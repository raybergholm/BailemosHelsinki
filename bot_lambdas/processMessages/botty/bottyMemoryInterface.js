"use strict";

const moment = require("moment");

const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

const dynamoDB = new AWS.DynamoDB();
const s3 = new AWS.S3();

//---------------------------------------------------------------------------//

module.exports = {
    getConversation: function(userId, callback){

    }
};