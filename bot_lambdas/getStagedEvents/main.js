// Persistent storage interface 
const dataInterface = require("./persistentStorageInterface");

//---------------------------------------------------------------------------//

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

exports.handler = (event, context, callback) => {
    let response;

    if (event.httpMethod === "GET") {
        const accessToken = event.queryStringParameters["bh.access_token"];
        if (accessToken && accessToken === ACCESS_TOKEN) {
            dataInterface.getEvents()
                .then((data) => {
                    const payload = data;

                    response = generateHttpResponse(200, payload);
                    callback(null, response);
                })
                .catch((err) => {
                    console.log("Error thrown: ", err);
                    const payload = {
                        message: "Internal Server Error"
                    };
                    response = generateHttpResponse(500, payload);
                    callback(null, response);
                });
        } else {
            const payload = {
                message: "Error, wrong validation token"
            };
            response = generateHttpResponse(422, payload);
            callback(null, response);
        }
    } else {
        response = generateHttpResponse(204, null);
        callback(null, response);
    }
};

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}