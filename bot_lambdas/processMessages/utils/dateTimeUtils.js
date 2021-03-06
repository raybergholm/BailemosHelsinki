"use strict";

const moment = require("../node_modules/moment");

//---------------------------------------------------------------------------//

module.exports = {
    parseTimezoneOffset: (dateTimeString) => {
        const gmtRegex = /Z$/;
        if (gmtRegex.test(dateTimeString)) {
            return {
                hours: 0,
                minutes: 0
            };
        } else {
            const timezoneRegex = /[+-]\d{2}(?::?)\d{2}/;
            const result = timezoneRegex.exec(dateTimeString);
            if (result) {
                const sign = result[0][0];
                result[0] = result[0].replace(":", "");
                return {
                    hours: Number(sign + result[0].substr(1, 2)),
                    minutes: Number(sign + result[0].substr(3, 2))
                };
            } else {
                return null;
            }
        }
    },

    correctTimezoneOffset: (momentDateTime, offset) => {
        return momentDateTime.clone().add(offset.hours, "hours").add(offset.minutes, "minutes");
    },

    parse: (dateTimeString) => {
        const offset = module.exports.parseTimezoneOffset(dateTimeString);
        return module.exports.correctTimezoneOffset(moment(dateTimeString), offset);
    }
};