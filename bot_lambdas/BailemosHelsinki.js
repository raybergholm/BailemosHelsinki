"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const FACEBOOK_NODES = {    // TODO: Move this to S3 or DynamoDB maybe?
    IDanceHelsinki: 343877245641683,
    SalsaLatina: 218545868207533,
    BailaBaila: 149017031808062,
    SalsaStudioHelsinki: 410366985000,
    HelsinkiSalsaAcademy: 187046454640210,
    SalsaBorealis: 181612268553494,
    RioZoukStyle: 341108445941295,
    LambazoukFinland: 1632263940334820,
    KirsiAndCarlosKizomba: 325466984269341,

    FiestaLatinaHelsinki: 622387527900387,

    VeDance: 1866639140232828,
    SalsaGarage: 750517591779604,

    DJGoodblood: 1563545733858318,
    DJLuchoHelsinki: 155127126480,
    DJHermanni: 213430002067432
};

var https = require("https");
var crypto = require('crypto');

exports.handler = (event, context, callback) => {
    console.log(event);

    /*
    // TODO: event["X-Hub-Signature"] is always undefined, but it's definitely there. Why?
    if(!verifySignature(event['X-Hub-Signature'])){
        console.log("X-Hub_Signature did not match the expected value");
        return;
    }
    */

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

function verifySignature(signature) {
    var shasum;

    console.log(signature);

    if (signature) {
        shasum = crypto.createHash('sha1');
        shasum.update(FACEBOOK_APP_SECRET);

        if (signature === shasum.digest("hex")) {
            return true;
        } else {
            console.log("HTTP signature: " + signature + ", digest: " + shasum.digest("hex"));
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

        var result = analyseMessage(messageText);
        var messageResponse = generateResponse(result);
        if (messageResponse) {
            sendTextMessage(senderId, messageResponse);
        }

        fetchEventData();
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

function fetchEventData(){ // TODO: most likely this should be integrated elsewhere or split to other functions
    // TODO: PoC for know

    var targetNode = FACEBOOK_NODES.IDanceHelsinki;

    var path = "/v2.9/" + targetNode + "/events?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN;
    var options = {
        host: "graph.facebook.com",
        path: path,
        method: "GET",
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
            console.log("tried to fetch event data, got this: ", str);
        });
    };

    var req = https.request(options, callback);
    req.on("error", function(e) {
        console.log("problem with request: " + e);
    });

    req.end();
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
