"use strict";

//---------------------------------------------------------------------------//
// Built-in modules
var moment = require("moment");
//---------------------------------------------------------------------------//

//---------------------------------------------------------------------------//
// Custom modules

var facebookRequestVerifier = require("./facebook/facebookRequestVerifier");
var facebookMessageInterface = require("./facebook/facebookMessageInterface");

var dataStagingInterface = require("./dataStagingInterface");

var botty = require("./botty/botty");

//---------------------------------------------------------------------------//

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

exports.handler = (event, context, callback) => {
    if (!facebookRequestVerifier.verifySignature(event.headers['X-Hub-Signature'])) {
        console.log("X-Hub_Signature did not match the expected value");
        // return;  TODO: allow it to pass for now, debug it later
    }

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    if (event.httpMethod === "POST") {
        var data = JSON.parse(event.body);
        if (data) {
            // Make sure this is a page subscription
            if (data.object === "page") {

                // Iterate over each entry - there may be multiple if batched
                data.entry.forEach(function (entry) {
                    // var pageID = entry.id;
                    // var timeOfEvent = entry.time;
                    // Iterate over each messaging event
                    entry.messaging.forEach(function (msg) {
                        if (msg.message) {
                            // Normal message
                            handleReceivedMessage(msg);
                        } else if (msg.delivery) {
                            handleDeliveryReceipt(msg);
                        } else if (msg.read) {
                            handleReadReceipt(msg);
                        } else {
                            console.log("Webhook received unknown event with data: ", msg);
                        }
                    });
                });
            } else {
                console.log("Something went wrong, expected 'page', got '" + data.object + "'");
            }
        } else {
            console.log("POST request body was null");
        }

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.

        // TODO: Check if it's ok if the response can be generated & returned at the end, this lambda should execute fast enough

        console.log("Responding with a 200 OK");

        response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: "OK"
        };
    }

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function handleReceivedMessage(receivedMessage) {
    var senderId = receivedMessage.sender.id;

    var recipientId = receivedMessage.recipient.id;
    var timeOfMessage = receivedMessage.timestamp;
    var messageData = receivedMessage.message;

    console.log("entire message data structure: ", receivedMessage);

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    console.log("Message data: ", messageData);

    // var messageId = messageData.mid;
    var messageText = messageData.text;
    var messageAttachments = messageData.attachments;

    botty.setConversationTarget(senderId);
    // botty.readMessage(messageText, messageAttachments); // TODO: let botty kick off the rest

    if (messageText) {
        if (!findSpecialTexts(messageText)) {
            var result = analyseMessage(messageText);
            generateResponse(result);
        }
    }
}

function findSpecialTexts(text) {
    var i, botTexts, message;

    for (var prop in KEYWORD_REGEXES.Special) {
        if (KEYWORD_REGEXES.Special[prop].test(text)) {
            switch (prop) {
                case "Greetings":
                    facebookMessageInterface.sendMessage({
                        text: botty.greet()
                    });
                    break;
                case "Info":
                    botTexts = botty.giveDisclaimer();
                    for (i = 0; i < botTexts.length; i++) {
                        facebookMessageInterface.sendMessage({
                            text: botTexts[i]
                        });
                    }
                    break;
                case "HelpRequest":
                    botTexts = botty.giveUserHelp();
                    for (i = 0; i < botTexts.length; i++) {
                        facebookMessageInterface.sendMessage({
                            text: botTexts[i]
                        });
                    }
                    break;
                case "Oops":
                facebookMessageInterface.sendMessage({
                    text: botty.greet()
                });
                    break;
            }
            return true;
        }
    }
    return false;
}

function analyseMessage(text) {
    // TODO: this is probably going to be a big janky mess for a long time since text analysis is going to be complex
    var result = {
        originalText: text,
        language: analyseLanguage(text),
        eventType: findEventTypeKeywords(text),
        temporalMarkers: findTemporalKeywords(text),
        locations: findLocationKeywords(text),
        interests: findInterestKeywords(text)
    };

    return result;
}

function analyseLanguage(text) {
    var language;

    language = "en"; // TODO: hardcode english for now, can worry about other langs later

    return language;
}

function findEventTypeKeywords(text) {
    var eventTypes = [];

    for (var prop in KEYWORD_REGEXES.Types) {
        if (KEYWORD_REGEXES.Types[prop].test(text)) {
            eventTypes.push(prop);
        }
    }

    return eventTypes;
}

function findTemporalKeywords(text) {
    var temporalMarkers = [];

    for (var prop in KEYWORD_REGEXES.Temporal) {
        if (KEYWORD_REGEXES.Temporal[prop].test(text)) {
            temporalMarkers.push(prop);
        }
    }

    return temporalMarkers;
}

function findLocationKeywords(text) {
    var locations = [];

    return locations;
}

function findInterestKeywords(text) {
    var interests = [];

    for (var prop in KEYWORD_REGEXES.Interests) {
        if (KEYWORD_REGEXES.Interests[prop].test(text)) {
            interests.push(prop);
        }
    }

    return interests;
}

function generateResponse(analysisResults) {
    var message;
    if (analysisResults.eventType.length === 0 && analysisResults.temporalMarkers.length === 0 && analysisResults.locations.length === 0 && analysisResults.interests.length === 0) {
        // found absolutely nothing
        facebookMessageInterface.sendMessage({
            text: botty.beUncertain()
        });
    } else {
        console.log("analysis picked up these keywords: ", analysisResults);

        var responseText = "I detected the following keywords: ";
        var keywords = [];
        analysisResults.eventType.forEach((elem) => {
            keywords.push(elem);
        });
        analysisResults.temporalMarkers.forEach((elem) => {
            keywords.push(elem);
        });
        analysisResults.interests.forEach((elem) => {
            keywords.push(elem);
        });

        facebookMessageInterface.sendMessage({
            text: responseText + keywords.join(', ')
        });

        // Filter staged events by keywords
        var callback = function (stagedData) {
            var organisers = stagedData.organisers;
            var filterMap = {};

            var dateTimeRange;

            console.log("before filtering: " + stagedData.events.length + " events");

            if (analysisResults.temporalMarkers && analysisResults.temporalMarkers.length > 0) {
                dateTimeRange = dateTimeSemanticDecoder.read(analysisResults.originalText, analysisResults);
            } else {
                // default
                dateTimeRange = dateTimeSemanticDecoder.getDefaultRange();
            }

            console.log(dateTimeRange);

            // Filter by datetime: this is the only mandatory filter so build the whitelist from everything within the time range
            stagedData.events.forEach((eventData) => {
                // TODO: filter by datetime range. Mandatory filter, can't pass everything to the end-user all at once anyway

                if (eventData.start_time.getTime() > dateTimeRange.from.getTime() && eventData.end_time.getTime() < dateTimeRange.to.getTime()) {
                    filterMap[eventData.id] = eventData;
                }
            });

            console.log("after temporal filtering: " + Object.keys(filterMap).length + " events");

            var i;
            var matchedKeyword;

            // Start throwing out things which don't fit the rest of the keywords
            if (analysisResults.interests.length > 0 || analysisResults.locations > 0) {
                for (var prop in filterMap) {
                    matchedKeyword = false;

                    // Lazy match: OK it if any keyword matches (TODO: for handling complex cases, may need an entire class for doing the logical connections)
                    for (i = 0; i < analysisResults.interests.length; i++) {
                        if (KEYWORD_REGEXES.Interests[analysisResults.interests[i]].test(filterMap[prop].description)) {
                            matchedKeyword = true;
                            break;
                        }
                    }

                    for (i = 0; i < analysisResults.locations.length; i++) {
                        if (KEYWORD_REGEXES.Locations[analysisResults.locations[i]].test(filterMap[prop].description)) {
                            matchedKeyword = true;
                            break;
                        }
                    }

                    if (!matchedKeyword) {
                        delete filterMap[prop];
                    }
                }
            }

            console.log("after all filtering: " + Object.keys(filterMap).length + " events");

            // Convert back to an array
            var filteredEvents = Object.keys(filterMap).map((id) => {
                return filterMap[id];
            });

            // Sort array by ascending time
            filteredEvents.sort((left, right) => {
                if (!left.start_time.getTime() === right.start_time.getTime()) {
                    return 0;
                } else {
                    return left.start_time.getTime() < right.start_time.getTime() ? -1 : 1;
                }
            });

            postFilteredEvents(filteredEvents, dateTimeRange);
        };

        dataStagingInterface.getEventData(callback);
    }
}

function postFilteredEvents(filteredEvents, dateTimeRange) {
    var elements = [];

    if (filteredEvents.length > 0) {
        filteredEvents.forEach((eventData) => {
            var subtitleString = "";
            var coverImageUrl = null;

            // TODO: can I just get moment.js in here to do this?
            var fillLeadingZero = function (value) {
                return value < 10 ? "0" + value : value;
            };

            subtitleString += fillLeadingZero(eventData.start_time.getDate()) + '.' + fillLeadingZero(eventData.start_time.getMonth() + 1) + ' ' + fillLeadingZero(eventData.start_time.getHours()) + ':' + fillLeadingZero(eventData.start_time.getMinutes());
            try {
                if (eventData.place) {
                    subtitleString += "\n" + eventData.place.name;
                    if (eventData.place.location) {
                        subtitleString += "\n" + eventData.place.location.street + ", " + eventData.place.location.city;
                    }
                }
            } catch (err) {
                console.log("Error trying to write the location: ", err.message);
            }

            if (eventData.attending_count) {
                subtitleString += "\n " + eventData.attending_count + " people attending";
            }

            if (eventData.cover && eventData.cover.source) {
                coverImageUrl = eventData.cover.source;
            }

            elements.push({
                title: eventData.name,
                subtitle: subtitleString,
                imageUrl: coverImageUrl,
                actionUrl: "https://www.facebook.com/events/" + eventData.id
            });
        });
    }

    var bottyText = botty.replyWithResults(filteredEvents.length, moment(dateTimeRange.from).format("DD.MM"), moment(dateTimeRange.to).format("DD.MM"));

    if (filteredEvents.length > 10) {
        while (elements.length > 10) {
            elements.pop();
        }
    }
    
    facebookMessageInterface.sendMessage({
        text: bottyText
    });

    if (filteredEvents.length > 0) {
        facebookMessageInterface.sendTemplatedMessage(elements);
    }
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}