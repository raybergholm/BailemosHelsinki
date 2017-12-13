"use strict";

exports.handler = (event, context, callback) => {
    let response = {
        isBase64Encoded: false,
        statusCode: 501,
        body: "Not implemented"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};