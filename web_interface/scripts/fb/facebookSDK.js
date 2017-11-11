window.fbAsyncInit = function() {
    FB.init({
        appId: FacebookInterface.CONFIG.appId,
        xfbml: true,
        status: true,
        cookie: true,
        version: "v2.9"
    });
    FB.AppEvents.logPageView();
};

(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if(d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/" + FacebookInterface.CONFIG.lang + "/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
