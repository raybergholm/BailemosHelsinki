"use strict";

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

let AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

let dynamoDB = new AWS.DynamoDB();
let s3 = new AWS.S3();

module.exports = {
    getOrganiserData: (callback) => {
        dynamoDB.scan({
            TableName: EVENT_ORGANISER_TABLE_NAME,
            Limit: 50
        }, function (err, data) {
            let item;
            let nodes = {};
            if (err) {
                console.log("error reading DynamoDB: ", err);
            } else {
                for (let prop in data.Items) {
                    item = data.Items[prop];

                    nodes[item.NodeId.N] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                        Id: item.NodeId.N,
                        Name: item.Name.S,
                        Type: item.NodeType.S
                    };
                }

                console.log(JSON.stringify(nodes));

                if (callback) {
                    callback(nodes);
                }
            }
        });
    },

    getEventData: (callback) => {
        s3.getObject({
            Bucket: DATA_STAGING_BUCKET_NAME, // TODO: check if I am allowed to skip the Key property since I want to grab everything from this bucket
            Key: EVENT_DATA_FILENAME
        }, (err, s3Object) => {
            let stagedData;
            if (err) {
                console.log("S3 getObject error: ", err);
            } else {
                stagedData = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                // Convert all date strings to date objects (all date/time calculations require it, and JSON.stringify will convert back to string correctly)
                for (let i = 0; i < stagedData.events.length; i++) {
                    stagedData.events[i].start_time = new Date(stagedData.events[i].start_time);
                    stagedData.events[i].end_time = new Date(stagedData.events[i].start_time);

                    if (stagedData.events[i].event_times) {
                        for (let j = 0; j < stagedData.events[i].event_times.length; j++) {
                            stagedData.events[i].event_times[j].start_time = new Date(stagedData.events[i].event_times[j].start_time);
                            stagedData.events[i].event_times[j].end_time = new Date(stagedData.events[i].event_times[j].end_time);
                        }
                    }
                }

                console.log(stagedData);

                if (callback) {
                    callback(stagedData);
                }
            }
        });
    },

    updateEventData: (payload, callback) => {
        s3.putObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME,
            Body: payload
        }, function (err, data) {
            if (err) {
                console.log("S3 putObject error: ", err);
            } else {
                console.log("S3 putObject response metadata:", data);
                if (callback) {
                    callback(data);
                }
            }
        });
    }
};