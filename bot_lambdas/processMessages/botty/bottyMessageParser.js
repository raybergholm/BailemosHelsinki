"use strict";

var moment = require("../node_modules/moment");

const QUICK_ACTION_KEYWORDS = {
    Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
    Info: /\b(?:info|disclaimer)\b/i,
    HelpRequest: /\b(?:help)(?:\b|[!?])|\bhelp [me|please]\b/i,
    Oops: /\b(?:wtf|you're drunk|wrong)\b/i
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

        DateLike: /\d{1,2}[./]\d{1,2}(?:\d{2,4}?)/
        // TimeLike: /\b(?:\d{1,2}[:]\d{2}|(?:klo) \d{1,2}\.\d{2})\b/,
        // FromMarker: /\b(?:from|starting|after)\b/i,
        // ToMarker: /\b(?:to|until|before)\b/i

    }
};

module.exports = {
    quickScan: function (text) {
        for (var prop in QUICK_ACTION_KEYWORDS) {
            if (QUICK_ACTION_KEYWORDS[prop].test(text)) {
                return prop;
            }
        }
        return null;
    },

    deepScan: function (text) {
        var result = {};

        var dateRange = checkForTemporalCues(text);
        if (dateRange) {
            result.dateRange = dateRange;
            result.matched = true;
        }

        var interests = checkForInterests(text);
        if (interests) {
            result.interests = interests;
            result.matched = true;
        }
        return result;
    },

    filterEvents: function (eventsMap, keywords) {
        var i;
        var matchedKeyword;
        if (keywords.interests.length > 0 || keywords.locations > 0) {
            for (var prop in eventsMap) {
                matchedKeyword = false;

                // Lazy matching: OK it if any keyword matches (TODO: for handling complex cases, may need an entire class for doing the logical connections)
                for (i = 0; i < keywords.interests.length; i++) {
                    if (KEYWORDS.Interests[keywords.interests[i]].test(eventsMap[prop].description)) {
                        matchedKeyword = true;
                        break;
                    }
                }

                // for (i = 0; i < keywords.locations.length; i++) {
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
    var dateRange = {
        from: null,
        to: null
    };

    var results;
    var offset;

    // Semantic ranges don't directly reference numbers, so we have to convert it from language actual dates
    for (var prop in KEYWORDS.Temporal.SemanticRanges) {
        if (KEYWORDS.Temporal.SemanticRanges[prop]) {
            switch (KEYWORDS.Temporal.SemanticRanges[prop]) {
                case "Today":
                    dateRange.from = moment().startOf("day");
                    dateRange.to = moment().endOf("day");
                    break;
                case "Tomorrow":
                    dateRange.from = moment().add(1, "day").startOf("day");
                    dateRange.to = moment().add(1, "day").endOf("day");
                    break;
                case "ThisWeek":
                    dateRange.from = moment().startOf("days");
                    dateRange.to = moment().endOf("isoWeek");
                    break;
                case "ThisWeekend":
                    offset = 5 - moment().isoWeekday();
                    dateRange.from = moment().add(offset, "days").startOf("day");
                    dateRange.to = moment().endOf("isoWeek");
                    break;
                case "NextSeven":
                    dateRange.from = moment().startOf("day");
                    dateRange.to = moment().add(7, "days").endOf("day");
                    break;
                case "NextWeek":
                    dateRange.from = moment().add(7, "days").startOf("isoWeek");
                    dateRange.to = moment().add(7, "days").endOf("isoWeek");
                    break;
                case "NextWeekend":
                    offset = 5 - moment().isoWeekday();
                    dateRange.from = moment().add(7 + offset, "days").startOf("day");
                    dateRange.to = moment().add(7, "days").endOf("isoWeek");
                    break;
                case "ThisMonth":
                    dateRange.from = moment().startOf("day");
                    dateRange.to = moment().endOf("month");
                    break;
                case "NextMonth":
                    dateRange.from = moment().add(1, "month").startOf("month");
                    dateRange.to = moment().endOf("month");
                    break;
            }
            console.log("dateRange inside parser:", dateRange);
            return dateRange;
        }
    }

    // FIXME: datelike is behaving strangely and can't quite catch dd.mm, and dd.mm.yyyy becomes dd.mm.yy

    results = KEYWORDS.Temporal.Precise.OnExactDate(text);
    if (results) {
        results = KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            dateRange.from = moment(results[0]).startOf("day");
            dateRange.from.year(dateRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateRange.to = dateRange.from.clone();
            dateRange.to.endOf("day");

            console.log("dateRange inside parser:", dateRange);
            return dateRange;
        }
    }

    results = KEYWORDS.Temporal.Precise.ExactDateRange(text);
    if (results) {
        results = KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            dateRange.from = moment(results[0]).startOf("day");
            dateRange.from.year(dateRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateRange.to = moment(results[1]).endOf("day");
            dateRange.to.year(dateRange.from.year());
            if (dateRange.to.month() < dateRange.from.month()) {
                dateRange.to.add(1, "year");
            }

            console.log("dateRange inside parser:", dateRange);
            return dateRange;
        }
    }

    return null;
}

function checkForEventTypes(text) {
    var eventTypes = [];

    for (var prop in KEYWORDS.Types) {
        if (KEYWORDS.Types[prop].test(text)) {
            eventTypes.push(prop);
        }
    }

    return eventTypes;
}

function checkForInterests(text) {
    var interests = [];

    for (var prop in KEYWORDS.Interests) {
        if (KEYWORDS.Interests[prop].test(text)) {
            interests.push(prop);
        }
    }

    return interests.length > 0 ? interests : null;
}