"use strict";

const BOT_TEXTS = { // TODO: probably should be fetched from S3, especially if I want to localise this
    Greetings: [
        "Hi!",
        "Hello!",
        "Hi! :)",
        "Hello! :)",
        "Hi! How can I help?",
        "Hey there!",
        "Hey there! How can I help?"
    ],
    GoodMorning: [
        "Good morning!",
        "Good morning! :)",
        "Morning!",
        "Morning! :)"
    ],
    GoodDay: [
        "Good day to you too :)"
    ],
    GoodEvening: [
        "Evening!"
    ],
    GoodNight: [
        "Good night!",
        "Good night! :)",
        "Sleep tight!",
        "Sleep tight! :)",
    ],
    OpenQuestion: [
        "Sure, go ahead!",
        "I'm all ears.",
        "Sure thing, fire away!"
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
    HelpQuickReplyHeader: [
        "Alright, here's some topics! Just click one of these buttons and I can tell you more."
    ],
    Intro1: [
        `My name is Botty and I'm a chatbot! No humans required here (unless it's really necessary). I was originally developed by my owner, who is a dancer and also knows IT magic. 
        One day he got tired of having to subscribe to 200 different Facebook groups, getting spammed all the time, and yet still miss out on events because he wasn't subscribed to the right group(s), or it just got lost in the giant pile of groups.`
    ],
    Intro2: [
        `So, I was born to deal with all of that mess. I monitor all the pages and groups so that he (and you) don't have to, because I heard you humans have a lot of things to do nowadays.
        
        Need help getting started? Click one of the buttons below and I'll tell you what I know!`
    ],
    HowTo1: [
        `So a quickstart idea: what's happening tonight? You could try asking me that. Or maybe you want to plan what to do next weekend, so asking me "anything going on next weekend?" will get you some results. Maybe you prefer a specific dance style? Try "any bachata this week?"`
    ],
    HowTo2: [
        `I can also do fancier stuff like "are there parties this month?", better yet you can combine things for really specific cases like "kizomba parties on 01.03" if you know that's the only free day you have. Or if you have nothing specific in mind, try "surprise me!"`
    ],
    Manual1: [
        `Right now I only work in English. I can pick up some super basic Finnish in base form, but it's not supported yet, sorry! It's work in progress. Also, my owner likes Swedish so hopefully I'll get Swedish support sometime soon!
        
        So, first off, I always need to filter by date. Facebook has so much stuff, and I can only display a limited amount so I always need somewhere to start. I'll try to guess if you mention dates in your text, if I can't find anything I'll default to a range of up to seven days from now.`
    ],
    Manual2: [
        `Some stuff which I understand:
        - Some semantic date concepts: I can handle stuff like "today", "tomorrow", "this weekend", "next month", etc.
        - Exact dates in European format: I can work out that things like "12.2" or "12.02" or "12/2" probably means 12th February of the current year. Or maybe next year if it's already past February, if that's working (it's still in progress). At the very least, I shouldn't be trying to read things in American date format, that's kind of wrong when I'm only operating in Finland.`
    ],
    Manual3: [
        `- Date ranges: Give me two exact dates like "from 02.02 to 18.02" or "05.08 - 12.08" and I should be able to parse it as a real date range. If not, it's probably being fixed.
        - Event types: I categorise events as a "party", "workshop", "course" or "festival". I can filter based on those terms. Just be warned that some things might not be properly categorised though, some organisers throw in a lot of confusing info in their event descriptions!`
    ],
    Manual4: [
        `- Dance styles: I understand a part of the dance scene in Helsinki right now, so I support filtering based on keywords: mostly salsa, bachata, kizomba and zouk. I'm still working on learning how to handle more complex cases like "cuban salsa" vs "mambo" or "sensual bachata" vs "dominician bachata" or even stuff like "salsa" as a general concept.

        - The intricacies of Macbeth: err actually maybe not yet. But don't be afraid of using full sentences, I'm trying to understand proper language :)`
    ],

    Disclaimer: [
        `I'm still under construction (I'm basically a really early Beta build, for the tech-savvy people out there), so don't worry if things break or I do weird things at times.
        If something clearly doesn't work when it should, you should tell my owner so that I can get better at your human languages! It's really hard sometimes, just ask anyone out there who had to learn Finnish as a second language...
        
        So anyway, if you want to submit a bug report: just tell him the exact text you wrote, what you meant by it and what sort of answer you were expecting. Every bit of help counts!"`
    ],
    HelpRequest: [
        "I can detect some keywords related to the dance scene in Helsinki based on things like time, event types and interests. You can freely combine terms to narrow down your search e.g. try something like \"any salsa parties this weekend?\" and I can pick up \"salsa\", \"party\" and \"this weekend\" and check what's out there. Currently I work based on first figuring out a time range (please use just one), after that I try to check if there's anything more restrictive, like anything related to \"salsa\" or \"bachata\"",
    ],
    MarketingPolicy: [
        "We don't directly market to you or anyone. Even bots hate spam, so we wouldn't want you to deal with it either."
    ],
    PrivacyPolicy: [
        "This application does not store any private or personally identifiable data. Your Facebook ID, related info and conversation history with this page is never stored on the bot's servers. In the event of bot errors, your message text may appear in the error logs, however this data is kept anonymous and your Facebook details are never linked with it."
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
    getText: function (category) {
        if (!BOT_TEXTS[category]) {
            console.log("tried to get an nonexistent bot text category");
            return "Major error, botty bugged out";
        }

        let reply;
        if (BOT_TEXTS[category].length === 1) {
            reply = BOT_TEXTS[category][0];
        } else {
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