"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_EVENT_DATA_OBJECT_KEY = process.env.S3_EVENT_DATA_OBJECT_KEY;

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

            queryFacebookApi(nodes);
        }
    });
}

function queryFacebookApi(nodes) {
    var path,
        callback,
        params;

    var aggregatedResponse = {}; // this is an object and not an array since this being used as a KVP data container, we want to enforce unique keys

    var callbacksStarted = Object.keys(nodes).length;
    var callbacksFinished = 0;

    var pageEventsCallback = function(organiser, response) {
        var payload = "";
        response.on("data", function(chunk) {
            payload += chunk;
        });
        response.on("end", function() {
            var responseData = JSON.parse(payload);
            var organiserData = {
                NodeId: organiser.Id,
                NodeType: organiser.Type,
                Name: organiser.Name
            };
            if (responseData.error) {
                console.log("Response errored: ", responseData.error.message);
            } else {
                for (var i = 0; i < responseData.data.length; i++) {
                    responseData.data[i].organiser = organiserData;

                    // entries with event_times really mess up the sorting, so replace the original id, start_time and end_time with the next upcoming event
                    if(responseData.data[i].event_times){
                        var firstUpcomingEvent = responseData.data[i].event_times.find((element) => {
                            return (new Date(element.start_time).getTime() > Date.now();
                        });

                        responseData.data[i].id = firstUpcomingEvent.id;
                        responseData.data[i].start_time = firstUpcomingEvent.start_time;
                        responseData.data[i].end_time = firstUpcomingEvent.end_time;
                    }
                    aggregatedResponse[responseData.data[i].id] = responseData.data[i]; // event ID should be unique, so duplicates can be overwritten
                }
            }

            callbacksFinished++;

            if (callbacksStarted === callbacksFinished) { // FIXME: This is a dirty way of doing this, find something more elegant (Promises?)
                updateS3Data(aggregatedResponse);
            }
        });
    }

    var groupFeedCallback = function(organiser, response) {
        var payload = "";
        response.on("data", function(chunk) {
            payload += chunk;
        });
        response.on("end", function() {
            var responseData = JSON.parse(payload);
            var organiserData = {
                NodeId: organiser.Id,
                NodeType: organiser.Type,
                Name: organiser.Name
            };
            if (responseData.error) {
                console.log("Response errored: ", responseData.error.message);
            } else {
                for (var i = 0; i < responseData.data.length; i++) {
                    responseData.data[i].organiser = organiserData;
                    // aggregatedResponse[responseData.data[i].id] = responseData.data[i]; // event ID should be unique, so duplicates can be overwritten
                }
            }

            callbacksFinished++;

            if (callbacksStarted === callbacksFinished) { // FIXME: This is a dirty way of doing this, find something more elegant (Promises?)
                updateS3Data(aggregatedResponse);
            }
        });
    }

    var errCallback = function(err) {
        console.log("problem with request: " + err);
    }

    for (var node in nodes) {
        // foreach node: query FB for event data and replace the data in the corresponding S3 bucket

        switch (nodes[node].Type) {
            case "page":
                // scrape this page's events
                params = {
                    time_filter: "upcoming"
                };
                path = generateApiUrl(nodes[node].Id, "events", params);
                callback = pageEventsCallback.bind(this, nodes[node]);
                break;
            case "group":
                // scrape this page's post feed
                path = generateApiUrl(nodes[node].Id, "feed", params);
                callback = groupFeedCallback.bind(this, nodes[node]);
                break;
            case "user":
                // scrape this user's events, NB the user needs to give this app permission!
                path = generateApiUrl(nodes[node].Id, "events", params);
                callback = pageEventsCallback.bind(this, nodes[node]);
                break;

            default:
                console.log("Unexpected node type: ", nodes[node].Type);
        }
        console.log("api path:", path);

        if (!path) {
            continue;
        }

        var options = {
            host: "graph.facebook.com",
            path: path,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        var req = https.request(options, callback);
        req.on("error", errCallback);
        req.end();
    }
}

function updateS3Data(payload) {
    var content = cleanupPayloadToS3(payload);

    s3.putObject({
        Bucket: S3_BUCKET_NAME,
        Key: S3_EVENT_DATA_OBJECT_KEY,
        Body: content
    }, function(err, data) {
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            console.log("putObject response metadata:", data);
        }
    });
}

function cleanupPayloadToS3(payload){
    // var cleanedPayload = Object.values(payload); // NB Object.values isn't available until Node 7.0
    var cleanedPayload = Object.keys(payload).map((key) => { return payload[key]; });

    console.log("cleaned payload content: ", cleanedPayload);

    cleanedPayload.sort(function(left, right){
        var leftDate = new Date(left.start_time);
        var rightDate = new Date(right.start_time);

        if(!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()){
            return 0;
        }else{
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    cleanedPayload = JSON.stringify(cleanedPayload);
    return cleanedPayload;
}

function generateApiUrl(nodeId, edge, params) {
    var url = "/v2.9/" + nodeId;
    var accessTokenParam = "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN;

    url += '/' + edge + accessTokenParam;

    if (params) {
        var paramsArr = [],
            temp;
        for (var prop in params) {
            temp = prop + '=' + (
                params[prop] instanceof Array
                ? params[prop].join(',')
                : params[prop]); // handles joining one level deep. If this requires some fancy subquerying, consider making this recursive
            paramsArr.push(temp);
        }
        url = url + '&' + paramsArr.join('&');
    }

    return url;
}
