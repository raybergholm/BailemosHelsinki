"use strict";

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

module.exports = {
    createMessage: function (targetId, text, attachment) {
        let message = createMessageBase(targetId);

        if (text) {
            message.message.text = text;
        }
        if (attachment) {
            message.message.attachment = attachment;
        }
        return message;
    },

    createSenderActionMessage: function (targetId, action) {
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

    createGenericMessageTemplate: function (targetId, text, elements) {
        let messageTemplate;

        if (elements && elements.length > 0) {
            messageTemplate = createTemplateBase();
            messageTemplate.payload = {
                template_type: "generic",
                elements: elements.map((item) => {
                    return createTemplateElement(item.title, item.subtitle, item.imageUrl, item.actionUrl)
                })
            };
        }

        return createMessage(targetId, text, messageTemplate);
    },

    createQuickReplyMessage: function (targetId, text, quickReplies) {
        let message = createMessageBase(targetId);

        if (text) {
            message.message.text = text;
        }

        if (quickReplies) {
            message.quick_replies = quickReplies.map((item) => {
                return item.type === "text" ? createTextQuickReply(item.text, item.payload, item.imageUrl) : createLocationQuickReply();
            });
        }

        return message;
    },
};

function createMessageBase(targetId) {
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
    }
}

function createTextQuickReply(text, payload, imageUrl) {
    let quickReply = {
        text: text,
        payload: payload
    }

    if (imageUrl) { // optional property 
        quickReply.image_url = imageUrl;
    }

    return quickReply;
}