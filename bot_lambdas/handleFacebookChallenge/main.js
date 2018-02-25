"use strict";

const VERIFY_TOKEN_VALUE = process.env.FACEBOOK_VERIFY_TOKEN;

const VERIFY_TOKEN_PARAM_NAME = "hub.verify_token";
const CHALLENGE_PARAM_NAME = "hub.challenge";

exports.handler = (event, context, callback) => {
    const response = handleChallengeResponse(event);

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function handleChallengeResponse(event) {
    let response;

    if (event.httpMethod === "GET" && event.queryStringParameters[VERIFY_TOKEN_PARAM_NAME] && event.queryStringParameters[CHALLENGE_PARAM_NAME]) {
        const verifyToken = event.queryStringParameters[VERIFY_TOKEN_PARAM_NAME];

        if (verifyToken === VERIFY_TOKEN_VALUE) {
            console.log("Responding to Facebook challenge token");

            const challengeToken = parseInt(event.queryStringParameters[CHALLENGE_PARAM_NAME], 10);
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