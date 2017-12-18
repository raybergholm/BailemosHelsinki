"use strict";

const crypto = require("crypto");

//---------------------------------------------------------------------------//

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

const HASH_ALGORITHM = "sha1";

module.exports = {
    verifySignature: function (inputSignature, requestPayload) {
        if (!inputSignature || !requestPayload) {
            throw new Error("Invalid input params to verifySignature function");
        }

        let signature = inputSignature.split('=')[1];

        if (!signature) {
            throw new Error("Failed to extract signature from input");
        }

        let hash = crypto.createHash(HASH_ALGORITHM);
        hash.update(JSON.stringify(requestPayload));
        let hashResult = hash.digest("hex");

        console.log("hash result: ", hashResult);
        console.log("signature from FB: ", signature);

        let verify = crypto.createVerify(HASH_ALGORITHM);

        try {
            verify.update(JSON.stringify(requestPayload));
        } catch (err) {
            console.log("it caught fire and died: ", err.message);
            console.log(requestPayload);
            return false;
        }

        let publicKey = FACEBOOK_APP_SECRET;
        let result;

        try {
            result = verify.verify(publicKey, signature);
        } catch (err) {
            console.log("it caught fire and died: ", err.message);
            console.log(requestPayload);
            return false;
        }

        if (result) {
            console.log("verify match");
        } else {
            console.log("verify not matched");
        }

        return result;
    },

    verifySignatureOld: function (payload) {
        let signature = payload.split('=')[1];

        if (signature) {
            let hash = crypto.createHash(HASH_ALGORITHM);
            hash.update(FACEBOOK_APP_SECRET);

            let digest = hash.digest("hex");

            if (signature === digest) { // TODO: always a mismatch right now, investigate why
                return true;
            } else {
                console.log("Verification mismatch!", {
                    fromFB: signature,
                    digest: digest
                });
            }
        }
        return false;
    }
};