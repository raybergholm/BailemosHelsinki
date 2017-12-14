"use strict";

const moment = require("../node_modules/moment");
moment.locale("en-GB");

//---------------------------------------------------------------------------//

const QUICK_MESSAGE_KEYWORDS = {
    Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
    GoodMorning: /\b(?:Good morning(!?)|morning!+)\b/i,
    GoodDay: /\bGood day(!?)\b/i,
    GoodEvening: /\b(?:Good evening(!?)|evening!+)\b/i,
    GoodNight: /\b(?:Good night(!?)|night( ?)night(!?))\b/i,
    Info: /\b(?:info|disclaimer)\b/i,
    HelpRequest: /\b(?:help)(?:\b|[!?])|\bhelp [me|please]\b/i,
    OpenQuestion: /\bask\b+something\b/i,
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

module.exports = {
    quickScan: function (text) {
        for (let prop in QUICK_MESSAGE_KEYWORDS) {
            if (QUICK_MESSAGE_KEYWORDS[prop].test(text)) {
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

        let eventTypes = checkForEventTypes(text);
        if (eventTypes) {
            result.eventTypes = eventTypes;
            result.optionals = true;
            result.matched = true;
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

function checkForTemporalCues(text) { // this one is more special because we can only have one date range
    let dateTimeRange = {
        from: null,
        to: null
    };

    let offset;

    // Semantic ranges don't directly reference numbers, so we have to convert it from language actual dates
    for (let prop in MAIN_KEYWORDS.Temporal.SemanticRanges) {
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
            dateTimeRange.from.year(dateTimeRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateTimeRange.to = dateTimeRange.from.clone();
            dateTimeRange.to.endOf("day");

            return dateTimeRange;
        }
    }

    results = MAIN_KEYWORDS.Temporal.Precise.ExactDateRange.exec(text);
    if (results) {
        results = MAIN_KEYWORDS.Temporal.DateLike.exec(results[0]);
        if (results) {
            if (results.length < 2 || !moment(results[0], "DD.MM.YYYY").isValid() || !moment(results[1]).isValid()) {
                console.log("Attempted to use invalid date(s): ", results);
                return null;
            }

            dateTimeRange.from = moment(results[0], "DD.MM.YYYY").startOf("day");
            dateTimeRange.from.year(dateTimeRange.from.month() < moment().month() ? moment().year() : moment().add(1, "year").year());

            dateTimeRange.to = moment(results[1], "DD.MM.YYYY").endOf("day");
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

    for (let prop in MAIN_KEYWORDS.Types) {
        if (MAIN_KEYWORDS.Types[prop].test(text)) {
            eventTypes.push(prop);
        }
    }

    return eventTypes.length > 0 ? eventTypes : null;
}

function checkForInterests(text) {
    let interests = [];

    for (let prop in MAIN_KEYWORDS.Interests) {
        if (MAIN_KEYWORDS.Interests[prop].test(text)) {
            interests.push(prop);
        }
    }

    return interests.length > 0 ? interests : null;
}