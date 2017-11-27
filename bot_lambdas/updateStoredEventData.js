"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

var AWS = require("aws-sdk");
AWS.config.update({region: "eu-central-1"});

var dynamodb = new AWS.DynamoDB({
    apiVersion: "2017-11-20" // TODO: any special significance to this timestamp?
});

var s3 = new AWS.S3({
    apiVersion: "2017-11-20" // TODO: any special significance to this timestamp?
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

    fetchNodes();

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function fetchNodes() {
    //return fetchNodesDebug();

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

                /* Structure:
                {
                    "S3Pointer": {
                        "S": "TODO"
                    },
                    "NodeType": {
                        "S": "Group"
                    },
                    "NodeId": {
                        "N": "341108445941295"
                    },
                    "ItemId": {
                        "N": "7"
                    },
                    "Name": {
                        "S": "RioZoukStyle"
                    }
                    }
                */

                //console.log(JSON.stringify(line));

                nodes[item.Name.S] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                    Id: item.NodeId.N,
                    Type: item.NodeType.S,
                    S3Filename: item.S3Pointer.S
                };
            }

            fetchData(nodes);
        }
    });
}

function fetchData(nodes) {
    console.log(JSON.stringify(nodes));

    // debugS3();

    for (var node in nodes) {
        queryFacebookApi(node, nodes[node]); // foreach node: query FB for event data and replace the data in the corresponding S3 bucket
    }
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
    var path = generateApiUrl(nodeData.Id);

    var options = {
        host: "graph.facebook.com",
        path: path,
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    };

    var callback = function(key, response) {
        var responseData = "";
        response.on("data", function(chunk) {
            responseData += chunk;
        });
        response.on("end", function() {
            console.log("tried to fetch event data, got this: ", responseData);

            updateS3Data(key, responseData); // key from nodeData?
        });
    }.bind(nodeData.S3Filename);

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

function generateApiUrl(targetNodeId) {
    return {
        path: "/v2.9/" + targetNodeId + "/events",
        accessToken: "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN
    };
}
