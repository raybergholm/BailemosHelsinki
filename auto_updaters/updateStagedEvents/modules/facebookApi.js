const request = require("../utils/httpsUtils");

const HOST_URL = "graph.facebook.com";

const EVENT_FIELDS = ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"];
const FEED_FIELDS = ["type", "link", "message", "story"];

const buildQueryUrl = (basePath, params, encodeUri) => {
    let path = basePath;
    if (params) {
        const paramsArr = Object.keys(params).map((entry) => `${entry}=${(params[entry] instanceof Array ? params[entry].join(',') : params[entry])}`);
        path += '?' + paramsArr.join('&');
    }
    if (encodeUri) {
        path = encodeURIComponent(path);
    }
    return path;
};

const buildBatchUpcomingQueryPayload = (path, ids, fields, encodeUri = true) => ({
    relative_url: buildQueryUrl(path, {
        // debug: "all",
        ids,
        time_filter: "upcoming",
        fields
    }, encodeUri),
    method: "GET"
});

const buildBatchQueryPayload = (path, ids, fields, encodeUri = true) => ({
    relative_url: buildQueryUrl(path, {
        // debug: "all",
        ids,
        fields
    }, encodeUri),
    method: "GET"
});

const facebookApi = (apiVersion, accessToken) => {
    const API_VERSION_STRING_REGEX = /^v\d{1}\.\d{2}$/;
    if (!API_VERSION_STRING_REGEX.test(apiVersion)) {
        throw new Error("Invalid API version specified");
    }

    const batchRequestUrl = `/${apiVersion}/?access_token=${accessToken}`;

    const sendBatchQuery = async (ids) => {
        const batchPayload = Object.entries(ids).reduce((accumulator, [key, value]) => {
            accumulator.push(key === "groupIds" ? 
                buildBatchQueryPayload(`/${apiVersion}/feed/`, value, FEED_FIELDS) : 
                buildBatchUpcomingQueryPayload(`/${apiVersion}/events/`, value, EVENT_FIELDS));
            return accumulator;
        }, []);

        const body = `batch=${JSON.stringify(batchPayload)}`;

        return request.post(HOST_URL, batchRequestUrl, body);
    };

    const sendBatchEventsQuery = async (eventIds) => {
        const batchQueries = eventIds.map((eventId) => buildBatchQueryPayload(`${eventId}/`, eventId, EVENT_FIELDS));
        const body = `batch=${JSON.stringify(batchQueries)}`;

        return request.post(HOST_URL, batchRequestUrl, body);
    };

    return {
        sendBatchQuery,
        sendBatchEventsQuery
    };
};

module.exports = facebookApi;