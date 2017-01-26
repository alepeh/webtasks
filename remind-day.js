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
  var date = new Date(new Date().setDate(new Date(date).getDate()));
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
	    filteredDocuments.push(documents[i]);
	  }  
	}
  return filteredDocuments;
};
module.exports = Webtask.fromExpress(server).auth0({
  authorized: [
    'alexander@pehm.biz' 
  ]
});






