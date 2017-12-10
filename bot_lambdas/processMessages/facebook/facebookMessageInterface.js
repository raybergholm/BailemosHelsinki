var https = require("https");

var facebookApiInterface = require("./facebookApiInterface");
var facebookMessageHelper = require("./facebookMessageHelper");


var _messageBuffer = new MessageBuffer();

module.exports = {
    sendMessage: function (params) {
        var message = facebookMessageHelper.createMessage(params.text, params.attachment);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        this.sendMessageToFacebook(message);
    },

    sendTemplatedMessage: function (inputElements) {
        var elements = [];
        for (var i = 0; i < inputElements.length; i++) {
            elements.push(facebookMessageHelper.createTemplateElement(
                inputElements[i].title,
                inputElements[i].subtitle,
                inputElements[i].imageUrl,
                inputElements[i].actionUrl
            ));
        }
        var message = facebookMessageHelper.createGenericMessageTemplate(elements);

        // _messageBuffer.enqueue(message);    // TODO: async messaging queues aren't going to work until I figure out what the batched message format actually requires
        this.sendMessageToFacebook(message);
    },

    setTargetId: function (targetId) {
        facebookMessageHelper.setTargetId(targetId);
    },

    sendTypingIndicator: function (mode) {
        var typingIndicatorMessage = facebookMessageHelper.createSenderActionMessage(mode ? "typing_on" : "typing_off");
        // this.sendMessage(typingIndicatorMessage); // TODO: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
    },

    sendAsync: function () {
        var payload;
        if (_messageBuffer.length === 0) {
            payload = _messageBuffer.flush();
            this.sendMessageToFacebook(payload);
        } else {
            payload = _messageBuffer.flush();
            this.sendBatchedMessage(payload);
        }
    },

    sendMessageToFacebook: function (payload) {
        console.log("sending this message payload to FB:", payload);

        var body = JSON.stringify(payload);
        var options = facebookApiInterface.createSendMessageOptions();

        var callback = function (response) {
            var str = "";
            response.on("data", function (chunk) {
                str += chunk;
            });
            response.on("end", function () {
                postDeliveryCallback(str);
            });
        };

        var req = https.request(options, callback);
        req.on("error", function (e) {
            console.log("problem with request: " + e);
        });

        req.write(body);
        req.end();
    },

    sendBatchedMessage: function (payload) {
        console.log("sending this message payload to FB:", payload);

        var body = payload;
        var options = facebookApiInterface.createGraphApiOptions();

        var callback = function (response) {
            var str = "";
            response.on("data", function (chunk) {
                str += chunk;
            });
            response.on("end", function () {
                postDeliveryCallback(str);
            });
        };

        var req = https.request(options, callback);
        req.on("error", function (e) {
            console.log("problem with request: " + e);
        });

        req.write(body);
        req.end();
    }
}

function postDeliveryCallback(str) {
    console.log("callback end, got " + str);

    module.exports.sendTypingIndicator(false);
}

function MessageBuffer() {
    this._queuedMessages = [];
    this.enqueue = function (message) {
        this._queuedMessages.push(message);
    };
    this.flush = function () {
        var content;
        if (this._queuedMessages.length === 1) {
            content = JSON.stringify(this._queuedMessages[0]);
        } else {
            var batchRequestContent = [];
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
}