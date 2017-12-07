"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_EVENT_DATA_OBJECT_KEY = process.env.S3_EVENT_DATA_OBJECT_KEY;

var https = require("https");
var crypto = require('crypto');

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var s3 = new AWS.S3();

function FacebookMessageFactory() {
    this._targetId = null;

    this.setTargetId = function(targetId) {
        this._targetId = targetId;
    };

    this.createMessage = function(payload) {
        return {
            messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
            recipient: {
                id: this._targetId
            },
            sender: {
                id: FACEBOOK_PAGE_ID
            },
            message: payload
        };
    };

    this.createSenderActionMessage = function(action) {
        return {
            messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
            recipient: {
                id: this._targetId
            },
            sender: {
                id: FACEBOOK_PAGE_ID
            },
            sender_action: action
        };
    };

    this.createBaseTemplate = function() {
        return {
            attachment: {
                type: "template",
                payload: null
            }
        };
    };

    this.createGenericMessageTemplate = function(elements) {
        var messageTemplate = this.createBaseTemplate();
        messageTemplate.attachment.payload = {
            template_type: "generic",
            elements: elements
        };
        return this.createMessage(messageTemplate);
    };

    this.createTemplateElement = function(title, subtitle, imageUrl, defaultActionUrl) {
        return {
            title: title,
            subtitle: subtitle,
            image_url: imageUrl,
            default_action: {
                type: "web_url",
                url: defaultActionUrl
            }
        };
    };
}

var facebookMessageFactory = new FacebookMessageFactory();

function DateTimeSemanticDecoder() {
    this.read = (input) => {
        var dateTimeRange = {
            from: null,
            to: null
        };

        /*
        Today: /\b(?:today|tonight)\b/i,
        Monday: /\b(?:monday|mo[n\-\b])/i,
        Tuesday: /\b(?:tuesday|tu[e\-\b])/i,
        Wednesday: /\b(?:wednesday|we[d\-\b])/i,
        Thursday: /\b(?:thursday|th[u\-\b])/i,
        Friday: /\b(?:friday|fr[i\-\b])/i,
        Saturday: /\b(?:saturday|sa[t\-\b])/i,
        Sunday: /\b(?:sunday|su[n\-\b])/i,
        ThisWeek: /\bthis week\b/i,
        UpcomingWeekend: /\bthis weekend\b/i,
        NextWeekend: /\bnext weekend\b/i,
        NextWeek: /\bnext week\b/i,
        RangeLike: /\s\-\s|\w\-\w/,
        DateLike: /\d{1,2}[\.\/]\d{1,2}/,
        TimeLike: /\d{1,2}[\.\:]\d{2}/,
        FromMarker: /\b(?:from|starting|after)\b/i,
        ToMarker: /\b(?:to|until|before)\b/i

        */

        return this.getDefaultRange(); // FIXME: use the real value when it's actually there
        // return dateTimeRange;
    };
    this.getDefaultRange = () => { // from today to today+7
        var dateTimeRange = {
            from: null,
            to: null
        };

        dateTimeRange.from = new Date();
        dateTimeRange.to = (new Date()).setDate(dateTimeRange.from.getDate() + 7);

        return dateTimeRange;
    };
}

var dateTimeSemanticDecoder = new DateTimeSemanticDecoder();

var messageBuffer = {
    _messages: [],
    enqueue: function(message) {
        this._messages.push(message);
    },
    flush: function() {
        if (this._messages.length === 1) {
            callSendAPI(JSON.stringify(this._messages[0]));
        } else {
            var batchRequestContent = [];
            for (var i = 0; i < this._messages.length; i++) {
                batchRequestContent.push({
                    relative_url: encodeURIComponent("/me/messages/"),
                    method: "POST",
                    body: encodeURIComponent(JSON.stringify(this._messages[i])) // TODO: This is hella broken, body needs a different format entirely?
                });
            }

            callSendBatchAPI("batch=" + JSON.stringify(batchRequestContent));
        }

        this._messages = [];
    }
};

const BOT_TEXTS = { // probably should be fetched from S3
    Greetings: [
        "Hi!", "Hello!", "Hi! :)", "Hello! :)"
    ],
    Disclaimer: [
        "This bot is currently under construction, so don't worry if things break.", "I don't really understand full sentences yet, just so you know :(", "If something clearly doesn't work when it should, you should tell my owner so that I can get better at your human languages!", "Just tell him the exact text you wrote, what you meant by it and what sort of answer you were expecting. Every bit of help counts!"
    ],
    HelpInfo: [
        "Currently I can detect some keywords related to the dance scene in Helsinki based on things like time, event types and interests. You can freely combine terms to narrow down your search", "e.g. try something like \"any salsa parties this weekend?\" and I can pick up \"salsa\", \"party\" and \"this weekend\" and check what's out there.", "Or you could just ask \"what's happening next Friday?\" if you just want to know what's happening then", "Or you could just try \"Surprise me\" :)"
    ],
    Unknown: [
        "I have no idea what you mean :(", "This bot is not quite advanced enough to understand that. Yet.", "Uh, try to say that again in a different way?"
    ],
    Affirmative: [
        "Ok, on it!", "Sure, I can do that", "Alrighty!", "Sure thing!"
    ],
    Apologise: [
        "Whoops, did I get it wrong?", "I guess that didn't quite work as intended", "Yeah, I have problems too :("
    ]
};

const KEYWORD_REGEXES = { // TODO: worry about localisation later. This could end up requiring a major rewrite of these regexes since \b considers stuff like åäö as word breaks
    Special: {
        Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[\!\?])/i,
        Info: /\b(?:info|disclaimer)\b/i,
        HelpRequest: /\b(?:help)(?:\b|[\!\?])|\bhelp [me|please]\b/i,
        Oops: /\b(?:wtf|you're drunk|wrong)\b/i,
        SurpriseMe: /\bsurprise me\b/i,
        Debug: /\bdebug test\b/i,
        TemplateDebug: /\btemplate plz\b/i
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
        ThisWeekend: /\bthis weekend\b/i,
        NextWeek: /\bnext week\b/i,
        NextWeekend: /\bnext weekend\b/i,
        RangeLike: /\s\-\s|\w\-\w/,
        DateLike: /\d{1,2}[\.\/]\d{1,2}/,
        TimeLike: /\b(?:\d{1,2}[\:]\d{2}|(?:klo) \d{1,2}\.\d{2})\b/,
        FromMarker: /\b(?:from|starting|after)\b/i,
        ToMarker: /\b(?:to|until|before)\b/i
    }
};

exports.handler = (event, context, callback) => {
    console.log(event);

    if (!verifySignature(event.headers['X-Hub-Signature'])) {
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
                data.entry.forEach(function(entry) {
                    // var pageID = entry.id;
                    // var timeOfEvent = entry.time;
                    // Iterate over each messaging event
                    entry.messaging.forEach(function(msg) {
                        if (msg.message) {
                            // Normal message

                            sendTypingIndicator(true); // send the typing_on indicator immediately

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

function verifySignature(payload) {
    var shasum;

    var signature = payload.split('=')[1];

    if (signature) {
        shasum = crypto.createHash('sha1');
        shasum.update(FACEBOOK_APP_SECRET);

        var digest = shasum.digest("hex");

        if (signature === digest) { // TODO: always a mismatch right now, investigate why
            return true;
        } else {
            console.log("Verification mismatch!", {
                fromFB: signature,
                digest: digest
            });
        }
    }
    return false;
}

function handleReceivedMessage(receivedMessage) {
    /*
        message = {
            sender: {id: [SENDER_ID]},          // should be the user
            recipient: {id: [RECIPIENT_ID]},    // should be page ID
            timestamp: [TIMESTAMP],
            message: {
                mid: [MESSAGE_ID],
                text: [MESSAGE_TEXT],
                attachments: [ATTACHMENTS]
            }
        }
    */
    var senderId = receivedMessage.sender.id;

    facebookMessageFactory.setTargetId(senderId);

    var recipientId = receivedMessage.recipient.id;
    var timeOfMessage = receivedMessage.timestamp;
    var messageData = receivedMessage.message;

    console.log("entire message data structure: ", receivedMessage);

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    console.log("Message data: ", messageData);

    // var messageId = messageData.mid;
    var messageText = messageData.text;
    var messageAttachments = messageData.attachments;

    if (messageText) {
        if (!findSpecialTexts(messageText)) {
            var result = analyseMessage(messageText);
            generateResponse(result);
        }
    } else if (messageAttachments) {
        var message = facebookMessageFactory.createMessage({
            text: "Message with attachment received"
        });
        messageBuffer.enqueue(message);

        messageBuffer.flush();
    }
}

function findSpecialTexts(text) {
    var i, message;

    for (var prop in KEYWORD_REGEXES.Special) {
        if (KEYWORD_REGEXES.Special[prop].test(text)) {
            switch (prop) {
                case "Greetings":
                    message = facebookMessageFactory.createMessage({
                        text: BOT_TEXTS.Greetings[Math.floor(Math.random() * BOT_TEXTS.Greetings.length)]
                    });
                    messageBuffer.enqueue(message);
                    break;
                case "Info":
                    for (i = 0; i < BOT_TEXTS.Disclaimer.length; i++) {
                        message = facebookMessageFactory.createMessage({
                            text: BOT_TEXTS.Disclaimer[i]
                        });
                        messageBuffer.enqueue(message);
                    }
                    break;
                case "HelpRequest":
                    for (i = 0; i < BOT_TEXTS.HelpInfo.length; i++) {
                        message = facebookMessageFactory.createMessage({
                            text: BOT_TEXTS.HelpInfo[i]
                        });
                        messageBuffer.enqueue(message);
                    }
                    break;
                case "Debug":
                    fetchDataFromS3(null);
                    message = facebookMessageFactory.createMessage({
                        text: BOT_TEXTS.Affirmative[Math.floor(Math.random() * BOT_TEXTS.Affirmative.length)]
                    });
                    messageBuffer.enqueue(message);
                    break;
                case "Oops":
                    message = facebookMessageFactory.createMessage({
                        text: BOT_TEXTS.Apologise[Math.floor(Math.random() * BOT_TEXTS.Apologise.length)]
                    });
                    messageBuffer.enqueue(message);
                    break;
                case "TemplateDebug":
                    messageBuffer.enqueue(generateDebugMessageTemplate());
                    break;
            }

            messageBuffer.flush();
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
        message = facebookMessageFactory.createMessage({
            text: BOT_TEXTS.Unknown[Math.floor(Math.random() * BOT_TEXTS.Unknown.length)]
        });
        messageBuffer.enqueue(message);
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

        message = facebookMessageFactory.createMessage({
            text: responseText + keywords.join(', ')
        });
        messageBuffer.enqueue(message);

        // Filter staged events by keywords
        var callback = function(stagedData) {
            var organisers = stagedData.organisers;
            var filterMap = {};

            var dateTimeRange;

            if (analysisResults.temporalMarkers && analysisResults.temporalMarkers.length > 0) {
                dateTimeRange = dateTimeSemanticDecoder.read(analysisResults.originalText);
            } else {
                // default
                dateTimeRange = dateTimeSemanticDecoder.getDefaultRange();
            }

            console.log(dateTimeRange);

            // Filter by datetime: this is the only mandatory filter so build the whitelist from everything within the time range
            stagedData.events.forEach((eventData) => {
                // TODO: filter by datetime range. Mandatory filter, can't pass everything to the end-user all at once anyway
                
                if(eventData.start_time.getTime() > dateTimeRange.from.getTime() && eventData.end_time.getTime() < dateTimeRange.to.getTime()){
                    filterMap[eventData.id] = eventData;
                }
            });

            // Start throwing out things which don't fit the rest of the keywords
            filterMap.forEach((eventData) => {
                var i;
                var matchedKeyword = false;

                // Lazy match: OK it if any keyword matches (TODO: for handling complex cases, may need an entire class for doing the logical connections)
                for(i = 0; i < analysisResults.interests; i++){
                    if (KEYWORD_REGEXES.Interests[analysisResults.interests[i]].test(eventData.description)) { // TODO: eww, this is going to create errors isn't it?
                        matchedKeyword = true;
                        break;
                    }
                }
                for(i = 0; i < analysisResults.locations; i++){
                    if (KEYWORD_REGEXES.Locations[analysisResults.locations[i]].test(eventData.description)) { // TODO: eww, this is going to create errors isn't it?
                        matchedKeyword = true;
                        break;
                    }
                }

                if(!matchedKeyword){
                    delete filterMap[eventData.id];
                }
            });

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

            postFilteredEvents(filteredEvents);
        };
        fetchDataFromS3(callback);
    }

    messageBuffer.flush(); // fire this immediately even if there's more to come after querying S3, I want the debug message for now
}

function postFilteredEvents(filteredEvents) {
    var elements = [];

    filteredEvents.forEach((eventData) => {
        var subtitleString = "";
        var coverImageUrl = null;

        // TODO: can I just get moment.js in here to do this?
        var fillLeadingZero = function(value) {
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

        elements.push(facebookMessageFactory.createTemplateElement(
            eventData.name,
            subtitleString,
            coverImageUrl,
            "https://www.facebook.com/events/" + eventData.id
        ));
    });

    if (elements.length > 10) { // NOTE: the Messenger API only allows up to 10 elements at a time
        messageBuffer.enqueue(facebookMessageFactory.createMessage({
            text: "I got " + elements.length + " results, here's the first 10 of them. I'd love to display the rest but Facebook doesn't let me :("
        }));

        while (elements.length > 10) {
            elements.pop();
        }
    } else {
        messageBuffer.enqueue(facebookMessageFactory.createMessage({
            text: "Alright! I got " + elements.length + " results:"
        }));
    }
    messageBuffer.flush();

    var message = facebookMessageFactory.createGenericMessageTemplate(elements);
    messageBuffer.enqueue(message);

    messageBuffer.flush();
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}

function sendTypingIndicator(mode) {
    var typingIndicatorMessage = facebookMessageFactory.createSenderActionMessage(mode ? "typing_on" : "typing_off");

    // FIXME: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
    // messageBuffer.enqueue(typingIndicatorMessage);
    // messageBuffer.flush();
}

function fetchDataFromS3(callback) {
    s3.getObject({
        Bucket: S3_BUCKET_NAME, // TODO: check if I am allowed to skip the Key property since I want to grab everything from this bucket
        Key: S3_EVENT_DATA_OBJECT_KEY
    }, (err, s3Object) => {
        var stagedData;
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            stagedData = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

            // Convert all date strings to date objects (all date/time calculations require it, and JSON.stringify will convert back to string correctly)
            for(var i = 0; i < stagedData.events.length; i++){
                stagedData.events[i].start_time = new Date(stagedData.events[i].start_time);
                stagedData.events[i].end_time = new Date(stagedData.events[i].start_time);
                
                if(stagedData.events[i].event_times){
                    for(var j = 0; j < stagedData.events[i].event_times.length; j++){
                        stagedData.events[i].event_times[j].start_time = new Date(stagedData.events[i].event_times[j].start_time);
                        stagedData.events[i].event_times[j].end_time = new Date(stagedData.events[i].event_times[j].end_time); 
                    }

                }
            }

            console.log(stagedData);

            if (callback) {
                callback(stagedData);
            }
        }
    });
}

function callSendAPI(payload) {
    console.log("sending this message payload to FB:", payload);

    var body = payload;
    var options = {
        host: "graph.facebook.com",
        path: "/v2.11/me/messages/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    var callback = function(response) {
        var str = "";
        response.on("data", function(chunk) {
            str += chunk;
        });
        response.on("end", function() {
            postDeliveryCallback(str);
        });
    };

    var req = https.request(options, callback);
    req.on("error", function(e) {
        console.log("problem with request: " + e);
    });

    req.write(body);
    req.end();
}

function callSendBatchAPI(payload) {
    console.log("sending this message payload to FB:", payload);

    var body = payload;
    var options = {
        host: "graph.facebook.com",
        path: "/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    var callback = function(response) {
        var str = "";
        response.on("data", function(chunk) {
            str += chunk;
        });
        response.on("end", function() {
            postDeliveryCallback(str);
        });
    };

    var req = https.request(options, callback);
    req.on("error", function(e) {
        console.log("problem with request: " + e);
    });

    req.write(body);
    req.end();
}

function postDeliveryCallback(str) {
    console.log("callback end, got " + str);

    sendTypingIndicator(false);
}

function generateDebugMessageTemplate() {

    var elements = [
        facebookMessageFactory.createTemplateElement(
            "Hi there",
            "lorem ipsum",
            "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/23632575_1723944837617023_5988946792782455376_o.jpg?oh=0e3b27fb5e6ac9adb9d728a2e2b31685&oe=5A9AC859",
            "https://www.facebook.com/events/322279428254954"
        ),
        facebookMessageFactory.createTemplateElement(
            "Hi there2",
            "lorem ipsum",
            "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/23592459_1906885559340836_1475249793396713895_o.jpg?oh=d2f189863b67d2a044bd0666884cbf58&oe=5A934F5E",
            "https://www.facebook.com/events/146422476113836"
        ),
        facebookMessageFactory.createTemplateElement(
            "Hi there3",
            "lorem ipsum",
            "https://scontent.xx.fbcdn.net/v/t1.0-9/s720x720/23434801_1575952269133546_6154874085764592548_n.jpg?oh=bb93a0cfe75d680d0e629b64c3e0ef0f&oe=5AD3CA01",
            "https://www.facebook.com/events/125180038152734"
        )
    ];
    return facebookMessageFactory.createGenericMessageTemplate(elements);
}
