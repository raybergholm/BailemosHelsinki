"use strict";

const https = require("https");

const DEFAULT_PORT = null;

const DEFAULT_HEADERS = {
    "Content-Type": "application/json"
};

const createOptions = (hostname, path, method, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => {
    return {
        hostname,
        port,
        path,
        method,
        headers
    };
};

const request = (hostname, path, method, payload = null, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => {
    const options = createOptions(hostname, path, method, port, headers);

    return new Promise((resolve, reject) => {
        const successCallback = (response) => {
            let str = "";
            response.on("data", (chunk) => {
                str += chunk;
            });
            response.on("end", () => {
                resolve(str);
            });
        };

        const errorCallback = (err) => {
            console.log("problem with request: " + err);
            reject(err);
        };

        const req = https.request(options, successCallback);
        req.on("error", errorCallback);

        if (payload) {
            req.write(payload);
        }
        req.end();
    });
};

module.exports = {
    request: request,
    get: (hostname, path, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "GET", null, port, headers),
    head: (hostname, path, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "HEAD", null, port, headers),
    post: (hostname, path, payload, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "POST", payload, port, headers),
    put: (hostname, path, payload, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "PUT", payload, port, headers),
    patch: (hostname, path, payload, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "PATCH", payload, port, headers),
    delete: (hostname, path, port = DEFAULT_PORT, headers = DEFAULT_HEADERS) => request(hostname, path, "DELETE", null, port, headers),
};