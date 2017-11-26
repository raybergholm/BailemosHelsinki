"use strict";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const EVENT_ORGANISER_TABLE_NAME = process.env.EVENT_ORGANISER_TABLE_NAME;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

var AWS = require("aws-sdk");
AWS.config.update({
    region: "eu-central-1"
});

var dynamodb = new AWS.DynamoDB({
    apiVersion: "2017-11-20"    // TODO: any special significance to this timestamp?
});

var s3 = new AWS.S3({
    apiVersion: "2017-11-20"   // TODO: any special significance to this timestamp?
});

exports.handler = (event, context, callback) => {
    console.log(event);

    /*
    // TODO: event["X-Hub-Signature"] is always undefined, but it's definitely there. Why?
    if(!verifySignature(event['X-Hub-Signature'])){
        console.log("X-Hub_Signature did not match the expected value");
        return;
    }
    */

    fetchNodes();

    var response = {
        isBase64Encoded: false,
        statusCode: 200,
        body: "OK"
    };

    console.log("returning the following response: ", JSON.stringify(response));
    callback(null, response);
};

function fetchNodes() {
    //return fetchNodesDebug();

    dynamodb.scan({
        TableName: EVENT_ORGANISER_TABLE_NAME,
        Limit: 50
    }, function(err, data) {
        var line;
        var nodes = {};
        if (err) {
            console.log("error reading DynamoDB: ", err);
        } else {
            for (var item in data.Items) {

                console.log(typeof data.Items);
                line = data.Items[item];

                /* Structure:
                {
                    "S3Pointer": {
                        "S": "TODO"
                    },
                    "NodeType": {
                        "S": "Group"
                    },
                    "NodeId": {
                        "N": "341108445941295"
                    },
                    "ItemId": {
                        "N": "7"
                    },
                    "Name": {
                        "S": "RioZoukStyle"
                    }
                    }
                */

                //console.log(JSON.stringify(line));

                nodes[line.Name.S] = { // TODO: hardcoding all these S and Ns are a bit silly, sort that out later?
                    Id: line.NodeId.N,
                    Type: line.NodeType.S,
                    S3Pointer: line.S3Pointer.S
                };
            }

            fetchData(nodes);
        }
    });
}

function debugFetchNodes(){ // this is just the data from DynamoDB hardcoded here. Move it there when the IAM permissions issue gets fixed
    return {
        IDanceHelsinki: 343877245641683,
        SalsaLatina: 218545868207533,
        SalsotekaLatinaAfroFlow: 100010462204294,
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
}

function fetchData(nodes) {
    console.log(JSON.stringify(nodes));

    debugS3();

    for (var node in nodes) {
        queryFacebookApi(node, nodes[node]); // foreach node: query FB for event data and replace the data in the corresponding S3 bucket
    }
}

function debugS3(){
    s3.listBuckets(function(err, data){
        if(err){
            console.log("S3 interface error: ", err);
        }else{
            console.log("bucket list", data.Buckets);
        }
    });

    s3.getObject({
        Bucket: S3_BUCKET_NAME,
        Key: "S3 Dummy Test File.txt"
    }, function(err, data){
        if(err){
            console.log("S3 interface error: ", err);
        }else{
            console.log("bucket item data:", data);
        }
    });
}

function queryFacebookApi(nodeName, nodeData) {
    var url = generateApiUrl(nodeData.Id);

}

function updateS3Data(key, data){
    // TODO:
}

function generateApiUrl(targetNodeId) {
    return {
        path: "/v2.9/" + targetNodeId + "/events",
        accessToken: "?access_token=" + FACEBOOK_PAGE_ACCESS_TOKEN
    };
}
