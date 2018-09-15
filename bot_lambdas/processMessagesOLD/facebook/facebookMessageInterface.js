"use strict";

// Facebook GraphAPI submodules
const facebookApiInterface = require("./facebookApiInterface");
const messageFactory = require("./facebookMessageFactory");

//---------------------------------------------------------------------------//

const FACEBOOK_API_VERSION = "v2.11";
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const api = facebookApiInterface(FACEBOOK_API_VERSION, FACEBOOK_ACCESS_TOKEN);

const factory = (targetId, texts) => {
    const messageInterface = {
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

        sendQuickReplyHelp: () => {
            const text = texts.getText(messageFactory.QuickReplyPayloads.Help_Start);
            const message = messageFactory.createQuickReplyHelpMessage(targetId, text);

            return sendMessageToFacebook(message);
        },

        sendQuickReplyUserGuide: () => {
            const text = texts.getText(messageFactory.QuickReplyPayloads.UserGuide_Start);
            const message = messageFactory.createQuickReplyUserGuideMessage(targetId, text);

            return sendMessageToFacebook(message);
        },

        respondToQuickReply: (payload) => {
            let promise;
            switch (payload) {
                case messageFactory.QuickReplyPayloads.NewUserIntro:
                    promise = messageInterface.sendQuickReplyMessage("");
                    break;
                case messageFactory.QuickReplyPayloads.BottyOverview:
                    promise = messageInterface.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.BottyOverview), [{
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
                    promise = messageInterface.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.HowTo_Start), [{
                        type: "text",
                        text: "Any examples?",
                        payload: messageFactory.QuickReplyPayloads.HowTo_Examples
                    }]);
                    break;
                case messageFactory.QuickReplyPayloads.HowTo_Examples:
                    promise = messageInterface.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.HowTo_Examples));
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_Start:
                    promise = messageInterface.sendQuickReplyUserGuide();
                    break;
                case messageFactory.QuickReplyPayloads.UserGuide_Datetime:
                    promise = messageInterface.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_Datetime), [{
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
                    promise = messageInterface.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_EventTypes), [{
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
                    promise = messageInterface.sendQuickReplyMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_Interests), [{
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
                    promise = messageInterface.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.UserGuide_End));
                    break;
                case messageFactory.QuickReplyPayloads.Disclaimer:
                    messageInterface.sendMessage(texts.getText(messageFactory.QuickReplyPayloads.Disclaimer));
                    break;
            }
            return promise;
        }
    };
    return messageInterface;
};

function sendMessageToFacebook(payload) {
    console.log("Outbound message payload: ", payload.message);
    return api.sendMessage(JSON.stringify(payload));
}

module.exports = factory;