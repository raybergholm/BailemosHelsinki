"use strict";

const facebookApiInterface = (apiVersion, accessToken) => {
    return {
        getHostUrl: () => "graph.facebook.com",
        getBatchRequestPath: () => `/${apiVersion}/?access_token=${accessToken}`,

        buildBatchEventQueryPayload: (nodeIds) => {
            return {
                relative_url: buildQueryUrl(`/${apiVersion}/events/`, {
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
                relative_url: buildQueryUrl(`/${apiVersion}/feed/`, {
                    // debug: "all",
                    ids: nodeIds,
                    fields: ["type", "link", "message", "story"]
                }, true),
                method: "GET"
            };
        }
    };
};

function buildQueryUrl(basePath, params, escapePath) {
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

module.exports = facebookApiInterface;