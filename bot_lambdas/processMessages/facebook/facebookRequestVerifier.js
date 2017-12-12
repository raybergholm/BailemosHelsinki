"use strict";

const crypto = require("crypto");

//---------------------------------------------------------------------------//

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

module.exports = {
    verifySignature: function (payload) {
        let shasum;

        let signature = payload.split('=')[1];

        if (signature) {
            shasum = crypto.createHash('sha1');
            shasum.update(FACEBOOK_APP_SECRET);

            let digest = shasum.digest("hex");

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