"use strict";
// Server-side Code


var db = require("../../server/database/DatabasePool");
var fs = require('fs');
var path = require('path');
var jt = require('./json_tree');
var ss = require('socketstream'); 

var config = JSON.parse(require('fs').readFileSync('Quale/Config/config.json').toString());

//http://stackoverflow.com/questions/2218999/remove-duplicates-from-an-array-of-objects-in-javascript
function arrayContains(arr, val, equals) {
    var i = arr.length;
    while (i--) {
        if ( equals(arr[i], val) ) {
            return true;
        }
    }
    return false;
}

function removeDuplicates(arr, equals) {
    var originalArr = arr.slice(0);
    var i, len, j, val;
    arr.length = 0;

    for (i = 0, len = originalArr.length; i < len; ++i) {
        val = originalArr[i];
        if (!arrayContains(arr, val, equals)) {
            arr.push(val);
        }
    }
}

function objEqual(o1, o2) {
    if (o1.endpoint && o1.endpoint !== o2.endpoint) return false;
    if (o1.Style && o1.Style !== o2.Style) return false;

    return  true;        
}



 var prep_debug__tool = function(str)
 {
   var obj=JSON.parse(str);
   
   
   //dedupe the array
   var filename;
   for (filename in obj )
      {
      var file=obj[filename];
      removeDuplicates(file, objEqual);
      }
   
   var output  = [];
   jt.html("root",obj,output);

   console.log('prep_debug__tool: \n\n', output.join('\n'));
   return output.join('\n');
   
   
 }

exports.ProcessDebugRequest = function (cmds) {
	console.log('ProcessDebugRequest cmds:', JSON.stringify(cmds, null, 4));
        
    // dev mode can debug with key not set, or short key, production mode the key must be at least 8 chars.
    var oktodebug=false;
    if ((config.run_mode==="dev")&&(config.debugkey===cmds.auth))   oktodebug=true;
    if ((config.run_mode!=="dev")&&(config.debugkey.length<8)) oktodebug=false;    
    if (!oktodebug) return '<pre>Not Authorised'+'</pre>';
    
	switch (cmds.fn) {

	case "Rebuild": {
			var fn = path.resolve('built_complete');            
			fs.unlinkSync(fn);            
            ss.api.publish.all('BuildNotify', '#debugBuildNotify','Started rebuild'); // Broadcast the message to everyone
			return '<pre></pre>';
		}
		break;

	case "Console": {
			try {

				var fn = path.resolve('server/compiler/output/consol.txt');
				try {
					console.log('ProcessDebugRequest cons cmds:', fn);
					return '<pre>' + fs.readFileSync(fn).toString() + '</pre>';
				} catch (e) {
					return '<pre>Not found:' + fn + '</pre>';
				};

			} catch (e) {};
		}
		break;
	case "Errors": {
			var fn = path.resolve('server/compiler/output/error_log.json');
            console.log('ProcessDebugRequest err cmds:', fn);
				return '' + prep_debug__tool(fs.readFileSync(fn).toString()) + '';
			try {
				
			} catch (e) {
				return '<pre>Not found:' + fn + '</pre>';
			};
		}
		break;
	case "Model": {}
		var fn = path.resolve('server/compiler/output/Model.json');
		try {
			console.log('ProcessDebugRequest model cmds:', fn);
			return '<pre>' + fs.readFileSync(fn).toString() + '</pre>';
		} catch (e) {
			return '<pre>Not found:' + fn + '</pre>';
		};

		break;
	case "Controllers": {}
		var fn = path.resolve('server/compiler/output/Controllers.json');
		try {
			console.log('ProcessDebugRequest cont:', fn);
			return '<pre>' + fs.readFileSync(fn).toString() + '</pre>';
		} catch (e) {
			return '<pre>Not found:' + fn + '</pre>';
		};

		break;
	case "Views": {}
		var fn = path.resolve('server/compiler/output/Views.json');
		try {
			console.log('ProcessDebugRequest views:', fn);
			return '<pre>' + fs.readFileSync(fn).toString() + '</pre>';
		} catch (e) {
			return '<pre>Not found:' + fn + '</pre>';
		};

		break;

	}

	return '<pre>some debug info</pre>';

}



