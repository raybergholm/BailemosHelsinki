function FacebookInterface() {
    "use strict";

    this.user = null;
    this.accessToken = null;
    this.permissions = null;

    this.isLoggedIn = false;

    this.init = function() {

    };

    this.getLoginStatus = function() {
        FB.getLoginStatus(function(response) {
            this.isLoggedIn = response.status === "connected";
            if(this.isLoggedIn){
                this.accessToken = response.authResponse.accessToken;
                this.user.id = response.authResponse.userID;

                this.apiCall("/me", function(response){
                    if(response){
                        this.user.name = response.name || null;
                    }
                }.bind(this));
            }

            console.log("connected? " + this.isLoggedIn);
        }.bind(this));
    };

    this.login = function(permissions) {
        if(permissions){
            permissions = permissions.join(',');

            FB.login(advancedLoginCallback, {
                scope: permissions,
                return_scopes: true
            });
        } else {
            FB.login(basicLoginCallback); // basic permissions (pretty much just the name?)
        }
    };

    var basicLoginCallback = function(response) {
        if(response.authResponse) {
            console.log('Welcome!  Fetching your information.... ');

            var loginDisplayDiv = document.getElementById("loginDisplay");
            if(loginDisplayDiv) {
                loginDisplayDiv.innerHTML = "You are logged in";
            }

            this.apiCall("/me", function(response) {
                console.log(response);
            });

        } else {
            console.log("User cancelled login or did not fully authorize.");
        }
    };

    var advancedLoginCallback = function(response) {

    };

    this.logout = function() {
        FB.logout(logoutCallback);
        this.isLoggedIn = false;
    };

    var logoutCallback = function(response) {
        var loginDisplayDiv = document.getElementById("loginDisplay");
        if(loginDisplayDiv) {
            loginDisplayDiv.innerHTML = "You are logged out";
        }
    };

    this.apiCall = function(node, callback, parameters) {
        if(node && callback) {
            if(parameters){
                FB.api(node, parameters, callback);
            }else {
                FB.api(node, callback);
            }
        } else {
            console.error("Missing parameters for FB API call");
        }
    };

    this.search = function(term, type, callback){
        var parameters = {
            q: term,
            type: type
        };
        this.apiCall("search", parameters, callback);
    };

    this.fetchMe = function(){
        this.apiCall("/me",
            function(response){
                if(response){
                    this.user = response;
                }
            }.bind(this),
            {
                fields: "id,name,location.fields(id,name,location)"
            });
    };

    this.getPermissions = function(){
        this.apiCall("me/permissions", function(response){
            this.permissions = response.data;
        }.bind(this));
    };

    // debug
    this.echoCallback = function(response){ // just for debugging
        console.log(response);
    };

    this.init();
}

FacebookInterface.PERMISSIONS = {
    PUBLIC_PROFILE: "public_profile", // default
    EMAIL: "email",
    LOCATION: "location",

    FRIENDS: "user_friends",
    USER_EVENTS: "user_events",
    RSVP_EVENT: "rsvp_event"    // set user's RSVP status
};

FacebookInterface.SEARCH_TYPE = {
    USER: "user",
    PAGE: "page",
    EVENT: "event",
    GROUP: "group",
    PLACE: "place"
};

FacebookInterface.CONFIG = {
    appId: "153909218550014",
    lang: "en_US"
};
