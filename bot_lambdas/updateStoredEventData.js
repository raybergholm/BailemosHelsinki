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

    fetchNodes();

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function fetchNodes() { // scan the entire event organiser table (won't take long, in the current scope the data size is tiny), then use that data to call the GraphAPI to get the updated data
    dynamodb.scan({
        TableName: EVENT_ORGANISER_TABLE_NAME,
        Limit: 50
    }, function(err, data) {
        var item;
        var nodes = {};
        if (err) {
            console.log("error reading DynamoDB: ", err);
        } else {
            for (var prop in data.Items) {
                item = data.Items[prop];

                nodes[item.Name.S] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                    Id: item.NodeId.N,
                    Name: item.Name.S,
                    Type: item.NodeType.S,
                    S3Filename: item.S3Filename.S
                };
            }

            console.log(JSON.stringify(nodes));

            // debugS3();

            for (var node in nodes) {
                queryFacebookApi(node, nodes[node]); // foreach node: query FB for event data and replace the data in the corresponding S3 bucket
            }
        }
    });
}

function debugS3() {
    // s3.listBuckets(function(err, data){
    //     if(err){
    //         console.log("S3 interface error: ", err);
    //     }else{
    //         console.log("bucket list", data.Buckets);
    //     }
    // });

    s3.getObject({
        Bucket: S3_BUCKET_NAME,
        Key: "dummy_data.json"
    }, function(err, data) {
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            console.log("bucket item metadata:", data);
            console.log("data body content: ", data.Body.toString());
        }
    });
}

function queryFacebookApi(nodeName, nodeData) {
    var path = generateApiUrl(nodeData.Id, nodeData.Type);

    console.log("api path:", JSON.stringify(path));

    var options = {
        host: "graph.facebook.com",
        path: path,
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    };

    var callback = function(nodeData, response) {
        var payload = "";
        response.on("data", function(chunk) {
            payload += chunk;
        });
        response.on("end", function() {

            // VeDance & DJGoodblood missing permissions (private?)
            // SalsaGarage & SalsotekaLatinaAfroFlow empty events (should have public events visible?)

            // do we need public group scraping?

            var responseData = JSON.parse(payload);
            var s3Data = {
                NodeId: nodeData.NodeId,
                NodeType: nodeData.NodeType,
                Name: nodeData.Name,
                Events: null
            };
            if(responseData.error){
                console.log("Response errored: ", responseData.error.message);
                s3Data.Events = [];
            }else{
                s3Data.Events = responseData.data;
            }
            updateS3Data(nodeData.S3Filename, s3Data);
        });

    }.bind(this, nodeData);

    var req = https.request(options, callback);

    req.on("error", function(err) {
        console.log("problem with request: " + err);
    });

    req.end();
}

function updateS3Data(s3Filename, data) {
    // TODO: check if this will auto-overwrite. What if the file doesn't exist yet?

    var content = JSON.stringify(data);

    s3.putObject({
        Bucket: S3_BUCKET_NAME,
        Key: s3Filename,
        Body: content
    }, function(err, data) {
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            console.log("putObject response metadata:", data);
        }
    });
}

function generateApiUrl(nodeId, nodeType) {
    var basePath = "/v2.9/" + nodeId;

    switch (nodeType) {
        case "Group":
        case "User": // TODO: users may need to explicitly give permission for this app to scrape data
        case "PublicFigure":
            basePath += "/events"
            break;
        default:
            console.log("Unexpected identifier: ", nodeType);
            basePath += "/events"
    }

    var accessTokenParam = "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN;

    return basePath + accessTokenParam;
}
