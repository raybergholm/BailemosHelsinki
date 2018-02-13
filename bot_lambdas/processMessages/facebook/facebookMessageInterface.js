"use strict";

const request = require("../utils/httpUtils");

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const facebookMessageFactory = require("./facebookMessageFactory");

//---------------------------------------------------------------------------//

let conversation = null;

module.exports = {
    setTargetId: (targetId) => {
        conversation = facebookMessageFactory(targetId);
    },

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
        const message = facebookMessageFactory.createMessage(_targetId, text, attachment);
        return sendMessageToFacebook(message);
    },

    sendQuickReplyMessage: (text, quickReplies) => {
        const message = facebookMessageFactory.createQuickReplyMessage(_targetId, text, quickReplies);
        return sendMessageToFacebook(message);
    },

    sendGenericTemplateMessage: (elements) => {
        const message = facebookMessageFactory.createGenericMessageTemplate(_targetId, elements);
        return sendMessageToFacebook(message);
    }
};

function sendMessageToFacebook(payload) {
    return request.post(facebookApiInterface.getHostUrl(), facebookApiInterface.getSendMessagePath(), payload);
}