"use strict";

const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

var moment = require("../node_modules/moment");

// Botty internal modules
var parser = require("./bottyMessageParser");
var textGenerator = require("./bottyTextGenerator");
var memory = require("./bottyMemoryInterface");

// Facebook Graph API interface
var facebookApiInterface = require("../facebook/facebookApiInterface");
var facebookMessageInterface = require("../facebook/facebookMessageInterface");

// Persistent storage interface 
var dataStagingInterface = require("../dataStagingInterface");

const FAST_ACTIONS = { // if the bot replies with these, no call is required to DDB/S3
    Greetings: "Greetings",
    Thank: "Thank",
    ReplyToThanks: "ReplyToThanks",
    Apologise: "Apologise",
    HelpRequest: "HelpRequest",
    Disclaimer: "Disclaimer"
};

var typingIndicatorSent = false;

var analysisResults;

module.exports = {
    setConversationTarget: (targetId) => {
        facebookMessageInterface.setTargetId(targetId);
    },

    replyToQuickAction: function () {

    },

    readMessage: function (text, attachments) { // main method: read input text and/or attachments, then reply with something 
        var result;
        result = quickScan(text);

        if (result) {
            if (result instanceof Array) {
                for (var i = 0; i < result.length; i++) {
                    facebookMessageInterface.sendMessage({
                        text: result[i]
                    });
                }
            } else {
                facebookMessageInterface.sendMessage({
                    text: result
                });
            }
            return;
        }

        if (attachments) {
            // TODO: what do we want to do with attachments?
        }

        // this will require a deepScan and may take longer. Send typing indicator
        facebookMessageInterface.sendTypingIndicator(typingIndicatorSent);
        typingIndicatorSent = true;

        result = deepScan(text);
        if (!result) {
            facebookMessageInterface.sendMessage({
                text: textGenerator.getText("Uncertain")
            });
            endConversation();
            return;
        }

        dataStagingInterface.getEventData(eventDataCallback);
    },

    reply: () => {

    },

    greet: () => {
        return textGenerator.getText("Greetings");
    },

    thank: () => {
        return textGenerator.getText("Thank");
    },

    replyToThanks: () => {
        return textGenerator.getText("ReplyToThanks");
    },

    apologise: () => {
        return textGenerator.getText("Apologise");
    },

    beUncertain: () => {
        return textGenerator.getText("Uncertain");
    },

    giveUserHelp: () => {
        return textGenerator.getAllText("HelpRequest");
    },

    giveDisclaimer: () => {
        return textGenerator.getAllText("Disclaimer");
    }
};

function endConversation() {
    if (typingIndicatorSent) {
        facebookMessageInterface.sendTypingIndicator(false);
    }
}

function quickScan(text) {
    var result = parser.quickScan(text);
    var reply = null;
    if (result) {
        switch (result) {
            case FAST_ACTIONS.Greetings:
                reply = module.exports.greet();
                break;
            case FAST_ACTIONS.Thank:
                reply = module.exports.thank();
                break;
            case FAST_ACTIONS.ReplyToThanks:
                reply = module.exports.replyToThanks();
                break;
            case FAST_ACTIONS.Apologise:
                reply = module.exports.apologise();
                break;
            case FAST_ACTIONS.HelpRequest:
                reply = module.exports.giveUserHelp();
                break;
            case FAST_ACTIONS.Disclaimer:
                reply = module.exports.giveDisclaimer();
                break;
        }
    }
    return reply;
}

function deepScan(text) {
    analysisResults = parser.deepScan(text);
    return analysisResults.matched;
}

function eventDataCallback(stagedData) {
    var organisers = stagedData.organisers;
    var eventMap = {};

    console.log("before filtering: " + stagedData.events.length + " events");

    // Filter by datetime: this is the only mandatory filter so build the whitelist from everything within the time range
    stagedData.events.forEach((eventData) => {
        if (eventData.start_time.getTime() > analysisResults.dateTimeRange.from.getTime() && eventData.end_time.getTime() < analysisResults.dateTimeRange.to.getTime()) {
            eventMap[eventData.id] = eventData;
        }
    });

    console.log("after temporal filtering: " + Object.keys(eventMap).length + " events");

    // Start throwing out things which don't fit the rest of the keywords
    eventMap = parser.filterEvents(eventMap, analysisResults);

    console.log("after all filtering: " + Object.keys(eventMap).length + " events");

    // Convert back to an array
    var filteredEvents = Object.keys(eventMap).map((id) => {
        return eventMap[id];
    });

    // Sort array by ascending time
    filteredEvents.sort((left, right) => {
        if (!left.start_time.getTime() === right.start_time.getTime()) {
            return 0;
        } else {
            return left.start_time.getTime() < right.start_time.getTime() ? -1 : 1;
        }
    });

    replyWithFilteredEvents(filteredEvents);
}

function replyWithFilteredEvents(filteredEvents) {
    var elements = [];

    if (filteredEvents.length > 0) {
        filteredEvents.forEach((eventData) => {
            var subtitleString = "";
            var coverImageUrl = null;

            subtitleString += moment(eventData.start_time).format("DD.MM.YYYY HH:mm");

            try {
                if (eventData.place) {
                    subtitleString += "\n" + eventData.place.name;
                    if (eventData.place.location) {
                        subtitleString += "\n" + eventData.place.location.street + ", " + eventData.place.location.city;
                    }
                }
            } catch (err) {
                console.log("Error trying to write the location: ", err.message);
            }

            if (eventData.attending_count) {
                subtitleString += "\n " + eventData.attending_count + " people attending";
            }

            if (eventData.cover && eventData.cover.source) {
                coverImageUrl = eventData.cover.source;
            }

            elements.push({
                title: eventData.name,
                subtitle: subtitleString,
                imageUrl: coverImageUrl,
                actionUrl: "https://www.facebook.com/events/" + eventData.id
            });
        });
    }

    var baseString;
    if (filteredEvents.length === 0) {
        baseString = textGenerator.getText("NoResults");
    } else if (filteredEvents.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
        baseString = textGenerator.getText("NormalResults");
    } else {
        baseString = textGenerator.getText("OverflowResults");
    }

    var messageText = textGenerator.formatText(baseString, {
        amount: filteredEvents.length,
        from: moment(analysisResults.dateTimeRange.from).format("DD.MM"),
        to: moment(analysisResults.dateTimeRange.to).format("DD.MM")
    });

    facebookMessageInterface.sendMessage({
        text: messageText
    });

    if (elements.length > 10) {
        while (elements.length > 10) {
            elements.pop();
        }
    }

    facebookMessageInterface.sendTemplatedMessage(elements);
}