'use latest';
import bodyParser from 'body-parser';
import express from 'express';
import Webtask from 'webtask-tools';
import { MongoClient } from 'mongodb';
import { ObjectID } from 'mongodb';
var moment = require('moment');

const server = express();

server.use(bodyParser.json());

server.get('/:DateAsyyymmdd',  (req, res, next) => {
  var MONGO_URL = req.webtaskContext.data;
  var date = req.params.DateAsyyymmdd;
  console.log("Requested Reminders for: " + date);
  query(MONGO_URL, date).then(result => {res.send(result)});
});

server.get('/', (req, res, next) => {
  var MONGO_URL = req.webtaskContext.data;
  var date = new Date(new Date().setDate(new Date().getDate()));
  console.log("Requested Reminders for: " + date);
  query(MONGO_URL, date).then(result => {res.send(result)});
});

var query = function(mongourl, date){
  
  var fromDate = new Date(new Date().setDate(new Date(date).getDate()-1));
  var toDate = new Date(new Date().setDate(new Date(date).getDate()+8));
  
  console.log("From date is " + fromDate);
  console.log("ToDate is: " + toDate);
  return new Promise(
    function(resolve, reject){
      const { MONGO_URL } = mongourl;
  const { DATE } = date;
  MongoClient.connect(MONGO_URL, (err, db) => {
    if (err) return next(err);
    db.collection('termine').aggregate([
    {
      $lookup:
         {
            from: "kehrplaene",
            localField: "_id",
            foreignField: "termine",
            as: "kehrplan"
        }
    },
   {
        $unwind: "$kehrplan"
    },
    {
    $lookup:
         {
            from: "kehrterminerinnerungen",
            localField: "kehrplan._id",
            foreignField: "kehrplan",
            as: "erinnerung"
        }
    },
   {
        $unwind: "$erinnerung"
    },
    {
    $lookup:
         {
            from: "strassen",
            localField: "erinnerung.strasse",
            foreignField: "_id",
            as: "strasse"
        }
    },
    {
    $lookup:
         {
            from: "orte",
            localField: "erinnerung.ort",
            foreignField: "_id",
            as: "ort"
        }
    },
    {
        $unwind: "$ort"
    },
    {
    $lookup:
         {
            from: "mitarbeiter",
            localField: "ort.mitarbeiter",
            foreignField: "_id",
            as: "mitarbeiter"
        }
    },
    {
      $match: { "datum": { 
	        $lte: toDate, 
	        $gte: fromDate
        }  
      }
    }
    ]).toArray(function(error, documents) {
          console.log("Finished query");
      if (err) reject(error);
      resolve (filter(documents, date));
    });
  });
    } 
  );
};

var filter = function(documents, date){
  var filteredDocuments = [];
	var now = moment(date).startOf('day').format();
	for(var i=0;i<documents.length;i++){
	  console.log("Erinnerung Time: " + moment(documents[i].datum).subtract(documents[i].erinnerung.zeitpunkt, 'days').startOf('day').format());
	  if(moment(documents[i].datum).subtract(documents[i].erinnerung.zeitpunkt, 'days').startOf('day').format() === now){
	    var doc = {};
	    
	    //Anzahl: 1203 ​ ​[{"_id":"58867efbf0e3fa6510fded21","datum":"2017-02-03T19:08:46.000Z","__v":0,"kehrplan":{"_id":"581226b62d4c44188d9fd6bd","hausNummer":"","hausNummerBis":"","hausNummerVon":"","ort":"580d1622de752368257a279e","name":"Siegendorf Tag04 Kleine Gasse","createdAt":"2016-10-27T16:09:26.000Z","termine":["581226de2d4c44188d9fd6be","58867efbf0e3fa6510fded21","58867f04f0e3fa6510fded22","58867f0df0e3fa6510fded23","58867f17f0e3fa6510fded24"],"__v":2,"strasse":"581063302d4c44188d9fd666"},"erinnerung":{"_id":"581227112d4c44188d9fd6bf","hausNummer":"8","ort":"580d1622de752368257a279e","createdAt":"2016-10-27T16:10:57.000Z","erinnerungPerSms":true,"erinnerungPerEmail":false,"name":{"last":"Popp","first":"Roman"},"__v":0,"email":"","kehrplan":"581226b62d4c44188d9fd6bd","strasse":"581063302d4c44188d9fd666","telefon":"06503876842","zeitpunkt":"7"},"strasse":[{"_id":"581063302d4c44188d9fd666","ort":"580d1622de752368257a279e","strasse":"Kleine Gasse","__v":0}],"ort":{"_id":"580d1622de752368257a279e","plz":"7011","ort":"Siegendorf","__v":0,"mitarbeiter":"58088bfe121b0919ee2ce319"},"mitarbeiter":[{"_id":"58088bfe121b0919ee2ce319","name":{"last":"Bauer","first":"Julius"},"__v":0,"telefon":"069910416567"}]}]
	    
	    doc.name = documents[i].erinnerung.name
	    filteredDocuments.push(doc);
	  }  
	}
  return filteredDocuments;
};
//does not work - see https://auth0.com/forum/t/webtask-authentication-returns-unauthorized/5071
//module.exports = Webtask.fromExpress(server).auth0();
module.exports = Webtask.fromExpress(server);






