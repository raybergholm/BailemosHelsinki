"use strict";

module.exports = {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

    analyse: (text, keywords, weights) => {
        let collectedResults = {};

        for (let prop in keywords) {
            let result = keywords[prop].exec(text);
            if (result) {
                collectedResults[prop] += result.length * weights[prop];
            }
        }

        return collectedResults;
    },

    find: (texts, keywords) => {
        let tags = new Set();

        texts.forEach((text) => {
            for (let prop in keywords) {
                let result = keywords[prop].test(text);
                if (result) {
                    tags.add(prop);
                }
            }
        });

        return Array.from(tags.values());
=======
    analyse: (text, keywords) => {
        /* 
=======
    /* 
>>>>>>> refactor finder logic into TextAnalyser
        let keywords = {
            prop: {
                regex: /blah/i,
                weight: 1
            },
            ...
        }
<<<<<<< HEAD
        */
>>>>>>> add initial structure for stand-alone text analysis module
=======
    */
=======
>>>>>>> fix merge conflict
    analyse: (text, keywords, weights) => {
        let collectedResults = {};

        for (let prop in keywords) {
            let result = keywords[prop].exec(text);
            if (result) {
                collectedResults[prop] += result.length * weights[prop];
            }
        }

        return collectedResults;
    },

    find: (texts, keywords) => {
        let tags = new Set();

        texts.forEach((text) => {
            for (let prop in keywords) {
                let result = keywords[prop].test(text);
                if (result) {
                    tags.add(prop);
                }
            }
        });

        return Array.from(tags.values());
>>>>>>> refactor finder logic into TextAnalyser
    }
};