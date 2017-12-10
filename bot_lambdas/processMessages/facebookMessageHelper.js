module.exports = {
    _ownId: null,
    _targetId: null,

    setOwnId: function (ownId) {
        this._ownId = ownId;
    },
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
                id: this._ownId
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
                id: this._ownId
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