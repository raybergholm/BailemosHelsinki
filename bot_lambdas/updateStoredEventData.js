"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;

var AWS = require('aws-sdk');
AWS.config.update({
    region: 'eu-central-1'
});

var dynamodb = new AWS.DynamoDB({
    apiVersion: '2017-11-20'    // TODO: any special significance to this timestamp?
});

exports.handler = (event, context, callback) => {
    console.log(event);

    /*
    // TODO: event["X-Hub-Signature"] is always undefined, but it's definitely there. Why?
    if(!verifySignature(event['X-Hub-Signature'])){
        console.log("X-Hub_Signature did not match the expected value");
        return;
    }
    */

    var nodes = fetchNodes();

    fetchData(nodes);

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function fetchNodes() {
    // TODO: fetch the relevant nodes from DynamoDB

    dynamodb.scan({
        TableName: EVENT_ORGANISER_TABLE_NAME,
        Limit: 50
    }, function(err, data) {
        var line;
        if (err) {
            console.log("error reading DynamoDB: ", err);
        } else {
            for (var item in data.Items) {
                line = data.Items[item];

                console.log(JSON.stringify(line));
            }
        }
    });
}

function fetchData(nodes) {
    for (var node in nodes) {
        queryFacebookApi(node, nodes[node]); // foreach node: query FB for event data and replace the data in the corresponding S3 bucket
    }
}

function queryFacebookApi(nodeName, nodeId) {
    // TODO:
}

function generateApiUrl(targetNode) {
    return {
        path: "/v2.9/" + targetNode + "/events",
        accessToken: "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN
    };
}
