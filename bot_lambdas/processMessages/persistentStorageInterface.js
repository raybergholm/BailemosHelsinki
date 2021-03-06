"use strict";

const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-west-1"
});

const s3 = new AWS.S3();

//---------------------------------------------------------------------------//

const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

module.exports = {
    getEvents: () => {
        const s3GetRequest = s3.getObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME
        });

        return s3GetRequest.promise().then(
            (result) => { // post-processing: anything outside this module should not need to deal with the raw data format from S3, it expects the result to be JSON
                const data = JSON.parse(result.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                return data;
            },
            (err) => {
                console.log("S3 getObject error: ", err);

                return err;
            }
        );
    }
};