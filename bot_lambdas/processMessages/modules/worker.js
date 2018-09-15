const { verifySignature } = require("./facebook/requestVerifier");

const processMessages = (event) => {
    try {
        if (!verifySignature(event.headers['X-Hub-Signature'], event.body)) {
            console.log("X-Hub_Signature did not match the expected value");
            const payload = {
                message: "Error, unauthorized request"
            };
            return {
                statusCode: 403,
                payload
            };
        }
    } catch (err) {
        console.log("Error during request verification:", err.message);
        const payload = {
            message: "Internal server error"
        };
        return {
            statusCode: 500,
            payload
        };
    }

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
            console.log(`[ERROR] Unexpected payload, expected 'page', got '${data.object}'`);
        }
    } else {
        console.log("[ERROR] request body was null");
    }

    // always return 200 so that Facebook doesn't spam the lambda like crazy. If any issues appear, it's a server-side problem and Facebook constantly calling an incorrect webhook won't help
    return {
        statusCode: 200,
        payload: "OK"
    };
};

module.exports = {
    processMessages
};