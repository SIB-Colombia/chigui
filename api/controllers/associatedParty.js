import mongoose from 'mongoose';
import async from 'async';
import winston from 'winston';
import AssociatedPartyVersion from '../models/associatedParty.js';
import add_objects from '../models/additionalModels.js';


function postAssociatedParty(req, res) {
  var associated_party_version  = req.body; 
    associated_party_version._id = mongoose.Types.ObjectId();
    associated_party_version.created=Date();
    associated_party_version.state="to_review";
    //associated_party_version.state="accepted";
    associated_party_version.element="associatedParty";
    var elementValue = associated_party_version.associatedParty;
    associated_party_version = new AssociatedPartyVersion(associated_party_version);
    var id_v = associated_party_version._id;
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
                var lenassociatedParty = data.associatedPartyVersion.length;
                if( lenassociatedParty !=0 ){
                  var idLast = data.associatedPartyVersion[lenassociatedParty-1];
                  AssociatedPartyVersion.findById(idLast , function (err, doc){
                    if(err){
                            callback(new Error("failed getting the last version of associatedPartyVersion:" + err.message));
                        }else{
                          var prev = doc.associatedParty;
                            var next = associated_party_version.associatedParty;
                            //if(!compare.isEqual(prev,next)){ //TODO
                            if(true){
                              associated_party_version.id_record=id_rc;
                              associated_party_version.version=lenassociatedParty+1;
                              callback(null, associated_party_version);
                            }else{
                              callback(new Error("The data in associatedParty is equal to last version of this element in the database"));
                            }
                        }
                  });
                }else{
                  associated_party_version.id_record=id_rc;
                      associated_party_version.version=1;
                      callback(null, associated_party_version);
                }
              }else{
                  callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(associated_party_version, callback){ 
                ver = associated_party_version.version;
                associated_party_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, associated_party_version);
                  }
                });
            },
            function(associated_party_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "associatedPartyVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
                  //res.status(406);
                  winston.error("message: " + err );
                  res.status(400);
                  res.json({ ErrorResponse: {message: ""+err }});
                }else{
                  winston.info('info', 'Save AssociatedPartyVersion, version: ' + ver + " for the Record: " + id_rc);
                  res.json({ message: 'Save AssociatedPartyVersion', element: 'associatedParty', version : ver, _id: id_v, id_record : id_rc });
               }      
            });

      }else{
        //res.status(406);
        winston.error("message: " + "Empty data in version of the element" );
        res.status(400);
        res.json({message: "Empty data in version of the element"});
      }
    }else{
      //res.status(406);
      winston.error("message: " + "The url doesn't have the id for the Record (Ficha)" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
    }
}

function setAcceptedAssociatedParty(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        AssociatedPartyVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a AssociatedPartyVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        AssociatedPartyVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        AssociatedPartyVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
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
        winston.info('info', 'Updated AssociatedPartyVersion to accepted, version: ' + version + " for the Record: " + id_rc);
        res.json({ message: 'Updated AssociatedPartyVersion to accepted', element: 'associatedParty', version : version, id_record : id_rc });
      }      
    });
  }else{
    //res.status(406);
      winston.error("message: " + "The url doesn't have the id for the Record (Ficha)" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewAssociatedParty(req, res) {
  var id_rc = req.swagger.params.id.value;
  AssociatedPartyVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      winston.error("message: " + err );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        winston.info('info', 'Get list of AssociatedPartyVersion with state to_review, function getToReviewAssociatedParty');
        res.json(elementList);
      }else{
        winston.error("message: " + err );
        res.status(406);
        res.json({message: "Doesn't exist a AssociatedPartyVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedAssociatedParty(req, res) {
  var id_rc = req.swagger.params.id.value;
  AssociatedPartyVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
    if(err){
      res.status(400);
      res.send(err);
    }else{
      if(elementVer){
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a AssociatedPartyVersion with id_record: "+id_rc});
      }
    }
  });
}

function getAssociatedParty(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    AssociatedPartyVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                res.status(400);
                res.json({message: "Doesn't exist a AssociatedPartyVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


module.exports = {
  postAssociatedParty,
  getAssociatedParty,
  setAcceptedAssociatedParty,
  getToReviewAssociatedParty,
  getLastAcceptedAssociatedParty
};