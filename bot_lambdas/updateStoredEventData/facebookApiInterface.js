const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

module.exports = {
    buildQueryUrl: (basePath, params, escapePath) => {
        let path = basePath;
        if (params) {
            let paramsArr = [];
            for (let prop in params) {
                paramsArr.push(prop + "=" + (params[prop] instanceof Array ? params[prop].join(',') : params[prop]));
            }
            path += '?' + paramsArr.join('&');
        }
        if (escapePath) {
            path = encodeURIComponent(path);
        }
        return path;
    },

    createBaseGraphApiOptions: () => {
        return {
            host: "graph.facebook.com",
            path: "/2.9/?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };
    }
};