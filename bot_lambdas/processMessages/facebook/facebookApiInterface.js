"use strict";

const request = require("../utils/httpsUtils");

//---------------------------------------------------------------------------//

const HOST_URL = "graph.facebook.com";

const API_VERSION_STRING_REGEX = /^v\d{1}\.\d{2}$/;

const facebookApiInterface = (apiVersion, accessToken) => {
    if (!API_VERSION_STRING_REGEX.test(apiVersion)) {
        throw new Error("Invalid API version input");
    }

    const sendMessagePath = `/${apiVersion}/me/messages/?access_token=${accessToken}`;

    return {
        sendMessage: (payload) => {
            return request.post(HOST_URL, sendMessagePath, payload);
        }
    };
};

module.exports = facebookApiInterface;