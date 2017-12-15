"use strict";

const https = require("https");

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const facebookMessageFactory = require("./facebookMessageFactory");

//---------------------------------------------------------------------------//

let _messageBuffer = {
    _queuedMessages: [],
    enqueue: function (message) {
        this._queuedMessages.push(message);
    },
    flush: function () {
        let content;
        if (this._queuedMessages.length === 1) {
            content = JSON.stringify(this._queuedMessages[0]);
        } else {
            let batchRequestContent = [];
            for (var i = 0; i < this._queuedMessages.length; i++) {
                batchRequestContent.push({
                    relative_url: encodeURIComponent("/me/messages/"),
                    method: "POST",
                    body: encodeURIComponent(JSON.stringify(this._queuedMessages[i])) // FIXME: This is hella broken, body needs a different format entirely?
                });
            }

            content = "batch=" + JSON.stringify(batchRequestContent);
        }

        this._messages = [];

        return content;
    }
};

let _targetId;

module.exports = {
    setTargetId: (targetId) => {
        _targetId = targetId;
    },

    sendTypingIndicator: (mode) => {
        let typingIndicatorMessage = facebookMessageFactory.createSenderActionMessage(_targetId, mode ? "typing_on" : "typing_off");
        // this.sendMessageToFacebook(typingIndicatorMessage); // TODO: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
    },

    sendMessage: (text, attachment) => {
        let message = facebookMessageFactory.createMessage(_targetId, text, attachment);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        sendMessageToFacebook(message);
    },

    sendQuickReplyMessage: (text, quickReplies) => {
        let message = facebookMessageFactory.createQuickReplyMessage(_targetId, text, quickReplies);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        sendMessageToFacebook(message);
    },

    sendGenericTemplateMessage: (text, elements) => {
        let message = facebookMessageFactory.createGenericMessageTemplate(_targetId, text, elements);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        sendMessageToFacebook(message);
    }
};

function sendMessageToFacebook(payload) {
    console.log("sending this message payload to FB:", payload);

    let body = JSON.stringify(payload);
    let options = facebookApiInterface.createSendMessageOptions();

    let callback = function (response) {
        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });
        response.on("end", () => {
            postDeliveryCallback(str);
        });
    };

    let req = https.request(options, callback);
    req.on("error", function (err) {
        console.log("problem with request: " + err);
    });

    req.write(body);
    req.end();
}

function sendBatchedMessage(payload) {
    console.log("sending this message payload to FB:", payload);

    let body = payload;
    let options = facebookApiInterface.createGraphApiOptions();

    let callback = function (response) {
        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });
        response.on("end", () => {
            postDeliveryCallback(str);
        });
    };

    let req = https.request(options, callback);
    req.on("error", function (err) {
        console.log("problem with request: " + err);
    });

    req.write(body);
    req.end();
}

function postDeliveryCallback(str) {
    console.log("callback end, got " + str);

    module.exports.sendTypingIndicator(false);
}