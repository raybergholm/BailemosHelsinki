const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const FACEBOOK_API_VERSION = "v2.11";

const HOST_URL = "graph.facebook.com";
const BATCH_PATH = `/${FACEBOOK_API_VERSION}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
const RELATIVE_EVENTS_PATH = `/${FACEBOOK_API_VERSION}/events/`;
const RELATIVE_FEED_PATH = `/${FACEBOOK_API_VERSION}/feed/`;

module.exports = {
    getHostUrl: () => HOST_URL,
    getBatchRequestPath: () => BATCH_PATH,

    buildBatchEventQueryPayload: (nodeIds) => {
        return {
            relative_url: buildQueryUrl(RELATIVE_EVENTS_PATH, {
                // debug: "all",
                time_filter: "upcoming",
                ids: nodeIds,
                fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
            }, true),
            method: "GET"
        };
    },
    buildBatchFeedQueryPayload: (nodeIds) => {
        return {
            relative_url: buildQueryUrl(RELATIVE_FEED_PATH, {
                // debug: "all",
                ids: nodeIds,
                fields: ["type", "link", "message", "story"]
            }, true),
            method: "GET"
        };
    }
};

function buildQueryUrl (basePath, params, escapePath) {
    let path = basePath;
    if (params) {
        const paramsArr = [];
        for (const prop in params) {
            paramsArr.push(prop + "=" + (params[prop] instanceof Array ? params[prop].join(',') : params[prop]));
        }
        path += '?' + paramsArr.join('&');
    }
    if (escapePath) {
        path = encodeURIComponent(path);
    }
    return path;
}