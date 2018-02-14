"use strict";

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

const objectUtils = require("./utils/objectUtils");

const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-west-1"
});

const dynamoDB = new AWS.DynamoDB();
const s3 = new AWS.S3();

module.exports = {
    getOrganisers: () => {
        const dynamoDBRequest = dynamoDB.scan({
            TableName: EVENT_ORGANISER_TABLE_NAME,
            Limit: 50
        });

        return dynamoDBRequest.promise().then(
            (result) => { // post-processing: format data from raw DynamoDB format to locally-defined JSON
                return objectUtils.map(result.Items)((entry) => {
                    return {
                        Id: entry.NodeId.N,
                        Name: entry.Name.S,
                        Type: entry.NodeType.S
                    };
                });
            },
            (err) => {
                console.log("error reading DynamoDB: ", err);
                return err;
            }
        );
    },

    saveEvents: (payload) => {
        const s3PutRequest = s3.putObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME,
            Body: payload
        });

        return s3PutRequest.promise().then(
            (result) => {
                return result;
            },
            (err) => {
                console.log("S3 putObject error: ", err);
                return err;
            }
        );
    }
};