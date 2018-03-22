# BailemosHelsinki
This is a chatbot application designed to be run on AWS. It integrates with a corresponding Facebook app, the standard use case is that it is connected to a public page and any messages sent to the page IM is forwarded to the chatbot.

---

## Dependencies
### Environment
* [AWS](https://aws.amazon.com/) environment
* [Facebook](https:developers.facebook.com/) application with configured integrations:
    * Webhook
    * Messenger

### JS libraries
* [moment.js](https://momentjs.com/)

## AWS components used
- Lambda
- API Gateway
- DynamoDB
- S3
- Cloudwatch

## Running locally?
This bot is meant to run on AWS so there's no localhost version.

## How does this work?

### Challenge-response
When the Facebook app webhook gets configured, it requires a successful challenge-response before the webhook gets accepted. So make sure that AWS has been configured correctly to accept the incoming request before linking the webhook

### Data staging
Querying Facebook Graph API every time a user sends a message is pretty wasteful, especially since each event needs post-processing to add custom tags used by this app. To fix this, the data staging lambda is set up to run a batch job (e.g. Cloudwatch events) to automatically update the data storage.

### Handling user messages
When an incoming user message reaches the webhook, it gets forwarded to the message handler lambda. Quick replies are handled before all others, after this the message content is checked. Messenger's built-in NLP is already enabled so it reads the output from that before doing its own basic analysis. 