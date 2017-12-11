"use strict";

//---------------------------------------------------------------------------//
// Built-in modules
var https = require("https");

//---------------------------------------------------------------------------//

//---------------------------------------------------------------------------//
// Custom modules
var facebookApiInterface = require("./facebookApiInterface");

var dataStagingInterface = require("./dataStagingInterface");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    dataStagingInterface.getOrganiserData(queryFacebookApi); // main logical chain gets kicked off asynchronously from here

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };
    callback(null, response);
};

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

            var payload = formatEventData(responses, organisers);
            if (payload) {
                dataStagingInterface.updateEventData(payload, function (err, data) {
                    if (err) {
                        console.log("S3 interface error: ", err);
                    } else {
                        console.log("putObject response metadata:", data);
                    }
                });
            }
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

    if (!eventsMap) {
        console.log("events map was empty");
        return;
    }

    // Convert the map into an array of events sorted in ascending chronological order
    var eventsArr = Object.keys(eventsMap).map((key) => {
        return eventsMap[key];
    });

    eventsArr.sort(function (left, right) {
        var leftDate = new Date(left.start_time);
        var rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    var payload = {
        events: eventsArr,
        organisers: organisers
    }

    payload = JSON.stringify(payload); // important: need to stringify the body prior to saving

    return payload;
}