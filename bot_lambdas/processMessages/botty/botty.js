"use strict";

// Date manipulation library
const moment = require("../node_modules/moment");

// Botty internal modules
const parser = require("./bottyMessageParser");
const textGenerator = require("./bottyTextGenerator");
// const memory = require("./bottyMemoryInterface"); // TODO: Not in use right now, do we even need message history? (NOTE: history can be either stored in S3 or fetched from FB, need to decide the implementation)

// Facebook Graph API interface
const facebookMessageInterface = require("../facebook/facebookMessageInterface");

// Persistent storage interface 
const dataInterface = require("../persistentStorageInterface");

//---------------------------------------------------------------------------//

const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

let conversation = null;

let typingIndicatorSent = false;

let analysisResults;

module.exports = {
    initConversation: (targetId) => {
        conversation = facebookMessageInterface(targetId, textGenerator);
    },

    respondToQuickReply: (payload) => {
        conversation.respondToQuickReply(payload);
    },

    readMessage: function (text, attachments, nlp) { // main method: read input text and/or attachments, then reply with something 
        console.log(`Incoming message with text: "${text}", ${attachments ? "with" : "no"} attachments`);
        console.log("Built-in NLP from Facebook: ", JSON.stringify(nlp));

        if (attachments) {
            // TODO: what do we want to do with attachments?
        }

        const result = analyseInput(text, nlp);

        if (!result) {
            conversation.sendMessage(textGenerator.getText("Uncertain"))
                .then(endConversation)
                .catch((err) => {
                    console.log("Error thrown in null reply chain: ", err);
                });
            return;
        } else if (result.type === "QuickReply") {
            switch (result.text) {
                case "Help":
                    conversation.sendQuickReplyHelp();
                    break;
                case "UserGuide":
                    conversation.sendQuickReplyUserGuide();
                    break;
            }
        } else if (result.type === "NormalReply") {
            if (result.text instanceof Array) {
                for (let i = 0; i < result.length; i++) {
                    conversation.sendMessage(result[i].text)
                        .then(endConversation)
                        .catch((err) => {
                            console.log("Error thrown in short reply chain: ", err);
                        });
                }
            } else {
                conversation.sendMessage(result.text)
                    .then(endConversation)
                    .catch((err) => {
                        console.log("Error thrown in short reply chain: ", err);
                    });
            }
            return;
        }

        // DeferredReply = start convo because we got analysis results and events to fetch

        startConversation() // send "typing indicator on" to FB
            .then(setConversationStatus) // set typing indicator on local boolean
            .then(fetchEvents)
            .then(filterEvents)
            .then(buildResponse)
            .then(sendResponse)
            .then(endConversation) // typing indicator off (where applicable). Log outgoing text
            .catch((err) => {
                console.log("Error thrown in main promise chain: ", err);
            });
    }
};

function analyseInput(text, nlp) {
    let result;
    const parsedFromNlp = new Map();

    // Check the NLP results first, if we have hits here then we can skip custom parsing
    if (nlp && nlp.entities) {
        const nlpResult = parser.parseBuiltinNlp(nlp.entities);

        console.log("Result after parsing NLP:", nlpResult);

        if (nlpResult) {
            nlpResult.forEach((val, key) => {
                switch (key) {
                    case "greetings":
                        result = {
                            type: "NormalReply",
                            text: textGenerator.getText("Greetings")
                        };
                        break;
                    case "helpRequest": // TODO: nothing goes here atm, needs wit.ai integration for this to become functional
                        result = {
                            type: "QuickReply",
                            text: "Help"
                        };
                        break;
                    case "userGuide": // TODO: nothing goes here atm, needs wit.ai integration for this to become functional
                        result = {
                            type: "QuickReply",
                            text: "UserGuide"
                        };
                        break;
                    default:
                        parsedFromNlp.set(key, val);
                }
            });
        }

        if (result) {
            // If it ends up here, short-circuit the rest since it's some quick reply or response that doesn't require persistent storage access
            return result;
        }
    }

    // Need to do custom parsing, though it could be that we have nlpDateTime results to speed things up
    result = quickScan(text); // TODO: Deprecate this over time, move this stuff to wit.ai instead
    if (result) {
        return result;
    }

    result = deepScan(text, parsedFromNlp);

    return result;
}

function quickScan(text) {
    const parsedResult = parser.quickScan(text);
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

function deepScan(text, nlp) {
    analysisResults = parser.deepScan(text, nlp);
    if (analysisResults.matched) {
        return {
            type: "DeferredReply"
        };
    } else {
        return null;
    }
}

// Promise chain functions & handlers start here

function startConversation() {
    return conversation.sendTypingIndicator();
}

function setConversationStatus(typingIndicatorStatus) {
    typingIndicatorSent = typingIndicatorStatus;
    return Promise.resolve(typingIndicatorSent);
}

function fetchEvents() { // NOTE: this gets the resolve value from setConversationStatus() but we're not using it
    return dataInterface.getEvents();
}

function filterEvents(inputEvents) {
    let outputEvents = inputEvents.filter((evt) => {
        const startTime = moment(evt.start_time);
        return analysisResults.dateTimeRange.some((dateTime) => {
            return startTime >= dateTime.from && startTime <= dateTime.to;
        });
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
    const output = {
        overviewMessage: null,
        eventElements: null
    };

    let baseString;

    if (inputEvents.length === 0) {
        baseString = textGenerator.getText("NoResults");
    } else if (inputEvents.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
        baseString = textGenerator.getText("OverflowResults");
    } else {
        baseString = textGenerator.getText("NormalResults");
    }

    output.overviewMessage = textGenerator.formatText(baseString, {
        amount: inputEvents.length
    });

    const elements = [];

    if (inputEvents.length > 0) {
        inputEvents.forEach((eventData) => {
            const displayMoment = moment(eventData.start_time);

            // I don't like having to do it this way, but native Date & moment.js end up losing info on the offset in the original date string
            if (eventData._bh && eventData._bh.timezoneOffset) {
                displayMoment.add(eventData._bh.timezoneOffset.hours, "hours").add(eventData._bh.timezoneOffset.minutes, "minutes");
            }

            let subtitleString = displayMoment.format("ddd Do MMM HH:mm");

            try {
                if (eventData.place) {
                    subtitleString += "\n" + eventData.place.name;
                    if (eventData.place.location) { // For some entries, this part might not be in the JSON response if the organiser didn't input a location which FB could parse
                        subtitleString += ", " + eventData.place.location.city;
                    }
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

            const coverImageUrl = eventData.cover && eventData.cover.source ? eventData.cover.source : null;

            elements.push({
                title: eventData.name,
                subtitle: subtitleString,
                imageUrl: coverImageUrl,
                actionUrl: "https://www.facebook.com/events/" + eventData.id
            });
        });

        while (elements.length > FACEBOOK_GENERIC_TEMPLATE_LIMIT) {
            elements.pop();
        }

        output.eventElements = elements;
    }

    return Promise.resolve(output);
}

function sendResponse(input) {
    return conversation.sendMessage(input.overviewMessage).then(
        (response) => {
            if (input.eventElements) {
                return conversation.sendGenericTemplateMessage(input.eventElements);
            } else {
                return response;
            }
        }
    );
}

function endConversation(messageReceipt) {
    console.log("Returned message receipt: ", messageReceipt);

    if (typingIndicatorSent) {
        conversation.sendTypingIndicator(false);
    }
    return Promise.resolve(messageReceipt);
}