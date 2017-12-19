const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const FACEBOOK_API_VERSION = "/v2.11/";

const FACEBOOK_GRAPH_API_PATHS = {
    Events: "events/",
    Feed: "feed/"
};

module.exports = {
    getFeedPath: () => {
        return FACEBOOK_API_VERSION + FACEBOOK_GRAPH_API_PATHS.Feed;
    },

    getEventsPath: (path) => {
        return FACEBOOK_API_VERSION + FACEBOOK_GRAPH_API_PATHS.Events;
    },

    buildQueryUrl: (basePath, params, escapePath) => {
        let path = basePath;
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

    createBatchGraphApiOptions: () => {
        return {
            host: "graph.facebook.com",
            path: FACEBOOK_API_VERSION + "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };
    }
};