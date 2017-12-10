const BOT_TEXTS = { // probably should be fetched from S3
    Greetings: [
        "Hi!",
        "Hello!",
        "Hi! :)",
        "Hello! :)"
    ],
    Uncertain: [
        "I have no idea what you mean :(",
        "This bot is not quite advanced enough to understand that. Yet.",
        "Uh, try to say that again in a different way?",
        "Well this is embarassing, I didn't understand :/",
        "Uh, my owner didn't anticipate whatever you said"
    ],
    Affirmative: [
        "Ok, on it!",
        "Sure, I can do that",
        "Alrighty!",
        "Sure thing!"
    ],
    Apologise: [
        "Whoops, did I get it wrong?",
        "I guess that didn't quite work as intended",
        "Yeah, I have some problems sometimes :("
    ],

    Disclaimer: [
        "This bot is currently under construction, so don't worry if things break.", "I don't really understand full sentences yet, just so you know :(", "If something clearly doesn't work when it should, you should tell my owner so that I can get better at your human languages!", "Just tell him the exact text you wrote, what you meant by it and what sort of answer you were expecting. Every bit of help counts!"
    ],
    HelpInfo: [
        "Currently I can detect some keywords related to the dance scene in Helsinki based on things like time, event types and interests. You can freely combine terms to narrow down your search", "e.g. try something like \"any salsa parties this weekend?\" and I can pick up \"salsa\", \"party\" and \"this weekend\" and check what's out there.", "Or you could just ask \"what's happening next Friday?\" if you just want to know what's happening then", "Or you could just try \"Surprise me\" :)"
    ],
    NoResults: [
        "I didn't find any events for the period {from} to {to}"
    ],
    NormalResults: [
        "Alright! I got {amount} results for {from} to {to}:"
    ],
    OverflowResults: [
        "I got {amount} results for {from} to {to}, here's the first 10 of them. I'd love to display the rest but Facebook doesn't let me :("
    ]
};

module.exports = {
    getText: (category) => {
        if (!BOT_TEXTS[category]) {
            console.log("tried to get an nonexistent bot text category");
            return "Major error, botty bugged out";
        }

        return BOT_TEXTS[category].length === 1 ? BOT_TEXTS[category][0] : this.getRandomText();
    },

    getRandomText: (category) => {
        if (!BOT_TEXTS[category]) {
            console.log("tried to get an nonexistent bot text category");
            return "Major error, botty bugged out";
        }

        return BOT_TEXTS[category][Math.floor(Math.random() * BOT_TEXTS[category].length)]
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
            var regex, prop, tempString;

            tempString = str;

            for (prop in replacements) {
                // eslint-disable-next-line no-useless-escape
                regex = new RegExp("\\{" + prop + "\}", "g");
                tempString = tempString.replace(regex, replacements[prop]);
            }

            return tempString;
        }
    }
};