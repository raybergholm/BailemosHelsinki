"use strict";

const request = require("../utils/httpsUtils");

//---------------------------------------------------------------------------//

const buildBatchQueryPayload = (path, nodeIds, fields, encodeUri = true) => {
    return {
        relative_url: buildQueryUrl(path, {
            // debug: "all",
            ids: nodeIds,
            fields: fields
        }, encodeUri),
        method: "GET"
    };
};

const HOST_URL = "graph.facebook.com";

const facebookApiInterface = (apiVersion, accessToken) => {
    if (!/^v\d{1}\.\d{2}$/.test(apiVersion)) {
        throw new Error("Invalid API version input");
    }

    const batchRequestUrl = `/${apiVersion}/?access_token=${accessToken}`;

    return {
        sendBatchDataQuery: (ids) => {
            const payload = [];

            payload.push(
                buildBatchQueryPayload(`/${apiVersion}/events/`, ids.pageIds, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"])
            );

            payload.push(
                buildBatchQueryPayload(`/${apiVersion}/feed/`, ids.groupIds, ["type", "link", "message", "story"])
            );

            payload.push(
                buildBatchQueryPayload(`/${apiVersion}/events/`, ids.userIds, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"])
            );

            return request.post(HOST_URL, batchRequestUrl, payload);
        },

        sendBatchDirectEventsQuery: (eventIds) => {
            const payload = eventIds.map((eventId) => buildBatchQueryPayload(`${eventId}/`, eventId, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]));
            return request.post(HOST_URL, batchRequestUrl, payload);
        }
    };
};

function buildQueryUrl(basePath, params, escapePath) {
    let path = basePath;
    if (params) {
        const paramsArr = Object.keys(params).map((entry) => `${entry}=${(params[entry] instanceof Array ? params[entry].join(',') : params[entry])}`);
        path += '?' + paramsArr.join('&');
    }
    if (escapePath) {
        path = encodeURIComponent(path);
    }
    return path;
}

module.exports = facebookApiInterface;