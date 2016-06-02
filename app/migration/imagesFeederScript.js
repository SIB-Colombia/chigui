var mongoose = require('mongoose');
var async = require('async');
var fs = require('fs');
var TaxonRecordNameVersion = require('../models/taxonRecordName.js');
var SynonymsAtomizedVersion = require('../models/synonymsAtomized.js');
var CommonNamesAtomizedVersion = require('../models/commonNamesAtomized.js');
var HierarchyVersion = require('../models/hierarchy.js');
var ThreatStatusVersion = require('../models/threatStatus.js');
var add_objects = require('../models/additionalModels.js');
var parse = require('csv-parse');
var rest = require('restler');
var Schema = mongoose.Schema;

var CatalogoDb = mongoose.createConnection('mongodb://localhost:27017/catalogoDb', function(err) {
	if(err) {
      console.log('connection error', err);
  	}else{
  		console.log('connection successful to the CatalogoDb');
  		async.waterfall([
  			function(callback) {
        		var texSchema = TaxonRecordNameVersion.schema;
          		var TaxonRecordNameVersionModel = CatalogoDb.model('TaxonRecordNameVersion', texSchema );

          		TaxonRecordNameVersionModel.find({}, function(err, records){
          			if(err){
          				console.log("Error finding scientificName in the database!: " + taxName);
						throw new ScriptException("Error finding scientific Name in the database!: " + taxName);
          			}else{
          				console.log("Number of Records finded: " + records.length);
          				if(records.length > 0){
          					callback(null, records);
          				}else{
          					//TODO break,
          				}	//callback(error);
          			}
          		});
    		},
    		function(records, callback) {
      			if(records.length > 0){
      				async.eachSeries(records, function(record, callback){
      					rest.get("http://eol.org/api/search/1.0.json?q="+ encodeURIComponent(taxonnombre) +"&page=1&exact=true&filter_by_taxon_concept_id=&filter_by_hierarchy_entry_id=&filter_by_string=&cache_ttl=").on('complete', function(data) {
      						if (data instanceof Error || response.statusCode !== 200) {
      							console.log('Error:', result.message);
      						}else{

      						}
      					});
      				}, 
      				function(err){
              			// if any of the file processing produced an error, err would equal that error
              			if( err ) {
                			// One of the iterations produced an error.
                			// All processing will now stop.
                			console.log('A record failed to process');
              			} else {
                			console.log('All records have been processed successfully');
                			callback(null, dataN, catalogoDb);
              			}
          			})
      			}
    		},
    		function(arg1, callback) {
        		// arg1 now equals 'three'
        		callback(null, 'done');
    		}
  			],
  			,function (err, result){
          		if (err) {
                      console.log("Error in the script!!: " + err);
                      callback();
                    }else{
                      console.log('done!');
                      callback();
                }
    	});

  	}
});