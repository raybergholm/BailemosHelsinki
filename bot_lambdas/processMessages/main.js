"use strict";

// Used to handle incoming HTTP request verification
const facebookRequestVerifier = require("./facebook/facebookRequestVerifier");

// Main bot logic module
const botty = require("./botty/botty");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    const response = processMessages(event);

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function processMessages(event) {
    let response;
    let isVerified = false;

    try {
        isVerified = facebookRequestVerifier.verifySignature(event.headers['X-Hub-Signature'], event.body);
        if (!isVerified) {
            console.log("X-Hub_Signature did not match the expected value");
            const payload = {
                message: "Error, unauthorized request"
            };
            response = generateHttpResponse(403, payload);
        }
    } catch (err) {
        console.log("Error during request verification:", err.message);
        const payload = {
            message: "Internal server error"
        };
        response = generateHttpResponse(500, payload);
    }

    if (isVerified && event.httpMethod === "POST") {
        const data = JSON.parse(event.body);
        if (data) {
            // Make sure this is a page subscription
            if (data.object === "page") {

                // Iterate over each entry - there may be multiple if batched
                data.entry.forEach((entry) => {
                    // var pageID = entry.id;
                    // var timeOfEvent = entry.time;
                    // Iterate over each messaging event
                    entry.messaging.forEach((msg) => {
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

        // always return 200 so that Facebook doesn't spam the lambda like crazy. If any issues appear, it's a server-side problem and Facebook constantly calling an incorrect webhook won't help
        response = generateHttpResponse(200, "OK");
    }

    return response;
}

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}

function handleReceivedMessage(receivedMessage) {
    const senderId = receivedMessage.sender.id;
    const messageData = receivedMessage.message;

    // const recipientId = receivedMessage.recipient.id;
    // const timeOfMessage = receivedMessage.timestamp;

    console.log("entire message data structure: ", JSON.stringify(receivedMessage));

    // console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
    // console.log("Message data: ", messageData);

    // let messageId = messageData.mid;
    const messageText = messageData.text;
    const messageAttachments = messageData.attachments;
    const nlp = messageData.nlp;

    botty.initConversation(senderId);

    if (messageData.quick_reply) {
        botty.respondToQuickReply(messageData.quick_reply.payload);
    } else {
        botty.readMessage(messageText, messageAttachments, nlp);
    }
}

function handleDeliveryReceipt(message) {
    console.log("Message delivery response: ", message.delivery);
}

function handleReadReceipt(message) {
    console.log("Message read response: ", message.read);
}