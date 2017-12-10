const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

module.exports = {
    _targetId: null,
    
    setTargetId: function (targetId) {
        this._targetId = targetId;
    },

    createMessage: function (payload) {
        return {
            messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
            recipient: {
                id: this._targetId
            },
            sender: {
                id: FACEBOOK_PAGE_ID
            },
            message: payload
        };
    },

    createSenderActionMessage: function (action) {
        return {
            messaging_type: "RESPONSE", // NOTE: Messenger API v2.2 compliance: this field is mandatory from 07.05.2018 onwards
            recipient: {
                id: this._targetId
            },
            sender: {
                id: FACEBOOK_PAGE_ID
            },
            sender_action: action
        };
    },

    createBaseTemplate: function () {
        return {
            attachment: {
                type: "template",
                payload: null
            }
        };
    },

    createGenericMessageTemplate: function (elements) {
        var messageTemplate = this.createBaseTemplate();
        messageTemplate.attachment.payload = {
            template_type: "generic",
            elements: elements
        };
        return this.createMessage(messageTemplate);
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