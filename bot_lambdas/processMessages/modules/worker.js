const { verifySignature } = require("./facebook/requestVerifier");
const botty = require("./botty/botty");

const DEBUG_MODE = process.env.DEBUG_MODE === "ALL" || process.env.DEBUG_MODE === "MESSAGE_PROCESSING";

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

    const { object, entry } = JSON.parse(event.body);
    if (object && object === "page") {
        // Iterate over each entry - there may be multiple if batched
        entry.forEach((batch) => {
            batch.messaging.forEach((msg) => {
                if(msg.message){
                    handleReceivedMessage(msg);
                }else if(msg.delivery){
                    handleDeliveryReceipt(msg);
                }else if(msg.read){
                    handleReadReceipt(msg);
                }else{
                    console.log("[WARN] Webhook received unknown event", msg);
                }
            });
        });
    } else {
        console.log("[WARN] Received unexpected payload", { object, entry });
    }

    // always return 200 so that Facebook doesn't spam the lambda like crazy. If any issues appear, it's a server-side problem and Facebook constantly calling an incorrect webhook won't help
    return {
        statusCode: 200,
        payload: "OK"
    };
};

const handleReceivedMessage = ({sender, message}) => {
    const senderId = sender.id;

    if (DEBUG_MODE){
        console.log("[DEBUG] entire message data structure: ", JSON.stringify(message));
    }

    const { quick_reply, text, attachments, nlp } = message;

    botty.initConversation(senderId, DEBUG_MODE);

    return botty.readMessage(message);
};

const handleDeliveryReceipt = (message) => {
    console.log("Message delivery response: ", message.delivery);

    return true;
};

const handleReadReceipt = (message) => {
    console.log("Message read response: ", message.read);

    return true;
};

module.exports = {
    processMessages
};