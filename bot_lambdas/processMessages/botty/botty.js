"use strict";

// Date manipulation library
const moment = require("../node_modules/moment");

// Botty internal modules
const parser = require("./bottyMessageParser");
const textGenerator = require("./bottyTextGenerator");
const quickReplyHandler = require("./bottyQuickReplyHandler");
// const memory = require("./bottyMemoryInterface"); // TODO: Not in use right now, do we even need message history? (NOTE: history can be either stored in S3 or fetched from FB, need to decide the implementation)

// Facebook Graph API interface
const facebookMessageInterface = require("../facebook/facebookMessageInterface");

// Persistent storage interface 
const dataStagingInterface = require("../dataStagingInterface");

//---------------------------------------------------------------------------//

const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

let typingIndicatorSent = false;

let userTimezoneOffset = 2; // TODO: dirty hardcoding workaround for now to deal with the fact that the server is in GMT.

let analysisResults;

module.exports = {
    setConversationTarget: (targetId) => {
        facebookMessageInterface.setTargetId(targetId);
    },

    respondToQuickReply: (payload) => {
        quickReplyHandler.respondToQuickReply(payload);
    },

    readMessage: function (text, attachments) { // main method: read input text and/or attachments, then reply with something 
        let result;
        result = quickScan(text);

        if (result) {
            if (result.type === "QuickReply") {
                switch (result.text) {
                    case "Help":
                        quickReplyHandler.sendQuickReplyHelp();
                        break;
                    case "UserGuide":
                        quickReplyHandler.sendQuickReplyUserGuide();
                        break;
                }
            } else if (result.text instanceof Array) {
                for (let i = 0; i < result.length; i++) {
                    facebookMessageInterface.sendMessage(result[i].text);
                }
            } else {
                facebookMessageInterface.sendMessage(result.text);
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
            facebookMessageInterface.sendMessage(textGenerator.getText("Uncertain"));
            endConversation();
            return;
        }

        startConversation() // typing indicator on
            .then(setConversationStatus)
            .then(fetchEvents)
            .then(filterEvents)
            .then(buildResponse)
            .then(sendResponse)
            .then(endConversation) // typing indicator off
            .catch((err) => {
                console.log("Error thrown in main Promise chain: ", err);
            });
    }
};

function quickScan(text) {
    let parsedResult = parser.quickScan(text);
    let result = null;
    if (parsedResult) {
        switch (parsedResult) {
            case "HelpRequest":
                result = {
                    type: "QuickReply",
                    text: "Help"
                };
                break;
            case "UserGuide":
                result = {
                    type: "QuickReply",
                    text: "UserGuide"
                };
                break;
            default:
                result = {
                    type: "NormalReply",
                    text: textGenerator.getText(parsedResult)
                };
        }
    }

    return result;
}

function deepScan(text) {
    analysisResults = parser.deepScan(text);
    console.log("deepScan:", analysisResults);
    return analysisResults.matched;
}

// Promise chain functions & handlers start here

function startConversation() {
    return facebookMessageInterface.sendTypingIndicator();
}

function setConversationStatus() {
    typingIndicatorSent = true;
    return Promise.resolve(typingIndicatorSent);
}

function fetchEvents() { // NOTE: this gets the resolve value from setConversationStatus() but we're not using it
    return dataStagingInterface.getEventData();
}

function filterEvents(inputEvents) {
    let outputEvents = inputEvents.filter((evt) => {
        let startTime = moment(evt.start_time);
        return startTime >= analysisResults.dateTimeRange.from && startTime <= analysisResults.dateTimeRange.to;
    });

    if (analysisResults.optionals) {
        outputEvents = outputEvents.filter((evt) => {
            if (!evt._bh) {
                return false;
            }

            // TODO: still need to refactor this to be a more flexible filter 
            if (analysisResults.interests) {
                for (let i = 0; i < analysisResults.interests.length; i++) {
                    if (evt._bh.interestTags.indexOf(analysisResults.interests[i]) !== -1) {
                        if (analysisResults.eventTypes) {
                            return analysisResults.eventTypes.indexOf(evt._bh.type.name) !== -1;
                        } else {
                            return true;
                        }
                    }
                }
                return false;
            } else if (analysisResults.eventTypes) {
                return analysisResults.eventTypes.indexOf(evt._bh.type.name) !== -1;
            }
        });
    }

    return Promise.resolve(outputEvents);
}

function buildResponse(inputEvents) {
    let output = {
        overviewMessage: null,
        eventElements: null
    };

    let baseString;

    let dateDiff = analysisResults.dateTimeRange.to.diff(analysisResults.dateTimeRange.from, "days");

    if (dateDiff > 0) {
        if (inputEvents.length === 0) {
            baseString = textGenerator.getText("NoResults");
        } else if (inputEvents.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
            baseString = textGenerator.getText("OverflowResults");
        } else {
            baseString = textGenerator.getText("NormalResults");
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (inputEvents.length === 0) {
            baseString = textGenerator.getText("NoResultsOneDay");
        } else if (inputEvents.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
            baseString = textGenerator.getText("OverflowResultsOneDay");
        } else {
            baseString = textGenerator.getText("NormalResultsOneDay");
        }
    }

    output.overviewMessage = textGenerator.formatText(baseString, {
        amount: inputEvents.length,
        from: moment(analysisResults.dateTimeRange.from).format("Do MMM"),
        to: moment(analysisResults.dateTimeRange.to).format("Do MMM")
    });

    let elements = [];

    if (inputEvents.length > 0) {
        inputEvents.forEach((eventData) => {
            let subtitleString = "";
            let coverImageUrl = null;

            subtitleString += moment(eventData.start_time).add(userTimezoneOffset, "hours").format("ddd Do MMM HH:mm");

            try {
                if (eventData.place) {
                    subtitleString += "\n" + eventData.place.name;
                    // if (eventData.place.location) {
                    //     subtitleString += textGenerator.formatText(textGenerator.getText("Address"), {
                    //         street: eventData.place.location.street,
                    //         city: eventData.place.location.city
                    //     });
                    // }
                }
            } catch (err) {
                console.log("Error trying to write the location: ", err.message);
            }

            if (eventData._bh && eventData._bh.type) {
                subtitleString += textGenerator.formatText(textGenerator.getText("EventType"), {
                    type: eventData._bh.type.name,
                    confidence: eventData._bh.type.confidence
                });
            } else if (eventData.attending_count) {
                subtitleString += textGenerator.formatText(textGenerator.getText("Attending"), {
                    count: eventData.attending_count
                });
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

        if (elements.length > 10) {
            while (elements.length > 10) {
                elements.pop();
            }
        }

        output.eventElements = elements;
    }

    return Promise.resolve(output);
}

function sendResponse(input) {
    return facebookMessageInterface.sendMessage(input.overviewMessage).then(
        (response) => {
            if (input.eventElements) {
                return facebookMessageInterface.sendGenericTemplateMessage(input.eventElements);
            } else {
                return response;
            }
        }
    );
}

function endConversation() {
    console.log("End of conversation reached.");
    if (typingIndicatorSent) {
        facebookMessageInterface.sendTypingIndicator(false);
    }
}