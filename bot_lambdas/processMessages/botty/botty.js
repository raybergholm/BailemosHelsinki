"use strict";

// Date manipulation library
const moment = require("../node_modules/moment");

// Botty internal modules
const parser = require("./bottyMessageParser");
const textGenerator = require("./bottyTextGenerator");
const memory = require("./bottyMemoryInterface");

// Facebook Graph API interface
const facebookMessageInterface = require("../facebook/facebookMessageInterface");

// Persistent storage interface 
const dataStagingInterface = require("../dataStagingInterface");

//---------------------------------------------------------------------------//

const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

const FAST_ACTIONS = { // if the bot replies with these, no call is required to DDB/S3
    Greetings: "Greetings",
    Thank: "Thank",
    ReplyToThanks: "ReplyToThanks",
    Embarressed: "Embarressed",
    Apologise: "Apologise",
    HelpRequest: "HelpRequest",
    Disclaimer: "Disclaimer"
};

let typingIndicatorSent = false;

let targetId;

let analysisResults;

module.exports = {
    setConversationTarget: (targetId) => {
        facebookMessageInterface.setTargetId(targetId);
    },

    replyToQuickAction: function () {

    },

    readMessage: function (text, attachments) { // main method: read input text and/or attachments, then reply with something 
        let result;
        result = quickScan(text);

        if (result) {
            if (result instanceof Array) {
                for (let i = 0; i < result.length; i++) {
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

    beEmbarressed: () => {
        return textGenerator.getText("Embarressed");
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
    let result = parser.quickScan(text);
    let reply = null;
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
            case FAST_ACTIONS.Embarressed:
                reply = module.exports.beEmbarressed();
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
    console.log("deepScan:", analysisResults);
    return analysisResults.matched;
}

function eventDataCallback(stagedData) {
    let organisers = stagedData.organisers;
    let eventMap = {};

    console.log(analysisResults);

    console.log("before filtering: " + stagedData.events.length + " events");

    if (!analysisResults.dateTimeRange || !analysisResults.dateTimeRange.from || !analysisResults.dateTimeRange.to) {
        console.log("major error in date/time range, they were null. Emergency fallback to default date range");
        analysisResults.dateTimeRange = parser.getDefaultDateRange();
    }

    // Filter by datetime: this is the only mandatory filter so build the whitelist from everything within the time range
    stagedData.events.forEach((eventData) => {
        if (eventData.start_time.getTime() > analysisResults.dateTimeRange.from.valueOf() && eventData.end_time.getTime() < analysisResults.dateTimeRange.to.valueOf()) {
            eventMap[eventData.id] = eventData;
        }
    });

    console.log("after temporal filtering: " + Object.keys(eventMap).length + " events");

    // Start throwing out things which don't fit the rest of the keywords
    eventMap = parser.filterEvents(eventMap, analysisResults);

    console.log("after all filtering: " + Object.keys(eventMap).length + " events");

    // Convert back to an array
    let filteredEvents = Object.keys(eventMap).map((id) => {
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
    let elements = [];

    if (filteredEvents.length > 0) {
        filteredEvents.forEach((eventData) => {
            let subtitleString = "";
            let coverImageUrl = null;

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

    let baseString;
    if (filteredEvents.length === 0) {
        baseString = textGenerator.getText("NoResults");
    } else if (filteredEvents.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
        baseString = textGenerator.getText("OverflowResults");
    } else {
        baseString = textGenerator.getText("NormalResults");
    }

    let messageText = textGenerator.formatText(baseString, {
        amount: filteredEvents.length,
        from: moment(analysisResults.dateTimeRange.from).format("DD.MM"),
        to: moment(analysisResults.dateTimeRange.to).format("DD.MM")
    });

    facebookMessageInterface.sendMessage({
        text: messageText
    });

    if (elements.length > 0) {
        if (elements.length > 10) {
            while (elements.length > 10) {
                elements.pop();
            }
        }

        facebookMessageInterface.sendTemplatedMessage(elements);
    }

    endConversation();
}