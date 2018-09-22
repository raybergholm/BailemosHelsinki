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
    NewUserIntro: [
        "Hi there new person!"
    ],
    HelpQuickReplyHeader: [
        "Alright, here's some topics! Just click one of these buttons and I can tell you more."
    ],
    BottyOverview: [
        "My name is Botty and I'm a chatbot! No humans required here (unless it's really necessary). I monitor pages and groups related to the dance scene in Helsinki so that you don't have to.\n\nNeed help getting started? Click one of the buttons below and I'll tell you what I know!"
    ],
    HowTo_Start: [
        "I work based off keywords. I understand concepts related to time, event type and dance styles. You can use as many or as few terms as you want in your search."
    ],
    HowTo_Examples: [
        "Some examples you could try:\n\"are there parties this weekend?\"o\n\"any bachata next week?\"\n\"I remember a kizomba party somehwere on 01.03\". Go ahead, try searching for something!"
    ],
    UserGuide_Start: [
        "I understanding your messages based on the keywords and phase you use. Right now I only work in English. Finnish and Swedish support will eventually be added.\n\nFor now, I work with concepts related to date & time, event types and dance styles."
    ],
    UserGuide_Datetime: [
        "I can handle some common date terms like \"today\", \"tomorrow\", \"this weekend\", \"next month\", etc. I can also work out if you use give me a date like \"12.2\""
    ],
    UserGuide_EventTypes: [
        "I read the text on the event page and try to categorise them as a \"party\", workshop\", \"course\" or \"festival\". You can see how I categorised them in the list of events I give you, as well as how confident I am in my guess."
    ],
    UserGuide_Interests: [
        "My currently supported dance styles are \"salsa\", \"bachata\", \"kizomba\" and \"zouk\". I plan to eventually work out the nuances between related concepts like \"cuban salsa\" vs \"mambo\" or \"bachata\" as a general concept vs \"sensual bachata\"."
    ],
    UserGuide_End: [
        "I hope that helped! :) If you ever get lost, just say \"guide\" to open up this guide again."
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
        "Hmm, it seems like there's nothing available in that time period, at least with that criteria",
        "I didn't find anything for that time period :/"
    ],
    NormalResults: [
        "Let's see... We have {amount} things happening:",
        "Ok! I dug up {amount} results:",
        "Alright, I found {amount} results for that time period:"
    ],
    OverflowResults: [
        "I got {amount} results, here's the first 10 of them. I'd love to display the rest but Facebook doesn't let me :("
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


const getText = (category) => {
    if (!BOT_TEXTS[category]) {
        console.log("tried to get an nonexistent bot text category: ", category);
        return "Major error, botty bugged out";
    }

    let reply;
    if (BOT_TEXTS[category].length === 1) {
        reply = BOT_TEXTS[category][0];
    } else {
        reply = BOT_TEXTS[category][Math.floor(Math.random() * BOT_TEXTS[category].length)];
    }
    return reply;
};

const getAllText = (category) => {
    if (!BOT_TEXTS[category]) {
        console.log("tried to get an nonexistent bot text category: ", category);
        return "Major error, botty bugged out";
    }

    return BOT_TEXTS[category];
};

const formatText = (str, replacements) => {
    if (replacements instanceof Array) {
        return str.replace(/\{\d+\}/g, (match) => replacements[match.substring(1, match.length - 1)] || match);
    } else if (replacements instanceof Object) {
        let regex, tempString;

        tempString = str;

        for (const prop in replacements) {
            // eslint-disable-next-line no-useless-escape
            regex = new RegExp(`\\{${prop}}`, "g"); 
            tempString = tempString.replace(regex, replacements[prop]);
        }

        return tempString;
    }
};


module.exports = {
    getText,
    getAllText,
    formatText
};