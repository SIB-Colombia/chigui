import mongoose from 'mongoose';
import async from 'async';
import winston from 'winston';
import HierarchyVersion from '../models/hierarchy.js';
import add_objects from '../models/additionalModels.js';

winston.add(winston.transports.File, { filename: 'chigui.log' });

function postHierarchy(req, res) {
  var hierarchy_version  = req.body; 
    hierarchy_version._id = mongoose.Types.ObjectId();
    hierarchy_version.created=Date();
    hierarchy_version.state="to_review";
    hierarchy_version.element="hierarchy";
    var elementValue = hierarchy_version.hierarchy;
    hierarchy_version = new HierarchyVersion(hierarchy_version);
    var id_v = hierarchy_version._id;
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
                var lenhierarchy = data.hierarchyVersion.length;
                if( lenhierarchy !=0 ){
                  var idLast = data.hierarchyVersion[lenhierarchy-1];
                  HierarchyVersion.findById(idLast , function (err, doc){
                    if(err){
                            callback(new Error("failed getting the last version of hierarchyVersion:" + err.message));
                        }else if(doc){
                          var prev = doc.hierarchy;
                            var next = hierarchy_version.hierarchy;
                            //if(!compare.isEqual(prev,next)){ //TODO
                            if(true){
                              hierarchy_version.id_record=id_rc;
                              hierarchy_version.version=lenhierarchy+1;
                              callback(null, hierarchy_version);
                            }else{
                              callback(new Error("The data in hierarchy is equal to last version of this element in the database"));
                            }
                        }else{
                          callback(new Error("An _id was registered for the Record, but the corresponding HierarchyVersion wasn't created"));
                        }
                  });
                }else{
                  hierarchy_version.id_record=id_rc;
                      hierarchy_version.version=1;
                      callback(null, hierarchy_version);
                }
              }else{
                  callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(hierarchy_version, callback){ 
                ver = hierarchy_version.version;
                hierarchy_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, hierarchy_version);
                  }
                });
            },
            function(hierarchy_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "hierarchyVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
                  winston.info('info', 'Save HierarchyVersion, version: ' + ver + " for the Record: " + id_rc);
                  res.json({ message: 'Save HierarchyVersion', element: 'hierarchy', version : ver, _id: id_v, id_record : id_rc });
               }      
            });

      }else{
        winston.error("message: " + "Empty data in version of the element" );
        res.status(400);
        res.json({message: "Empty data in version of the element"});
      }
    }else{
      winston.error("message: " + "The url doesn't have the id for the Record " );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
    }

}

function getHierarchy(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    HierarchyVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              winston.error("message: " + err );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                winston.error("message: Doesn't exist a HierarchyVersion with id_record " + id_rc+" and version: "+version );
                res.status(400);
                res.json({message: "Doesn't exist a HierarchyVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setAcceptedHierarchy(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        HierarchyVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a HierarchyVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        HierarchyVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        HierarchyVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
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
        winston.info('info', 'Updated HierarchyVersion to accepted, version: ' + version + " for the Record: " + id_rc);
        res.json({ message: 'Updated HierarchyVersion to accepted', element: 'hierarchy', version : version, id_record : id_rc });
      }      
    });
  }else{
    //res.status(406);
      winston.error("message: " + "The url doesn't have the id for the Record (Ficha)" );
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewHierarchy(req, res) {
  var id_rc = req.swagger.params.id.value;
  HierarchyVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      winston.error("message: " + err );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        winston.info('info', 'Get list of HierarchyVersion with state to_review, function getToReviewHierarchy');
        res.json(elementList);
      }else{
        winston.error("message: " + err );
        res.status(406);
        res.json({message: "Doesn't exist a HierarchyVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedHierarchy(req, res) {
  var id_rc = req.swagger.params.id.value;
  HierarchyVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
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
        res.json({message: "Doesn't exist a HierarchyVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postHierarchy,
  getHierarchy,
  setAcceptedHierarchy,
  getToReviewHierarchy,
  getLastAcceptedHierarchy
};