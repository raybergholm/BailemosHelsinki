"use strict";

//---------------------------------------------------------------------------//
// Built-in modules
let https = require("https");

//---------------------------------------------------------------------------//

//---------------------------------------------------------------------------//
// Custom modules
let facebookApiInterface = require("./facebookApiInterface");

let dataStagingInterface = require("./dataStagingInterface");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    dataStagingInterface.getOrganiserData(queryFacebookApi); // main logical chain gets kicked off asynchronously from here

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };
    callback(null, response);
};

function queryFacebookApi(organisers) {
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

    let options = facebookApiInterface.createGraphApiOptions();

    let req = https.request(options, (response) => {
        console.log(response);

        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });

        response.on("end", () => {
            let responses = JSON.parse(str);

            console.log(responses);

            let payload = formatEventData(responses, organisers);
            if (payload) {
                dataStagingInterface.updateEventData(payload);
            }
        });
    });
    req.on("error", (err) => {
        console.log("problem with request: " + err);
    });

    req.write("batch=" + JSON.stringify(batchRequestContent));
    req.end();
}

function formatEventData(responses, organisers) { // it's a bit dirty that they're in different arrays, but at least they match 1-to-1
    let eventsMap = {}; // NOTE: this is an object and not an array since this being used as a KVP data container, we want to enforce unique keys

    responses.forEach((response) => {
        console.log(response.body);

        if (response.error) {
            console.log("Response errored: ", response.error.message);
        } else {
            let events;
            let entries = JSON.parse(response.body);
            for (let prop in entries) {

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
                            let firstUpcomingEvent = eventData.event_times.find((element) => {
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
    let eventsArr = Object.keys(eventsMap).map((key) => {
        return eventsMap[key];
    });

    eventsArr.sort(function (left, right) {
        let leftDate = new Date(left.start_time);
        let rightDate = new Date(right.start_time);

        if (!leftDate || !rightDate || leftDate.getTime() === rightDate.getTime()) {
            return 0;
        } else {
            return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
        }
    });

    let payload = {
        events: eventsArr,
        organisers: organisers
    };

    payload = JSON.stringify(payload); // important: need to stringify the body prior to saving

    return payload;
}