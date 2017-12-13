"use strict";

// Built-in modules
const https = require("https");

// Facebook Graph API interfacing modules
const facebookApiInterface = require("./facebookApiInterface");

// AWS data staging interfacing modules
const dataStagingInterface = require("./dataStagingInterface");

// For event data analysis
const bottyEventAnalyser = require("./botty/bottyEventAnalyser");

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

            let payload = parseResponses(responses);
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

function parseResponses(responses){
    let eventMap = {};

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
                        if (eventData.event_times) {
                            let firstUpcomingEvent = eventData.event_times.find((element) => {
                                return (new Date(element.start_time)).getTime() > Date.now();
                            });

                            eventData.id = firstUpcomingEvent.id;
                            eventData.start_time = firstUpcomingEvent.start_time;
                            eventData.end_time = firstUpcomingEvent.end_time;
                        }
                        
                        eventData._bh = bottyEventAnalyser.analyse(eventData);

                        eventMap[eventData.id] = eventData;
                    });
                } else {
                    console.log("Additional metadata in response: ", entries[prop]);
                }
            }
        }
    });

    return formatForExport(eventMap);
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