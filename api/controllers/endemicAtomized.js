import mongoose from 'mongoose';
import async from 'async';
import winston from 'winston';
import EndemicAtomizedVersion from '../models/endemicAtomized.js';
import add_objects from '../models/additionalModels.js';


function postEndemicAtomized(req, res) {
  var endemic_atomized_version  = req.body; 
    endemic_atomized_version._id = mongoose.Types.ObjectId();
    endemic_atomized_version.created=Date();
    endemic_atomized_version.state="to_review";
    endemic_atomized_version.element="endemicAtomized";
    var elementValue = endemic_atomized_version.endemicAtomized;
    endemic_atomized_version = new EndemicAtomizedVersion(endemic_atomized_version);
    var id_v = endemic_atomized_version._id;
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
                if(data.endemicAtomizedVersion && data.endemicAtomizedVersion.length !=0){
                  var lenEndemicAtomized = data.endemicAtomizedVersion.length;
                  var idLast = data.endemicAtomizedVersion[lenEndemicAtomized-1];
                  EndemicAtomizedVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of EndemicAtomizedVersion:" + err.message));
                    }else{
                      var prev = doc.endemicAtomizedVersion;
                      var next = endemic_atomized_version.endemicAtomizedVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        endemic_atomized_version.id_record=id_rc;
                        endemic_atomized_version.version=lenEndemicAtomized+1;
                        callback(null, endemic_atomized_version);
                      }else{
                        callback(new Error("The data in EndemicAtomizedVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  endemic_atomized_version.id_record=id_rc;
                  endemic_atomized_version.version=1;
                  callback(null, endemic_atomized_version);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(endemic_atomized_version, callback){ 
                ver = endemic_atomized_version.version;
                endemic_atomized_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, endemic_atomized_version);
                  }
                });
            },
            function(endemic_atomized_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "endemicAtomizedVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
                  winston.info('info', 'Save EndemicAtomizedVersion, version: ' + ver + " for the Record: " + id_rc);
                  res.json({ message: 'Save EndemicAtomizedVersion', element: 'endemicAtomized', version : ver, _id: id_v, id_record : id_rc });
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

function getEndemicAtomized(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    EndemicAtomizedVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              winston.error("message: " + err );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                winston.error("message: Doesn't exist a EndemicAtomizedVersion with id_record " + id_rc+" and version: "+version );
                res.status(400);
                res.json({message: "Doesn't exist a EndemicAtomizedVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setAcceptedEndemicAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        EndemicAtomizedVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a EndemicAtomizedVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        EndemicAtomizedVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        EndemicAtomizedVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
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
        winston.info('info', 'Updated EndemicAtomizedVersion to accepted, version: ' + version + " for the Record: " + id_rc);
        res.json({ message: 'Updated EndemicAtomizedVersion to accepted', element: 'EndemicAtomized', version : version, id_record : id_rc });
      }      
    });
  }else{
    //res.status(406);
      winston.error("message: " + "The url doesn't have the id for the Record (Ficha)" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewEndemicAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  EndemicAtomizedVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      winston.error("message: " + err );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        winston.info('info', 'Get list of EndemicAtomizedVersion with state to_review, function getToReviewEndemicAtomized');
        res.json(elementList);
      }else{
        winston.error("message: " + err );
        res.status(406);
        res.json({message: "Doesn't exist a EndemicAtomizedVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedEndemicAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  EndemicAtomizedVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
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
        res.json({message: "Doesn't exist a EndemicAtomizedVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postEndemicAtomized,
  getEndemicAtomized,
  setAcceptedEndemicAtomized,
  getToReviewEndemicAtomized,
  getLastAcceptedEndemicAtomized
};