"use strict";

const https = require("https");

const DEFAULT_HEADERS = {
    "Content-Type": "application/json"
};

const request = (options, payload = null) => {
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
        
        if(payload) {
            const body = JSON.stringify(payload);
            req.write(body);
        }
        req.end();
    });
};

module.exports = {
    get: (hostname, path, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "GET",
            headers: headers
        });
    },
    
    post: (hostname, path, payload, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "POST",
            headers: headers
        }, payload);
    },

    put: (hostname, path, payload, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "PUT",
            headers: headers
        }, payload);
    },

    delete: (hostname, path, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "DELETE",
            headers: headers
        });
    },

    head: (hostname, path, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "DELETE",
            headers: headers
        });
    },

    patch: (hostname, path, port = 443, headers = DEFAULT_HEADERS) => {
        return request({
            hostname: hostname,
            port: port,
            path: path,
            method: "DELETE",
            headers: headers
        });
    }
};