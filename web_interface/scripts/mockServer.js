function MockServer(){
    "use strict"

    function Parser(){

    };

    this._parser = new Parser();

    this._mockData = {
        eventTypes: [
            {
                Name: "Any",
                Regex: {
                    en: "",
                    fi: ""
                }
            },
            {
                Name: "Course",
                Regex: {
                    en: /course|lesson/,
                    fi: ""
                }
            },
            {
                Name: "Party",
                Regex: {
                    en: "",
                    fi: ""
                }
            },
            {
                Name: "Event",
                Regex: {
                    en: "",
                    fi: ""
                }
            }
        ],
        interestTags: [
            { Name: "", Regex: ""}
        ]
    };

    this._fbInterface = new FacebookInterface();

    this._fbNodes = {
        IDanceHelsinki: 343877245641683,
        SalsaLatina: 218545868207533,
        BailaBaila: 149017031808062,
        SalsaStudioHelsinki: 410366985000,
        HelsinkiSalsaAcademy: 187046454640210,
        SalsaBorealis: 181612268553494,
        RioZoukStyle: 341108445941295,
        LambazoukFinland: 1632263940334820,
        KirsiAndCarlosKizomba: 325466984269341,

        FiestaLatinaHelsinki: 622387527900387,

        VeDance: 1866639140232828,
        SalsaGarage: 750517591779604,

        DJGoodblood: 1563545733858318,
        DJLuchoHelsinki: 155127126480,
        DJHermanni: 213430002067432
    };

    this.fetchData = function(callback){
        var data = [];
        var nodeUrl;

        var asyncCallsCount = 0;
        var asyncCallsFinished = 0;

        var nodeCallback = function(data, key, response){
            data.push({
                id: this._fbNodes[key],
                name: key,
                events: response
            });

            asyncCallsFinished++;
            if(asyncCallsCount === asyncCallsFinished && callback){
                callback(data);
            }
        };

        if(this._fbInterface){
            asyncCallsCount = Object.keys(this._fbNodes).length;

            for(var node in this._fbNodes){
                nodeUrl = "" + this._fbNodes[node] + "/events";

                this._fbInterface.apiCall(nodeUrl, nodeCallback.bind(this, data, node));
                // {
                //     fields: "id,name,owner.fields(id,name)"
                // }
            }
        }else{
            console.error("Facebook Interface not found");
        }
    };

    this.postQueryText = function(sText){
        return this._parseQueryText(sText);
    }

    this._parseQueryText = function(sText){
        var result = null;

        if(sText){
            result = {
                RequestText: sText,
                Language: this._detectLanguage(sText),
                DateRange: this._detectDateRange(sText),
                InterestTags: this._detectInterestTags(sText),
                EventTypes: this._detectEventTypes(sText)
            };
        }

        return result;
    };

    this._detectLanguage = function(sText){
        return "en";

        // TODO: actual logic
    };

    this._detectDateRange = function(sText){
        return {
            from: new Date(),
            to: new Date()
        };

        // TODO: actual logic
    };

    this._detectInterestTags = function(sText){
        return [];

        // TODO: actual logic
    };

    this._detectEventTypes = function(sText){
        return [];

        // TODO: actual logic
    };
}
