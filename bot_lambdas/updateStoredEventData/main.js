"use strict";

// Built-in modules
const https = require("https");

// Facebook Graph API interfacing modules
const facebookApiInterface = require("./facebook/facebookApiInterface");

// AWS data staging interfacing modules
const dataStagingInterface = require("./dataStagingInterface");

// For event data analysis
const bottyDataAnalyser = require("./botty/bottyDataAnalyser");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    let response = updateEventData();
    callback(null, response);
};

function updateEventData() {
    return Promise.resolve(
        getOrganiserData()
        .then(buildOrganiserQuery)
        .then(batchQueryFacebook)
        .then(processResponseFromFacebook) // NOTE: this step may kick off a secondary FB query if feed scraping returns additional events
        .then(formatPayloadForStorage)
        .then(saveEventData)
        .then((result) => {
            console.log("All promises resolved, end result return value: ", result);
            return generateHttpResponse(200, "OK");
        })
        .catch((err) => {
            console.log("Error thrown: ", err);
            let payload = {
                message: "Internal Server Error"
            };
            return generateHttpResponse(500, payload);
        })
    );
}

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}

// Promise chain functions & handlers start here

function getOrganiserData() {
    return dataStagingInterface.getOrganiserData();
}

function buildOrganiserQuery(organisers) {
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

    let batchRequestPayload = [];

    batchRequestPayload.push({
        relative_url: facebookApiInterface.buildQueryUrl(facebookApiInterface.getEventsPath(), {
            debug: "all",
            time_filter: "upcoming",
            ids: pageIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });
    batchRequestPayload.push({
        relative_url: facebookApiInterface.buildQueryUrl(facebookApiInterface.getFeedPath(), {
            debug: "all",
            ids: groupIds,
            fields: ["type", "link", "message", "story"]
        }, true),
        method: "GET"
    });
    batchRequestPayload.push({
        relative_url: facebookApiInterface.buildQueryUrl(facebookApiInterface.getEventsPath(), {
            debug: "all",
            time_filter: "upcoming",
            ids: userIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"
    });

    return Promise.resolve(batchRequestPayload);
}

function batchQueryFacebook(payload) {
    return new Promise((resolve, reject) => {
        let options = facebookApiInterface.createBatchGraphApiOptions();

        let req = https.request(options, (response) => {
            resolve(response);
        });
        req.on("error", (err) => {
            reject(err);
        });

        req.write("batch=" + JSON.stringify(payload));
        req.end();
    });
}

function processResponseFromFacebook(response) {
    return new Promise((resolve, reject) => {
        try {
            let str = "";
            response.on("data", (chunk) => {
                str += chunk;
            });

            response.on("end", () => {
                let responses = JSON.parse(str);
                resolve(parseResponses(responses));
            });
        } catch (err) {
            reject(err);
        }
    });
}

function parseResponses(responses) {
    let events = new Map(); // using a Map to guarentee unique entries
    let eventLinks = new Set(); // using a Set to guarentee unique entries

    let facebookEventLinkRegex = /^https:\/\/www.facebook.com\/events\/\d+\/$/i;

    responses.forEach((response) => {
        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            let body = JSON.parse(response.body);

            for (let prop in body) {
                if (body[prop].data) {
                    let entries = body[prop].data;
                    entries.forEach((entry) => {
                        if (entry.name && entry.description && entry.start_time && entry.end_time) {
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

                            events.set(entry.id, entry);
                        } else if (entry.type && entry.type === "event" && entry.link && facebookEventLinkRegex.test(entry.link)) {
                            // This is a feed message with a link
                            eventLinks.add(entry.link);
                        } // no general else clause, discard all the rest since we don't need them
                    });
                } else {
                    console.log(`Additional metadata ${prop} in response: ${JSON.stringify(body[prop])}`);
                }
            }
        }
    });

    if (eventLinks.size > 0) {
        // Need to wait for secondary event query
        return Promise.resolve(buildSecondaryQuery(eventLinks, events)
            .then(batchQueryFacebook)
            .then(
                (response) => {
                    // Has to be done here because it needs the ref to the events map to concat the secondary results
                    return new Promise((resolve, reject) => {
                        try {
                            let str = "";
                            response.on("data", (chunk) => {
                                str += chunk;
                            });

                            response.on("end", () => {
                                let responses = JSON.parse(str);

                                let additionalEvents = parseSecondaryEventResponses(responses);
                                additionalEvents.map((evt) => { // add additional events to the main map (if it somehow gets a duplicate here, it's fine. We just end up overwriting)
                                    events.set(evt.id, evt);
                                });

                                resolve(events);
                            });
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
            ));
    } else {
        // No additional queries, save right away
        return Promise.resolve(events);
    }
}

function buildSecondaryQuery(eventLinks, events) {
    let eventIdRegex = /\d+/i;

    let eventIds = [];

    // extract the event ID from the URL, then check if it's already in the events: if it is, just skip it, we already have the event data
    Array.from(eventLinks.values()).forEach((link) => {
        let id = eventIdRegex.exec(link)[0];
        if (!events.get(id)) {
            eventIds.push(id);
        }
    });

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
    return Promise.resolve(batchRequestContent);
}

function parseSecondaryEventResponses(responses) { // NOTE: this is a normal function, no promise required
    let additionalEvents = [];
    responses.forEach((response) => {
        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            let evt = JSON.parse(response.body);

            if ((new Date(evt.start_time)).getTime() > Date.now()) { // future events only
                evt._bh = bottyDataAnalyser.analyseEvent(evt);
                additionalEvents.push(evt);
            }
        }
    });

    return additionalEvents;
}

function formatPayloadForStorage(events) {
    let payload = convertMapToArray(events);
    return Promise.resolve(JSON.stringify(payload));
}

function convertMapToArray(inputMap) {
    // Convert the map into an array of events sorted in ascending chronological order

    let outputArr = [...inputMap.values()];
    outputArr.sort((left, right) => {
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

function saveEventData(payload) {
    return dataStagingInterface.saveEventData(payload);
}