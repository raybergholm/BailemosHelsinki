"use strict";

const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

exports.handler = (event, context, callback) => {
    const response = handleChallengeResponse(event);

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function handleChallengeResponse(event) {
    let response;

    if (event.httpMethod === "GET" && event.queryStringParameters["hub.verify_token"] && event.queryStringParameters["hub.challenge"]) {
        const verifyToken = event.queryStringParameters["hub.verify_token"];

        if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
            console.log("Responding to Facebook challenge token");

            const challengeToken = parseInt(event.queryStringParameters["hub.challenge"], 10);
            response = generateHttpResponse(200, parseInt(challengeToken, 10));
        } else {
            console.log("Incorrect validation token received");

            const payload = {
                message: "Error, wrong validation token"
            };
            response = generateHttpResponse(422, payload);
        }
    } else {
        const payload = {
            message: "Internal Server Error"
        };
        response = generateHttpResponse(500, payload);
    }

    return response;
}

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}