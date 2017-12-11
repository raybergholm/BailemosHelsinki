"use strict";

const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var s3 = new AWS.S3();

module.exports = {
    getEventData: (callback) => {
        s3.getObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME
        }, (err, s3Object) => {
            var stagedData;
            if (err) {
                console.log("S3 interface error: ", err);
            } else {
                stagedData = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                // Convert all date strings to date objects (all date/time calculations require it, and JSON.stringify will convert back to string correctly)
                for (var i = 0; i < stagedData.events.length; i++) {
                    stagedData.events[i].start_time = new Date(stagedData.events[i].start_time);
                    stagedData.events[i].end_time = new Date(stagedData.events[i].start_time);

                    if (stagedData.events[i].event_times) {
                        for (var j = 0; j < stagedData.events[i].event_times.length; j++) {
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
    }
};