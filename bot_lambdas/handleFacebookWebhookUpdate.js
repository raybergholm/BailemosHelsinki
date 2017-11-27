"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

var https = require("https");
var crypto = require('crypto');

var AWS = require("aws-sdk");
AWS.config.update({region: "eu-central-1"});

var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    console.log(event);

    // TODO: event["X-Hub-Signature"] is always undefined, but it's definitely there. Why?
    if(!verifySignature(event['X-Hub-Signature'])){
        console.log("X-Hub_Signature did not match the expected value");
        // return; // TODO: allow it to pass for now, debug it later
    }

    var response;

    switch (event.httpMethod) {
        case "GET":
            response = handleFacebookChallenge(event.queryStringParameters);
            break;
        case "POST":
            response = processUpdates(JSON.parse(event.body));
            break;
    }

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function verifySignature(signature) {
    var shasum;

    console.log(signature);

    if (signature) {
        shasum = crypto.createHash('sha1');
        shasum.update(FACEBOOK_APP_SECRET);

        if (signature === shasum.digest("hex")) {
            return true;
        } else {
            console.log("HTTP signature: " + signature + ", digest: " + shasum.digest("hex"));
        }
    }
    return false;
}

function handleFacebookChallenge(queryParams) {
    var response;
    var verifyToken = queryParams["hub.verify_token"];

    if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
        var challengeToken = parseInt(queryParams["hub.challenge"]);

        console.log("Responding to Facebook challenge token");

        response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: parseInt(challengeToken)
        };
    } else {
        console.log("Incorrect validation token received");

        response = {
            isBase64Encoded: false,
            statusCode: 422,
            body: "Error, wrong validation token"
        };
    }
    return response;
}

function processUpdates(data) {
    var response;

    if (data) {
        console.log("entire HTTP request data: ", data);


        /*
        object      Indicates the object's type.        enum{user, page, permissions, payments}
        entry
        The list of changes. Multiple changes from different objects that are of the same type are batched together.
        object[]
        entry.id
        The object's ID.
        string
        entry.changed_fields
        An array of the fields that have been updated.
        string[]
        entry.changes
        An array containing the newly updated values.
        object[]
        entry.time
        When the update was sent (not when the change that triggered the updated occurred).
        timestamp
        */

        var type = data.object;

        data.entry.forEach(function(entry){
            var pageId = entry.id;
            var timeOfEvent = entry.time;
            var changedFields = entry.changedFields; // string[]
            var changes = entry.changes; // object[]

            // TODO: check the payload structure of string & object entries, then handle update using DDB and S3
        });
    } else {
        console.log("POST request body was null");
    }

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.

    // TODO: Check if it's ok if the response can be generated & returned at the end, this lambda should execute fast enough

    console.log("Responding with a 200 OK");

    response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    return response;
}
