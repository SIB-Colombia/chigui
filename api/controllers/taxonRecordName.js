import mongoose from 'mongoose';
import async from 'async';
import TaxonRecordNameVersion from '../models/taxonRecordName.js';
import add_objects from '../models/additionalModels.js';


function postTaxonRecordName(req, res) {
	console.log("!!!");
	var taxon_record_name_version  = req.body; 
  	taxon_record_name_version._id = mongoose.Types.ObjectId();
  	taxon_record_name_version.created=Date();
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
        				var lentaxonRecordName = data.taxonRecordNameVersion.length;
        				if( lentaxonRecordName !=0 ){
        					var idLast = data.taxonRecordNameVersion[lentaxonRecordName-1];
        					TaxonRecordNameVersion.findById(idLast , function (err, doc){
        						if(err){
                  					callback(new Error("failed getting the last version of taxonRecordNameVersion:" + err.message));
                				}else{
                					var prev = doc.taxonRecordName;
                  					var next = taxon_record_name_version.taxonRecordName;
                  					//if(!compare.isEqual(prev,next)){ //TODO
                  					if(true){
                  						taxon_record_name_version.id_record=id_rc;
                    					taxon_record_name_version.version=lentaxonRecordName+1;
                    					callback(null, taxon_record_name_version);
                  					}else{
                  						callback(new Error("The data in taxonRecordName is equal to last version of this element in the database"));
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
            			console.log("Error: "+err);
            			//res.status(406);
            			res.status(400);
            			res.json({ ErrorResponse: {message: ""+err }});
          			}else{
            			res.json({ message: 'Save TaxonRecordNameVersion', element: 'taxonRecordName', version : ver, _id: id_v, id_record : id_rc });
         			 }			
        		});

  		}else{
    		//res.status(406);
    		res.status(400);
    		res.json({message: "Empty data in version of the element"});
   		}
  	}else{
  		//res.status(406);
  		res.status(400);
    	res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  	}

}

function getTaxonRecordName(req, res) {
	console.log("****");

  	var id_rc = req.swagger.params.id.value;
  	var version = req.swagger.params.version.value;

  	TaxonRecordNameVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
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


module.exports = {
  postTaxonRecordName,
  getTaxonRecordName
};