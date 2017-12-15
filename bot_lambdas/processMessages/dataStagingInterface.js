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
                let data = JSON.parse(s3Object.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                // console.log(data);

                if (callback) {
                    callback(data);
                }
            }
        });
    }
};