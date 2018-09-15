const VERIFY_TOKEN_VALUE = process.env.FACEBOOK_VERIFY_TOKEN;

const VERIFY_TOKEN_PARAM_NAME = "hub.verify_token";
const CHALLENGE_PARAM_NAME = "hub.challenge";

exports.handler = (event, context, callback) => {
    const response = handleChallengeResponse(event.queryStringParameters);

    console.log("Returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

const handleChallengeResponse = (queryStringParameters) => {
    let response;

    try {
        const verifyToken = queryStringParameters[VERIFY_TOKEN_PARAM_NAME];
        const challengeToken = parseInt(event.queryStringParameters[CHALLENGE_PARAM_NAME], 10);

        if (verifyToken === VERIFY_TOKEN_VALUE) {
            console.log("Verification token OK, responding to Facebook challenge token");

            response = generateHttpResponse(200, challengeToken);
        } else {
            console.log("Incorrect validation token received");

            const payload = {
                message: "Error, wrong validation token"
            };
            response = generateHttpResponse(422, payload);
        }

        return response;
    } catch (error) {
        const payload = {
            message: "Internal Server Error"
        };
        response = generateHttpResponse(500, payload);
    }
};

const generateHttpResponse = (statusCode, payload) => ({
    isBase64Encoded: false,
    statusCode,
    body: typeof payload === "string" ? payload : JSON.stringify(payload)
});