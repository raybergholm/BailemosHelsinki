"use strict";

const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

exports.handler = (event, context, callback) => {
    let response;

    if (event.httpMethod === "GET") {
        let verifyToken = event.queryStringParameters["hub.verify_token"];

        if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
            let challengeToken = parseInt(event.queryStringParameters["hub.challenge"], 10);

            console.log("Responding to Facebook challenge token");

            response = generateHttpResponse(200, parseInt(challengeToken, 10));
        } else {
            console.log("Incorrect validation token received");

            let payload = {
                message: "Error, wrong validation token"
            };
            response = generateHttpResponse(422, payload);
        }
    } else {
        let payload = {
            message: "Internal Server Error"
        };
        response = generateHttpResponse(500, payload);
    }

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}