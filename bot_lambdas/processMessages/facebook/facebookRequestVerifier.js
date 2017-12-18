"use strict";

const crypto = require("crypto");

//---------------------------------------------------------------------------//

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

module.exports = {
    verifySignature: function (payload) {
        let signature = payload.split('=')[1];

        if (signature) {
            let hash = crypto.createHash("sha1");
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