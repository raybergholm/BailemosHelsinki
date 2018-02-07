"use strict";

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const FACEBOOK_API_VERSION = "v2.11";

const FACEBOOK_GRAPH_API_PATHS = {
    MessengerProfile: "me/messenger_profile"
};

module.exports = {
    getMessengerProfilePath: () => {
        return `${FACEBOOK_API_VERSION}/${FACEBOOK_GRAPH_API_PATHS.MessengerProfile}/`;
    },
    buildQueryUrl: (basePath, params, escapePath) => {
        let path = basePath;

        if (params && !params.access_token) {
            params.access_token = FACEBOOK_PAGE_ACCESS_TOKEN;
        }

        if (params) {
            let paramsArr = [];
            for (let prop in params) {
                paramsArr.push(prop + "=" + (params[prop] instanceof Array ? params[prop].join(',') : params[prop]));
            }
            path += '?' + paramsArr.join('&');
        }
        if (escapePath) {
            path = encodeURIComponent(path);
        }
        return path;
    },

    createBaseGraphApiOptions: (path, method) => {
        return {
            host: "graph.facebook.com",
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };
    },

    createBatchGraphApiOptions: () => {
        return {
            host: "graph.facebook.com",
            path: `/${FACEBOOK_API_VERSION}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };
    },

    createBaseMessengerProfileOptions: (method) => {
        return {
            host: "graph.facebook.com",
            path: "/v2.11/me/messenger_profile?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };
    }
};