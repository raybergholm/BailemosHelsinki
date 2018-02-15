"use strict";

const request = require("./utils/httpsUtils");

//---------------------------------------------------------------------------//

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const FACEBOOK_API_VERSION = "v2.11";

const HOST_URL = "graph.facebook.com";
const BATCH_PATH = `/${FACEBOOK_API_VERSION}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
const SEND_MESSAGE_PATH = `/${FACEBOOK_API_VERSION}/me/messages/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;

module.exports = {
    sendBatchDataQuery: (ids) => {

    },

    sendBatchDirectEventsQuery: () => {

    },

    getHostUrl: () => HOST_URL,
    getBatchRequestPath: () => BATCH_PATH,
    getSendMessagePath: () => SEND_MESSAGE_PATH,
    
    buildQueryUrl: (basePath, params, escapePath) => {
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
};