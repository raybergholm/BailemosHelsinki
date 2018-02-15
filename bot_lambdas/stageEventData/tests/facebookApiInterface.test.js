import { describe, it } from "mocha";
import { expect } from "chai";

import facebookApiInterface from "../facebook/facebookApiInterface";

// mock AWS env vars
const apiVersion = "v2.11";

const process = {
    env: {
        FACEBOOK_PAGE_ACCESS_TOKEN: "testtoken123"
    }
};

const hostUrl = "graph.facebook.com";

const apiInstance = facebookApiInterface(apiVersion, process.env.FACEBOOK_PAGE_ACCESS_TOKEN);

describe("Basic sanity checks", () => {
    it("Host URL is valid", () => {
        expect(apiInstance.getHostUrl()).to.equal(hostUrl);
    });

    it("Api version and access token are being passed through", () => {
        expect(apiInstance.getBatchRequestPath()).to.equal(`/${apiVersion}/?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`);
    });

    it("Batch event query payloads are the correct format", () => {
        const testInput = ["123", "456", "789", "12345"];

        const expectedUnencodedOutput = `/${apiVersion}/events?time_filter=upcoming&ids=${testInput.join(",")}&fields=name,description,place,start_time,end_time,eent_times,owner,cover,attending_count`; 
        const expectedEncodedOutput = encodeURIComponent(expectedUnencodedOutput);
        
        expect(apiInstance.buildBatchEventQueryPayload(testInput, false)).to.equal(expectedUnencodedOutput);
        expect(apiInstance.buildBatchEventQueryPayload(testInput, true)).to.equal(expectedEncodedOutput);
        expect(apiInstance.buildBatchEventQueryPayload(testInput)).to.equal(expectedEncodedOutput);
    });

    it("Batch feed query payloads are the correct format", () => {
        const testInput = ["1111", "1234567", "42"];
        
        const expectedUnencodedOutput = `/${apiVersion}/feed?ids=${testInput.join(",")}&fields=type,link,message,story`;
        const expectedEncodedOutput = encodeURIComponent(expectedUnencodedOutput);
        
        expect(apiInstance.buildBatchEventQueryPayload(testInput, false)).to.equal(expectedUnencodedOutput);
        expect(apiInstance.buildBatchEventQueryPayload(testInput, true)).to.equal(expectedEncodedOutput);
        expect(apiInstance.buildBatchEventQueryPayload(testInput)).to.equal(expectedEncodedOutput);
    });
});

