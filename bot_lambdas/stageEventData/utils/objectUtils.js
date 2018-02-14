"use strict";

const map = source => callback => Object.keys(source).reduce((reducer, prop) => {
    reducer[prop] = callback(source[prop]);
    return reducer;
}, {});

const filter = source => predicate => Object.keys(source).reduce((reducer, prop) => {
    if (predicate(source[prop])) {
        reducer[prop] = source[prop];
    }
    return reducer;
}, {});

module.exports = {
    // call with map(obj)(callback)
    map: map,

    // call with filter(obj)(predicate)
    filter: filter,

    // call with composite(obj).method(callback)
    composite: source => {
        return {
            map: map(source),
            filter: filter(source)
        };
    }
};