const AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-west-1"
});

const s3 = new AWS.S3();

const fetchEvents = async (query) => {
    const { data: events, error } = await getAllEvents();

    if (error) {
        return { error };
    }

    const filtered = events.filter((entry) => {
        if (query.from || query.to) {
            // filter this event by time range
            if (query.from && entry.start_time < query.from) {
                return false;
            }

            if (query.to && entry.end_time > query.to) {
                return false;
            }
        }

        if (query.tags && entry.tags) {
            // filter by event tags (dance style in this case)
            return false;
        }

        if (query.type && entry.type !== query.type) {
            return false;
        }

        if (query.pattern) {
            const pattern = new RegExp(query.pattern);
            if (!pattern.test(entry.title) && !pattern.test(entry.body)) {
                return false;
            }
        }

        return true;
    });
    return { data: filtered };
};

const getAllEvents = async () => {
    const DATA_STAGING_BUCKET_NAME = process.env.DATA_STAGING_BUCKET_NAME;
    const EVENT_DATA_FILENAME = process.env.EVENT_DATA_FILENAME;

    const s3GetRequest = s3.getObject({
        Bucket: DATA_STAGING_BUCKET_NAME,
        Key: EVENT_DATA_FILENAME
    });

    return s3GetRequest.promise().then(
        (result) => { // post-processing: anything outside this module should not need to deal with the raw data format from S3, it expects the result to be JSON
            const data = JSON.parse(result.Body.toString()); // This is not redundant weirdness, it's casting binary >>> string >>> JSON
            return { data };
        },
        (error) => {
            console.log("S3 getObject error: ", error);
            return { error };
        }
    );
};

module.exports = {
    getAllEvents,
    fetchEvents
};