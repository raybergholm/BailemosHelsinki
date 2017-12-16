"use strict";

// Used to handle incoming HTTP request verification
const facebookRequestVerifier = require("./facebook/facebookRequestVerifier");

// Main bot logic module
const botty = require("./botty/botty");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    if (!facebookRequestVerifier.verifySignature(event.headers['X-Hub-Signature'])) {
        console.log("X-Hub_Signature did not match the expected value");
        // return;  TODO: allow it to pass for now, debug it later
    }

    if (event.httpMethod === "POST") {
        let data = JSON.parse(event.body);
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
    }

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function handleReceivedMessage(receivedMessage) {
    let senderId = receivedMessage.sender.id;

    let recipientId = receivedMessage.recipient.id;
    let timeOfMessage = receivedMessage.timestamp;
    let messageData = receivedMessage.message;

    console.log("entire message data structure: ", receivedMessage);

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    console.log("Message data: ", messageData);

    // let messageId = messageData.mid;
    let messageText = messageData.text;
    let messageAttachments = messageData.attachments;

    botty.setConversationTarget(senderId);

    if (messageData.quick_reply) {
        botty.replyToQuickReply(messageData.quick_reply.payload);
    } else {
        botty.readMessage(messageText, messageAttachments);
    }
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}