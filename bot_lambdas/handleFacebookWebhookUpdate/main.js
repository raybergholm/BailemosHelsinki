"use strict";

exports.handler = (event, context, callback) => {
    let payload = {
        message: "Not Implemented"
    };

    let response = {
        isBase64Encoded: false,
        statusCode: 501,
        body: JSON.stringify(payload)
    };

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};