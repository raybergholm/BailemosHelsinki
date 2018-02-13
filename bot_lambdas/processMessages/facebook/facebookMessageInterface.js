"use strict";

const request = require("../utils/httpUtils");

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const messageFactory = require("./facebookMessageFactory");

//---------------------------------------------------------------------------//

const factory = targetId => texts => {
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
            const message = messageFactory.createMessage(targetId, text, attachment);
            return sendMessageToFacebook(message);
        },

        sendQuickReplyMessage: (text, quickReplies) => {
            const message = messageFactory.createQuickReplyMessage(targetId, text, quickReplies);
            return sendMessageToFacebook(message);
        },

        sendGenericTemplateMessage: (elements) => {
            const message = messageFactory.createGenericMessageTemplate(targetId, elements);
            return sendMessageToFacebook(message);
        },

        respondToQuickReply: (payload) => {
            switch (payload) {
                case messageFactory.QuickReplyPayloads.NewUserIntro:
                    this.sendQuickReplyMessage("");
                    break;
                case messageFactory.QuickReplyPayloads.BottyOverview:
                    this.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.BottyOverview), [{
                            type: "text",
                            text: "Quickstart",
                            payload: messageFactory.QuickReplyPayloads.HowTo_Start
                        },
                        {
                            type: "text",
                            text: "Detailed guide",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_Start
                        }
                    ]);
                    break;
                case messageFactory.QuickReplyPayloads.HowTo_Start:
                    this.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.HowTo_Start), [{
                        type: "text",
                        text: "Any examples?",
                        payload: messageFactory.QuickReplyPayloads.HowTo_Examples
                    }]);
                    break;
                case messageFactory.QuickReplyPayloads.HowTo_Examples:
                    this.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.HowTo_Examples));
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_Start:
                    module.exports.sendQuickReplyUserGuide();
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_Datetime:
                    this.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_Datetime), [{
                            type: "text",
                            text: "Event types?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_EventTypes
                        },
                        {
                            type: "text",
                            text: "Dance styles?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_Interests
                        },
                        {
                            type: "text",
                            text: "OK, got it!",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_End
                        }
                    ]);
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_EventTypes:
                    this.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_EventTypes), [{
                            type: "text",
                            text: "Date & time?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_Datetime
                        },
                        {
                            type: "text",
                            text: "Dance styles?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_Interests
                        },
                        {
                            type: "text",
                            text: "OK, got it!",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_End
                        }
                    ]);
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_Interests:
                    this.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_Interests), [{
                            type: "text",
                            text: "Date & time?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_Datetime
                        },
                        {
                            type: "text",
                            text: "Event types?",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_EventTypes
                        },
                        {
                            type: "text",
                            text: "OK, got it!",
                            payload: messageFactory.QuickReplyPayloads.UserGuide_End
                        }
                    ]);
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_End:
                    this.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_End));
                    break;
                case messageFactory.QuickReplyPayloads.Disclaimer:
                    module.exports.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.Disclaimer));
                    break;
            }
        }
    };
};

function sendMessageToFacebook(payload) {
    return request.post(facebookApiInterface.getHostUrl(), facebookApiInterface.getSendMessagePath(), payload);
}

module.exports = factory;