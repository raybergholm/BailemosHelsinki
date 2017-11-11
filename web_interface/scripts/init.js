function init(){
    "use strict"

    window._mockServer = new MockServer();

    var parameters = {};
    parameters.DomElements = {
        FetchDataButton: document.getElementById("fetchDataButton"),
        QueryField: document.getElementById("queryField"),
        OutputElement: document.getElementById("outputElement")
    };

    parameters.MockServer = window._mockServer;

    window._appController = new Controller(parameters);
};
