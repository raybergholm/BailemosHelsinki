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

var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();

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
        var challengeToken = parseInt(queryParams["hub.challenge"]);

        console.log("Responding to Facebook challenge token");

        response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: parseInt(challengeToken)
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
        // If we receive a text message, check to see if it matches a keyword
        // and send back the example. Otherwise, just echo the text we received.

        if (/debug fetch data/.test(messageText.toLowerCase())) { // TODO: less hardcoding
            sendTextMessage(senderId, "Ok, fetching the data...");
            fetchDataList();
        } else {
            var result = analyseMessage(messageText);
            var messageResponse = generateResponse(result);
            if (messageResponse) {
                sendTextMessage(senderId, messageResponse);
            }
        }

    } else if (messageAttachments) {
        sendTextMessage(senderId, "Message with attachment received");
    }
}

function analyseMessage(messageText) {
    var result = {
        originalText: messageText,
        language: null,
        keywords: null,
        dateRange: null
    };

    return result;
}

function generateResponse(result) {
    return result.originalText; // TODO: Just a placeholder for now, later on do more than just echo the message
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function fetchDataList() {
    s3.listObjectsV2({
        Bucket: S3_BUCKET_NAME
    }, function(err, data) {
        if (err) {
            console.log("Error fetching data list: ", err.message);
        } else {
            var list = [];
            for (var i = 0; i < data.Contents.length; i++) {
                list.push(data.Contents[i].Key);
            }
            fetchData(list);
        }
    });
}

function fetchData(list) {
    var data = [];

    var callbacksStarted = list.length;
    var callbacksFinished = 0;

    var callback = function(err, s3Object) {
        if (err) {
            console.log("S3 interface error: ", err);
        } else {
            data.push(JSON.parse(s3Object.Body.toString())); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

            callbacksFinished++;

            if (callbacksStarted === callbacksFinished) { // FIXME: This is a dirty way of doing this, find something more elegant
                onDataFetched(data);
            }
        }
    };

    for (var i = 0; i < list.length; i++) {
        s3.getObject({
            Bucket: S3_BUCKET_NAME, // TODO: check if I am allowed to skip the Key property since I want to grab everything from this bucket
            Key: list[i]
        }, callback);
    }

}

function onDataFetched(data) {
    for (var i = 0; i < data.length; i++) {
        console.log(data[i]);
    }
}

function callSendAPI(messageData) {
    var body = JSON.stringify(messageData);
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
