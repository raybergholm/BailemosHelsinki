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
    getEventData: () => {
        let s3GetRequest = s3.getObject({
            Bucket: DATA_STAGING_BUCKET_NAME,
            Key: EVENT_DATA_FILENAME
        });

        return s3GetRequest.promise().then(
            (data) => {
                let stagedData = JSON.parse(data.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON

                console.log(stagedData);

                return stagedData;
            },
            (err) => {
                console.log("S3 getObject error: ", err);

                return err;
            }
        );
    }
};