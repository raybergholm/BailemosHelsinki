"use strict";

// Date manipulation library
const moment = require("../node_modules/moment");
moment.locale("en-GB");

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

const QUICK_REPLY_PAYLOADS = {
    BottyOverview: "BottyOverview",
    HowTo_Start: "HowTo_Start",
    HowTo_Examples: "HowTo_Examples",
    UserGuide_Start: "UserGuide_Start",
    UserGuide_Datetime: "UserGuide_Datetime",
    UserGuide_EventTypes: "UserGuide_EventTypes",
    UserGuide_Interests: "UserGuide_Interests",
    UserGuide_End: "UserGuide_End",
    Disclaimer: "Disclaimer"
};

let typingIndicatorSent = false;

let analysisResults;

module.exports = {
    setConversationTarget: (targetId) => {
        facebookMessageInterface.setTargetId(targetId);
    },

    replyToQuickReply: function (quickReplyPayload) {
        switch (quickReplyPayload) {
            case QUICK_REPLY_PAYLOADS.BottyOverview:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.BottyOverview), [{
                        type: "text",
                        text: "Quickstart",
                        payload: QUICK_REPLY_PAYLOADS.HowTo_Start
                    },
                    {
                        type: "text",
                        text: "Detailed guide",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Start
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.HowTo_Start:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.HowTo_Start), [{
                    type: "text",
                    text: "How about some examples?",
                    payload: QUICK_REPLY_PAYLOADS.HowTo_Examples
                }]);
                break;
            case QUICK_REPLY_PAYLOADS.HowTo_Examples:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.HowTo_Examples));
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Start:
                sendQuickReplyUserGuide();
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Datetime:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Datetime), [{
                        type: "text",
                        text: "Event types?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
                    },
                    {
                        type: "text",
                        text: "Dance styles?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_EventTypes:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_EventTypes), [{
                        type: "text",
                        text: "Date & time?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
                    },
                    {
                        type: "text",
                        text: "Dance styles?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_Interests:
                facebookMessageInterface.sendQuickReplyMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Interests), [{
                        type: "text",
                        text: "Date & time?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
                    },
                    {
                        type: "text",
                        text: "Event types?",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
                    },
                    {
                        type: "text",
                        text: "OK, got it!",
                        payload: QUICK_REPLY_PAYLOADS.UserGuide_End
                    }
                ]);
                break;
            case QUICK_REPLY_PAYLOADS.UserGuide_End:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_End));
                break;
            case QUICK_REPLY_PAYLOADS.Disclaimer:
                facebookMessageInterface.sendMessage(textGenerator.getText(QUICK_REPLY_PAYLOADS.Disclaimer));
                break;
        }
    },

    readMessage: function (text, attachments) { // main method: read input text and/or attachments, then reply with something 
        let result;
        result = quickScan(text);

        if (result) {
            if (result.type === "QuickReply") {
                switch (result.text) {
                    case "Help":
                        sendQuickReplyHelp();
                        break;
                    case "UserGuide":
                        sendQuickReplyUserGuide();
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

        dataStagingInterface.getEventData(eventDataCallback);
    }
};

function endConversation() {
    if (typingIndicatorSent) {
        facebookMessageInterface.sendTypingIndicator(false);
    }
}

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

function eventDataCallback(stagedData) {
    // console.log(analysisResults);

    if (!analysisResults.dateTimeRange || !analysisResults.dateTimeRange.from || !analysisResults.dateTimeRange.to) {
        console.log("major error in date/time range, they were null. Emergency fallback to default date range");
        analysisResults.dateTimeRange = parser.getDefaultDateRange();
    }

    // console.log("before filtering: " + stagedData.length + " events");

    // Start throwing out things which don't fit the rest of the keywords
    let filteredEvents = filterEvents(stagedData, analysisResults);

    // console.log("after all filtering: " + filteredEvents.length + " events");

    replyWithEvents(filteredEvents);
}

function filterEvents(events, analysisResults) {
    let filteredEvents = [];
    for (let i = 0; i < events.length; i++) {
        // Filter by date & time: the array is already sorted in date order so we can just use one standard loop
        let startTime = moment(events[i].start_time);

        if (startTime < analysisResults.dateTimeRange.from) { // TODO: check how moment 
            continue; // too early, keep going
        } else if (startTime > analysisResults.dateTimeRange.to) {
            break; // everything after this is outside the date range, we can discard the rest
        }

        if (events[i]._bh && analysisResults.optionals) {
            if (analysisResults.interests) {
                for (let j = 0; j < analysisResults.interests.length; j++) {
                    if (events[i]._bh.interestTags.indexOf(analysisResults.interests[j]) !== -1) {
                        if (analysisResults.eventTypes) {
                            if (analysisResults.eventTypes.indexOf(events[i]._bh.type.name) !== -1) {
                                filteredEvents.push(events[i]);
                            }
                        } else {
                            filteredEvents.push(events[i]);
                        }
                        break;
                    }
                }
            } else if (analysisResults.eventTypes) {
                if (analysisResults.eventTypes.indexOf(events[i]._bh.type.name) !== -1) {
                    filteredEvents.push(events[i]);
                }
            }
        } else {
            filteredEvents.push(events[i]);
        }
    }
    return filteredEvents;
}

function sendQuickReplyHelp() {
    let text = textGenerator.getText("HelpQuickReplyHeader");

    let quickReplies = [{
            type: "text",
            text: "Who are you?",
            payload: QUICK_REPLY_PAYLOADS.BottyOverview
        },
        {
            type: "text",
            text: "Quickstart",
            payload: QUICK_REPLY_PAYLOADS.HowTo_Start
        },
        {
            type: "text",
            text: "Detailed guide",
            payload: QUICK_REPLY_PAYLOADS.UserGuide_Start
        }
    ];

    facebookMessageInterface.sendQuickReplyMessage(text, quickReplies);
}

function sendQuickReplyUserGuide() {
    let text = textGenerator.getText(QUICK_REPLY_PAYLOADS.UserGuide_Start);

    let quickReplies = [{
            type: "text",
            text: "Date & time?",
            payload: QUICK_REPLY_PAYLOADS.UserGuide_Datetime
        },
        {
            type: "text",
            text: "Event types?",
            payload: QUICK_REPLY_PAYLOADS.UserGuide_EventTypes
        },
        {
            type: "text",
            text: "Dance styles?",
            payload: QUICK_REPLY_PAYLOADS.UserGuide_Interests
        }
    ];

    facebookMessageInterface.sendQuickReplyMessage(text, quickReplies);
}

function replyWithEvents(filteredEvents) {
    let elements = [];

    if (filteredEvents.length > 0) {
        filteredEvents.forEach((eventData) => {
            let subtitleString = "";
            let coverImageUrl = null;

            subtitleString += moment(eventData.start_time).format("Do MMM HH:mm");

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
        from: moment(analysisResults.dateTimeRange.from).format("Do MMM"),
        to: moment(analysisResults.dateTimeRange.to).format("Do MMM")
    });

    facebookMessageInterface.sendMessage(messageText);

    if (elements.length > 0) {
        if (elements.length > 10) {
            while (elements.length > 10) {
                elements.pop();
            }
        }

        facebookMessageInterface.sendGenericTemplateMessage(elements);
    }

    endConversation();
}