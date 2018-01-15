"use strict";

module.exports = {
    parseTimezoneOffset: (dateTimeString) => {
        let gmtRegex = /Z$/;
        if (gmtRegex.test(dateTimeString)) {
            return {
                hours: 0,
                minutes: 0
            };
        } else {
            let timezoneRegex = /[+-]\d{2}(?::?)\d{2}/;
            let result = timezoneRegex.exec(dateTimeString);
            if (result) {
                let sign = result[0][0];
                result[0] = result[0].replace(":", "");
                return {
                    hours: Number(sign + result[0].substr(1, 2)),
                    minutes: Number(sign + result[0].substr(3, 2))
                };
            } else {
                return null;
            }
        }
    }
};