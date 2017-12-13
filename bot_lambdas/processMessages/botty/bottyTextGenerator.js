"use strict";

const BOT_TEXTS = { // probably should be fetched from S3
    Greetings: [
        "Hi!",
        "Hello!",
        "Hi! :)",
        "Hello! :)"
    ],
    Thank: [
        "Thank you",
        "Thank you :)",
        "Thanks!"
    ],
    ReplyToThanks: [
        "You're welcome!",
        "You're welcome! :)",
        "No problems!",
        "No problems! :)",
        "Just doing my job",
        "Just doing my job :)",
        "Glad to be of service!",
        "Glad to be of service! :)"
    ],
    Embarressed: [
        "Why, thank you! ^_^",
        "Aww, thanks ^_^"
    ],
    Uncertain: [
        "I have no idea what you mean :(",
        "This bot is not quite advanced enough to understand that. Yet.",
        "Uh, try to say that again in a different way?",
        "Well this is embarassing, I didn't understand :/",
        "Uh, my owner didn't anticipate whatever you said",
        "Umm... :/"
    ],
    Affirmative: [
        "Ok, on it!",
        "Sure, I can do that",
        "Alrighty!",
        "Sure thing!"
    ],
    Apologise: [
        "Sorry!",
        "Oops, sorry!",
        "Whoops, did I get it wrong?",
        "I guess that didn't quite work as intended",
        "Yeah, I have some weird quirks sometimes :("
    ],
    Info: [
        "This bot is currently under construction, so don't worry if things break. If something clearly doesn't work when it should, you should tell my owner so that I can get better at your human languages!", "Just tell him the exact text you wrote, what you meant by it and what sort of answer you were expecting. Every bit of help counts!"
    ],
    HelpRequest: [
        "I can detect some keywords related to the dance scene in Helsinki based on things like time, event types and interests. You can freely combine terms to narrow down your search", "e.g. try something like \"any salsa parties this weekend?\" and I can pick up \"salsa\", \"party\" and \"this weekend\" and check what's out there. Currently I work based on first figuring out a time range (please use just one), after that I try to check if there's anything more restrictive, like anything related to \"salsa\" or \"bachata\"", 
    ],
    NoResults: [
        "Hmm, it seems like there's nothing available from {from} to {to}, at least with that criteria",
        "I didn't find anything for the period {from} to {to}"
    ],
    NormalResults: [
        "Let's see... We have {amount} things happening from {from} to {to}:",
        "Ok! There's {amount} results for {from} to {to}:",
        "Alright, I found {amount} results for {from} to {to}:"
    ],
    OverflowResults: [
        "I got {amount} results for {from} to {to}, here's the first 10 of them. I'd love to display the rest but Facebook doesn't let me :("
    ],
    Address: [
        "\n{street}, {city}"
    ],
    Attending: [
        "\n{count} people attending"
    ],
    EventType: [
        "\n{type} - {confidence}% confidence"
    ]

};

module.exports = {
    getText: function(category) {
        if (!BOT_TEXTS[category]) {
            console.log("tried to get an nonexistent bot text category");
            return "Major error, botty bugged out";
        }

        let reply;
        if(BOT_TEXTS[category].length === 1){
            reply = BOT_TEXTS[category][0];
        }else {
            reply = BOT_TEXTS[category][Math.floor(Math.random() * BOT_TEXTS[category].length)];
        }
        return reply;
    },

    getAllText: (category) => {
        if (!BOT_TEXTS[category]) {
            console.log("tried to get an nonexistent bot text category");
            return "Major error, botty bugged out";
        }

        return BOT_TEXTS[category];
    },

    formatText: (str, replacements) => {
        if (replacements instanceof Array) {
            return str.replace(/\{\d+\}/g, function (match) {
                return replacements[match.substring(1, match.length - 1)] || match;
            });
        } else if (replacements instanceof Object) {
            let regex, tempString;

            tempString = str;

            for (let prop in replacements) {
                // eslint-disable-next-line no-useless-escape
                regex = new RegExp("\\{" + prop + "\}", "g");
                tempString = tempString.replace(regex, replacements[prop]);
            }

            return tempString;
        }
    }
};