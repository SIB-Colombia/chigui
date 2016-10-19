import mongoose from 'mongoose';
import async from 'async';
import winston from 'winston';
import AncillaryData from '../models/ancillaryData.js';
import add_objects from '../models/additionalModels.js';


function postAncillaryData(req, res) {
  var ancillary_data_version  = req.body; 
    ancillary_data_version._id = mongoose.Types.ObjectId();
    ancillary_data_version.created=Date();
    ancillary_data_version.state="to_review";
    ancillary_data_version.element="ancillaryData";
    var elementValue = ancillary_data_version.ancillaryData;
    ancillary_data_version = new AncillaryData(ancillary_data_version);
    var id_v = ancillary_data_version._id;
    var id_rc = req.swagger.params.id.value;

    var ob_ids= new Array();
    ob_ids.push(id_v);

    var ver = "";

    if(typeof  id_rc!=="undefined" && id_rc!=""){
      if(typeof  elementValue!=="undefined" && elementValue!=""){
        async.waterfall([
          function(callback){ 
                add_objects.RecordVersion.findById(id_rc , function (err, data){
                  if(err){
                      callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist.:" + err.message));
                  }else{
                      callback(null, data);
                  }
                });
            },
            function(data,callback){
              if(data){
                if(data.ancillaryDataVersion && data.ancillaryDataVersion.length !=0){
                  var lenAncillaryData = data.ancillaryDataVersion.length;
                  var idLast = data.ancillaryDataVersion[lenAncillaryData-1];
                  AncillaryDataVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of AncillaryDataVersion:" + err.message));
                    }else{
                      var prev = doc.ancillaryDataVersion;
                      var next = ancillary_data_version.ancillaryDataVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        ancillary_data_version.id_record=id_rc;
                        ancillary_data_version.version=lenAncillaryData+1;
                        callback(null, ancillary_data_version);
                      }else{
                        callback(new Error("The data in AncillaryDataVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  ancillary_data_version.id_record=id_rc;
                  ancillary_data_version.version=1;
                  callback(null, ancillary_data_version);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(ancillary_data_version, callback){ 
                ver = ancillary_data_version.version;
                ancillary_data_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, ancillary_data_version);
                  }
                });
            },
            function(ancillary_data_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "ancillaryDataVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
                  if(err){
                      callback(new Error("failed added id to RecordVersion:" + err.message));
                  }else{
                      callback();
                  }
                });
            }
            ],
            function(err, result) {
                if (err) {
                  console.log("Error: "+err);
                  winston.error("message: " + err );
                  res.status(400);
                  res.json({ ErrorResponse: {message: ""+err }});
                }else{
                  winston.info('info', 'Save AncillaryDataVersion, version: ' + ver + " for the Record: " + id_rc);
                  res.json({ message: 'Save AncillaryData', element: 'ancillaryData', version : ver, _id: id_v, id_record : id_rc });
               }      
            });

      }else{
        winston.error("message: " + "Empty data in version of the element" );
        res.status(400);
        res.json({message: "Empty data in version of the element"});
      }
    }else{
      winston.error("message: " + "The url doesn't have the id for the Record" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
    }

}

function getAncillaryData(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    AncillaryData.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              winston.error("message: " + err );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                winston.error("message: Doesn't exist a AncillaryData with id_record " + id_rc+" and version: "+version );
                res.status(400);
                res.json({message: "Doesn't exist a AncillaryData with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setAcceptedAncillaryData(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        AncillaryDataVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a AncillaryDataVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        AncillaryDataVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        AncillaryDataVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else{
            callback();
          }
        });
      }
    ],
    function(err, result) {
      if (err) {
        console.log("Error: "+err);
        winston.error("message: " + err );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        winston.info('info', 'Updated AncillaryDataVersion to accepted, version: ' + version + " for the Record: " + id_rc);
        res.json({ message: 'Updated AncillaryDataVersion to accepted', element: 'AncillaryData', version : version, id_record : id_rc });
      }      
    });
  }else{
    //res.status(406);
      winston.error("message: " + "The url doesn't have the id for the Record (Ficha)" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewAncillaryData(req, res) {
  var id_rc = req.swagger.params.id.value;
  AncillaryDataVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      winston.error("message: " + err );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        winston.info('info', 'Get list of AncillaryDataVersion with state to_review, function getToReviewAncillaryData');
        res.json(elementList);
      }else{
        winston.error("message: " + err );
        res.status(406);
        res.json({message: "Doesn't exist a AncillaryDataVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedAncillaryData(req, res) {
  var id_rc = req.swagger.params.id.value;
  AncillaryDataVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
    if(err){
    winston.error("message: " + err );
      res.status(400);
      res.send(err);
    }else{
      if(elementVer.length !== 0){
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a AncillaryDataVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postAncillaryData,
  getAncillaryData,
  setAcceptedAncillaryData,
  getToReviewAncillaryData,
  getLastAcceptedAncillaryData
};