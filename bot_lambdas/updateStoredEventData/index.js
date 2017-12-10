"use strict";

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_EVENT_DATA_OBJECT_KEY = process.env.S3_EVENT_DATA_OBJECT_KEY;

//---------------------------------------------------------------------------//
// Built-in modules
var https = require("https");

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();
//---------------------------------------------------------------------------//

//---------------------------------------------------------------------------//
// Custom modules
var facebookApiInterface = require("./facebookApiInterface");

//---------------------------------------------------------------------------//

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
    }, function (err, data) {
        var item;
        var nodes = {};
        if (err) {
            console.log("error reading DynamoDB: ", err);
        } else {
            for (var prop in data.Items) {
                item = data.Items[prop];

                nodes[item.NodeId.N] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                    Id: item.NodeId.N,
                    Name: item.Name.S,
                    Type: item.NodeType.S
                };
            }

            console.log(JSON.stringify(nodes));

            queryFacebookApi(nodes);
        }
    });
}

function queryFacebookApi(organisers) {
    var batchRequestContent = [];

    var pageIds = [];
    var groupIds = [];
    var userIds = [];

    for (var prop in organisers) {
        switch (organisers[prop].Type) {
            case "page":
                // scrape this page's events
                pageIds.push(organisers[prop].Id);
                break;
            case "group":
                // scrape this page's post feed
                groupIds.push(organisers[prop].Id);
                break;
            case "user":
                // scrape this user's events, NB the user needs to give this app permission!
                userIds.push(organisers[prop].Id);
                break;
            default:
                console.log("Unexpected node type: ", organisers[prop].Type);
        }
    }

    batchRequestContent.push({
        relative_url: facebookApiInterface.buildQueryUrl("/events/", {
            debug: "all",
            time_filter: "upcoming",
            ids: pageIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });
    // batchRequestContent.push({   // TODO: reinstate this when I have a decent feed scraping algorithm
    //     relative_url: facebookApiInterface.buildQueryUrl("/feed/", {
    //         debug: "all",
    //         ids: groupIds
    //     }, true),
    //     method: "GET"
    // });
    batchRequestContent.push({
        relative_url: facebookApiInterface.buildQueryUrl("/events/", {
            debug: "all",
            time_filter: "upcoming",
            ids: userIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });


    var body = "batch=" + JSON.stringify(batchRequestContent);

    // console.log("write to body: ", body);
    var options = facebookApiInterface.createGraphApiOptions();

    var req = https.request(options, (response) => {
        console.log(response);

        var str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });

        response.on("end", () => {
            var responses = JSON.parse(str);

            console.log(responses);

            var eventsMap = formatEventData(responses, organisers);
            updateS3Data(eventsMap, organisers);
        });
    });
    req.on("error", (err) => {
        console.log("problem with request: " + err);
    });

    req.write(body);
    req.end();
}

function formatEventData(responses, organisers) { // it's a bit dirty that they're in different arrays, but at least they match 1-to-1
    var eventsMap = {}; // NOTE: this is an object and not an array since this being used as a KVP data container, we want to enforce unique keys

    responses.forEach((response) => {
        console.log(response.body);

        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            var events;
            var entries = JSON.parse(response.body);
            for (var prop in entries) {

                console.log(entries[prop]);

                if (entries[prop].data) {
                    events = entries[prop].data;
                    events.forEach((eventData) => {
                        if (organisers[prop]) {
                            // Links this event to the associated organiser. Not using the node's owner field since it's not guaranteed
                            // they match the whitelisted organisers, especially for the bigger events with multiple organisers
                            eventData.organiser = organisers[prop].Id;
                        }
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
                } else {
                    console.log("Additional metadata in response: ", entries[prop]);
                }


            }
        }
    });

    return eventsMap;
}

function updateS3Data(events, organisers) {
    if (!events) {
        console.log("Invalid S3 events payload: ", events);
        return;
    }

    var payload = {
        events: cleanupPayloadToS3(events),
        organisers: organisers
    };

    payload = JSON.stringify(payload);

    s3.putObject({
        Bucket: S3_BUCKET_NAME,
        Key: S3_EVENT_DATA_OBJECT_KEY,
        Body: payload
    }, function (err, data) {
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            console.log("putObject response metadata:", data);
        }
    });
}

// Converts the payload map into an array of events sorted in ascending chronological order, then stringifies the result in preparation for saving to S3
function cleanupPayloadToS3(payload) {
    // var cleanedPayload = Object.values(payload); // NB Object.values isn't available until Node 7.0
    var cleanedPayload = Object.keys(payload).map((key) => {
        return payload[key];
    });

    console.log("cleaned payload content: ", cleanedPayload);

    cleanedPayload.sort(function (left, right) {
        var leftDate = new Date(left.start_time);
        var rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    return cleanedPayload;
}