"use strict";

// Built-in modules
const https = require("https");

// Facebook Graph API interfacing modules
const facebookApiInterface = require("./facebookApiInterface");

// AWS data staging interfacing modules
const dataStagingInterface = require("./dataStagingInterface");

// For event data analysis
const bottyDataAnalyser = require("./botty/bottyDataAnalyser");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    dataStagingInterface.getOrganiserData(queryOrganiserEvents); // main logical chain gets kicked off asynchronously from here

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };
    callback(null, response);
};

function queryOrganiserEvents(organisers) {
    let pageIds = [],
        groupIds = [],
        userIds = [];
    for (let prop in organisers) {
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

    let batchRequestContent = [];

    batchRequestContent.push({
        relative_url: facebookApiInterface.buildQueryUrl("/events/", {
            debug: "all",
            time_filter: "upcoming",
            ids: pageIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });
    batchRequestContent.push({
        relative_url: facebookApiInterface.buildQueryUrl("/feed/", {
            debug: "all",
            ids: groupIds,
            fields: ["type", "link", "message", "story"]
        }, true),
        method: "GET"
    });
    batchRequestContent.push({
        relative_url: facebookApiInterface.buildQueryUrl("/events/", {
            debug: "all",
            time_filter: "upcoming",
            ids: userIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });

    sendBatchRequestToFacebook(batchRequestContent, (response) => {
        console.log(response);

        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });

        response.on("end", () => {
            let responses = JSON.parse(str);

            console.log(responses);

            parseResponses(responses); // TODO: good place refactor into a promise
        });
    });
}

function sendBatchRequestToFacebook(body, callback) {
    let options = facebookApiInterface.createBaseGraphApiOptions();

    let req = https.request(options, callback);
    req.on("error", (err) => {
        console.log("problem with request: " + err);
    });

    req.write("batch=" + JSON.stringify(body));
    req.end();
}

function parseResponses(responses) {
    let eventMap = {};
    let linkedEvents = [];

    let facebookEventLinkRegex = /^https:\/\/www.facebook.com\/events\/\d+\/$/i;

    responses.forEach((response) => {
        console.log(response.body);

        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            let body = JSON.parse(response.body);

            for (let prop in body) {
                console.log(body[prop]);

                if (body[prop].data) {
                    let entries = body[prop].data;
                    entries.forEach((entry) => {
                        if (entry.type && entry.link) {
                            // This is a feed message with a link
                            if (entry.type && entry.type === "event" && entry.link && facebookEventLinkRegex.test(entry.link)) {
                                linkedEvents.push(entry.link);
                            }
                        } else if (entry.name && entry.description && entry.start_time && entry.end_time) {
                            // This is an event
                            if (entry.event_times) {
                                let firstUpcomingEvent = entry.event_times.find((element) => {
                                    return (new Date(element.start_time)).getTime() > Date.now();
                                });

                                entry.id = firstUpcomingEvent.id;
                                entry.start_time = firstUpcomingEvent.start_time;
                                entry.end_time = firstUpcomingEvent.end_time;
                            }

                            entry._bh = bottyDataAnalyser.analyseEvent(entry); // attach custom metadata from data analysis to this event.

                            eventMap[entry.id] = entry;
                        } else {
                            // console.log("Unknown and/or discarded entry received: ", entry); // Don't care about these right now, they're just clogging up the logs
                        }
                    });
                } else {
                    console.log("Additional metadata in response: ", body[prop]);
                }
            }
        }
    });

    if (linkedEvents.length > 0) {
        // Need to wait for secondary event query
        queryAdditionalEvents(linkedEvents, eventMap);
    } else {
        // No additional queries, save right away
        let payload = formatForExport(eventMap);
        dataStagingInterface.updateEventData(payload);
    }
}

function queryAdditionalEvents(linkedEvents, eventMap) {
    let eventIdRegex = /\d+/i;

    console.log(linkedEvents);

    let eventIds = [];

    // extract the event ID from the URL, then check if it's already in the eventMap: if it is, just skip it, we already have the event data
    linkedEvents.forEach((link) => {
        let id = eventIdRegex.exec(link)[0];
        if (!eventMap[id]) {
            eventIds.push(id);
        }
    });

    eventIds = [...new Set(eventIds)]; // unique values only 

    let batchRequestContent = [];
    eventIds.map((eventId) => {
        batchRequestContent.push({
            relative_url: facebookApiInterface.buildQueryUrl(eventId + "/", {
                debug: "all",
                time_filter: "upcoming",
                fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
            }, true),
            method: "GET"
        });
    });

    // console.log(eventIds);

    sendBatchRequestToFacebook(batchRequestContent, (response) => {
        console.log(response);

        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });

        response.on("end", () => {
            let responses = JSON.parse(str);

            // console.log(responses);

            let events = parseSecondaryEventResponses(responses);

            events.map((evt) => { // add new events to eventMap (if it somehow gets a duplicate here, it's fine. We just end up overwriting)
                eventMap[evt.id] = evt;
            });

            let payload = formatForExport(eventMap);
            dataStagingInterface.updateEventData(payload);
        });
    });
}

function parseSecondaryEventResponses(responses) {
    let events = [];
    responses.forEach((response) => {
        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            let evt = JSON.parse(response.body);
            console.log(evt);

            if ((new Date(evt.start_time)).getTime() > Date.now()) { // future events only
                evt._bh = bottyDataAnalyser.analyseEvent(evt);
                events.push(evt);
            }
        }
    });

    return events;
}

function formatForExport(eventMap) {
    let payload = convertMapToArray(eventMap);
    return JSON.stringify(payload);
}

function convertMapToArray(inputMap) {
    // Convert the map into an array of events sorted in ascending chronological order
    let outputArr = Object.keys(inputMap).map((key) => {
        return inputMap[key];
    });

    outputArr.sort(function (left, right) {
        let leftDate = new Date(left.start_time);
        let rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    return outputArr;
}