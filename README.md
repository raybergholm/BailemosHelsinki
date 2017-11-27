# BailemosHelsinki
Proof of Concept: FB Messenger bot and debug web interface

---

## bot_lambdas
Main functionality here.

### handleFacebookChallenge
### processMessages
Both of these are smaller versions of the BailemosHelsinki lambda. On hold for now (and currently not up to date!), but they're better for overall maintenance since handleFacebookChallenge is common to anything subscribing to FB webhooks, and smaller units are easier to read. Use these when there's some time to change the lambda calls in API Gateway.

### BailemosHelsinki
Main bot execution logic, currently a combined monster function which differs if the request is a GET or POST.

### updateStoredEventData
Batch job method of updating everything in the corresponding S3 bucket. Iterates through DynamoDB to get the relevant node IDs and S3 filenames, then queries GraphAPI and updates the event data stored in S3.

### handleFacebookWebhookUpdate
Alternative to updateStoredEventData: this can be used as an entry point to update S3 bucket entries.

---

## web_interface
Currently on hold, originally was used as an alternate entry point for debugging GraphAPI calls

---

## TODOs:

* handleFacebookWebhookUpdate is meant to handle when a subscribed page/user/etc updates, and it would be superior to static batch updates. But, check if this requires the page/user to give permission to this bot, if so we're no longer passively collecting data, but we'd have to actively approach the other event organisers for consent!
