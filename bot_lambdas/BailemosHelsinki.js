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
AWS.config.update({region: "eu-central-1"});

var s3 = new AWS.S3();

var senderId; // this is a bit dirty making it global

const BOT_TEXTS = { // probably should be fetched from S3
    Greetings: [
        "Hi!", "Hello!"
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
    Affirmative: ["Ok, on it!", "Sure, I can do that", "Alrighty!", "Sure thing!"]
};

const KEYWORD_REGEXES = { // TODO: worry about localisation later
    Special: {
        Greetings: /hi|hello|moi|\bhei|hej[\b\!\?]/i,
        Info: /\info\b|\bdisclaimer\b/i,
        HelpRequest: /help\b|help[\!\?]|help [me|please]/i,
        Debug: /debug test/i
    },
    Types: {
        Course: /course/i,
        Party: /party/i
    },
    Interests: {
        Salsa: /salsa/i,
        Bachata: /bachata/i,
        Kizomba: /kizomba/i,
        Zouk: /zouk/i
    },
    Temporal: {
        Today: /today\b|tonight\b/i,
        Monday: /monday|mo[n\-\b]/i,
        Tuesday: /tuesday|tu[e\-\b]/i,
        Wednesday: /wednesday|we[d\-\b]/i,
        Thursday: /thursday|th[u\-\b]/i,
        Friday: /friday|fr[i\-\b]/i,
        Saturday: /saturday|sa[t\-\b]/i,
        Sunday: /sunday|su[n\-\b]/i,
        ThisWeek: /this week\b/i,
        UpcomingWeekend: /this weekend\b/i,
        NextWeekend: /next weekend\b/i,
        NextWeek: /next week\b/i,
        RangeLike: /\s\-\s|\w\-\w/,
        DateLike: /\d{1,2}[\.\/]\d{1,2}/,
        TimeLike: /\d{1,2}[\.\:]\d{2}/,
        FromMarker: /from|starting|after/i,
        ToMarker: /to|until|before/i
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
        sendTextMessage(senderId, {text: "Message with attachment received"});
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
                        messages.push({text: BOT_TEXTS.Disclaimer[i]});
                    }
                    break;
                case "HelpRequest":
                    for (i = 0; i < BOT_TEXTS.HelpInfo.length; i++) {
                        messages.push({text: BOT_TEXTS.HelpInfo[i]});
                    }
                    break;
                case "Debug":
                    fetchDataFromS3();
                    messages.push({
                        text: BOT_TEXTS.Affirmative[Math.floor(Math.random() * BOT_TEXTS.Affirmative.length)]
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
    var messages = [];
    if (analysisResults.eventType.length === 0 && analysisResults.temporalMarkers.length === 0 && analysisResults.locations.length === 0 && analysisResults.interests.length === 0) {
        // found absolutely nothing
        messages.push({
            text: BOT_TEXTS.Unknown[Math.floor(Math.random() * BOT_TEXTS.Unknown.length)]
        });
    } else {
        console.log("analysis picked up these keywords: ", analysisResults);
        messages.push({text: "THIS IS A PLACEHOLDER"}); // TODO: change text strings based on the keywords found. Also link some events! (may need additional messages tbh)
    }

    for (var i = 0; i < messages.length; i++) {
        sendTextMessage(senderId, messages[i]);
    }
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
        sender_action: (
            mode
            ? "typing_on"
            : "typing_off")
    };

    // callSendAPI(messagePayload);  FIXME: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
}

function sendTextMessage(recipientId, content) {
    var message = {};

    message = content; // TODO: validation checks: only a subset of stuff is OK here
    var messagePayload = {
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        recipient: {
            id: recipientId
        },
        message: message
    };

    callSendAPI(messagePayload);
}

function fetchDataFromS3() {
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
        }
    });
}

function callSendAPI(messagePayload) {
    console.log("sending this message payload to FB:", messagePayload);

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
