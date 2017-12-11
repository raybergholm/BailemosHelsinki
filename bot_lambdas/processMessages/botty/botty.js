"use strict";

const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

var parser = require("./bottyMessageParser");
var textGenerator = require("./bottyTextGenerator");
var memory = require("./bottyMemoryInterface");

// TODO: could be all the facebook interfaces should go here, if we're delegating away from main.js

const FAST_ACTIONS = {  // if the bot replies with these, no call is required to DDB/S3
    Greetings: "Greetings",
    Thank: "Thank",
    ReplyToThanks: "ReplyToThanks",
    Apologise: "Apologise",
    HelpRequest: "HelpRequest",
    Disclaimer: "Disclaimer"
};

module.exports = {
    replyToQuickAction: function(){

    },

    readMessage: function(text, attachments){ // main method: read input text and/or attachments, then reply with something 
        var reply;
        reply = scanForFastActions(text);

        if(reply){
            // TODO: send reply to user. don't continue, no further backend calls required. Note that reply may be an array

            return;
        }
    },

    reply: () => {
        
    },
    
    replyWithResults: (amount, from, to) => {
        var baseString;
        if(amount === 0){
            baseString = textGenerator.getText("NoResults");
        }else if(amount > FACEBOOK_GENERIC_TEMPLATE_LIMIT){
            baseString = textGenerator.getText("NormalResults");
        }else {
            baseString = textGenerator.getText("OverflowResults");
        }

        return textGenerator.formatText(baseString, {
            amount: amount, 
            from: from, 
            to: to
        });
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

function scanForFastActions(text){
    var result = parser.quickScan(text);
    var reply = null;
    if(result){
        switch(result){
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