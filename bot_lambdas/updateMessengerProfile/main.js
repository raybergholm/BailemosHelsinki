"use strict";

// Facebook Graph API interfacing modules
const facebookApiInterface = require("./facebook/facebookApiInterface");

//---------------------------------------------------------------------------//

exports.handler = (event, context, callback) => {
    console.log(event);

    switch(event.httpMethod) {
        case "GET":
            // fetch messenger_profile data
            queryMessengerProfile();
            break;
        case "POST":
            // update messenger_profile data
            updateMessengerProfile();
            break;
        case "DELETE":
            // remove messenger_profile data
            deleteMessengerProfile();
            break;
    }

    let response = generateHttpResponse(200, "OK");

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function generateHttpResponse(statusCode, payload) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        body: payload
    };
}

function queryMessengerProfile(){
    let url = facebookApiInterface.buildQueryUrl(facebookApiInterface.getMessengerProfilePath(), {
        fields: ["greetings", "getting_started", "persistent_menu"]
    }, true);

    sendRequestToFacebook(options, callback)
}


function updateMessengerProfile(){
    
}


function deleteMessengerProfile(){
    
}

function sendRequestToFacebook(options, callback, body) {
    let req = https.request(options, callback);
    req.on("error", (err) => {
        console.log("problem with request: " + err);
    });
    if(body){
        req.write(body);
    }
    req.end();
}