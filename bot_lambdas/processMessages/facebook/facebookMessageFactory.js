"use strict";

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

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

const factory = (targetId) => {
    return {
        createMessage: (text, attachment) => {
            if (!targetId || (!text && !attachment)) {
                throw new Error("Invalid function arguments: cannot create a message with no targetId or empty body");
            }

            let message = createMessageBase(targetId);

            if (text) {
                message.message.text = text;
            }
            if (attachment) {
                message.message.attachment = attachment;
            }
            return message;
        },

        createSenderActionMessage: (action) => {
            if (!targetId || !action) {
                throw new Error("Invalid function arguments: cannot create a message with no targetId or empty body");
            }

            return {
                messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
                recipient: {
                    id: targetId
                },
                sender: {
                    id: FACEBOOK_PAGE_ID
                },
                sender_action: action
            };
        },

        createGenericMessageTemplate: (elements) => {
            if (!targetId || !elements) {
                throw new Error("Invalid function arguments: cannot create a message with no targetId or empty body");
            }

            let messageTemplate;

            if (elements && elements.length > 0) {
                messageTemplate = createTemplateBase();
                messageTemplate.payload = {
                    template_type: "generic",
                    elements: elements.map((item) => {
                        return createTemplateElement(item.title, item.subtitle, item.imageUrl, item.actionUrl);
                    })
                };
            }

            return module.exports.createMessage(targetId, null, messageTemplate); // A message template is just a message with an attachment and no text, so we can reuse the other function
        },

        createQuickReplyHelpMessage: (text) => {
            if (!targetId) {
                throw new Error("Invalid function arguments: cannot create a message with no targetId or empty body");
            }

            let message = createMessageBase(targetId);

            if (text) {
                message.message.text = text;
            }

            const quickReplies = createQuickReplyHelpPayload();

            if (quickReplies) {
                message.message.quick_replies = quickReplies.map((item) => {
                    return item.type === "location" ? createLocationQuickReply() : createTextQuickReply(item.text, item.payload, item.imageUrl);
                });
            }

            return message;
        },

        createQuickReplyUSerGuideMessage: (text) => {
            if (!targetId) {
                throw new Error("Invalid function arguments: cannot create a message with no targetId or empty body");
            }

            let message = createMessageBase(targetId);

            if (text) {
                message.message.text = text;
            }

            const quickReplies = createQuickReplyUserGuidePayload();

            if (quickReplies) {
                message.message.quick_replies = quickReplies.map((item) => {
                    return item.type === "location" ? createLocationQuickReply() : createTextQuickReply(item.text, item.payload, item.imageUrl);
                });
            }

            return message;
        }
    };
};

// Everything below here is for creating fragments of a valid message. They're not meant to be publically accessible (which is why they are not in the module.exports section), since anything outside this module should only know "call this method to get a fully formed message"

function createMessageBase(targetId) {
    if (!targetId) {
        throw new Error("Invalid function arguments: cannot create a message base with no targetId");
    }

    return {
        messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
        recipient: {
            id: targetId
        },
        sender: {
            id: FACEBOOK_PAGE_ID
        },
        message: {}
    };
}

function createTemplateBase() {
    return {
        type: "template",
        payload: null
    };
}

function createTemplateElement(title, subtitle, imageUrl, defaultActionUrl) {
    return {
        title: title,
        subtitle: subtitle,
        image_url: imageUrl,
        default_action: {
            type: "web_url",
            url: defaultActionUrl
        }
    };
}

function createLocationQuickReply() {
    return {
        content_type: "location"
    };
}

function createTextQuickReply(text, payload, imageUrl) {
    let quickReply = {
        content_type: "text",
        title: text,
        payload: payload
    };

    if (imageUrl) { // optional property 
        quickReply.image_url = imageUrl;
    }

    return quickReply;
}

function createQuickReplyHelpPayload() {
    return [{
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
}

function createQuickReplyUserGuidePayload() {
    return [{
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
}

module.exports = factory;