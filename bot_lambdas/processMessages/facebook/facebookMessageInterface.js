"use strict";

const https = require("https");

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const facebookMessageFactory = require("./facebookMessageFactory");

//---------------------------------------------------------------------------//

let _targetId;

module.exports = {
    setTargetId: (targetId) => {
        _targetId = targetId;
    },

    sendTypingIndicator: (mode) => {
        // TODO: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
        // let typingIndicatorMessage = facebookMessageFactory.createSenderActionMessage(_targetId, mode ? "typing_on" : "typing_off");
        // return this.sendMessageToFacebook(typingIndicatorMessage); 
        return Promise.resolve(true);
    },

    sendMessage: (text, attachment) => {
        let message = facebookMessageFactory.createMessage(_targetId, text, attachment);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        return sendMessageToFacebook(message);
    },

    sendQuickReplyMessage: (text, quickReplies) => {
        let message = facebookMessageFactory.createQuickReplyMessage(_targetId, text, quickReplies);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        return sendMessageToFacebook(message);
    },

    sendGenericTemplateMessage: (elements) => {
        let message = facebookMessageFactory.createGenericMessageTemplate(_targetId, elements);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        return sendMessageToFacebook(message);
    }
};

function sendMessageToFacebook(payload) {
    return new Promise((resolve, reject) => {
        console.log("sending this message payload to FB:", payload);

        let body = JSON.stringify(payload);
        let options = facebookApiInterface.createSendMessageOptions();

        let callback = function (response) {
            let str = "";
            response.on("data", (chunk) => {
                str += chunk;
            });
            response.on("end", () => {
                resolve(str);
            });
        };

        let req = https.request(options, callback);
        req.on("error", function (err) {
            console.log("problem with request: " + err);
            reject(err);
        });

        req.write(body);
        req.end();
    });
}