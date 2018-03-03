"use strict";

// Facebook Graph API interfacing modules
const facebookApiInterface = require("./facebook/facebookApiInterface");

// AWS data staging interfacing modules
const dataInterface = require("./persistentStorageInterface");

// For event data analysis
const bottyDataAnalyser = require("./botty/bottyDataAnalyser");

const dateTimeUtils = require("./utils/dateTimeUtils");

//---------------------------------------------------------------------------//

const FACEBOOK_API_VERSION = "v2.11";
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const api = facebookApiInterface(FACEBOOK_API_VERSION, FACEBOOK_ACCESS_TOKEN);

exports.handler = (event, context, callback) => {
    const response = updateEventData();
    callback(null, response);
};

function updateEventData() {
    return Promise.resolve(
        getOrganiserData()
        .then(buildPrimaryQuery)
        .then(sendPrimaryQuery)
        .then(processPrimaryResponse) // NOTE: this step may kick off a secondary FB query if feed scraping returns additional events
        .then(formatPayloadForStorage)
        .then(saveEventData)
        .then((result) => {
            console.log("All promises resolved, end result return value: ", result);
            return generateHttpResponse(200, "OK");
        })
        .catch((err) => {
            console.log("Error thrown: ", err);
            const payload = {
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
    return dataInterface.getOrganisers();
}

function buildPrimaryQuery(organisers) {
    const ids = {
        pageIds: [],
        groupIds: [],
        userIds: []
    };

    for (const prop in organisers) {
        switch (organisers[prop].Type) {
            case "page":
                // scrape this page's events
                ids.pageIds.push(organisers[prop].Id);
                break;
            case "group":
                // scrape this page's post feed
                ids.groupIds.push(organisers[prop].Id);
                break;
            case "user":
                // scrape this user's events, NB the user needs to give this app permission!
                ids.userIds.push(organisers[prop].Id);
                break;
            default:
                console.log("Unexpected node type: ", organisers[prop].Type);
        }
    }

    return Promise.resolve(ids);
}

function sendPrimaryQuery(payload) {
    return api.sendBatchDataQuery(payload);
}

function processPrimaryResponse(response) {
    const result = JSON.parse(response);

    if (result.error) {
        return Promise.reject(result.error); // TODO: wait will this ever happen?
    }

    const facebookEventLinkRegex = /^https:\/\/www.facebook.com\/events\/\d+\/$/i;

    const data = result.reduce((reducer, response) => {
        if (response.error) {
            console.log(`Error in primary response: ${response.error.message}`, response.error);
        } else {
            const body = JSON.parse(response.body);

            for (const prop in body) {
                if (body[prop].data) {
                    body[prop].data.forEach((entry) => {
                        if (entry.name && entry.description && entry.start_time && entry.end_time) {
                            // This is an event
                            const event = formatEvent(entry);
                            if (event) {
                                reducer.events.set(event.id, event);
                            }
                        } else if (entry.type && entry.type === "event" && entry.link && facebookEventLinkRegex.test(entry.link)) {
                            // This is a feed message with a link
                            reducer.links.add(entry.link);
                        } // no general else clause, discard all the rest since we don't need them
                    });
                } else {
                    console.log(`Additional metadata ${prop} in response: ${JSON.stringify(body[prop])}`);
                }
            }
        }
        return reducer;
    }, {
        events: new Map(),
        links: new Set()
    });

    console.log(`Primary query response processed, ${data.events.size} events added with ${data.links.size} additional events to query.`);

    if (data.links.size > 0) {
        // Need to wait for secondary event query
        return executeSecondaryQuery(data);
    } else {
        // No additional queries, save right away
        return Promise.resolve(data.events);
    }
}

function formatEvent(event) {
    if (event.event_times) {
        const firstUpcomingEvent = event.event_times.find((element) => {
            return (new Date(element.start_time)).getTime() > Date.now();
        });

        if (firstUpcomingEvent) {
            event.id = firstUpcomingEvent.id;
            event.start_time = firstUpcomingEvent.start_time;
            event.end_time = firstUpcomingEvent.end_time;
        }
    }

    if (!dateTimeUtils.isFuture(event.start_time)) {
        return null;
    } else {
        event._bh = bottyDataAnalyser.analyseEvent(event); // attach custom metadata from data analysis to this event.
        return event;
    }
}

function executeSecondaryQuery(data) {
    return Promise.resolve(buildSecondaryQuery(data)
        .then(sendSecondaryQuery)
        .then(
            (response) => {
                const result = JSON.parse(response);

                console.log(`Secondary query response processed, event count is now ${data.size}.`);

                const additionalEvents = parseSecondaryResponse(result);
                additionalEvents.map((event) => { // add additional events to the main map (if it somehow gets a duplicate here, it's fine. We just end up overwriting)
                    data.events.set(event.id, event);
                });

                console.log(`Secondary query response processed, event count is now ${data.events.size}.`);

                // Has to be done here because it needs the ref to the events map to concat the secondary results
                return Promise.resolve(data.events);
            }
        ));
}

function buildSecondaryQuery(data) {
    const eventIdRegex = /\d+/i;
    const BATCH_QUERY_LIMIT = 50;

    const eventIds = [];

    // extract the event ID from the URL, then check if it's already in the events: if it is, just skip it, we already have the event data
    Array.from(data.links.values()).forEach((link) => {
        const id = eventIdRegex.exec(link)[0];
        if (!data.events.get(id) && eventIds.length < BATCH_QUERY_LIMIT) {
            eventIds.push(id);
        }
    });

    return Promise.resolve(eventIds);
}

function sendSecondaryQuery(eventIds) {
    return api.sendBatchDirectEventsQuery(eventIds);
}

function parseSecondaryResponse(responses) { // NOTE: this is a normal function, no promise required
    return responses.reduce((reducer, response) => {
        if (response.error) {
            console.log(`Error in secondary response: ${response.error.message}`, response.error);
        } else {
            const entry = JSON.parse(response.body);

            const event = formatEvent(entry);
            if (event) {
                reducer.push(event);
            }
        }
        return reducer;
    }, []);
}

function formatPayloadForStorage(events) {
    const payload = convertMapToArray(events);
    return Promise.resolve(JSON.stringify(payload));
}

function convertMapToArray(inputMap) {
    // Convert the map into an array of events sorted in ascending chronological order

    const outputArr = [...inputMap.values()];
    outputArr.sort((left, right) => {
        const leftDate = new Date(left.start_time);
        const rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    return outputArr;
}

function saveEventData(payload) {
    return dataInterface.saveEvents(payload);
}