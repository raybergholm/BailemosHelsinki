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

    const filtered = events.reduce((accumulator, entry) => {
        const entryIsValid = false;
        if (query.from || query.to) {
            // filter this event by time range
        }

        if (query.tags) {
            // filter by event tags (dance style in this case)
        }

        if (query.type) {
            // filter by event type
        }

        if (query.pattern) {
            // filter for events matching the pattern in title or body
        }

        if (entryIsValid) {
            accumulator.push(entry);
        }
        
        return accumulator;
    }, []);
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