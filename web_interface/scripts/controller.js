function Controller(mParameters){
    "use strict"

    this._mockServer = null;
    this._mDomElements = {
        FetchDataButton: null,
        QueryField: null,
        OutputElement: null
    };

    this.init = function(mParameters){
        if(!mParameters){
            return;
        }

        if(mParameters.DomElements){
            this._mDomElements.FetchDataButton = mParameters.DomElements.FetchDataButton;
            if(this._mDomElements.FetchDataButton){
                this._mDomElements.FetchDataButton.addEventListener("click", this.onPressFetchData.bind(this));
            }

            this._mDomElements.QueryField = mParameters.DomElements.QueryField;
            if(this._mDomElements.QueryField){
                this._mDomElements.QueryField.addEventListener("change", this.onChangeQueryField.bind(this));
            }

            this._mDomElements.OutputElement = mParameters.DomElements.OutputElement;
        }

        if(mParameters.MockServer){
            this._mockServer = mParameters.MockServer;
        }
    };

    this.onPressFetchData = function(oEvent){
        this._mockServer.fetchData(this._eventDataCallback.bind(this));
    };

    this._eventDataCallback = function(data){
        console.log(data);

        window.fetchedData = data; // DEBUG
    };

    this.onChangeQueryField = function(oEvent){
        console.log(oEvent);

        var response;
        if(this._mockServer){
            var queryText = oEvent.srcElement.value;
            if(queryText){
                response = this._mockServer.postQueryText(queryText);
                if(response){
                    this.displayOutput(response);
                }
            }else{
                this.clearOutput();
            }
        }
    };

    this.displayOutput = function(mOutput){
        if(!this._mDomElements.OutputElement){
            return;
        }

        this.clearOutput();

        if(mOutput){
            var card, column;
            for(var prop in mOutput){
                column = document.createElement("div");
                column.setAttribute("class", "col-sm-3");

                card = this._createCardContainer(mOutput[prop], prop);

                column.appendChild(card);

                this._mDomElements.OutputElement.appendChild(column);
            }
        }
    };

    this._createCardContainer = function(content, title){
        var card, cardBlock, cardContent, temp;

        card = document.createElement("div");
        card.setAttribute("class", "card");

        cardBlock = document.createElement("div");
        cardBlock.setAttribute("class", "card-block");
        card.appendChild(cardBlock);

        if(title){
            cardContent = document.createElement("h4");
            cardContent.setAttribute("class", "card-title");
            cardContent.innerHTML = title;
            cardBlock.appendChild(cardContent);
        }

        if(content){
            temp = null;
            if(Array.isArray(content)){
                cardContent = document.createElement("p");
                cardContent.setAttribute("class", "card-text");

                cardContent.innerHTML = content.length > 0 ? content.join(", ") : "None";

                cardBlock.appendChild(cardContent);
            }else if(typeof content === "object"){
                for(var prop in content){
                    cardContent = document.createElement("p");
                    cardContent.setAttribute("class", "card-text");

                    cardContent.innerHTML = prop + ": " + content[prop];

                    cardBlock.appendChild(cardContent);
                }
            }else{
                cardContent = document.createElement("p");
                cardContent.setAttribute("class", "card-text");

                cardContent.innerHTML = content;

                cardBlock.appendChild(cardContent);
            }
        }

        return card;
    }

    this.clearOutput = function(){
        if(!this._mDomElements.OutputElement){
            return;
        }

        while(this._mDomElements.OutputElement.children.length > 0){
            this._mDomElements.OutputElement.removeChild(this._mDomElements.OutputElement.lastChild);
        }
    };

    this.init(mParameters);
}
