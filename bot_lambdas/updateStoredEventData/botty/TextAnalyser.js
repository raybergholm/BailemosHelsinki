"use strict";

module.exports = {
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
    }
};