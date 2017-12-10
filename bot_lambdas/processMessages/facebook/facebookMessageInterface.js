var https = require("https");

var facebookApiInterface = require("./facebookApiInterface");
var facebookMessageHelper = require("./facebookMessageHelper");


var _messageBuffer = new MessageBuffer();

module.exports = {
    sendTypingIndicator: function (mode) {
        var typingIndicatorMessage = facebookMessageHelper.createSenderActionMessage(mode ? "typing_on" : "typing_off");
        // this.sendMessage(typingIndicatorMessage); // FIXME: turning this off for now since it's clogging up the logs. Can reenable this after the main logic gets cleaned up
    },

    enqueueMessage: function (message) {
        _messageBuffer.enqueue(message);
    },

    send: function () {
        var payload;
        if (_messageBuffer.length === 0) {
            payload = _messageBuffer.flush();
            this.sendMessage(payload);
        } else {
            payload = _messageBuffer.flush();
            this.sendBatchedMessage(payload);
        }

    },

    sendMessage: function (payload) {
        console.log("sending this message payload to FB:", payload);

        var body = payload;
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

    module.sendTypingIndicator(false);
}

function MessageBuffer() {
    this._queuedMessages = [],
        this.enqueue = function (message) {

            this._queuedMessages.push(message);
            this.flush(); // FIXME: there's some formatting issue with this whole thing right now so temp fix is to send messages immediately
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
                    body: encodeURIComponent(JSON.stringify(this._queuedMessages[i])) // TODO: This is hella broken, body needs a different format entirely?
                });
            }

            content = "batch=" + JSON.stringify(batchRequestContent);
        }

        this._messages = [];

        return content;
    }
}