"use strict";

// Botty internal modules
const textGenerator = require("./bottyTextGenerator");

// Facebook Graph API interface
const facebookMessageInterface = require("../facebook/facebookMessageInterface");

//---------------------------------------------------------------------------//

const QUICK_REPLY_PAYLOADS = {
    NewUserIntro: "NewUserIntro",
    BottyOverview: "BottyOverview",
    HowTo_Start: "HowTo_Start",
    HowTo_Examples: "HowTo_Examples",
    UserGuide_Start: "UserGuide_Start",
    UserGuide_Datetime: "UserGuide_Datetime",
    UserGuide_EventTypes: "UserGuide_EventTypes",
    UserGuide_Interests: "UserGuide_Interests",
    UserGuide_End: "UserGuide_End",
    Disclaimer: "Disclaimer"
};

module.exports = {
    sendQuickReplyHelp: () => {
        let text = textGenerator.getText("HelpQuickReplyHeader");

        let quickReplies = [{
                type: "text",
                text: "Who are you?",
                payload: QUICK_REPLY_PAYLOADS.BottyOverview
            },
            {
                type: "text",
                text: "Quickstart",
                payload: QUICK_REPLY_PAYLOADS.HowTo_Start
            },
            {
                type: "text",
                text: "Detailed guide",
                payload: QUICK_REPLY_PAYLOADS.UserGuide_Start
            }
        ];

        facebookMessageInterface.sendQuickReplyMessage(text, quickReplies);
    },

    sendQuickReplyUserGuide: () => {
        let text = textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Start);

        let quickReplies = [{
                type: "text",
                text: "Date & time?",
                payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
            },
            {
                type: "text",
                text: "Event types?",
                payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
            },
            {
                type: "text",
                text: "Dance styles?",
                payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
            }
        ];

        facebookMessageInterface.sendQuickReplyMessage(text, quickReplies);
    },

    respondToQuickReply: (payload) => {
        switch (payload) {
            case QUICK_REPLY_PAYLOADS.NewUserIntro:
                facebookMessageInterface.sendQuickReplyMessage("");
                break;
            case QUICK_REPLY_PAYLOADS.BottyOverview:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.BottyOverview), [{
                        type: "text",
                        text: "Quickstart",
                        payload: QUICK_REPLY_PAYLOADS.HowTo_Start
                    },
                    {
                        type: "text",
                        text: "Detailed guide",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Start
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.HowTo_Start:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.HowTo_Start), [{
                    type: "text",
                    text: "Any examples?",
                    payload: QUICK_REPLY_PAYLOADS.HowTo_Examples
                }]);
                break;
            case QUICK_REPLY_PAYLOADS.HowTo_Examples:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.HowTo_Examples));
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Start:
                this.sendQuickReplyUserGuide();
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Datetime:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Datetime), [{
                        type: "text",
                        text: "Event types?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
                    },
                    {
                        type: "text",
                        text: "Dance styles?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_EventTypes:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_EventTypes), [{
                        type: "text",
                        text: "Date & time?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
                    },
                    {
                        type: "text",
                        text: "Dance styles?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Interests:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Interests), [{
                        type: "text",
                        text: "Date & time?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
                    },
                    {
                        type: "text",
                        text: "Event types?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_End:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_End));
                break;
            case QUICK_REPLY_PAYLOADS.Disclaimer:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.Disclaimer));
                break;
        }
    }
};