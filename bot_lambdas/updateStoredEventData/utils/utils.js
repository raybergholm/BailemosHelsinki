"use strict";

module.exports = {
    parseTimezoneOffset: (dateTimeString) => {
        let timezoneRegex = /[+-]\d{4}/;
        let result = timezoneRegex.exec(dateTimeString);
        if (result) {
            let sign = result[0][0];
            return {
                hours: Number(sign + result[0].substr(1, 2)),
                minutes: Number(sign + result[0].substr(3, 2))
            };
        } else {
            return null;
        }
    }
};