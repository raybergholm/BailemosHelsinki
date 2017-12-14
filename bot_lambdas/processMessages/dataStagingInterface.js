"use strict";

const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

const s3 = new AWS.S3();

//---------------------------------------------------------------------------//

const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

module.exports = {
    getEventData: (callback) => {
        s3.getObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME
        }, (err, s3Object) => {
            if (err) {
                console.log("S3 interface error: ", err);
            } else {
                let stagedData = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                // Convert all date strings to date objects (all date/time calculations require it, and JSON.stringify will convert back to string correctly)
                for (let i = 0; i < stagedData.length; i++) {
                    stagedData[i].start_time = new Date(stagedData[i].start_time);
                    stagedData[i].end_time = new Date(stagedData[i].start_time);

                    if (stagedData[i].event_times) {
                        for (let j = 0; j < stagedData[i].event_times.length; j++) {
                            stagedData[i].event_times[j].start_time = new Date(stagedData[i].event_times[j].start_time);
                            stagedData[i].event_times[j].end_time = new Date(stagedData[i].event_times[j].end_time);
                        }
                    }
                }

                // console.log(stagedData);

                if (callback) {
                    callback(stagedData);
                }
            }
        });
    }
};