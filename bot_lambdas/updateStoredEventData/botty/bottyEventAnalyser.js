"use strict";

const KEYWORDS = {
    Interests: {
        Salsa: /\bsalsa(?:a?)\b/i,
        Bachata: /\bbachata(?:a?)\b/i,
        Kizomba: /\bkizomba(?:a?)\b/i,
        Zouk: /\b(brazilian ?)zouk|lambazouk\b/i
    },
    Type: {
        // NB: This is it's own thing because it's often common to both courses and festivals, so if this turns up it's probably not a party, but by itself it can't tell the difference between course/festival
        Workshop: /\b(?:workshop(?:s?)|työpaja(?:t?))\b/i,
        Course: /\b(?:course(?:s?)|(?:tiivis?)kurssi(t?)|boot(?: ?)camp|leiri(?:t?))\b/i, // NOTE: don't include "teaching" or "opetus", it has a habit of appearing everywhere, pretty meaningless in this context
        CourseTerminology: /\b(?:novice(?:s?)|alkeet|beginner(?:s?)|improver(?:s?)|advanced|ladie(?:'?)s styling)\b/i, // these words are nearly always massive indicators that this is a course and nothing else 
        Festival: /\b(?:festival(?:s?)|festivaali(?:t?))\b/i,
        // NB: annoyingly enough, a "party" might be found connected to any of the above! Usually the best hint that this isn't a workshop/course/festival is the event duration. Still, it can affect the confidence level of which category it should be in
        Party: /\b(?:part(?:y|ies)|fiesta|show|bash|get(?: ?)together|juhla(?:t?))\b/i // actually, "fiesta" might be dangerous here since a spanish event may use it to mean a lot of things...
    }
};

module.exports = {
    analyse: (eventData) => {
        let result = {};

        result.type = guessEventType(eventData);
        result.interestTags = scanForInterests(eventData);

        return result;
    }
};

function guessEventType(eventData) {
    let weights = {
        Workshop: 0,
        Course: 0,
        CourseTerminology: 0,
        Festival: 0,
        Party: 0
    };

    for (let prop in KEYWORDS.Type) {
        let result = KEYWORDS.Type[prop].exec(eventData.name);
        if (result) {
            weights[prop] += result.length * 100; // if it shows up in the main title, there's a good chance that this is most relevant
        }

        // I don't like how this will skew towards more verbose descriptions, maybe need to add weights to this. But a naive word count won't work well since I'll need to include all languages involved!
        result = KEYWORDS.Type[prop].exec(eventData.description);
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

    let totalWeights = 0;
    let highestWeight = {
        type: "",
        value: 0
    };

    for (let prop in probabilities) {
        totalWeights += probabilities[prop];
        if (probabilities[prop] > highestWeight.value) {
            highestWeight.type = prop;
            highestWeight.value = probabilities[prop];
        }
    }

    let confidence;
    if (totalWeights > 0) {
        confidence = Math.round((highestWeight.value / totalWeights) * 100);
    } else {
        highestWeight.type = "Unsure";
        confidence = 0;
    }

    return {
        type: highestWeight.type,
        confidence: confidence
    };
}

function scanForInterests(eventData) {
    let tags = [];
    for (let prop in KEYWORDS.Interests) {
        if (KEYWORDS.Interests[prop].test(eventData.name) || KEYWORDS.Interests[prop].test(eventData.description)) {
            tags.push(prop);
        }
    }
    return tags;
}