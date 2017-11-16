"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

var https = require("https");
var crypto = require("crypto");

exports.handler = (event, context, callback) => {
    console.log(event);

    /*
    // TODO: event["X-Hub-Signature"] is always undefined, but it's definitely there. Why?
    if(!verifySignature(event['X-Hub-Signature'])){
        console.log("X-Hub_Signature did not match the expected value");
        return;
    }
    */

    var response;

    if(event.httpMethod === "GET"){
        var verifyToken = event.queryStringParameters["hub.verify_token"];

        if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
            var challengeToken = parseInt(event.queryStringParameters["hub.challenge"]);

            console.log("Responding to Facebook challenge token");

            response = {
                isBase64Encoded: false,
                statusCode: 200,
                body: parseInt(challengeToken)
            };
        } else {
            console.log("Incorrect validation token received");

            var payload = {
                message: "Error, wrong validation token"
            };

            response = {
                isBase64Encoded: false,
                statusCode: 422,
                body: JSON.stringify(payload)
            };
        }
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
