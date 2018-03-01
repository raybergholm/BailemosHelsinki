"use strict";

const request = require("../utils/httpsUtils");

//---------------------------------------------------------------------------//

const HOST_URL = "graph.facebook.com";

const facebookApiInterface = (apiVersion, accessToken) => {
    if (!/^v\d{1}\.\d{2}$/.test(apiVersion)) {
        throw new Error("Invalid API version input");
    }

    const batchRequestUrl = `/${apiVersion}/?access_token=${accessToken}`;

    return {
        sendBatchDataQuery: (ids) => {
            const batchQueries = [];

            batchQueries.push(
                buildBatchUpcomingQueryPayload(`/${apiVersion}/events/`, ids.pageIds, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"])
            );

            batchQueries.push(
                buildBatchQueryPayload(`/${apiVersion}/feed/`, ids.groupIds, ["type", "link", "message", "story"])
            );

            batchQueries.push(
                buildBatchUpcomingQueryPayload(`/${apiVersion}/events/`, ids.userIds, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"])
            );

            const payload = `batch=${JSON.stringify(batchQueries)}`;

            return request.post(HOST_URL, batchRequestUrl, payload);
        },

        sendBatchDirectEventsQuery: (eventIds) => {
            const batchQueries = eventIds.map((eventId) => buildBatchQueryPayload(`${eventId}/`, eventId, ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]));
            const payload = `batch=${JSON.stringify(batchQueries)}`;

            return request.post(HOST_URL, batchRequestUrl, payload);
        }
    };
};

function buildBatchUpcomingQueryPayload (path, nodeIds, fields, encodeUri = true) {
    return {
        relative_url: buildQueryUrl(path, {
            // debug: "all",
            ids: nodeIds,
            time_filter: "upcoming",
            fields: fields
        }, encodeUri),
        method: "GET"
    };
};

function buildBatchQueryPayload (path, nodeIds, fields, encodeUri = true) {
    return {
        relative_url: buildQueryUrl(path, {
            // debug: "all",
            ids: nodeIds,
            fields: fields
        }, encodeUri),
        method: "GET"
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