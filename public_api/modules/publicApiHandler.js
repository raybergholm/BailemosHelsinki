const { fetchEvents } = require("./bailemosHelsinkiApi");

const RESOURCE_TYPE = {
    Events: "/events"
};

const processRequest = async ({ resource, pathParameters, queryStringParameters }) => {
    let response;
    switch(response) {
        case RESOURCE_TYPE.Events:
            return fetchEvents(queryStringParameters);
    }
};

module.exports = {
    processRequest
};