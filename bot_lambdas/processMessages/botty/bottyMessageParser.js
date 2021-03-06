"use strict";

const moment = require("../node_modules/moment");

const utils = require("../utils/dateTimeUtils");

//---------------------------------------------------------------------------//

const QUICK_MESSAGE_KEYWORDS = {
    Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
    GoodMorning: /\b(?:Good morning(!?)|morning!+)\b/i,
    GoodDay: /\bGood day(!?)\b/i,
    GoodEvening: /\b(?:Good evening(!?)|evening!+)\b/i,
    GoodNight: /\b(?:Good night(!?)|night( ?)night(!?))\b/i,
    // Info: /\b(?:info|disclaimer)\b/i,
    HelpRequest: /(?:\bhelp\b|^\?$)/i,
    UserGuide: /\b(?:guide|manual)\b/i,
    OpenQuestion: /\bask\b.+\byou\b.+\bsomething\b/i,
    Thank: /\b(?:you're a big help|nice (?::\)|:D|one)|that help(?:s|ed)|good (?:job|work))(!?)\b/i,
    ReplyToThanks: /\b(?:thank(s?)|thank you|tack|tacktack|kiitos)(!?)\b/i,
    Embarressed: /\b(?:good bot)(!?)\b/i,
    Apologise: /\b(?:wtf|you're drunk|wrong|big nope)\b/i
};

const MAIN_KEYWORDS = { // TODO: worry about localisation later. This could end up requiring a major rewrite of these regexes since \b considers stuff like åäö as word breaks
    Special: {
        SurpriseMe: /\bsurprise me\b/i
    },
    Types: {
        Course: /\b(?:course(?:s?)|(?:tiivis?)kurssi(t?)|lesson(?:s?)|boot(?: ?)camp|leiri(?:t?))\b/i,
        Workshop: /\b(?:workshop(?:s?)|työpaja(?:t?))\b/i,
        Party: /\b(?:part(?:y|ies)|fiesta|show|bash|get(?: ?)together(?:s?)|juhla(?:t?))\b/i,
        Festival: /\b(?:festival(?:s?)|festivaali(?:t?))\b/i,
    },
    Interests: {
        Salsa: /\bsalsa\b/i,
        Bachata: /\bbachata\b/i,
        Kizomba: /\bkizomba\b/i,
        Zouk: /\bzouk\b/i
    },
    Temporal: {
        WeekdayNames: {
            Monday: /\b(?:monday|mo(n?))\b/i,
            Tuesday: /\b(?:tuesday|tu(e?))\b/i,
            Wednesday: /\b(?:wednesday|we(d?))\b/i,
            Thursday: /\b(?:thursday|th(u?))\b/i,
            Friday: /\b(?:friday|fr(i?))\b/i,
            Saturday: /\b(?:saturday|sa(t?))\b/i,
            Sunday: /\b(?:sunday|su(n?))\b/i
        },
        MonthNames: {
            January: /\bjan(uary?)\b/i,
            February: /\bfeb(ruary?)\b/i,
            March: /\bmar(ch?)\b/i,
            April: /\bapr(il?)\b/i,
            May: /\bmay\b/i,
            June: /\bjun(e?)\b/i,
            July: /\bjul(y?)\b/i,
            August: /\baug(ust?)\b/i,
            September: /\bsep(tember?)\b/i,
            October: /\boct(ober?)\b/i,
            November: /\bnov(ember?)\b/i,
            December: /\bdec(ember?)\b/i,
        },
        SemanticRanges: {
            Today: /\b(?:today|tonight)(\??)\b/i,
            Tomorrow: /\btomorrow(\??)\b/i,
            OneWeek: /\b(?:7|seven) days(\??)\b/i,
            ThisWeek: /\bthis week(\??)\b/i,
            ThisWeekend: /\b(?:the|this|upcoming) weekend(\??)\b/i,
            NextWeek: /\bnext week(\??)\b/i,
            NextWeekend: /\bnext weekend(\??)\b/i,
            ThisMonth: /\b(?:this|upcoming) month(\??)\b/i,
            NextMonth: /\bnext month(\??)\b/i,
            ThisYear: /\bthis year(\??)\b/i,
            NextYear: /\bnext year(\??)\b/i
        },
        Precise: {
            OnExactDate: /\b(?:on) \d{1,2}[./]\d{1,2}/i,
            ExactDateRange: /\d{1,2}[./]\d{1,2}(?: ?)(?:-|to|until)(?: ?)\d{1,2}[./]\d{1,2}/i
        },

        DateLike: /\d{1,2}[./]\d{1,2}(?:(?:[./]\d{4})?)/
        // TimeLike: /\b(?:\d{1,2}[:]\d{2}|(?:klo) \d{1,2}\.\d{2})\b/,
        // FromMarker: /\b(?:from|starting|after)\b/i,
        // ToMarker: /\b(?:to|until|before)\b/i

    }
};

/*
    FIXME: The eventual goal of this module is to offload as much of the parsing logic to wit.ai as possible and 
    use custom parsing only as a fallback, as it's going to be ineffective Reinventing The Wheel otherwise.
*/

module.exports = {
    parseBuiltinNlp: (entries) => {
        const CONFIDENCE_THRESHOLD = 0.9;
        const result = new Map(),
            dateTimeResults = new Set(),
            interestResults = new Set(),
            eventTypeResults = new Set(),
            locationResults = new Set();

        for (let prop in entries) {
            entries[prop].map((item) => {
                if (item.confidence > CONFIDENCE_THRESHOLD) {
                    switch (prop) {
                        case "greetings":
                        case "helpRequest": // TODO: needs wit.ai integration for this to become functional
                        case "userGuide": // TODO: needs wit.ai integration for this to become functional
                            result.set(prop, true);
                            break;
                        case "datetime":
                            dateTimeResults.add(parseNlpDateTime(item));
                            break;
                        case "interests":
                            interestResults.add(parseNlpInterests(item));
                            break;
                        case "eventTypes":
                            eventTypeResults.add(parseNlpEventTypes(item));
                            break;
                        case "location":
                            locationResults.add(parseNlpLocations(item));
                            break;
                    }
                }
            });
        }

        if (dateTimeResults.size > 0) {
            result.set("datetime", dateTimeResults);
        }
        if (interestResults.size > 0) {
            result.set("interests", interestResults);
        }
        if (eventTypeResults.size > 0) {
            result.set("eventTypes", eventTypeResults);
        }
        if (locationResults.size > 0) {
            result.set("locations", locationResults);
        }

        return result.size > 0 ? result : null;
    },

    quickScan: (text) => {
        for (const prop in QUICK_MESSAGE_KEYWORDS) {
            if (QUICK_MESSAGE_KEYWORDS[prop].test(text)) {
                return prop;
            }
        }
        return null;
    },

    deepScan: function (text, nlp) {
        const result = {};

        if (nlp) {
            const dateTimes = nlp.get("datetime");
            if (dateTimes) {
                result.dateTimeRange = Array.from(dateTimes);
                result.matched = true;
            } else {
                result.dateTimeRange = module.exports.getDefaultDateRange();
            }

            const interests = nlp.get("interests");
            if (interests) {
                result.interests = Array.from(interests);
                result.matched = true;
            }

            const eventTypes = nlp.get("eventTypes");
            if (eventTypes) {
                result.eventTypes = Array.from(eventTypes);
                result.matched = true;
            }

            const locations = nlp.get("locations");
            if (locations) {
                result.locations = Array.from(locations);
                result.matched = true;
            }
        }

        console.log("[DEBUG] results after NLP:", result);

        // Generic custom parsing for fallback purposes: not really efficient, aim to deprecate
        if (!result.dateTimeRange) {
            const dateTimeRange = checkForTemporalCues(text);
            if (dateTimeRange) {
                result.dateTimeRange = dateTimeRange;
                result.matched = true;
            } else {
                result.dateTimeRange = module.exports.getDefaultDateRange();
            }
        }

        if (!result.interests) {
            const interests = checkForInterests(text);
            if (interests) {
                result.interests = interests;
                result.optionals = true;
                result.matched = true;
            }
        }

        if (!result.eventTypes) {
            const eventTypes = checkForEventTypes(text);
            if (eventTypes) {
                result.eventTypes = eventTypes;
                result.optionals = true;
                result.matched = true;
            }
        }

        return result;
    },

    getDefaultDateRange: () => {
        return {
            from: moment().startOf("day"),
            to: moment().add(7, "days").endOf("day")
        };
    }
};

function parseNlpDateTime(entry) {
    let result = null;

    // I don't like having to do a bunch of inline timezone corrections, but due to the nature of the way timestamp parsing
    // currently works, the server will always get incorrect intervals if there's any timezone offsets at all. Also, this method
    // fixes the week interval to use Monday instead of defaulting to US standards: we're not in the US so no reason to use US weeks
    const intervalParser = (from, to) => {
        const createDefaultInterval = () => {
            return {
                value: (new Date()).toISOString(),
                grain: "day"
            };
        };

        if (!from) {
            from = createDefaultInterval();
        }
        if (!to) {
            to = createDefaultInterval();
        }

        return {
            from: (() => {
                const correctedMoment = utils.parse(from.value);
                return correctedMoment.startOf(from.grain === "week" ? "isoWeek" : from.grain);
            })(),
            to: (() => {
                const correctedMoment = utils.parse(to.value);
                return correctedMoment.endOf(from.grain === "week" ? "isoWeek" : from.grain);
            })()
        };
    };

    switch (entry.type) {
        case "interval":
            result = intervalParser(entry.from, entry.to);
            break;
        case "value":
            result = intervalParser(entry, entry);
            break;
    }

    return result;
}

function parseNlpEventTypes(entry) {
    const result = null;
    // TODO: needs wit.ai integration
    return result;
}

function parseNlpInterests(entry) {
    const result = null;
    // TODO: needs wit.ai integration
    return result;
}

function parseNlpLocations(entry) {
    const result = null;
    // TODO: needs wit.ai integration
    return result;
}

// TODO: integrate wit.ai & train it well enough that everything below this line can be dumped, use the NLP versions above instead

function checkForTemporalCues(text) { // this one is more special because we can only have one date range
    let result;

    result = scanForSemanticDates(text);
    if (result) {
        return result;
    }

    result = scanForSemanticDateRanges(text);
    if (result) {
        return result;
    }

    result = scanForExactDateRanges(text);
    if (result) {
        return result;
    }

    return null;
}

function scanForSemanticDates(text) {
    const dateTimeRange = {
        from: null,
        to: null
    };

    let source, target, offset;

    // TODO: currently only handles one day, but most likely will need to handle ranges
    for (const prop in MAIN_KEYWORDS.Temporal.WeekdayNames) {
        if (MAIN_KEYWORDS.Temporal.WeekdayNames[prop].test(text)) {
            switch (prop) {
                case "Monday":
                    target = 1;
                    break;
                case "Tuesday":
                    target = 2;
                    break;
                case "Wednesday":
                    target = 3;
                    break;
                case "Thursday":
                    target = 4;
                    break;
                case "Friday":
                    target = 5;
                    break;
                case "Saturday":
                    target = 6;
                    break;
                case "Sunday":
                    target = 0;
                    break;
            }

            dateTimeRange.from = moment();

            source = dateTimeRange.from.day();
            if (source < target) {
                offset = target - source;
            } else {
                offset = 7 - (source - target);
            }

            dateTimeRange.from.add(offset, "days");
            dateTimeRange.from.startOf("day");

            dateTimeRange.to = dateTimeRange.from.clone();
            dateTimeRange.to.endOf("day");

            return dateTimeRange;
        }
    }

    for (const prop in MAIN_KEYWORDS.Temporal.MonthNames) {
        if (MAIN_KEYWORDS.Temporal.MonthNames[prop].test(text)) {
            switch (prop) {
                case "January":
                    target = 0;
                    break;
                case "February":
                    target = 1;
                    break;
                case "March":
                    target = 2;
                    break;
                case "April":
                    target = 3;
                    break;
                case "May":
                    target = 4;
                    break;
                case "June":
                    target = 5;
                    break;
                case "July":
                    target = 6;
                    break;
                case "August":
                    target = 7;
                    break;
                case "September":
                    target = 8;
                    break;
                case "October":
                    target = 9;
                    break;
                case "November":
                    target = 10;
                    break;
                case "December":
                    target = 11;
                    break;
            }

            dateTimeRange.from = moment();

            source = dateTimeRange.from.month();
            if (source < target) {
                offset = target - source;
            } else if (source > target) {
                offset = 12 - (source - target);
            } else {
                offset = 0;
            }

            dateTimeRange.from.add(offset, "months");
            dateTimeRange.from.startOf("month");

            dateTimeRange.to = dateTimeRange.from.clone();
            dateTimeRange.to.endOf("month");

            return dateTimeRange;
        }
    }

    return null;
}

function scanForSemanticDateRanges(text) {
    const dateTimeRange = {
        from: null,
        to: null
    };

    let offset;

    // Semantic ranges don't directly reference numbers, so we have to convert it from language actual dates
    for (const prop in MAIN_KEYWORDS.Temporal.SemanticRanges) {
        if (MAIN_KEYWORDS.Temporal.SemanticRanges[prop].test(text)) {
            switch (prop) {
                case "Today":
                    dateTimeRange.from = moment().startOf("day");
                    dateTimeRange.to = moment().endOf("day");
                    break;
                case "Tomorrow":
                    dateTimeRange.from = moment().add(1, "day").startOf("day");
                    dateTimeRange.to = moment().add(1, "day").endOf("day");
                    break;
                case "ThisWeek":
                    dateTimeRange.from = moment().startOf("day");
                    dateTimeRange.to = moment().endOf("isoWeek");
                    break;
                case "ThisWeekend": // Friday to Sunday (parties are traditionally mostly on Friday & Saturday so Friday evening counts as weekend too)
                    offset = 5 - moment().isoWeekday();
                    dateTimeRange.from = moment().add(offset, "days").startOf("day");
                    dateTimeRange.to = moment().endOf("isoWeek");
                    break;
                case "OneWeek":
                    dateTimeRange.from = moment().startOf("day");
                    dateTimeRange.to = moment().add(7, "days").endOf("day");
                    break;
                case "NextWeek":
                    dateTimeRange.from = moment().add(7, "days").startOf("isoWeek");
                    dateTimeRange.to = moment().add(7, "days").endOf("isoWeek");
                    break;
                case "NextWeekend":
                    offset = 5 - moment().isoWeekday();
                    dateTimeRange.from = moment().add(7 + offset, "days").startOf("day");
                    dateTimeRange.to = moment().add(7, "days").endOf("isoWeek");
                    break;
                case "ThisMonth":
                    dateTimeRange.from = moment().startOf("day");
                    dateTimeRange.to = moment().endOf("month");
                    break;
                case "NextMonth":
                    dateTimeRange.from = moment().add(1, "month").startOf("month");
                    dateTimeRange.to = moment().add(1, "month").endOf("month");
                    break;
                case "ThisYear":
                    dateTimeRange.from = moment().startOf("day");
                    dateTimeRange.to = moment().endOf("year");
                    break;
                case "NextYear":
                    dateTimeRange.from = moment().add(1, "year").startOf("year");
                    dateTimeRange.to = moment().add(1, "year").endOf("year");
                    break;
                default:
                    console.log("it matched but didn't match?", prop);
            }
            return dateTimeRange;
        }
    }
    return null;
}

function scanForExactDateRanges(text) {
    const dateTimeRange = {
        from: null,
        to: null
    };

    let results;

    results = MAIN_KEYWORDS.Temporal.Precise.OnExactDate.exec(text);
    if (results) {
        results = MAIN_KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            if (results.length < 1 || !moment(results[0], "DD.MM.YYYY").isValid()) {
                console.log("Attempted to use an invalid date: ", results);
                return null;
            }
            dateTimeRange.from = moment(results[0], "DD.MM.YYYY").startOf("day");
            dateTimeRange.from.year(moment().year());
            if (dateTimeRange.from < moment()) {
                dateTimeRange.from.add(1, "year");
            }

            dateTimeRange.to = dateTimeRange.from.clone();
            dateTimeRange.to.endOf("day");

            return dateTimeRange;
        }
    }

    results = MAIN_KEYWORDS.Temporal.Precise.ExactDateRange.exec(text);
    if (results) {
        let dates = results[0];
        dates = dates.replace(" ", "");
        dates = dates.replace(/to|until/g, "-");
        results = dates.split("-");

        if (results) {
            if (results.length < 2 || !moment(results[0], "DD.MM.YYYY").isValid() || !moment(results[1], "DD.MM.YYYY").isValid()) {
                console.log("Attempted to use invalid date(s): ", results);
                return null;
            }

            dateTimeRange.from = moment(results[0], "DD.MM.YYYY").startOf("day");
            dateTimeRange.from.year(moment().year());
            if (dateTimeRange.from < moment()) {
                dateTimeRange.from.add(1, "year");
            }

            dateTimeRange.to = moment(results[1], "DD.MM.YYYY").endOf("day");
            dateTimeRange.to.year(dateTimeRange.from.year());
            if (dateTimeRange.to < dateTimeRange.from) {
                dateTimeRange.to.add(1, "year");
            }

            return dateTimeRange;
        }
    }
}

function checkForEventTypes(text) {
    const eventTypes = [];

    for (const prop in MAIN_KEYWORDS.Types) {
        if (MAIN_KEYWORDS.Types[prop].test(text)) {
            eventTypes.push(prop);
        }
    }

    return eventTypes.length > 0 ? eventTypes : null;
}

function checkForInterests(text) {
    const interests = [];

    for (const prop in MAIN_KEYWORDS.Interests) {
        if (MAIN_KEYWORDS.Interests[prop].test(text)) {
            interests.push(prop);
        }
    }

    return interests.length > 0 ? interests : null;
}