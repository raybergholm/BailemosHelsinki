const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

module.exports = {
    buildQueryUrl: (basePath, params, escapePath) => {
        var path = basePath;
        if (params) {
            var paramsArr = [];
            for (var prop in params) {
                paramsArr.push(prop + "=" + (params[prop] instanceof Array ? params[prop].join(',') : params[prop]));
            }
            path += '?' + paramsArr.join('&');
        }
        if (escapePath) {
            path = encodeURIComponent(path);
        }
        return path;
    },

    createGraphApiOptions: () => {
        return {
            host: "graph.facebook.com",
            path: "/2.11/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };
    },

    createSendMessageOptions: () => {
        return {
            host: "graph.facebook.com",
            path: "/v2.11/me/messages/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }
    }
};