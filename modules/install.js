exports.name = "install";
exports.version = "1.0";
var mysql = require('mysql');
var fs = require('fs');

exports.check = function(callback) {
  F.path.exists(F.path.root()+'/config', function(exists,size,isFile) {     
     callback(exists);
     if (!exists) {
	     console.log('==========================================\n'+
		         '===== Need install service  ==============\n'+
                         '==========================================\n'+
		               ' Open browser and go to link: \n'+
		               '     http://'+F.ip+':'+F.port+'/install   \n');

      	F.route('/install/', install);
      	F.route('/install/db/check',  check_db,   [ 'get',  '*Install' ]);
        F.route('/install/db/create', create_db,  [ 'get',  '*Install' ]);
        F.route('/install/db/import', import_db,  [ 'get',  '*Install' ]);
        F.route('/install/save',      save_config,[ 'post', '*Install' ]);
        
        function install() {
    	    var self = this;
    	    self.layout('install');	    
    	    self.view();	    
        }
        //db connection check
        function check_db() {
        	var self = this;        	        	
        	self.$workflow('check_db', self.query, self.callback());   				
        }
        //create db
        function create_db() {
          var self = this;                    
          self.$workflow('create_db', self.query, self.callback());          
        }
         //import db
        function import_db() {
          var self = this;                    
          self.$workflow('import_db', self.query, self.callback());          
        }
        //save config
        function save_config() {          
          var self = this;                
          self.body.$save(self, self.callback());          
        }
     }
  });
};


NEWSCHEMA('Install').make(function(schema) {	
  schema.define('db',    Object);
  schema.define('mail',    Object);
	schema.setResource('errors');    
       //db connection check
	schema.addWorkflow('check_db', function (error, model, query, callback) { 		
		var con = mysql.createConnection({
  			host     : query.host,
  			port     : query.port,
  			user     : query.user,
  			password : query.pass,  			  			
		});

		con.connect(function(err){        
  			if(err){
	            error.push(err);
	            return callback();    			
  			}
  			callback(SUCCESS(true));  
		});		
	})

  schema.addWorkflow('create_db', function (error, model, query, callback) {     
    //need create new db        
    if (query.create && query.create.parseBoolean()) {            
      var con = mysql.createConnection({
          host     : query.host,
          port     : query.port,
          user     : query.user,
          password : query.pass,                
      });

      con.connect(function(err){        
        if(err){
              error.push(err);
              return callback();          
        }        
      });

      con.query('CREATE DATABASE '+query.name +'  CHARACTER SET utf8 COLLATE utf8_general_ci;', function(err, rows, fields) {
          if (err) {
            error.push(err);
            return callback();          
          }  
          callback(SUCCESS(true));  
      });

      con.end();   
    } //user say db create, chech him
      else {
        var con = mysql.createConnection({
          host     : query.host,
          port     : query.port,
          user     : query.user,
          password : query.pass,                
          database : query.name
        });

        con.connect(function(err){        
          if(err){
                error.push(err);
                return callback();          
          }
          callback(SUCCESS(true));  
        });   
    }      
  })	
  //import db (only MYSQL)
  schema.addWorkflow('import_db', function (error, model, query, callback) {     
    async = []; 
    var con = mysql.createConnection({
          host     : query.host,
          port     : query.port,
          user     : query.user,
          password : query.pass,                
          database : query.name
        });
    con.connect(function(err){        
          if(err){
                error.push(err);
                return callback();          
          }                    
    });         
    var sys = require('sys')
    var exec = require('child_process').exec;          
    exec('chcp 65001 | mysql -u {0} {1} {2} < {3}'.format(query.user, (_.isEmpty(query.pass))?"":"-p"+query.pass, query.name, F.path.definitions('db.sql')), 
      function(err, stdout, stderr){               
      if(err){
        error.push(err);
        return callback();          
      }           
      return callback(SUCCESS(true, RESOURCE('mess_install_bd')));      
    });             
  });   
  //create config
  schema.setSave(function (error, model, self, callback) {
    db = model.db;
    mail = model.mail;
    var config = "\
name                            : Example\n\
author                          : author\n\
version                         : 1.01\n\
// Please do not change the data\n\
database                        : mysql://{0}{1}@{2}:{3}/{4}\n\
\n\
// Mail settings\n\
Add a comment to this line\n\
mail.smtp                       : {5}\n\
mail.smtp.options               : {6}\n\
mail.address.from               : {7}\n\
mail.address.reply              : {8}\n\
mail.address.bcc                : {9}".format(db.user, 
                                             (db.pass)?":"+db.pass:"",
                                             (db.host)?db.host:"",
                                             (db.port)?db.port:"",
                                             (db.name)?db.name:"",
                                             (mail.smtp.server)?mail.smtp.server:"",
                                             JSON.stringify(mail.smtp.options),
                                             (mail.address.from) ? mail.address.from : "",
                                             (mail.address.reply) ? mail.address.reply : "",
                                             (mail.address.bcc) ? mail.address.bcc : ""
                                             );
    fs.writeFile('config', config, 'utf8', function (err, res) {
      if (err) {
         return callback();          
         error.push(err);
      }      
      callback(SUCCESS(true, RESOURCE('mess_install')));
      F.restart();
    });    
  })  
});	