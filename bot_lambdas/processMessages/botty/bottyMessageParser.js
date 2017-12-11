"use strict";

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
            Today: /\b(?:today|tonight)\b/i,
            Monday: /\b(?:monday|mo(n?))\b/i,
            Tuesday: /\b(?:tuesday|tu(e?))\b/i,
            Wednesday: /\b(?:wednesday|we(d?))\b/i,
            Thursday: /\b(?:thursday|th(u?))\b/i,
            Friday: /\b(?:friday|fr(i?))\b/i,
            Saturday: /\b(?:saturday|sa(t?))\b/i,
            Sunday: /\b(?:sunday|su(n?))\b/i
        },
        SemanticRanges: {
            NextSeven: /\b(?:7|seven) days\b/i,
            ThisWeek: /\bthis week\b/i,
            ThisWeekend: /\b(?:the|this|upcoming) weekend\b/i,
            NextWeek: /\bnext week\b/i,
            NextWeekend: /\bnext weekend\b/i,
            ThisMonth: /\b(?:this|upcoming) month\b/i
        },
        Precise: {
            OnExactDate: /\b(?:on) \d{1,2}[./]\d{1,2}/i,
            ExactDateRange: /\d{1,2}[./]\d{1,2}( ?)(?:-|to|until)( ?)\d{1,2}[./]\d{1,2}/i
        }



        // DateLike: /\d{1,2}[./]\d{1,2}/,
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
        var result = {
            dateRange: checkForTemporalCues(text)
        }

        var interests = checkForInterests(text);
        if (interests) {
            result.interests = interests;
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
    }
};

function checkForTemporalCues(text) {
    var dateRange = {
        from: null,
        to: null
    };
    // this one is more special because we can only have one date range
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

//----------------------------------------------------------


function DateTimeSemanticDecoder() { // TODO: to be honest, all of this semantic decoding should be rolled into one class
    this.read = (input, quickAnalysisResults) => {
        var dateTimeRange = {
            from: new Date(),
            to: new Date()
        };

        var monday;
        var friday;
        var sunday;
        var day;
        var month;
        var newFromDate;
        var newToDate;
        var execResults;

        try {
            console.log("moment: ", moment().format("YYYY-MM-DD"));
        } catch (err) {
            console.log("yeah that didn't work: ", err.message);
        }

        if (quickAnalysisResults) {
            // quick shortcuts. FIXME: All of these are dirty hacks, figure out how to upload moment to lambda and use that instead
            if (quickAnalysisResults.temporalMarkers.indexOf("Today") > -1) {
                // do nothing, the initial values are already set to today
            } else if (quickAnalysisResults.temporalMarkers.indexOf("ThisWeek") > -1) {
                while (dateTimeRange.to.getDay() > 0) {
                    dateTimeRange.to.setDate(dateTimeRange.to.getDate() + 1);
                }
            } else if (quickAnalysisResults.temporalMarkers.indexOf("ThisWeekend") > -1) {
                sunday = new Date();
                while (sunday.getDay() > 0) {
                    sunday.setDate(sunday.getDate() + 1);
                }

                friday = new Date(sunday);
                friday.setDate(friday.getDate() - 2);

                dateTimeRange.from = friday;
                dateTimeRange.to = sunday;
            } else if (quickAnalysisResults.temporalMarkers.indexOf("NextWeek") > -1) {
                sunday = new Date();
                while (sunday.getDay() > 0) {
                    sunday.setDate(sunday.getDate() + 1);
                }
                sunday.setDate(sunday.getDate() + 1);
                monday = new Date(sunday);
                while (sunday.getDay() > 0) {
                    sunday.setDate(sunday.getDate() + 1);
                }

                dateTimeRange.from = monday;
                dateTimeRange.to = sunday;
            } else if (quickAnalysisResults.temporalMarkers.indexOf("NextWeekend") > -1) {
                sunday = new Date();
                while (sunday.getDay() > 0) {
                    sunday.setDate(sunday.getDate() + 1);
                }
                sunday.setDate(sunday.getDate() + 1);
                monday = new Date(sunday);
                while (sunday.getDay() > 0) {
                    sunday.setDate(sunday.getDate() + 1);
                }

                friday = new Date(sunday);
                friday.setDate(friday.getDate() - 2);

                dateTimeRange.from = friday;
                dateTimeRange.to = sunday;
            } else if (quickAnalysisResults.temporalMarkers.indexOf("ThisMonth") > -1) {
                dateTimeRange.to.setMonth(dateTimeRange.to.getMonth() + 1);
                dateTimeRange.to.setDate(1);
                dateTimeRange.to.setDate(dateTimeRange.to.getDate() - 1);
            } else {
                // more complex stuff, have to exec regexes

                execResults = KEYWORD_REGEXES.Temporal.OnExactDate.exec(input);
                console.log("OnExactDate regex exec: ", execResults);
                if (execResults !== null) {
                    execResults = KEYWORD_REGEXES.Temporal.DateLike.exec(execResults[0]);
                    console.log("DateLike regex exec: ", execResults);
                    execResults = execResults[0].split(/\.|\//);
                    day = execResults[0];
                    month = execResults[1];

                    // FIXME: serious, get moment.js. There's so many edge cases not covered in this sort of naive implementation
                    dateTimeRange.from.setMonth(month - 1);
                    dateTimeRange.from.setDate(day);


                    dateTimeRange.to = dateTimeRange.from;
                    return dateTimeRange;
                }

                execResults = KEYWORD_REGEXES.Temporal.ExactDateRange.exec(input);
                console.log("ExactDateRange regex exec: ", execResults);
                if (execResults !== null) {
                    execResults = KEYWORD_REGEXES.Temporal.DateLike.exec(execResults[0]);
                    console.log("DateLike regex exec: ", execResults);



                    return dateTimeRange;
                }

                return this.getDefaultRange();
            }
        }
        return dateTimeRange;
    };
    this.getDefaultRange = () => { // from today to today+7
        var dateTimeRange = {
            from: new Date(),
            to: new Date()
        };
        dateTimeRange.to.setDate(dateTimeRange.to.getDate() + 7);

        return dateTimeRange;
    };
}

var dateTimeSemanticDecoder = new DateTimeSemanticDecoder();

const KEYWORD_REGEXES = { // TODO: worry about localisation later. This could end up requiring a major rewrite of these regexes since \b considers stuff like åäö as word breaks
    Special: {
        Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
        Info: /\b(?:info|disclaimer)\b/i,
        HelpRequest: /\b(?:help)(?:\b|[!?])|\bhelp [me|please]\b/i,
        Oops: /\b(?:wtf|you're drunk|wrong)\b/i,
        SurpriseMe: /\bsurprise me\b/i
    },
    Types: {
        Course: /\b(?:course|courses)\b/i,
        Party: /\b(?:party|parties)\b/i
    },
    Interests: {
        Salsa: /\bsalsa\b/i,
        Bachata: /\bbachata\b/i,
        Kizomba: /\bkizomba\b/i,
        Zouk: /\bzouk\b/i
    },
    Temporal: {
        Today: /\b(?:today|tonight)\b/i,
        Monday: /\b(?:monday|mo(n?))\b/i,
        Tuesday: /\b(?:tuesday|tu(e?))\b/i,
        Wednesday: /\b(?:wednesday|we(d?))\b/i,
        Thursday: /\b(?:thursday|th(u?))\b/i,
        Friday: /\b(?:friday|fr(i?))\b/i,
        Saturday: /\b(?:saturday|sa(t?))\b/i,
        Sunday: /\b(?:sunday|su(n?))\b/i,
        ThisWeek: /\bthis week\b/i,
        ThisWeekend: /\b(?:this|upcoming) weekend\b/i,
        NextWeek: /\bnext week\b/i,
        NextWeekend: /\bnext weekend\b/i,
        ThisMonth: /\b(?:this|upcoming) month\b/i,
        DateLike: /\d{1,2}[./]\d{1,2}/,
        TimeLike: /\b(?:\d{1,2}[:]\d{2}|(?:klo) \d{1,2}\.\d{2})\b/,
        FromMarker: /\b(?:from|starting|after)\b/i,
        ToMarker: /\b(?:to|until|before)\b/i,
        OnExactDate: /\b(?:on) \d{1,2}[./]\d{1,2}/i,
        ExactDateRange: /\d{1,2}[./]\d{1,2}( ?)(?:-|to|until)( ?)\d{1,2}[./]\d{1,2}/i,
    }
};