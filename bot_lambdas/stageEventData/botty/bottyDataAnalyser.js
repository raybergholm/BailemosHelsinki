"use strict";

const utils = require("../utils/dateTimeUtils");

const textAnalyser = require("./TextAnalyser");

//---------------------------------------------------------------------------//

const INTEREST_KEYWORDS = {
    Salsa: /\bsalsa(?:a?)\b/i,
    Bachata: /\bbachata(?:a?)\b/i,
    Kizomba: /\bkizomba(?:a?)\b/i,
    Zouk: /\b(brazilian ?)zouk|lambazouk\b/i
};

const TYPE_KEYWORDS = {
    // NB: This is it's own thing because it's often common to both courses and festivals, so if this turns up it's probably not a party, but by itself it can't tell the difference between course/festival
    Workshop: /\b(?:workshop(?:s?)|työpaja(?:t?))\b/i,
    Course: /\b(?:course(?:s?)|(?:tiivis?)kurssi(t?)|lesson(?:s?)|boot(?: ?)camp|leiri(?:t?))\b/i, // NOTE: don't include "teaching" or "opetus", it has a habit of appearing everywhere, pretty meaningless in this context
    CourseTerminology: /\b(?:novice(?:s?)|alkeet|beginner(?:s?)|improver(?:s?)|advanced|ladie(?:'?)s styling)\b/i, // these words are nearly always massive indicators that this is a course and nothing else 
    Festival: /\b(?:festival(?:s?)|festivaali(?:t?))\b/i,
    // NB: annoyingly enough, a "party" might be found connected to any of the above! Usually the best hint that this isn't a workshop/course/festival is the event duration. Still, it can affect the confidence level of which category it should be in
    Party: /\b(?:part(?:y|ies)|fiesta|show|bash|get(?: ?)together(?:s?)|juhla(?:t?))\b/i // actually, "fiesta" might be dangerous here since a spanish event may use it to mean a lot of things...
};

const EVENT_TITLE_WEIGHTS = {
    Workshop: 100,
    Course: 100,
    CourseTerminology: 100,
    Festival: 100,
    Party: 100
};

const EVENT_DESC_WEIGHTS = {
    Workshop: 1,
    Course: 1,
    CourseTerminology: 1,
    Festival: 1,
    Party: 1
};

module.exports = {
    analyseEvent: (eventData) => {
        const result = {};

        result.type = guessEventType(eventData);
        result.interestTags = scanForInterests(eventData);

        result.timezoneOffset = utils.parseTimezoneOffset(eventData.start_time);

        return result;
    }
};

function guessEventType(eventData) {
    const weights = {
        Workshop: 0,
        Course: 0,
        CourseTerminology: 0,
        Festival: 0,
        Party: 0
    };

    let result;

    result = textAnalyser.analyse(eventData.name, TYPE_KEYWORDS, EVENT_TITLE_WEIGHTS);
    if (result) {
        for (const prop in weights) {
            weights[prop] += result[prop] ? result[prop] : 0;
        }
    }

    result = textAnalyser.analyse(eventData.description, TYPE_KEYWORDS, EVENT_DESC_WEIGHTS);
    if (result) {
        for (const prop in weights) {
            weights[prop] += result[prop] ? result[prop] : 0;
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

    const probabilities = {
        Party: weights.Party * 15,
        Workshop: weights.Workshop * 30 + weights.Party + weights.Course,
        Course: weights.Course * 10 + weights.CourseTerminology * 100,
        Festival: weights.Festival * 20 + weights.Party + weights.Workshop
    };

    let totalWeights = 0;
    const highestWeight = {
        type: "",
        value: 0
    };

    for (const prop in probabilities) {
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
        name: highestWeight.type,
        confidence: confidence
    };
}

function scanForInterests(eventData) {
    return textAnalyser.find([eventData.name, eventData.description], INTEREST_KEYWORDS);
}