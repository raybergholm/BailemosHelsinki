"use strict";

const KEYWORDS = {
    // NB: This is it's own thing because it's often common to both courses and festivals, so if this turns up it's probably not a party, but by itself it can't tell the difference between course/festival
    Workshop: /\b(?:workshop(s?)|työpaja(t?))\b/i,
    Courses: /\b(?:course(s?)|kurssi(t?)|boot( ?)camp|leiri(t?))\b/i, // NOTE: don't include "teaching" or "opetus", it has a habit of appearing everywhere, pretty meaningless in this context
    Festivals: /\b(?:festival(s?)|festivaali(t?))\b/i,
    // NB: annoyingly enough, a "party" might be found connected to any of the above! Usually the best hint that this isn't a workshop/course/festival is the event duration. Still, it can affect the confidence level of which category it should be in
    Party: /\b(?:part(?:y|ies)|fiesta|show|bash|get( ?)together|juhla(t?))\b/i // actually, "fiesta" might be dangerous here since a spanish event may use it to mean a lot of things...
};

module.exports = {
    sort: (responses, organisers) => {
        let maps = {
            events: {}, // general parties and anything which didn't fit the other categories
            courses: {}, // courses and workshops
            festivals: {}, // anything "festival-like", allow scraping of foreign events into here
            organisers: organisers // putting this here as a lookup value  // TODO: do we even care? Might never need to show this info to the end user
        };

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

                            let probabilities = {
                                events: 0,
                                courses: 0,
                                festivals: 0
                            };

                            let mostFittingCategory = "events";
                            for (let prop in KEYWORDS) {
                                let result = KEYWORDS[prop].exec(eventData.name);
                                probabilities[prop] += result.length * 100; // if it shows up in the main title, there's a good chance that this is most relevant

                                // I don't like how this will skew towards more verbose descriptions, maybe need to add weights to this. But a naive word count won't work well since I'll need to include all languages involved!
                                result = KEYWORDS[prop].exec(eventData.description);    
                                probabilities[prop] += result.length;
                            }

                            console.log("probabilities for " + eventData.name, probabilities);

                            maps[mostFittingCategory][eventData.id] = eventData;
                        });
                    } else {
                        console.log("Additional metadata in response: ", entries[prop]);
                    }
                }
            }
        });

        return formatForExport(maps);
    }
};

function formatForExport(payload) {
    for (let prop in payload) {
        payload[prop] = convertMapToArray(payload[prop]);
    }

    return payload;
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