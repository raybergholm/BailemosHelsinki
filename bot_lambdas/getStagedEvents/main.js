// Persistent storage interface 
const dataStagingInterface = require("./dataStagingInterface");

//---------------------------------------------------------------------------//

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

exports.handler = (event, context, callback) => {
    let response;

    if (event.httpMethod === "GET") {
        let accessToken = event.queryStringParameters["bh.access_token"];
        if (accessToken && accessToken === ACCESS_TOKEN) {
            let events = null;

            dataStagingInterface.getEventData()
                .then((data) => {
                    events = data;
                })
                .catch((err) => {
                    console.log("Error thrown: ", err);
                });

            response = generateHttpResponse(200, events);
            callback(null, response);
        }
    }

    response = generateHttpResponse(200, null);
    callback(null, response);
}

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: typeof payload === "string" ? payload : JSON.stringify(payload)
    };
}