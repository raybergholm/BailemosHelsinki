"use strict";

const KEYWORDS = {
    // NB: This is it's own thing because it's often common to both courses and festivals, so if this turns up it's probably not a party, but by itself it can't tell the difference between course/festival
    Workshop: /\b(?:workshop(?:s?)|työpaja(?:t?))\b/i,
    Course: /\b(?:course(?:s?)|(?:tiivis?)kurssi(t?)|boot(?: ?)camp|leiri(?:t?))\b/i, // NOTE: don't include "teaching" or "opetus", it has a habit of appearing everywhere, pretty meaningless in this context
    CourseTerminology: /\b(?:novice(?:s?)|alkeet|beginner(?:s?)|improver(?:s?)|advanced|ladie(?:'?)s styling)\b/i, // these words are nearly always massive indicators that this is a course and nothing else 
    Festival: /\b(?:festival(?:s?)|festivaali(?:t?))\b/i,
    // NB: annoyingly enough, a "party" might be found connected to any of the above! Usually the best hint that this isn't a workshop/course/festival is the event duration. Still, it can affect the confidence level of which category it should be in
    Party: /\b(?:part(?:y|ies)|fiesta|show|bash|get(?: ?)together|juhla(?:t?))\b/i // actually, "fiesta" might be dangerous here since a spanish event may use it to mean a lot of things...
};

module.exports = {
    sort: (responses, organisers) => {
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
                            // TODO: do we really need this? Currently we don't expose or use the data source at all
                            // if (organisers[prop]) {  
                            //     // Links this event to the associated organiser. Not using the node's owner field since it's not guaranteed
                            //     // they match the whitelisted organisers, especially for the bigger events with multiple organisers
                            //     eventData.organiser = organisers[prop].Id;
                            // }
                            if (eventData.event_times) {
                                let firstUpcomingEvent = eventData.event_times.find((element) => {
                                    return (new Date(element.start_time)).getTime() > Date.now();
                                });

                                eventData.id = firstUpcomingEvent.id;
                                eventData.start_time = firstUpcomingEvent.start_time;
                                eventData.end_time = firstUpcomingEvent.end_time;
                            }

                            eventData.probabilities = calculateProbabilities(eventData);

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
};

function calculateProbabilities(eventData) {
    let weights = {
        Workshop: 0,
        Course: 0,
        CourseTerminology: 0,
        Festival: 0,
        Party: 0
    };

    for (let prop in KEYWORDS) {
        let result = KEYWORDS[prop].exec(eventData.name);
        if (result) {
            weights[prop] += result.length * 100; // if it shows up in the main title, there's a good chance that this is most relevant
        }

        // I don't like how this will skew towards more verbose descriptions, maybe need to add weights to this. But a naive word count won't work well since I'll need to include all languages involved!
        result = KEYWORDS[prop].exec(eventData.description);
        if (result) {
            weights[prop] += result.length;
        }
    }

    // TODO: use locations to change probability weights
    // Maxine is 100% chance of a party
    // Pressa skews towards either festival or party, never courses

    // TODO: use event duration to change probability weights: 
    // 1 day? high chance of party or an intensive workshop
    // 2 days? high chance of a workshop, much less likely to be a party. May be a festival too
    // 3 days over FRI-SUN? really high chance of being a festival. Sometimes a workshop. May also include parties, they may be separate. Not a course
    // over a week? a) yay, an organiser set it up right, b) almost 100% it's a long-term course

    let probabilities = {
        Party: weights.Party * 10,
        Workshop: weights.Workshop * 10 + weights.Party + weights.Course,
        Course: weights.Course * 10 + weights.CourseTerminology * 100,
        Festival: weights.Festival * 20 + weights.Party + weights.Workshop
    };

    return probabilities;
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