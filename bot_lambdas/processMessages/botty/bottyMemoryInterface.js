"use strict";

let moment = require("moment");

let AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

let dynamoDB = new AWS.DynamoDB();
let s3 = new AWS.S3();

module.exports = {
    getConversation: function(userId, callback){

    }
};