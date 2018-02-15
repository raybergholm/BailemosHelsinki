"use strict";

const facebookApiInterface = (apiVersion, accessToken) => {
    return {
        getHostUrl: () => "graph.facebook.com",
        getBatchRequestPath: () => `/${apiVersion}/?access_token=${accessToken}`,

        buildBatchEventQueryPayload: (nodeIds, encodeUri = true) => {
            return this.buildBatchQueryPayload(`/${apiVersion}/events/`, nodeIds, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]);
        },
        buildBatchFeedQueryPayload: (nodeIds, encodeUri = true) => {
            return this.buildBatchQueryPayload(`/${apiVersion}/feed/`, nodeIds, ["type", "link", "message", "story"]);
        },
        buildBatchDirectEventQueryPayload: (eventIds) => {
            return eventIds.map((eventId) => {
                return {
                    relative_url: buildQueryUrl(`${eventId}/`, {
                        time_filter: "upcoming",
                        fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
                    }, true),
                    method: "GET"
                };
            });
        },

        buildBatchQueryPayload: (path, nodeIds, fields, encodeUri = true) => {
            return {
                relative_url: buildQueryUrl(path, {
                    // debug: "all",
                    ids: nodeIds,
                    fields: fields
                }, encodeUri),
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