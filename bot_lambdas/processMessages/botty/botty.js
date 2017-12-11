const FACEBOOK_GENERIC_TEMPLATE_LIMIT = 10;

var parser = require("./bottyMessageParser");
var textGenerator = require("./bottyTextGenerator");
var memory = require("./bottyMemoryInterface");

module.exports = {
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
        return textGenerator.getAllText("HelpInfo");
    },

    giveDisclaimer: () => {
        return textGenerator.getAllText("Disclaimer");
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
    }
};