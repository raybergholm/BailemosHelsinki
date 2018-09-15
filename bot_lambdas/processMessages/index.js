const { processMessages } = require("./modules/worker");

exports.handler = (event, context, callback) => {
    const { statusCode, payload } = processMessages(event);

    const response = generateHttpResponse(statusCode, payload);

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

const generateHttpResponse = (statusCode, payload) => ({
    isBase64Encoded: false,
    statusCode,
    body: typeof payload === "string" ? payload : JSON.stringify(payload)
});