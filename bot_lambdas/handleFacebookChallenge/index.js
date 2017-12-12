"use strict";

const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

exports.handler = (event, context, callback) => {
    console.log(event);

    let response;

    if (event.httpMethod === "GET") {
        let verifyToken = event.queryStringParameters["hub.verify_token"];

        if (verifyToken === FACEBOOK_VERIFY_TOKEN) {
            let challengeToken = parseInt(event.queryStringParameters["hub.challenge"], 10);

            console.log("Responding to Facebook challenge token");

            response = {
                isBase64Encoded: false,
                statusCode: 200,
                body: parseInt(challengeToken, 10)
            };
        } else {
            console.log("Incorrect validation token received");

            let payload = {
                message: "Error, wrong validation token"
            };

            response = {
                isBase64Encoded: false,
                statusCode: 422,
                body: JSON.stringify(payload)
            };
        }
    }

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};