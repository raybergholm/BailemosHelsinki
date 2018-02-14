import { describe, it } from "mocha";
import { expect } from "chai";

import facebookApiInterface from "../facebook/facebookApiInterface";

// mock AWS env vars
const apiVersion = "v2.11";

const process = {
    env: {
        FACEBOOK_ACCESS_TOKEN: "testtoken123"
    }
};

const hostUrl = "graph.facebook.com";

const apiInstance = facebookApiInterface(apiVersion, process.env.FACEBOOK_ACCESS_TOKEN);

describe("Basic sanity checks", () => {
    it("Host URL is valid", () => {
        expect(apiInstance.getHostUrl()).to.equal(hostUrl);
    });

    it("Api version and access token are being passed through", () => {
        expect(apiInstance.getBatchRequestPath()).to.equal(`/${apiVersion}/?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`);
    });

    it("Batch Event Query payloads are the correct format", () => {
        relative_url: buildQueryUrl(`/${apiVersion}/events/`, {
            // debug: "all",
            time_filter: "upcoming",
            ids: nodeIds,
            fields: ["name", "description", "place", "start_time", "end_time", "event_times", "owner", "cover", "attending_count"]
        }, true),
        method: "GET"


        const expectedOutput = {}; 

        const testInput = ["123", "456", "789", "12345"];

        const batchEventQueryPayload = apiInstance.buildBatchEventQueryPayload();
    });
});

