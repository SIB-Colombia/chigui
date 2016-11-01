import mongoose from 'mongoose';
import async from 'async';
import TaxonRecordNameVersion from '../models/taxonRecordName.js';
import add_objects from '../models/additionalModels.js';
import generalController from './generalController.js';
import { logger }  from '../../server/log';


function postTaxonRecordName(req, res) {
	  var taxon_record_name_version  = req.body; 
  	taxon_record_name_version._id = mongoose.Types.ObjectId();
  	taxon_record_name_version.created=Date();
    //taxon_record_name_version.state="to_review";
    taxon_record_name_version.state="accepted"
  	taxon_record_name_version.element="taxonRecordName";
  	var elementValue = taxon_record_name_version.taxonRecordName;
  	taxon_record_name_version = new TaxonRecordNameVersion(taxon_record_name_version);
  	var id_v = taxon_record_name_version._id;
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
                if(data.taxonRecordNameVersion && data.taxonRecordNameVersion.length !=0){
                  var lentaxonRecordName = data.taxonRecordNameVersion.length;
                  var idLast = data.taxonRecordNameVersion[lentaxonRecordName-1];
                  TaxonRecordNameVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of taxonRecordNameVersion:" + err.message));
                    }else{
                      var prev = doc.taxonRecordNameVersion;
                      var next = taxon_record_name_version.taxonRecordNameVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        taxon_record_name_version.id_record=id_rc;
                        taxon_record_name_version.version=lentaxonRecordName+1;
                        callback(null, taxon_record_name_version);
                      }else{
                        callback(new Error("The data in TaxonRecordNameVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  taxon_record_name_version.id_record=id_rc;
                  taxon_record_name_version.version=1;
                  callback(null, taxon_record_name_version);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
        		function(taxon_record_name_version, callback){ 
          			ver = taxon_record_name_version.version;
          			taxon_record_name_version.save(function(err){
            			if(err){
              				callback(new Error("failed saving the element version:" + err.message));
            			}else{
              				callback(null, taxon_record_name_version);
           				}
          			});
      			},
      			function(taxon_record_name_version, callback){ 
          			add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "taxonRecordNameVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
            			logger.error('Error Creation of a new TaxonRecordNameVersion', JSON.stringify({ message:err }) );
            			res.status(400);
            			res.json({ ErrorResponse: {message: ""+err }});
          			}else{
                  logger.info('Creation a new TaxonRecordNameVersion sucess', JSON.stringify({id_record: id_rc, TaxonRecordNameVersion: ver, _id: id_v, id_user: user}));
            			res.json({ message: 'Save TaxonRecordNameVersion', element: 'taxonRecordName', version : ver, _id: id_v, id_record : id_rc });
         			 }			
        		});

  		}else{
        logger.warn('Empty data in version of the element' );
    		res.status(400);
    		res.json({message: "Empty data in version of the element"});
   		}
  	}else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
  		res.status(400);
    	res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  	}
}

function postRecord(req, res) {
  var taxon_record_name_version  = req.body; 
  taxon_record_name_version._id = mongoose.Types.ObjectId();
  taxon_record_name_version.id_record=mongoose.Types.ObjectId();
  taxon_record_name_version.created=Date();
  //taxon_record_name_version.state="to_review";
  taxon_record_name_version.state="accepted"
  taxon_record_name_version.element="taxonRecordName";
  var user = taxon_record_name_version.id_user;
  var elementValue = taxon_record_name_version.taxonRecordName;
  taxon_record_name_version = new TaxonRecordNameVersion(taxon_record_name_version);
  var id_v = taxon_record_name_version._id;
  var id_rc = taxon_record_name_version.id_record;
  var ver = 1;
  var ob_ids= new Array();
  ob_ids.push(id_v);

  if(typeof  elementValue!=="undefined" && elementValue!=""){
    add_objects.RecordVersion.count({ _id : id_rc }, function (err, count){
      if(count==0){
        add_objects.RecordVersion.create({ _id:id_rc, taxonRecordNameVersion: ob_ids },function(err, doc){
          if(err){
            logger.error('Creation of a record error', JSON.stringify({ message:err }) );
            res.status(400);
            res.json({message: err });
          }else{
            taxon_record_name_version.version=1;
            taxon_record_name_version.save(function(err){
              if(err){
                logger.error('Creation of a record error', JSON.stringify({ message:err }) );
                res.status(400);
                res.json({message: err });
              }else{
                logger.info('Creation new record and TaxonRecordNameVersion sucess', JSON.stringify({id_record: id_rc, TaxonRecordNameVersion: ver, _id: id_v, id_user: user}));
                res.json({ message: 'Created a new Record and Save TaxonRecordNameVersion', element: 'TaxonRecordName', version : ver, _id: id_v, id_record : id_rc, id_user: user });
              }
            });
          }
        });
      }else{
        logger.warn('Already exists a Record with id', JSON.stringify({ id :id_rc }) );
        res.status(400);
        res.json({message: "Already exists a Record(Ficha) with id: "+id_rc });
      }
    });
  }else{
    logger.warn('Empty data in version of TaxonRecordName');
    res.status(400);
    res.json({message: "Empty data in version of TaxonRecordName" });
  }
}

function setAcceptedTaxonRecordName(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        TaxonRecordNameVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a TaxonRecordNameVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        TaxonRecordNameVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        TaxonRecordNameVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
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
        logger.error('Error to set TaxonRecordName accepted', JSON.stringify({ message:err }) );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        logger.info('Updated TaxonRecordNameVersion to accepted', JSON.stringify({ version:version, id_record: id_rc }) );
        res.json({ message: 'Updated TaxonRecordNameVersion to accepted', element: 'taxonRecordName', version : version, id_record : id_rc });
      }      
    });
  }else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewTaxonRecordName(req, res) {
  var id_rc = req.swagger.params.id.value;
  TaxonRecordNameVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      logger.error('Error getting the list of TaxonRecordNameVersion at state to_review', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        logger.info('Get list of TaxonRecordNameVersion with state to_review', JSON.stringify({ id_record: id_rc }) );
        res.json(elementList);
      }else{
        logger.warn("Doesn't exist a TaxonRecordNameVersion with the indicated id_record");
        res.status(406);
        res.json({message: "Doesn't exist a TaxonRecordNameVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedTaxonRecordName(req, res) {
  var id_rc = req.swagger.params.id.value;
  TaxonRecordNameVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
    if(err){
      logger.error('Error getting the last TaxonRecordNameVersion at state accepted', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementVer.length !== 0){
        logger.info('Get last TaxonRecordNameVersion with state accepted', JSON.stringify({ id_record: id_rc }) );
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a TaxonRecordNameVersion with id_record: "+id_rc});
      }
    }
  });
}

function getTaxonRecordName(req, res) {
  	var id_rc = req.swagger.params.id.value;
  	var version = req.swagger.params.version.value;

  	TaxonRecordNameVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              logger.error('Error getting the indicated TaxonRecordNameVersion', JSON.stringify({ message:err, id_record : id_rc, version: version }) );
              logger.error("message: " + err );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
              	res.status(400);
              	res.json({message: "Doesn't exist a TaxonRecordVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });
}

function postTestTaxonRecordName(req, res) {
  var element_version  = req.body; 
    //taxon_record_name_version._id = mongoose.Types.ObjectId();
    //taxon_record_name_version.created=Date();
    //taxon_record_name_version.state="to_review";
    //taxon_record_name_version.state="accepted";
    //var element = element_version.element;
    //taxon_record_name_version.element="taxonRecordName";
    //var elementValue = taxon_record_name_version.taxonRecordName;
    //taxon_record_name_version = new TaxonRecordNameVersion(taxon_record_name_version);
    //var id_v = taxon_record_name_version._id;
  var id_rc = req.swagger.params.id.value;



  //var response = generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc);
  //console.log("***"+response);
  //console.log("***"+generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc));

  async.waterfall([
      function(callback){ 
        var result = "-";
        /*
        result = generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc);
        //console.log("***" + generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc));
        console.log("***"+result);
        */
        callback(null, result);
      },
      function(result,callback){ 
        console.log(result);
        //result = generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc);
        callback(null, generalController.postElementVersion(TaxonRecordNameVersion, element_version, id_rc));
      },
      function(result,callback){ 
        console.log("*"+result);
        callback(null, result);
      },
    ],function(err, result) {
      if (err) {
        logger.error("message: " + err );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        console.log("!!"+result);
        //res.status(result[status]);
        //delete result[status];
        //res.json(result);
      }      
    });
  /*
  res.status(response[status]);
  response[status];
  res.json(response);
  /*
  if(response.status == 400){
    res.status(400);
    delete response[status];
    res.json(response);
  }else{
    res.status(200);
    delete response[status];
    res.json(response);
  }
  */

  //

}




module.exports = {
  postTaxonRecordName,
  getTaxonRecordName,
  setAcceptedTaxonRecordName,
  getToReviewTaxonRecordName,
  getLastAcceptedTaxonRecordName,
  postTestTaxonRecordName,
  postRecord
};