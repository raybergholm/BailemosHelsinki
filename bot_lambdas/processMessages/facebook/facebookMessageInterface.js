"use strict";

const request = require("../utils/httpUtils");

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const facebookMessageFactory = require("./facebookMessageFactory");
const facebookQuickReplyFactory = require("./facebookQuickReplyFactory");

//---------------------------------------------------------------------------//

let messageFactory = null;
let quickReplyFactory = null;

const factory = (targetId) => {
    messageFactory = facebookMessageFactory(targetId);
    quickReplyFactory = facebookQuickReplyFactory();
    
    return {
        sendTypingIndicator: (mode) => {
            // TODO: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
            // let typingIndicatorMessage = conversation.createSenderActionMessage(mode ? "typing_on" : "typing_off");
            // return sendMessageToFacebook(typingIndicatorMessage)
            //     .then((messageReceipt) => {
            //         if (messageReceipt) {
            //             return true;
            //         } else {
            //             throw new Error("Invalid message receipt");
            //         }
            //     });
            return Promise.resolve(true);
        },

        sendMessage: (text, attachment) => {
            if (messageFactory !== null) {
                let message = messageFactory.createMessage(text, attachment);
                return sendMessageToFacebook(message);
            }
        },

        sendQuickReplyMessage: (text, quickReplies) => {
            if (messageFactory !== null) {
                let message = messageFactory.createQuickReplyMessage(text, quickReplies);
                return sendMessageToFacebook(message);
            }
        },

        sendGenericTemplateMessage: (elements) => {
            if (messageFactory !== null) {
                let message = messageFactory.createGenericMessageTemplate(elements);
                return sendMessageToFacebook(message);
            }
        }
    }
};

function sendMessageToFacebook(payload) {
    return new Promise((resolve, reject) => {
        let body = JSON.stringify(payload);
        let options = facebookApiInterface.createSendMessageOptions();

        console.log("Sending payload to Facebook: ", body);

        let callback = (response) => {
            let str = "";
            response.on("data", (chunk) => {
                str += chunk;
            });
            response.on("end", () => {
                resolve(str);
            });
        };

        let req = https.request(options, callback);
        req.on("error", (err) => {
            console.log("problem with request: " + err);
            reject(err);
        });

        req.write(body);
        req.end();
    });
}

module.exports = factory;
