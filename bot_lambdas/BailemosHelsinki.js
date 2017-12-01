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

const BOT_TEXTS = { // probably should be fetched from S3
    Unknown: [
        "I have no idea what you mean :(", "This bot is not quite advanced enough to understand that. Yet.", "Uh, try to say that again in a different way?"
    ],
    Affirmative: ["Ok, on it!", "Sure, I can do that", "Alrighty!", "Sure thing!"]
};

const KEYWORD_REGEXES = {
    Type: {
        Course: /[course|kurssi]/,
        Party: /[party|parties]/
    },

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
    var senderId = message.sender.id;
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
        var debugRegex = /debug test/;
        if (debugRegex.test(messageText)) {
            fetchDataFromS3();
            sendTextMessage(senderId, BOT_TEXTS.Affirmative[Math.floor(Math.random() * BOT_TEXTS.Affirmative.length)]);
        } else {
            var result = analyseMessage(messageText);
            generateResponse(senderId, result);
        }
    } else if (messageAttachments) {
        sendTextMessage(senderId, {text: "Message with attachment received"});
    }
}

function analyseMessage(text) {
    // TODO: this is probably going to be a big janky mess for a long time since text analysis is going to be complex
    var result = {
        originalText: text,
        language: analyseLanguage(text),
        eventType: findEventTypeKeywords(text),
        timeRange: findTimeKeywords(text),
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

function findEventTypeKeywords(text){
    var eventTypes = [];

    

    return eventTypes;
}

function findTimeKeywords(text) {
    var timeRange = {
        from: null,
        to: null
    };

    return timeRange;
}

function findLocationKeywords(text) {
    var locations = [];

    return locations;
}

function findInterestKeywords(text) {
    var interests = [];

    return interests;
}

function generateResponse(senderId, result) {
    var messages = [];
    if (result.timeRange.from === null && result.timeRange.to === null && result.locations.length === 0 && result.interests.length === 0) {
        messages.push({
            text: BOT_TEXTS.Unknown[Math.floor(Math.random() * BOT_TEXTS.Unknown.length)]
        });
    } else {
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

    callSendAPI(messagePayload);
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
}
