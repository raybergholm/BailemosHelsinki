const { processRequest } = require("./modules/publicApiHandler");

exports.handler = async (event, context, callback) => {
    const response = await processRequest(event);
    callback(null, response);
};