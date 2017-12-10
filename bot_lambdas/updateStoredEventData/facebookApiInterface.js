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
    createGraphApiOptions: (pageAccessToken) => {
        return {
            host: "graph.facebook.com",
            path: "/2.9/?access_token=" + pageAccessToken,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }
    }
};