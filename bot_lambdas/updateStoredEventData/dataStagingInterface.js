"use strict";

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

const dynamoDB = new AWS.DynamoDB();
const s3 = new AWS.S3();

module.exports = {
    getOrganiserData: () => {
        let ddbRequest = dynamoDB.scan({
            TableName: EVENT_ORGANISER_TABLE_NAME,
            Limit: 50
        });

        return ddbRequest.promise().then(
            (data) => { // post-processing: format data from raw DynamoDB format to local app JS object
                let item;
                let nodes = {};
                for (let prop in data.Items) {
                    item = data.Items[prop];

                    nodes[item.NodeId.N] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                        Id: item.NodeId.N,
                        Name: item.Name.S,
                        Type: item.NodeType.S
                    };
                }

                console.log(JSON.stringify(nodes));

                return nodes;
            },
            (err) => {
                console.log("error reading DynamoDB: ", err);

                return err;
            }
        );
    },

    updateEventData: (payload, callback) => {
        let s3PutRequest = s3.putObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME,
            Body: payload
        });

        return s3PutRequest.promise();
    }
};