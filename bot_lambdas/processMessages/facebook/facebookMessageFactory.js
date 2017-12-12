"use strict";

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

module.exports = {
    createMessage: function (targetId, text, attachment) {
        var message = createMessageBase(targetId);

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
        var messageTemplate = createTemplateBase();
        messageTemplate.payload = {
            template_type: "generic",
            elements: elements
        };

        return this.createMessage(targetId, text, messageTemplate);
    },

    createTemplateElement: function (title, subtitle, imageUrl, defaultActionUrl) {
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