const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

var crypto = require("crypto");

module.exports = {
    verifySignature: function (payload) {
        var shasum;

        var signature = payload.split('=')[1];

        if (signature) {
            shasum = crypto.createHash('sha1');
            shasum.update(FACEBOOK_APP_SECRET);

            var digest = shasum.digest("hex");

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