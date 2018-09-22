const messageInterface = require("../facebook/messageInterface");

const textGenerator = require("./textGenerator");
const parser = require("./messageParser");

class Botty {
    constructor({ targetId, debugMode = false }) {
        this._targetId = targetId || null;
        this._conversation = null;
        this._typingIndicatorSent = false;
        this._interface = messageInterface;
        this._debugMode = debugMode;
    }
    startConversation(targetId) {
        this._targetId = targetId;

        this._conversation = facebookMessageInterface(targetId, textGenerator);
    }
    async readMessage(message) {
        if (message.quick_reply) {
            respondToQuickReply(message.quick_reply, this._debugMode);
        } else {
            processMessage(message, this._debugMode);
        }     

        return true;
    }
    endConversation() {
        console.log("Returned message receipt: ", messageReceipt);

        if (this._typingIndicatorSent) {
            this._conversation.sendTypingIndicator(false);
        }
        return Promise.resolve(messageReceipt);
    }
}

const respondToQuickReply = ({ payload }, debugMode) => {
    if (debugMode) {
        console.log("Received quick reply with payload:", payload);
    }
};

const processMessage = ({text, attachments, nlp}, debugMode) => {
    if (debugMode) {
        console.log(`Received message with text "${text}" ${attachments && "plus an attachment"}, and nlp: `, nlp);
    }


    if (attachments) {
        // TODO: what do we want to do with attachments?
    }

    const result = analyseInput(text, nlp);   
};

const processNlp = (nlp) => {
    const parsedFromNlp = new Map();
    const nlpResult = parser.parseBuiltinNlp(nlp.entities);
};

function analyseInput(text, nlp) {
    let result;
    const parsedFromNlp = new Map();

    // Check the NLP results first, if we have hits here then we can skip custom parsing
    if (nlp && nlp.entities) {
        const nlpResult = parser.parseBuiltinNlp(nlp.entities);

        console.log("[DEBUG] Result after parsing NLP:", nlpResult);

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

module.exports = {
    Botty
};