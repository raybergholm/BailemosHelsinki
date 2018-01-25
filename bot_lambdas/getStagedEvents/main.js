// Persistent storage interface 
const dataStagingInterface = require("./dataStagingInterface");

//---------------------------------------------------------------------------//

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

exports.handler = (event, context, callback) => {
    let response;

    if (event.httpMethod === "GET") {
        let accessToken = event.queryStringParameters["bh.access_token"];
        if (accessToken && accessToken === ACCESS_TOKEN) {
            dataStagingInterface.getEventData()
                .then((data) => {
                    let payload = data;

                    response = generateHttpResponse(200, payload);
                    callback(null, response);
                })
                .catch((err) => {
                    console.log("Error thrown: ", err);
                    let payload = {
                        message: "Internal Server Error"
                    };
                    response = generateHttpResponse(500, payload);
                    callback(null, response);
                });
        } else {
            let payload = {
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