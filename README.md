# BailemosHelsinki
Proof of Concept: FB Messenger bot and debug web interface

---

## bot_lambdas
Main functionality here.

### handleFacebookChallenge
Responds to the Facebook challenge request when setting up the subscription. Only handles GET requests. When this is called, there will be two parameters: 
* __hub.verify_token:__ a string which should match the verification token defined in the environmental vars
* __hub.challenge:__ an integer which should be echoed back to Facebook in the response

### processMessages
Responds to user messages. Only handles POST requests. Contains cases for handling messages, delivery receipts and read receipts, currently only handling for messages are required.

Message processing is done in the botty modules. The overall process flow is as follows:
1. Parse the user input for keywords
2. If specific "quick message" keywords are detected, form the appropriate response and send back to the user (no need to query event data).
3. Else, perform a more intensive scan and check for all keywords. Attempt to identify the following attributes:
    * Date range
    * Interests
    * Event type
    * Location _(WIP)_
5. Fetch the stored event data.
4. Using the analysis results, start filtering the event data. The filtering logic in short:
    * The only mandatory filter is a date range: if it is not found, use a default of seven days from now
    * Filter by all other categories: currently operates on a lazy search (if it contains any of the keywords, it's included)
    * If optional keywords were in the user input but corresponding terms were not found in the event data, remove it from the list
5. Respond to the user with the filtered event list. Use a carousel of generic templates to display the events. This has an built-in max limit of 10 messages.

### stageEventData
Batch job method of updating everything in the corresponding S3 bucket. Iterates through DynamoDB to get the relevant node IDs and S3 filenames, then queries GraphAPI and updates the event data stored in S3.

Currently set up on AWS to automatically run twice a day at 06:00 EET (update during the night to catch any changes) and 17:00 EET (update prior to most event start times to have all info up-to-date in case of last-minute changes). For the moment, the data volume is small enough that there's no need to calculate deltas, the lambda can just replace the entire thing.

### handleFacebookWebhookUpdate
Alternative to updateStoredEventData: this can be used as an entry point to update S3 bucket entries. Returns a 501 - Not Implemented for now.

### getStagedEvents
Accessor method for public access to the staged event data.

---

## web_interface
Currently on hold, originally was used as an alternate entry point for debugging GraphAPI calls

---

## TODOs:

* handleFacebookWebhookUpdate is meant to handle when a subscribed page/user/etc updates, and it would be superior to static batch updates. But, check if this requires the page/user to give permission to this bot, if so we're no longer passively collecting data, but we'd have to actively approach the other event organisers for consent!
* getStagedEvents is implemented but currently not in use, so it may be out of date.
* moment works great for easy date parsing & user-friend displays, however the server is not necessarily in the same time zone as the user. Will need to add a mini-query to FB at some point (assuming this can be fetched without requesting permissions) to fetch the user timezone to handle any random time offset. Alternatively, always use the location's local time for the location.