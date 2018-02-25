"use strict";

module.exports = {
    analyse: (text, keywords, weights) => {
        const collectedResults = {};

        for (const prop in keywords) {
            const result = keywords[prop].exec(text);
            if (result) {
                if (!collectedResults[prop]) {
                    collectedResults[prop] = 0;
                }
                collectedResults[prop] += result.length * weights[prop];
            }
        }

        return collectedResults;
    },

    find: (texts, keywords) => {
        const tags = new Set();

        texts.forEach((text) => {
            for (const prop in keywords) {
                const result = keywords[prop].test(text);
                if (result) {
                    tags.add(prop);
                }
            }
        });

        return Array.from(tags.values());
    }
};