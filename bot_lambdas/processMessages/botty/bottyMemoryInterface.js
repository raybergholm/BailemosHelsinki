"use strict";

var moment = require("moment");

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var dynamoDB = new AWS.DynamoDB();
var s3 = new AWS.S3();

module.exports = {
    getConversation: function(userId, callback){

    }
};