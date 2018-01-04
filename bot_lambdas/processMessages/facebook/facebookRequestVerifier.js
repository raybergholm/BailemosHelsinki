"use strict";

const crypto = require("crypto");

//---------------------------------------------------------------------------//

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

const HASH_ALGORITHM = "sha1";

module.exports = {
    verifySignature: (inputSignature, requestPayload) => {
        if (!inputSignature || !requestPayload) {
            throw new Error("Invalid input params to verifySignature function");
        }

        let signature = inputSignature.split('=')[1];

        if (!signature) {
            throw new Error("Failed to extract signature from input");
        }

        let hmac = crypto.createHmac(HASH_ALGORITHM, FACEBOOK_APP_SECRET);

        hmac.update(requestPayload);

        let digest = hmac.digest("hex");

        if (signature === digest) {
            return true;
        } else {
            console.log("Verification mismatch!", {
                fromFB: signature,
                digest: digest
            });
            return false;
        }
    }
};