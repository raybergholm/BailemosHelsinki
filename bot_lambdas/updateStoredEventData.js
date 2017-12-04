"use strict";

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_EVENT_DATA_OBJECT_KEY = process.env.S3_EVENT_DATA_OBJECT_KEY;

var https = require("https");

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

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
        var nodes = [];
        if (err) {
            console.log("error reading DynamoDB: ", err);
        } else {
            for (var prop in data.Items) {
                item = data.Items[prop];

                nodes.push({ // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                    Id: item.NodeId.N,
                    Name: item.Name.S,
                    Type: item.NodeType.S
                });
            }

            console.log(JSON.stringify(nodes));

            queryFacebookApi(nodes);
        }
    });
}

function queryFacebookApi(organisers) {
    var batchRequestContent = [];

    for (var i = 0; i < organisers.length; i++) {
        switch (organisers[i].Type) {
            case "page":
                // scrape this page's events
                batchRequestContent.push({
                    relative_url: "/" + organisers[i].Id + "/events?time_filter=upcoming",
                    method: "GET"
                });
                break;
            case "group":
                // scrape this page's post feed
                batchRequestContent.push({
                    relative_url: "/" + organisers[i].Id + "/feed",
                    method: "GET"
                });
                break;
            case "user":
                // scrape this user's events, NB the user needs to give this app permission!

                batchRequestContent.push({
                    relative_url: "/" + organisers[i].Id + "/events?time_filter=upcoming",
                    method: "GET"
                });
                break;
            default:
                console.log("Unexpected node type: ", organisers[i].Type);
        }
    }

    var body = "batch=" + JSON.stringify(batchRequestContent);

    console.log("write to body: ", body);
    var options = {
        host: "graph.facebook.com",
        path: "/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    var req = https.request(options, (response) => {
        console.log(response);

        var str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });

        response.on("end", () => {
            var responseData = JSON.parse(str);

            console.log(responseData);

            formatEventData(organisers, responseData);
        });
    });
    req.on("error", (err) => {
        console.log("problem with request: " + err);
    });

    req.write(body);
    req.end();
}

function formatEventData(organisers, responseData) { // it's a bit dirty that they're in different arrays, but at least they match 1-to-1
    var responseBody;
    var eventsMap = {}; // NOTE: this is an object and not an array since this being used as a KVP data container, we want to enforce unique keys

    if (organisers.length !== responseData.length) {
        console.log("what sorcery is this, the array lengths don't match. Expect an error in the logs.");
    }

    for (var i = 0; i < organisers.length; i++) {
        console.log("organiser data index " + i, organisers[i]);

        console.log("response data index " + i, responseData[i]);

        if (responseData[i].error) {
            console.log("Response errored: ", responseData.error.message);
        } else {
            switch (organisers[i].Type) {
                case "page":
                    responseBody = JSON.parse(responseData[i].body);
                    responseBody.data.forEach((eventData) => {
                        eventData.organiser = organisers[i];

                        if (eventData.event_times) {
                            var firstUpcomingEvent = eventData.event_times.find((element) => {
                                return (new Date(element.start_time)).getTime() > Date.now();
                            });

                            eventData.id = firstUpcomingEvent.id;
                            eventData.start_time = firstUpcomingEvent.start_time;
                            eventData.end_time = firstUpcomingEvent.end_time;
                        }

                        eventsMap[eventData.id] = eventData;
                    });
                    break;
                case "group":
                    responseBody = JSON.parse(responseData[i].body);
                    responseBody.data.forEach((post) => {
                        // TODO: scrape every post for relevant event info
                    });
                    break;
                case "user":
                    responseBody = JSON.parse(responseData[i].body);
                    responseBody.data.forEach((eventData) => {
                        eventData.organiser = organisers[i];

                        if (eventData.event_times) {
                            var firstUpcomingEvent = eventData.event_times.find((element) => {
                                return (new Date(element.start_time)).getTime() > Date.now();
                            });

                            eventData.id = firstUpcomingEvent.id;
                            eventData.start_time = firstUpcomingEvent.start_time;
                            eventData.end_time = firstUpcomingEvent.end_time;
                        }

                        eventsMap[eventData.id] = eventData;
                    });
                    break;
            }
        }
    }

    updateS3Data(eventsMap);
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

function cleanupPayloadToS3(payload) {
    // var cleanedPayload = Object.values(payload); // NB Object.values isn't available until Node 7.0
    var cleanedPayload = Object.keys(payload).map((key) => {
        return payload[key];
    });

    console.log("cleaned payload content: ", cleanedPayload);

    cleanedPayload.sort(function(left, right) {
        var leftDate = new Date(left.start_time);
        var rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    cleanedPayload = JSON.stringify(cleanedPayload);
    return cleanedPayload;
}
