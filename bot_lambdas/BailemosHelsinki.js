"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_EVENT_DATA_OBJECT_KEY = process.env.S3_EVENT_DATA_OBJECT_KEY;

var https = require("https");
var crypto = require('crypto');

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var s3 = new AWS.S3();

var senderId; // this is a bit dirty making it global

var messageQueue = [];

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

const KEYWORD_REGEXES = { // TODO: worry about localisation later
    Special: {
        Greetings: /\b(?:hi|hello|moi|hei|hej)(?:\b|[\!\?])/i,
        Info: /\b(?:info|disclaimer)\b/i,
        HelpRequest: /\b(?:help)(?:\b|[\!\?])|\bhelp [me|please]\b/i,
        Oops: /\b(?:wtf|you're drunk|wrong)\b/i,
        SurpriseMe: /\bsurprise me\b/i,
        Debug: /\bdebug test\b/i
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
    }
};

exports.handler = (event, context, callback) => {
    console.log(event);

    if (!verifySignature(event.headers['X-Hub-Signature'])) {
        console.log("X-Hub_Signature did not match the expected value");
        // return;  TODO: allow it to pass for now, debug it later
    }

    var response;

    switch (event.httpMethod) {
        case "GET":
            response = handleFacebookChallenge(event.queryStringParameters);
            break;
        case "POST":
            response = processMessages(JSON.parse(event.body));
            break;
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

function handleFacebookChallenge(queryParams) {
    var response;
    var verifyToken = queryParams["hub.verify_token"];

    if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
        var challengeToken = parseInt(queryParams["hub.challenge"], 10);

        console.log("Responding to Facebook challenge token");

        response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: parseInt(challengeToken, 10)
        };
    } else {
        console.log("Incorrect validation token received");

        response = {
            isBase64Encoded: false,
            statusCode: 422,
            body: "Error, wrong validation token"
        };
    }
    return response;
}

function processMessages(data) {
    var response;

    if (data) {
        console.log("entire HTTP request data: ", data);

        // Make sure this is a page subscription
        if (data.object === "page") {

            // Iterate over each entry - there may be multiple if batched
            data.entry.forEach(function(entry) {
                var pageID = entry.id;
                var timeOfEvent = entry.time;
                // Iterate over each messaging event
                entry.messaging.forEach(function(msg) {
                    if (msg.message) {
                        // Normal message

                        sendTypingIndicator(msg.sender.id, true); // send the typing_on indicator immediately

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

    return response;
}

function handleReceivedMessage(message) {
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
    senderId = message.sender.id;
    var recipientId = message.recipient.id;
    var timeOfMessage = message.timestamp;
    var messageData = message.message;

    console.log("entire message data structure: ", message);

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    console.log("Message data: ", messageData);

    var messageId = messageData.mid;
    var messageText = messageData.text;
    var messageAttachments = messageData.attachments;

    if (messageText) {
        if (!findSpecialTexts(messageText)) {
            var result = analyseMessage(messageText);
            generateResponse(senderId, result);
        }
    } else if (messageAttachments) {
        messageQueue.push(senderId, {
            text: "Message with attachment received"
        });

        releaseMessages();
    }
}

function findSpecialTexts(text) {
    var i;
    var messages = [];

    for (var prop in KEYWORD_REGEXES.Special) {
        if (KEYWORD_REGEXES.Special[prop].test(text)) {
            switch (prop) {
                case "Greetings":
                    messages.push({
                        text: BOT_TEXTS.Greetings[Math.floor(Math.random() * BOT_TEXTS.Greetings.length)]
                    });
                    break;
                case "Info":
                    for (i = 0; i < BOT_TEXTS.Disclaimer.length; i++) {
                        messages.push({
                            text: BOT_TEXTS.Disclaimer[i]
                        });
                    }
                    break;
                case "HelpRequest":
                    for (i = 0; i < BOT_TEXTS.HelpInfo.length; i++) {
                        messages.push({
                            text: BOT_TEXTS.HelpInfo[i]
                        });
                    }
                    break;
                case "Debug":
                    fetchDataFromS3(null);
                    messages.push({
                        text: BOT_TEXTS.Affirmative[Math.floor(Math.random() * BOT_TEXTS.Affirmative.length)]
                    });
                    break;
                case "Oops":
                    messages.push({
                        text: BOT_TEXTS.Apologise[Math.floor(Math.random() * BOT_TEXTS.Apologise.length)]
                    });
                    break;
            }

            for (i = 0; i < messages.length; i++) {
                sendTextMessage(senderId, messages[i]);
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

function generateResponse(senderId, analysisResults) {
    if (analysisResults.eventType.length === 0 && analysisResults.temporalMarkers.length === 0 && analysisResults.locations.length === 0 && analysisResults.interests.length === 0) {
        // found absolutely nothing
        messageQueue.push({
            text: BOT_TEXTS.Unknown[Math.floor(Math.random() * BOT_TEXTS.Unknown.length)]
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

        messageQueue.push({
            text: responseText + keywords.join(', ')
        });

        var callback = function(events){
            var filteredEvents = [];
            events.forEach((eventData) => {
                analysisResults.interests.forEach((interest) => {
                    if(KEYWORD_REGEXES.Interests[interest].test(eventData.description)){ // TODO: eww, this is going to create errors isn't it?
                        filteredEvents.push(eventData);
                    }
                });
            });

            filteredEvents.forEach((eventData) => {
                messageQueue.push({
                    text: eventData.name + " " + eventData.start_time + "\n" + "https://www.facebook.com/events/" + eventData.id + '/'
                    // shares: {    // TODO: doesn't work like that. Does the API support enriched messages with link previews like "normal" messages?
                    //     id: eventData.id,
                    //     name: eventData.name,
                    //     description: eventData.name,
                    //     link: "https://www.facebook.com/events/" + eventData.id + '/'
                    // }
                });
            });

            releaseMessages();
        };
        fetchDataFromS3(callback);
    }

    releaseMessages(); // fire this immediately even if there's more to come after querying S3, I want the debug message for now
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}

function sendTypingIndicator(recipientId, mode) {
    var messagePayload = {
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        recipient: {
            id: recipientId
        },
        sender_action: (mode ? "typing_on" : "typing_off")
    };

    // callSendAPI(messagePayload);  FIXME: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
}

function releaseMessages(){ // TODO: probably should make this a real Queue
    for(var i = 0; i < messageQueue.length; i++){
        sendTextMessage(messageQueue[i]);
    }

    messageQueue = [];
}

function sendTextMessage(content) {
    var message = {};

    message = content; // TODO: validation checks: only a subset of stuff is OK here
    var messagePayload = {
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        recipient: {
            id: senderId
        },
        message: message
    };

    callSendAPI(messagePayload);
}

function fetchDataFromS3(callback) {
    s3.getObject({
        Bucket: S3_BUCKET_NAME, // TODO: check if I am allowed to skip the Key property since I want to grab everything from this bucket
        Key: S3_EVENT_DATA_OBJECT_KEY
    }, (err, s3Object) => {
        var eventData;
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            eventData = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

            console.log(eventData);

            if(callback){
                callback(eventData);
            }
        }
    });
}

function callSendAPI(messagePayload) {
    console.log("sending this message payload to FB:", messagePayload);

    if(!messagePayload.messaging_type){
        messagePayload.messaging_type = "RESPONSE"; // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
    }

    var body = JSON.stringify(messagePayload);
    var path = "/v2.6/me/messages?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN;
    var options = {
        host: "graph.facebook.com",
        path: path,
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

    sendTypingIndicator(senderId, false);
}
