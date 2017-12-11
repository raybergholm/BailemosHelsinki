"use strict";

const QUICK_ACTION_KEYWORDS = {
    Greetings: /\b(?:hi|hello|yo|ohai|moi|hei|hej)(?:\b|[!?])/i,
    Info: /\b(?:info|disclaimer)\b/i,
    HelpRequest: /\b(?:help)(?:\b|[!?])|\bhelp [me|please]\b/i,
    Oops: /\b(?:wtf|you're drunk|wrong)\b/i
};

const KEYWORD_REGEXES = { // TODO: worry about localisation later. This could end up requiring a major rewrite of these regexes since \b considers stuff like åäö as word breaks
    Special: {
        SurpriseMe: /\bsurprise me\b/i
    },
    Types: {
        Course: /\b(?:course|courses)\b/i,
        Party: /\b(?:party|parties)\b/i
    },
    Interests: {
        Salsa: /\bsalsa\b/i,
        Bachata: /\bbachata\b/i,
        Kizomba: /\bkizomba\b/i,
        Zouk: /\bzouk\b/i
    },
    Temporal: {
        Today: /\b(?:today|tonight)\b/i,
        Monday: /\b(?:monday|mo(n?))\b/i,
        Tuesday: /\b(?:tuesday|tu(e?))\b/i,
        Wednesday: /\b(?:wednesday|we(d?))\b/i,
        Thursday: /\b(?:thursday|th(u?))\b/i,
        Friday: /\b(?:friday|fr(i?))\b/i,
        Saturday: /\b(?:saturday|sa(t?))\b/i,
        Sunday: /\b(?:sunday|su(n?))\b/i,
        ThisWeek: /\bthis week\b/i,
        ThisWeekend: /\b(?:this|upcoming) weekend\b/i,
        NextWeek: /\bnext week\b/i,
        NextWeekend: /\bnext weekend\b/i,
        ThisMonth: /\b(?:this|upcoming) month\b/i,
        DateLike: /\d{1,2}[./]\d{1,2}/,
        TimeLike: /\b(?:\d{1,2}[:]\d{2}|(?:klo) \d{1,2}\.\d{2})\b/,
        FromMarker: /\b(?:from|starting|after)\b/i,
        ToMarker: /\b(?:to|until|before)\b/i,
        OnExactDate: /\b(?:on) \d{1,2}[./]\d{1,2}/i,
        ExactDateRange: /\d{1,2}[./]\d{1,2}( ?)(?:-|to|until)( ?)\d{1,2}[./]\d{1,2}/i,
    }
};

module.exports = {
    quickScan: function(text){
        for(var prop in QUICK_ACTION_KEYWORDS){
            if(QUICK_ACTION_KEYWORDS[prop].test(text)){
                return prop;
            }
        }
        return null;
    },

    deepScan: function(text){

    }
};