"use strict";

//---------------------------------------------------------------------------//
// Built-in modules
var moment = require("moment");
//---------------------------------------------------------------------------//

//---------------------------------------------------------------------------//
// Custom modules

var facebookRequestVerifier = require("./facebook/facebookRequestVerifier");

var botty = require("./botty/botty");

//---------------------------------------------------------------------------//

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
    botty.readMessage(messageText, messageAttachments); // TODO: let botty kick off the rest
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}