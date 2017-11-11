"use strict";

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

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

    if(event.queryStringParameters){
        // process GET request

        console.log("GET request received");

        handleGet(event, context, callback);
    }else{
        // process POST request

        console.log("POST request received");

        handlePost(event, context, callback);
    }
};

function verifySignature(signature){
    var shasum;

    console.log(signature);

    if(signature){
        shasum = crypto.createHash('sha1');
        shasum.update(FACEBOOK_APP_SECRET);

        if(signature === shasum.digest("hex")){
            return true;
        }else{
            console.log("HTTP signature: " + signature + ", digest: " + shasum.digest("hex"));
        }
    }
    return false;
}

function handleGet(evt, context, callback){
    var response;
    var queryParams = evt.queryStringParameters;

    //console.log(JSON.Stringify(queryParams));

    var verifyToken = queryParams["hub.verify_token"];

    if(verifyToken === FACEBOOK_VERIFY_TOKEN){
        var challengeToken = parseInt(queryParams["hub.challenge"]);

        console.log("Responding to Facebook challenge token");

        response = {
            isBase64Encoded: false,
            status: 200,
            body: parseInt(challengeToken)
        };
    }else{
        console.log("Incorrect validation token received");

        response = {
            isBase64Encoded: false,
            status: 422,
            body: "Error, wrong validation token"
        };
    }

    callback(null, response);
}

function handlePost(evt, context, callback){
    var response;

    console.log("Responding with a 200 OK");

    response = {
        isBase64Encoded: false,
        status: 200,
        body: "EVENT_RECEIVED"
    };
    callback(null, response);

    if(evt.body){
        var data = JSON.parse(evt.body);

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

                        receivedMessage(msg);
                    } else if(msg.delivery){
                        console.log("Message delivery response: ", msg.delivery);
                    } else if(msg.read){
                        console.log("Message read response: ", msg.read);
                    }else{
                        console.log("Webhook received unknown event with data: ", msg);
                    }
                });
            });
        }else{
            console.log("Something went wrong, expected 'page', got '" + data.object + "'");
        }
    }else{
        console.log("POST request body was null");
    }

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.

    /*
    console.log("Responding with a 200 OK");

    response = {
        isBase64Encoded: false,
        status: 200,
        body: "OK"
    };
    callback(null, response);
    */
}

function receivedMessage(messageEvent){
    var senderId = messageEvent.sender.id;
    var recipientId = messageEvent.recipient.id;
    var timeOfMessage = messageEvent.timestamp;
    var message = messageEvent.message;

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    console.log("Message data: ", message);

    var messageId = message.mid;
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if(messageText){
        // If we receive a text message, check to see if it matches a keyword
        // and send back the example. Otherwise, just echo the text we received.

        switch(messageText){
            case "generic":
                //sendGenericMessage(senderID);
                break;
            default:
                sendTextMessage(senderId, messageText);
        }
    }else if(messageAttachments){
        sendTextMessage(senderId, "Message with attachment received");
    }
}

function sendTextMessage(recipientId, messageText){
    var messageData = {
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        recipient: {
            id: recipientId
        },
        message: {
            text: "ECHO: " + messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData){
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
        response.on("data", function (chunk) {
            str += chunk;
        });
        response.on("end", function () {
            console.log("callback end, got " + str);
        });
    };

    var req = https.request(options, callback);
    req.on("error", function(e) {
        console.log("problem with request: " + e);
    });

    req.write(body);
    req.end();
}
