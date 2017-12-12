"use strict";

const moment = require("../node_modules/moment");

//---------------------------------------------------------------------------//

const QUICK_ACTION_KEYWORDS = {
    Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
    Info: /\b(?:info|disclaimer)\b/i,
    HelpRequest: /\b(?:help)(?:\b|[!?])|\bhelp [me|please]\b/i,
    Thank: /\b(?:you're a big help|that help(?:s|ed)|good job)(!?)\b/i,
    ReplyToThanks: /\b(?:thank(s?)|thank you|tack|tacktack|kiitos)(!?)\b/i,
    Embarressed: /\b(?:you're cute|good bot)(!?)\b/i,
    Apologise: /\b(?:wtf|you're drunk|wrong|big nope)\b/i
};

const KEYWORDS = { // TODO: worry about localisation later. This could end up requiring a major rewrite of these regexes since \b considers stuff like åäö as word breaks
    Special: {
        SurpriseMe: /\bsurprise me\b/i
    },
    Types: {
        Course: /\b(?:course(s?))\b/i,
        Workshop: /\b(?:workshop(s?))\b/i,
        Party: /\bpart(?:y|ies)\b/i
    },
    Interests: {
        Salsa: /\bsalsa\b/i,
        Bachata: /\bbachata\b/i,
        Kizomba: /\bkizomba\b/i,
        Zouk: /\bzouk\b/i
    },
    Temporal: {
        Days: {
            Monday: /\b(?:monday|mo(n?))\b/i,
            Tuesday: /\b(?:tuesday|tu(e?))\b/i,
            Wednesday: /\b(?:wednesday|we(d?))\b/i,
            Thursday: /\b(?:thursday|th(u?))\b/i,
            Friday: /\b(?:friday|fr(i?))\b/i,
            Saturday: /\b(?:saturday|sa(t?))\b/i,
            Sunday: /\b(?:sunday|su(n?))\b/i
        },
        SemanticRanges: {
            Today: /\b(?:today|tonight)(\??)\b/i,
            Tomorrow: /\btomorrow(\??)\b/i,
            NextSeven: /\b(?:7|seven) days(\??)\b/i,
            ThisWeek: /\bthis week(\??)\b/i,
            ThisWeekend: /\b(?:the|this|upcoming) weekend(\??)\b/i,
            NextWeek: /\bnext week(\??)\b/i,
            NextWeekend: /\bnext weekend(\??)\b/i,
            ThisMonth: /\b(?:this|upcoming) month(\??)\b/i,
            NextMonth: /\bnext month(\??)\b/i
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

module.exports = {
    quickScan: function (text) {
        for (let prop in QUICK_ACTION_KEYWORDS) {
            if (QUICK_ACTION_KEYWORDS[prop].test(text)) {
                return prop;
            }
        }
        return null;
    },

    deepScan: function (text) {
        let result = {};

        let dateTimeRange = checkForTemporalCues(text);
        if (dateTimeRange) {
            result.dateTimeRange = dateTimeRange;
            result.matched = true;
        } else {
            dateTimeRange = this.getDefaultDateRange();
        }

        let interests = checkForInterests(text);
        if (interests) {
            result.interests = interests;
            result.optionals = true;
            result.matched = true;
        }

        return result;
    },

    filterEvents: function (eventsMap, keywords) {
        let matchedKeyword;
        if (keywords.optionals) {
            for (let prop in eventsMap) {
                matchedKeyword = false;

                // Lazy matching: OK it if any keyword matches (TODO: for handling complex cases, may need an entire class for doing the logical connections)
                if (keywords.interests) {
                    for (let i = 0; i < keywords.interests.length; i++) {
                        if (KEYWORDS.Interests[keywords.interests[i]].test(eventsMap[prop].description)) {
                            matchedKeyword = true;
                            break;
                        }
                    }
                }

                // for (let i = 0; i < keywords.locations.length; i++) {
                //     if (KEYWORDS.Locations[keywords.locations[i]].test(eventsMap[prop].description)) {
                //         matchedKeyword = true;
                //         break;
                //     }
                // }

                if (!matchedKeyword) {
                    delete eventsMap[prop];
                }
            }
        }
        return eventsMap;
    },

    getDefaultDateRange: () => {
        return {
            from: moment().startOf("day"),
            to: moment().add(7, "days").endOf("day")
        };
    }
};

function checkForTemporalCues(text) { // this one is more special because we can only have one date range
    let dateTimeRange = {
        from: null,
        to: null
    };

    let offset;

    // Semantic ranges don't directly reference numbers, so we have to convert it from language actual dates
    for (let prop in KEYWORDS.Temporal.SemanticRanges) {
        if (KEYWORDS.Temporal.SemanticRanges[prop].test(text)) {
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
                case "NextSeven":
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
                default:
                    console.log("it matched but didn't match?", prop);
            }
            return dateTimeRange;
        }
    }

    let results;

    results = KEYWORDS.Temporal.Precise.OnExactDate.exec(text);
    if (results) {
        results = KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            if (results.length < 1 || !moment(results[0]).isValid()) {
                console.log("Attempted to use an invalid date: ", results);
                return null;
            }
            dateTimeRange.from = moment(results[0]).startOf("day");
            dateTimeRange.from.year(dateTimeRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateTimeRange.to = dateTimeRange.from.clone();
            dateTimeRange.to.endOf("day");

            return dateTimeRange;
        }
    }

    results = KEYWORDS.Temporal.Precise.ExactDateRange.exec(text);
    if (results) {
        results = KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            if (results.length < 2 || !moment(results[0]).isValid() || !moment(results[1]).isValid()) {
                console.log("Attempted to use invalid date(s): ", results);
                return null;
            };

            dateTimeRange.from = moment(results[0]).startOf("day");
            dateTimeRange.from.year(dateTimeRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateTimeRange.to = moment(results[1]).endOf("day");
            dateTimeRange.to.year(dateTimeRange.from.year());
            if (dateTimeRange.to.month() < dateTimeRange.from.month()) {
                dateTimeRange.to.add(1, "year");
            }

            return dateTimeRange;
        }
    }

    return null;
}

function checkForEventTypes(text) {
    let eventTypes = [];

    for (let prop in KEYWORDS.Types) {
        if (KEYWORDS.Types[prop].test(text)) {
            eventTypes.push(prop);
        }
    }

    return eventTypes.length > 0 ? eventTypes : null;
}

function checkForInterests(text) {
    let interests = [];

    for (let prop in KEYWORDS.Interests) {
        if (KEYWORDS.Interests[prop].test(text)) {
            interests.push(prop);
        }
    }

    return interests.length > 0 ? interests : null;
}