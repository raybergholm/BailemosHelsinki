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

var senderId; // this is a bit dirty making it global

function FacebookMessageFactory() {
    this._targetId = null;

    this.setTargetId = function(targetId){
        this._targetId = targetId;
    };

    this.createMessage = function(payload){
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

    this.createBaseTemplate = function(){
        return {
            attachment: {
                type: "template",
                payload: null
            }
        };
    };

    this.createGenericMessageTemplate = function(elements){
        var messageTemplate = this.createBaseTemplate();
        messageTemplate.attachment.payload = {
            template_type: "generic",
            elements: elements
        };
        return this.createMessage(messageTemplate);
    };

    this.createTemplateElement = function(title, subtitle, imageUrl, defaultActionUrl){
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
                    relative_url: "/me/messages",
                    method: "POST",
                    body: JSON.stringify(this._messages[i])
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

const KEYWORD_REGEXES = { // TODO: worry about localisation later
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
    senderId = receivedMessage.sender.id;

    facebookMessageFactory.setTargetId(receivedMessage.sender.id);

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
            generateResponse(senderId, result);
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

function generateResponse(senderId, analysisResults) {
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

        var callback = function(events) {
            var filteredEvents = [];
            events.forEach((eventData) => {
                analysisResults.interests.forEach((interest) => {
                    if (KEYWORD_REGEXES.Interests[interest].test(eventData.description)) { // TODO: eww, this is going to create errors isn't it?
                        filteredEvents.push(eventData);
                    }
                });
            });

            filteredEvents.forEach((eventData) => {
                messageBuffer.enqueue({
                    text: eventData.name + " " + eventData.start_time + "\n" + "https://www.facebook.com/events/" + eventData.id + '/'
                    // shares: {    // TODO: doesn't work like that. Does the API support enriched messages with link previews like "normal" messages?
                    //     id: eventData.id,
                    //     name: eventData.name,
                    //     description: eventData.name,
                    //     link: "https://www.facebook.com/events/" + eventData.id + '/'
                    // }
                });
            });

            messageBuffer.flush();
        };
        fetchDataFromS3(callback);
    }

    messageBuffer.flush(); // fire this immediately even if there's more to come after querying S3, I want the debug message for now
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

            if (callback) {
                callback(eventData);
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

    sendTypingIndicator(senderId, false);
}

function generateDebugMessageTemplate() {
    var elements = [
        {
            title: "Hi there",
            image_url: "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/23632575_1723944837617023_5988946792782455376_o.jpg?oh=0e3b27fb5e6ac9adb9d728a2e2b31685&oe=5A9AC859",
            subtitle: "lorem ipsum",
            default_action: {
                type: "web_url",
                url: "https://www.facebook.com/events/322279428254954",
            }
        },
        {
            title: "Hi there2",
            image_url: "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/23592459_1906885559340836_1475249793396713895_o.jpg?oh=d2f189863b67d2a044bd0666884cbf58&oe=5A934F5E",
            subtitle: "lorem ipsum",
            default_action: {
                type: "web_url",
                url: "https://www.facebook.com/events/146422476113836"
            }
        },
        {
            title: "Hi there3",
            image_url: "https://scontent.xx.fbcdn.net/v/t1.0-9/s720x720/23434801_1575952269133546_6154874085764592548_n.jpg?oh=bb93a0cfe75d680d0e629b64c3e0ef0f&oe=5AD3CA01",
            subtitle: "lorem ipsum",
            default_action: {
                type: "web_url",
                url: "https://www.facebook.com/events/125180038152734",
            }
        }
    ];
    return facebookMessageFactory.createGenericMessageTemplate(elements);
}
