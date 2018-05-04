"use strict";
/*
speed/memory performance  is not important
ease of use is important
 */



/*
- debugging facility
keep a map of template source file,line to sql line number output,
before committing the file to the database do a prepare,
this will give a line number error,
retrieve that line number from the source and display the error
have 2 files Last_error and Last_ok keep them open in notepad++ , after a compile either of them will prompt a reload depending on the result.

 */
/*
Purpose is to generate SQL code and apt for firebird
Important !!! this does not actually access the database it only generates script code
it does use utility functions to get more mete data from an existing database...



,later we can have other db plugins like sqlgen_nuosql,sqlgen_mssql,sqlgen_oracle

it is acceptable for version 1 to be less than optimal
variables are varchar(1000)
all script is compiled to EXECUTE STATEMENT <select-statement> INTO <var> [, <var> ...]
 ** which means it is no compiled into BLR
scripts are executed with execute block not as PSQL

later optimise as follows:
compile simple quries into native PSQL instead of  EXECUTE STATEMENTs
combine multiple single select into one from the same table/record
read table types from the existing table and decalre correct var types
compile as PSQL



 */

/*
strategy dealing with conditionals
flow control is done in flowcontrol.js based on this pattern
cond=true;
if (cond) cond=.....
if (cond) cond=.....
output (key<=cond)
if (cond)
begin
end
else
begin
end

any db language code can ge generated as long as it follows this flow pattern
the else part is optional

it does not matter what the db is  as long as it can produce the
fullstach json format



======================basic structure
set term #;
EXECUTE BLOCK
RETURNS  (
res blob SUB_TYPE 1
)
AS
declare operator_ref  varchar(1000) = '31.10000000001';
declare st varchar(1000);
declare operator_name  varchar(1000);
BEGIN

st='select name from user_table_name where user_table_name.user_pk_field = '''||operator_ref||'''';
execute statement st into operator_name;



res=operator_name;
suspend;
END#
set term ;#

===============================
from the pkr  we read Z$CONTEXT for  OPERATOR_ref
from the pkr  we read Z$PK_CACHE for  master.table, master.ref,
session.		: contains operator.ref
operator.		: this is easy from operator_ref
master. and


http://freeadhocudf.org/documentation_english/dok_eng_string.html#umwandlungen
F_STRINGLISTITEM

From external, redis paramstr
a=F_STRINGLISTITEM(parmstr, 'varname')


http://stackoverflow.com/questions/14197935/how-to-connect-to-a-redis-server-via-unix-domain-socket-using-hedis-in-haskell



 */

//var path = require('path');
//var fs = require('fs');
var fileutils = require('../lib/fileutils.js');


var indent = function (zx) {
	return zx.indent(zx.sql.dent);
};

function indent_str(zx,str) {
	if (zx.conf.db.dialect=="fb25") return str;
	const regex = /^(?!\s*$)/mg;
	return str.replace(regex, " ".repeat(zx.sql.dent));	
}


var emit = function (zx, line_obj, statement , comment
) {

	if (zx.debug > 3) {
		var LabelText = "";
		var BlockText = "";
		var ObjText = "";
		if (line_obj.Label !== undefined) {
			LabelText = " Label:" + line_obj.Label;
			//console.log('LabelText ',LabelText,line_obj );
		}
		if (line_obj.Block !== undefined)
			BlockText = " Block:" + line_obj.Block;

		if (zx.debug > 4)
			ObjText = " line_obj:" + JSON.stringify(line_obj);
		var full = String(zx.mt.stack) + indent(zx) + statement + "/*" + (comment||'') + BlockText + LabelText + " " + ObjText + "*/";
		//console.log(full );
		zx.sql.script.push(full);
		zx.sql.filelinemap.push(line_obj);
		if (zx.debug_conditional_structure > 4)
			zx.mt.lines.push("<--" + full + "-->");
	} else {
        comment=undefined; //disable the debug output
        if ((comment===undefined)||(comment===""))
		   zx.sql.script.push(indent_str(zx,statement));
       else
           zx.sql.script.push( indent_str(zx,statement+ " -- "+comment) );
		zx.sql.filelinemap.push(line_obj);
	}
};


var sqlconcat = function (zx,comment) {
	
	var res = zx.config.db.sql_concat_prefix;
	res = res + arguments[2];
	for(var i=3;i<arguments.length;i++) {
	  res = res + zx.config.db.sql_concat_seperator + arguments[i];	
	}
	res = res + zx.config.db.sql_concat_postfix ;	
	return res;
};

var vr = function (zx,name) {  
return zx.config.db.var_actaul+name;
};

var emitdeclare = function (zx, obj, name,type,val,comment) {
	if (zx.conf.db.dialect=="fb25")
	    emit(zx, obj, "declare "+name+" "+type+"="+val+";", "",comment);
    if (zx.conf.db.dialect=="mysql57")
	    emit(zx, obj, "declare "+name+" "+type+" default "+val+";", "",comment);
	
};


var emitset = function (zx,line_obj, comment ) { //followed by a number of strings to be concatenated 
	var res = zx.config.db.sql_set_prefix + zx.config.db.sql_concat_res;
	res = res + arguments[3];
	for(var i=4;i<arguments.length;i++) {
	  res = res + zx.config.db.sql_concat_seperator + arguments[i];	
	}
	res = res + zx.config.db.sql_concat_postfix +";";
	emit(zx, 0,res, comment);
}


var emito = function (zx, obj, val) {	
	emitset( zx,0, "",    "',``" + obj + "``:``" + val + "``'" );
};
var emits = function (zx, str) {	
	emitset( zx,0, "",   "'," + str + "'" );
};
var emit_mt_obj = function (zx, name, str) {	
	emitset( zx,0, "",  "'," + fb_escapetoString('"' + name + '":' + str) + "'")  ;
};
exports.emit = emit;
exports.emito = emito;
exports.emits = emits;
exports.emit_mt_obj = emit_mt_obj;

var fb_escapetoString = function (str) { //should make the content safe and prevent SQL incjection
	str = str.replace(/\'/g, "''");
	return str;
};

var fb_AsString = function (str) { //should make the content safe and prevent SQL incjection
	str = str.replace(/;/g, " ");
	str = str.replace(/\'/g, "''");
	return "'" + str + "'";
};

exports.var_subst = "/***/";
exports.var_actaul = ""; //will later be loaded with  zx.config.db.var_actaul

var make_concats = function (zx, line_obj, str) { //should make the parameters concatenate as strings, as script to be executed
	//make ref=:operator_ref  to ref='||:operator_ref||'
	//except : is escaped as /***/
	str = zx.escape_scriptstring(zx, str, 5, /\/\*\*\*\//, "", "'''||replace(/***/", ",'''','''''')||'''");
	return "'" + str + "'";
};

exports.emit_var_ref = function (name) {
	name = exports.var_subst + name.toLowerCase();
	name = name.replace(/\./g, '_');
	return name;
};
exports.emit_var_def = function (name) {
	name = name.replace(/\./g, '_').toLowerCase();
	return name;
};

exports.eval_start = function (zx, line_obj) {
	//compiles sql
	emit(zx, line_obj, zx.config.db.sql_set_prefix + "cond=1;", "");
	return line_obj;
};

exports.emit_comment = function (zx,comment) {
	//compiles sql
	emit(zx, zx.line_obj, "/*" + comment + "*/");
	return zx.line_obj;
};

exports.eval_cond = function (zx, line_obj, conditionals) {
	//compiles sql
	conditionals.forEach(function (entry) {
		var expr = zx.expressions.AnonymousExpression(zx, line_obj, entry.cond, 'expt', "eval_cond");
		if (entry.post === undefined)
			entry.post = '';
		if (entry.pre === undefined)
			entry.pre = '';
		emit(zx, conditionals, zx.dbu.sql_make_compatable(zx,"if (cond<>0) then if (" + entry.pre + expr + entry.post + " ) then "+zx.config.db.sql_set_prefix +"cond=0;"), "");
	    if (zx.conf.db.dialect=="mysql57") emit(zx, zx.line_obj, "    end if; end if;");
	});
	return conditionals;
};

exports.EmitConditionAndBegin = function (zx, line_obj, bid,comment) {

	//this is conditional so we need to emit a value to fullstash also	
	emitset( zx,0,"",  
		"',``" + bid + "``:'",
		((zx.mysql57)?"if":"iif")+
		"(cond<>0,'[``true``]','[]')",
		"''"		
		);
	emit(zx, line_obj, "if (cond<>0) then ", "");
	if (zx.conf.db.dialect=="fb25") emit(zx, line_obj, "begin",' '+ comment);
	zx.sql.dent += 4;
	zx.sql.blocktypes.push((zx.conf.db.dialect=="mysql57")?"if":"");

	return line_obj;
};

exports.EmitUnconditionalBegin = function (zx, line_obj) {
	//compiles sql   if there is no goto this wont begin a real block
	emit(zx, line_obj, "begin", line_obj.Block); //unconditional always on
	zx.sql.dent += 4;
	zx.sql.blocktypes.push("");
	return line_obj;
};

exports.elseblock = function (zx, line_obj) {
	//compiles sql
	zx.sql.dent -= 4;
	if (zx.conf.db.dialect=="fb25") emit(zx, line_obj, "end  ", "");
	zx.sql.dent -= 4;
	emit(zx, line_obj, "else  ", "");
	zx.sql.dent += 4;
	if (zx.conf.db.dialect=="fb25") emit(zx, line_obj, "begin", "");
	zx.sql.dent += 4;
	return line_obj;
};

exports.unblock = function (zx, line_obj,comment) {
	zx.sql.dent -= 4;
	emit(zx, line_obj, "end  "+zx.sql.blocktypes.pop()+zx.config.db.sql_end_postfix,comment);

	return line_obj;
};

exports.emit_log_out = function (zx, line_obj,comment) {
	emit(zx, line_obj, zx.config.db.sql_set_prefix +  "info='logout';",comment);

	return line_obj;
};



exports.assignsqrytovar = function (zx, line_obj) {
	//compiles sql

	return line_obj;
};

exports.clasifyAssign = function (zx, line_obj, varx) {
	// the purpose of this is to differentiate the assignment target type,  NOT the source type
	//   in v2 we have only "assign" keyword which is used everywhere, in v3 we differential var and macro assignments, and have the keywords for them
	//     to be backward comparable assign tries to differntiate the assign keyword between the var  and macro assignments.
	if (varx.target_type === "assign") {

		//now if it starts with select
		if ((varx.source.substr(0, 6).toLowerCase() === "select") || (zx.flow_control.is_conditional(zx, line_obj))) {
			varx.target_type = "var";
			//console.log('clasifyAssign;var: ',varx);
		} else {
			varx.target_type = "macro";
			//console.log('clasifyAssign;macro: ',varx);
		}
	}
	return varx.target_type;
};

exports.validateExpression = function (zx, line_obj, QryStr) {

	if (QryStr instanceof Array) {
		QryStr = QryStr.join('\n'); //make it into a string
	}

	//console.log('validateExpression: ',varx.DebugContext,QryStr);
	QryStr = QryStr.replace("!<", ">"); //TODO should have been "!<=",">" then "!<",">=" : fix all source files... grep ....lots of change review
	QryStr = QryStr.replace("!>", "<");
	QryStr = QryStr.replace("!=", "<>");

	return QryStr;
};

var recurse_sub_expressions = function (zx, line_obj, varx, QryStr) {
	//before we assemble the expression we must make its sub parts first
	//   makeexpression is very similar but does the actual variable expression evaluation

	var o = {},
	r = {},
	result,
	loopc = 0;

	result = QryStr;
	do {
		if (loopc++ > 100) {
			console.log('CRASH: recurse_sub_expressions looping infintely: \n', QryStr, '\n', line_obj);
			process.exit(2);
		}
		//console.log('recurse_sub_expressions do: \n', QryStr,"\n",result);
		QryStr = result;
		result = "";

		o.left = QryStr;
		while (zx.expressions.ExtractFirstOne(zx, o, r, 1600347)) {
			//console.log('recurse_sub_expressions o,r : ', o, r);

			//if (r.tag.insert !== undefined) result += r.tag.insert;

			if (r.tag.recurse === true) {
				if (r.tag.insert !== undefined)
					result += r.tag.insert;
				//console.log('recurse_sub_expressions =============',result);
				result += recurse_sub_expressions(zx, line_obj, varx, r.content);
				if (r.tag.insertz !== undefined)
					result += r.tag.insertz;
			} else if (r.method === "variable") {
				//console.log('recurse_sub_expressions expand : ', r.content,' to ', zx.variables.named[r.content.toLowerCase()]].source);
				zx.var_control.NamedVariable(zx, line_obj, r.content, zx.variables.named[r.content.toLowerCase()].source, "var", "FromExpression");
				result += '' + exports.emit_var_ref(r.content) + " ";

			} else {
				//result += "<CC"+r.content+'vvv'+r.method+"CC>";
				result += r.content;
			}

			o.left = o.right;

			//console.log('recurse_sub_expressions o,r : ', o, r);
		}

		//console.log('recurse_sub_expressions done: \n', QryStr,"\n",result);
	} while (QryStr !== result); //
	return result;
};

var recurse_variable_expressions = function (zx, line_obj, varx, QryStr) {
	// we are to to produce :operator_name from operator.name
	var o = {},
	r = {},
	result,
	loopc = 0,
	rfn = "";

	result = QryStr;
	do {
		if (loopc++ > 100) {
			console.log('CRASH: recurse_variable_expressions looping infintely: \n', QryStr, '\n', line_obj);
			console.trace('process.exit(2) from CRASH: recurse_variable_expressions looping infintely : ');process.exit(2);
		}
		//console.log('recurse_variable_expressions do: \n', QryStr,"\n",result);
		QryStr = result;
		result = "";

		o.left = QryStr;
		while (zx.expressions.ExtractFirstOne(zx, o, r, 1600404)) {
			//if (r.tag.insert !== undefined) result += r.tag.insert;
			//console.log('recurse_variable_expressions o,r,result : ', o, r,result);
			if (r.tag.recurse === true) {
				if (r.tag.insert !== undefined)
					result += r.tag.insert + '';
				//console.log('recurse_variable_expressions =============',result);
				result += recurse_variable_expressions(zx, line_obj, varx, r.content);
				if (r.tag.insertz !== undefined)
					result += r.tag.insertz;
			} else if (r.method === "tablefield") {
				//console.log('recurse_variable_expressions expand : ', r.content,' to ', zx.variables.named[r.content.toLowerCase()]].source);
				//    var_control.NamedVariable(zx,line_obj,r.content,zx.variables.named[r.content.toLowerCase()]].source,"var","FromExpression");
				rfn = r.table + "." + r.field;
				result += '' + exports.emit_var_ref(rfn); //this will be fixed at the output stage
				if (zx.variables.named[rfn.toLowerCase()] !== undefined) {
					zx.variables.named[rfn.toLowerCase()].varused++;
				} else {
					var v = {
						rfn : rfn,
						table : r.table,
						field : r.field
					};
					zx.variables.required[rfn.toLowerCase()] = v;
					if (rfn.toLowerCase() === "operator.operator")
                    {console.trace('process.exit(2) from operator.operator : ');process.exit(2);}
				}

			} else {
				//result += "<CC"+r.content+'vvv'+r.method+"CC>";
				result += r.content;
			}

			o.left = o.right;

			//console.log('recurse_variable_expressions o,r : ', o, r);
		}

		//console.log('recurse_variable_expressions done: \n', QryStr,"\n",result);
	} while (QryStr !== result); //
	return result;
};

exports.makeexpression = function (zx, line_obj, varx) {
	//expression is either a const,a singleton or a query
	var result;

	//before we assemble the expression we must make its sub parts first , they are referto by variables

	if (varx.target_type === 'var') //this is target type which is wrong logic
	{ // only a variable
		//console.log('makeexpression of var: \n', varx);
		result = recurse_sub_expressions(zx, line_obj, varx, varx.source);

		//now the script variables
		result = recurse_variable_expressions(zx, line_obj, varx, result);

	} else {
		//console.log('makeexpression of: \n', varx);
		result = recurse_sub_expressions(zx, line_obj, varx, varx.source);

		//now the script variables
		result = recurse_variable_expressions(zx, line_obj, varx, result);

	}

	return result; //varx.source;//expr;
};

exports.F_F2J = function (zx, line_obj, str) {
    if (zx.config.db.useUDF === "yes") return "Z$F_F2J(" + str + ")";
	else return "\n      "+zx.config.db.sql_concat_prefix + "'\"'"+
		zx.config.db.sql_concat_seperator+"REPLACE(REPLACE(coalesce(" + str + ",''),'\"','\\\"'),'\\n','CRLF')"+
		zx.config.db.sql_concat_seperator+"'\"'"+
		zx.config.db.sql_concat_postfix; 	
}

exports.F_F2SQL = function (zx, line_obj, str) {
    //console.log('exports.F_SQL  1: ',zx);
    if (zx.config.db.useUDF === "yes") return "Z$F_F2SQL(" + str + ")";
    else return  sqlconcat(zx,"",  "''''","REPLACE(coalesce(" + str + ",''),'''','''''')","''''"   );	
}



exports.EmitVariable = function (zx, line_obj, bid) {       
	emitset( zx,line_obj, "", "',``" + bid + "``:'",exports.F_F2J(zx, line_obj, bid) );
	return line_obj;
};

exports.DeclareVar = function (zx, line_obj, varx) {
	//compiles
	//console.log('DeclareVar 1: ',varx);
	zx.sql.declare_above[varx.key] = {
		name : varx.key,
		db_type : "varchar(1000)"
	};
	if (varx.code !== undefined) {
		emit(zx, line_obj, zx.config.db.sql_set_prefix + "st='" + varx.code + "';", ""); //for now
		emit(zx, line_obj, "execute statement st into " + exports.emit_var_def(varx.key) + ";", ""); //for now
	}
	if (varx.expr !== undefined) {
		var expr = varx.expr; //exports.makeexpression(zx,line_obj,varx);
		//console.log('DeclareVar: ',varx,"\n",expr,"\n\n");
		emit(zx, line_obj, zx.dbu.sql_make_compatable(zx, zx.config.db.sql_set_prefix + exports.emit_var_def(varx.key) + "=" + expr + ";", "") ); //for now
	}

	return line_obj;
};

exports.adapt_filename = function (fn) {
	//backward comparable with deprecated ~ format
	fn = fn.replace(/\\/g, "/");
	if (fn.substring(0, 1) === "~") {
		fn = fn.substring(1);
		if (fn.substring(0, 1) === "/")
			fn = fn.substring(1);
		fn = "//" + fn;
	}
	return fn;
};

exports.link_from = function (zx, line_obj) {
	// optimal back-end storage of likns are important -
	//  currently we use basic tables -- this will be optimised - to in memory or redis type tables.
	//  remember these tables may have a very short life....as soon as we move to the next page they are gone.....

	var wheresx = line_obj.where;
	var wheres = wheresx;
	//console.log('=================================\n',line_obj);
	//console.log('=================================\n link_from a:',wheres);
	//var queryx = zx.expressions.ConstantExpressions(zx,line_obj,from,"postback","link_from").slice(1,-1);
	var where = zx.expressions.ConstantExpressions(zx, line_obj, wheres, "postback"); //,"action_where");
	//now the where expresion is still going to be within text, so we must convert it
	//console.log('=================================\n link_from b:',wheres,where);
	var wherex = make_concats(zx, line_obj, where);
	//console.log('=================================\n link_from c:',where,wherex);
	//var where = zx.expressions.AnonymousExpression(zx,line_obj,wheres,target_type,"action_where");
	zx.sql.cidi += 1;

	//TODO line_obj.nonkeyd must escape :name from the string so it will act as a concatenation of the curent values at time of insertion
	//     ^^^^what does this mean? ...seems to want to create  a where clause for linking... but the nonkeyd text comes from a place with no relevance..?
	//     ^^^^  for now nonkeyd is disabled

	zx.Current_main_page_name = '';
	if (line_obj.form !== undefined)
		fileutils.locatefile(zx, zx.gets(line_obj.form), zx.file_name, line_obj, 120012);
	var from = zx.gets(line_obj.from);
	if (from === undefined)
		from = '';
	
	var PAGE_PARAMS = '';
    //console.log('run_procedure_a: ',line_obj );
	zx.Inject_procedures.check_inline_link_procedure(zx, line_obj,'link_from');
    //console.log('run_procedure_: ' );
	var proc = zx.gets(line_obj.execute);
    //console.log('run_procedure_as table: ',proc );
	if ((proc !== undefined) && (proc !== "")) {
		PAGE_PARAMS = PAGE_PARAMS +  zx.conf.db.var_global_set + "run_procedure=''" + proc + "'';";
		//maybe master_ref?? PAGE_PARAMS=PAGE_PARAMS+"run_procedure_pk='||Z$F_F2SQL(:F"+fld_obj.cf[0].pointer+")||';'";
		var param = zx.gets(line_obj.param);
		if ((param !== undefined) && (param !== ""))
			PAGE_PARAMS = PAGE_PARAMS + zx.conf.db.var_global_set + "run_procedure_param=''" + param + "'';";

		//console.log('run_procedure_param: ',PAGE_PARAMS );
	}
    
	var links = '';
	if (line_obj.pass)
	    links+= "\n--pass singleton link  TODO "+JSON.stringify(line_obj);// + fld_obj.pass.Divout;//:cid,:tfid,
	
	links += "\nINSERT INTO Z$PK_CACHE (MASTER, INDX, FIELD_NAME, VALU,TARGET,QUERY, PAGE_PARAMS)" +
		"VALUES ("+vr(zx,"cid") + "," + zx.sql.cidi + ",'click'," + fb_AsString(from) + ", " + 
        fb_AsString(zx.Current_main_page_name.replace(/\\/g, "/")) + "," + (wherex /*+" "+ zx.gets(line_obj.nonkeyd)..check above TODO note*/
		) + "," +
		"'" + PAGE_PARAMS + "');  ";		
	//console.log('=================================\n',
	//        'link_from: ',wheresx,"\n",
	//        where,"\n",links,line_obj.nonkeyd,line_obj,line_obj.where,"\n","\n");


	emit(zx, line_obj, links);
	return zx.sql.cidi;
};

var check_pointer = function (zx,cx,fld_obj) {
        
    if (fld_obj.cf[0].pointer===undefined)
    {

        zx.error.log_SQL_fail (zx, "no primary key for edit ","You must select(and mark) the primary key as part of the query, in order to edit a field in the table", fld_obj, zx.line_obj);
        throw zx.error.known_error;
    }
	var pointerfieldindex = fld_obj.cf[0].pointer;
	//console.log('pointerfieldindex a:',fld_obj.cf[0].pointer,cx.fields[ pointerfieldindex ]);
	var pointerfields = cx.fields[pointerfieldindex].name;
	//console.log('=================================\n',pointerfields );
	var pkname = pointerfields.split(' ')[0];
	if (pkname === 'INSERT_REF')
		pkname = 'REF'//This refers to the pk of the "Z$INSERTREF" Table

	if (pointerfieldindex === undefined) {
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!No Primary key field for edit\n', pointerfieldindex, fld_obj, pkname, pointerfields);
		{console.trace('process.exit(2) from No Primary key field for edit : ');process.exit(2); }//TODO log and continue non destructive
	}
   fld_obj.cf[0].pkname = pkname;
	return pkname;
};


exports.link_from_table = function (zx,cx, fld_obj) {
	// optimal back-end storage of likns are important -
	//  currently we use basic tables -- this will be optimised - to in memory or redis type tables.
	//  remember these tables may have a very short life....as soon as we move to the next page they are gone.....

	zx.Current_main_page_name = '';
	var form = fld_obj.cf[0].form;
	if (form === undefined)
		form = '';
	if (form !== '')
		fileutils.locatefile(zx, form, zx.file_name, zx.line_obj, 120011);

	var from = fld_obj.cf[0].from;
	if (from === undefined)
		from = fld_obj.cf[0].to;
	if (from === undefined)
		from = fld_obj.to;
	if (from === undefined)
		from = '';
	
	//pass many fields as master parameters to the sub form useful when aggregating across many fields
	// TODO - have a way of reading this fields from the sub form - they are not accessible from the master at the moment.
	var PAGE_PARAMS = "''";
	if (fld_obj.PAGE_PARAMS !== undefined) {
		//produces   substring(:coalesce(F1,'')||'\n'||coalesce(:F2,'') from 1 for 999)
		//TODO  this string limitation of 999 should through an compiler error if the sum of all the master fields could be longer than 999

		fld_obj.PAGE_PARAMS.forEach(function (fld, i) {
			PAGE_PARAMS += zx.config.db.sql_concat_seperator + "F" + i + "=coalesce("+ zx.config.db.var_actaul+"F" + fld + ",''),';\n'||";
		});
		PAGE_PARAMS = "\n    substring((''" + 
		    zx.config.db.sql_concat_prefix + PAGE_PARAMS + zx.config.db.sql_concat_postfix + 
			"'') from 1 for 999)";		
		
	}

	zx.Inject_procedures.check_inline_link_procedure(zx, fld_obj.cf[0],'link_from_table');
    //console.log('run_procedure_ table: ' );
    

if (fld_obj.cf[0].pointer===undefined)
{

    zx.error.log_SQL_fail (zx, "no primary key for link","You must select(and mark) the primary key as part of the query, in order to make a link on the table", fld_obj, zx.line_obj)
    throw zx.error.known_error;
}

    var pkname = check_pointer(zx,cx,fld_obj);
    
	var proc = zx.gets(fld_obj.cf[0].execute);
    //console.log('run_procedure_as : ',proc );
	if ((proc !== undefined) && (proc !== "")) {		
		PAGE_PARAMS = PAGE_PARAMS + zx.config.db.sql_concat_seperator + "'"+zx.conf.db.var_global_set+"run_procedure=''" + proc + "'';";
		PAGE_PARAMS = PAGE_PARAMS + zx.conf.db.var_global_set+"run_procedure_pk='"+zx.config.db.sql_concat_seperator +exports.F_F2SQL(zx, zx.line_obj, zx.config.db.var_actaul+"F" + fld_obj.cf[0].pointer )+zx.config.db.sql_concat_seperator + "';";

		var param = zx.gets(fld_obj.cf[0].param);
		if ((param !== undefined) && (param !== ""))
			PAGE_PARAMS = PAGE_PARAMS +  zx.conf.db.var_global_set + "run_procedure_param=''" + param + "'';";
		PAGE_PARAMS = PAGE_PARAMS += "'";
		//console.log('run_procedure_param: ',PAGE_PARAMS );
	}

	//this will happen in the table loop and inserts the value of the pointer field, it
    
	var links = '';
	if (fld_obj.cf[0].pass)
	    links+= exports.build_variable_pass_all(zx,fld_obj,fld_obj.cf[0].pass,'lft123737')
			
		links += "\nINSERT INTO Z$PK_CACHE (MASTER, INDX, FIELD_NAME, VALU,Pk_Field_Name,TARGET,QUERY, PAGE_PARAMS)" +
		"VALUES ("+zx.config.db.var_actaul+"cid,"+zx.config.db.var_actaul+"tfid,'tfid','" + from +
        "','" + pkname +
		"', '" + zx.Current_main_page_name.replace(/\\/g, "/") + "', "+        
         zx.config.db.var_actaul+"F" + fld_obj.cf[0].pointer         
        + " ," + PAGE_PARAMS + ");"+zx.config.db.sql_set_prefix+"tfid=tfid+1;";
	//console.log('link_from_table links: ',links,fld_obj.cf[0] );
	fld_obj.postback = links;
	fld_obj.tfidOffset = zx.tfidOffset;
	zx.tfidOffset += 1;
	return fld_obj.tfidOffset;
};

exports.edit_from_table = function (zx, cx, fld_obj) {
	//pass many fields as master parameters to the sub form useful when aggregating across many fields
	// TODO - have a way of reading this fields from the sub form - they are not accessible from the master at the moment.


	//master fields is not realy used in the update at the moment, but it could be in future....
	/*
	var PAGE_PARAMS="''";
	if (fld_obj.PAGE_PARAMS!==undefined)
{
	//produces   substring(:coalesce(F1,'')||'\n'||coalesce(:F2,'') from 1 for 999)
	fld_obj.PAGE_PARAMS.forEach(function(fld,i) {
	PAGE_PARAMS += "coalesce(:F"+fld+",'')||'\n'||"
	});
	PAGE_PARAMS = "\n    substring(("+PAGE_PARAMS+"'') from 1 for 999)";
	}
	 */
	var from = fld_obj.cf[0].from;
	if (from === undefined)
		from = fld_obj.cf[0].to;
	if (from === undefined)
		from = fld_obj.to;
	if (from === undefined)
		from = '';

	//this is to receive the codec information back from the user interface
	//var SoftCodec = "";
	var Soft_decode = "";
	//console.log('SoftCodec a:',fld_obj);
	if ((fld_obj.f !== undefined))
		if ((fld_obj.f.softcodec !== undefined)) {
			//console.log('SoftCodec obj:',fld_obj.f.softcodec);
			//produces  value= substring(:coalesce(F1,'')||'\n'||coalesce(:F2,'') from 1 for 999)
			var codecname = fld_obj.f.softcodec;
			if (codecname !== "") {
				var decoder = zx.softcodecs[codecname];
				if (decoder === undefined)
					decoder = zx.UIsl["SoftCodec-decoder-" + codecname];

				if (decoder === undefined)
					zx.error.log_NoSoftCodec_warning(cx.zx, "NoSoftCodec Decoder: 1:", codecname, 0);
				else {
					//var template = hogan.compile(decoder);
					//var FieldSQL = template.render(fld_obj); //pop
                    var FieldSQL =  zx.hogan_ext.compile_render(zx, fld_obj , decoder); 
					Soft_decode = FieldSQL;

				}
			}
			Soft_decode = fb_escapetoString(Soft_decode);
			//console.log('Soft_decode:',Soft_decode);
		}

	//this will happen in the table loop and inserts the value of the pointer field, it
	//needs pk to update on and the field that should be updated
	//console.log('=================================\n',fld_obj );

    var pkname = check_pointer(zx,cx,fld_obj);
    
    var baserecord_ref=zx.async_data.check_Async_Binary_Fields(zx,fld_obj);

    
	var TARGET_VALUES = "''";
	var TARGET_FIELDS = "";
	if (fld_obj.cf[0].onupdate !== undefined) {
		TARGET_VALUES = "\n   "+zx.config.db.sql_concat_prefix+"     ''";
		//accept an array of key value pairs
		//console.log('TARGET_VALUES a:',fld_obj.cf[0].onupdate);
		var kv = zx.stripQ(fld_obj.cf[0].onupdate);
		//console.log('TARGET_VALUES:',kv);
		var p = kv.indexOf('=');
		if (p >= 0) //ignore non assignments
		{
			var key = kv.substring(0, p);
			var val = kv.substring(p + 1);
			//console.log('TARGET_VALUES kvp:',key,val);
			TARGET_FIELDS += ',' + key;

			var expressed_value = zx.expressions.ConstantExpressions(zx, zx.line_obj, val, "postback");
			//console.log('TARGET_VALUES expr:',expressed_value);
            //TARGET_VALUES += "||','||" + exports.F_F2SQL(zx, zx.line_obj,expressed_value ) + "";
			//TARGET_VALUES += "||','||Z$F_F2SQL(" + expressed_value + ")";
			TARGET_VALUES += zx.config.db.sql_concat_seperator + "','"+zx.config.db.sql_concat_seperator+ exports.F_F2SQL(zx, zx.line_obj,expressed_value ) + "";
            
		}
        TARGET_VALUES += zx.config.db.sql_concat_postfix;		
	}
 
	var links = '';
	
	if (fld_obj.cf[0].pass)
	    links+= exports.build_variable_pass_all(zx,fld_obj,fld_obj.cf[0].pass,'lft123737')
	   

	links += "\nINSERT INTO Z$PK_CACHE ("+
			  "MASTER, INDX, FIELD_NAME, VALU,"+
			  "Pk_Field_Name,TARGET,QUERY, PAGE_PARAMS,"+
			  "TARGET_FIELDS,TARGET_VALUES,baserecord)" +
			  
			  "VALUES ("+zx.config.db.var_actaul+"cid,"+zx.config.db.var_actaul+"tfid,'updateonpk','" + /*valu*/	from + "',"+
		      "'" + pkname + "', '" + fld_obj.name + "', "+zx.config.db.var_actaul+"F" + fld_obj.cf[0].pointer + " ,'" + Soft_decode + "' ,"+
			  "'" + TARGET_FIELDS + "'," + TARGET_VALUES + ","+baserecord_ref+");"+zx.config.db.sql_set_prefix+"tfid=tfid+1;";				
				
		
	
        
	fld_obj.postback = links;
	fld_obj.tfidOffset = zx.tfidOffset;
	zx.tfidOffset += 1;
	return fld_obj.tfidOffset;
};

exports.table_make_script = function (zx, cx, line_obj, QueryType) {

	var fields = cx.fields;
	var query = cx.query;

	//var queryx=query;
	//var querys=queryx;
	//console.log('=================================\n',line_obj);
	var queryx = zx.expressions.ConstantExpressions(zx, line_obj, query, "postback" /*,"table_make_script"*/
		);
    
    queryx=zx.stripBrackets(queryx);
	//queryx=zx.dbu.sql_make_compatable(zx,queryx);
	//console.log('=================================\nqueryx:',query,queryx);
	//var where = zx.expressions.AnonymousExpression(zx,line_obj,wheres,target_type,"action_where");


	//2 possible methods exist
	//methods 1   for select abc,def from user_table_name into :f1,f2 do begin r=r||f1||f2; end
	//methods 2   for select abc||def from user_table_name into :st do begin r=r||st; end
	//the benefit of 1 over 2 is we just need to know the number of fields, the negative is you need to define a whole bunch of varaiabels

	/*The stach :
{{#e}}<br>:::{{0}},{{1}}{{/e}}
	produces a table from 2d array :
	"e":[ ["a","b"],["c","d"],["e","f"]
	 */

	//find the fields
	var postbacks = "";
	var postfields = 0;
	var SoftCodecs = '';

	var into = " into ";
	zx.tfidOffset = 0; //relative to tfid
	if (zx.sql.max_f < fields.length)
		zx.sql.max_f = fields.length;

	//var rows = '';
	//sql:  row='[``'||:f0||'``,``'||:f1||'``]';
	var sql;
	var open,
	comma,
	aclose,
	firstseperator,
	secondseperator,
	moreseperators,
	recordseperator,
	cend;

	if (QueryType === "Table") {
		open = zx.config.db.sql_set_prefix +"tfid=" + zx.sql.cidi * zx.sql.cidti_factor + ";\n"+
		       zx.config.db.sql_set_prefix +"first=' '"+";\r"+
		       zx.config.db.sql_set_prefix + zx.config.db.sql_concat_res+"', ``" + cx.tid_name + "``:['"+zx.config.db.sql_concat_postfix+";\n";

		sql =  zx.config.db.sql_set_prefix +"row="+
			    zx.config.db.sql_concat_prefix+
			     "first"+ zx.config.db.sql_concat_seperator +"'[``'"+zx.config.db.sql_concat_seperator +
				 zx.config.db.var_actaul+"tfid"+ zx.config.db.sql_concat_seperator +"'``";
			   
		firstseperator = ',';
		secondseperator = ",";
		moreseperators = ',';
		aclose = "]'"+zx.config.db.sql_concat_postfix+";";
		recordseperator = "\n    "+  zx.config.db.sql_set_prefix +"first=', ';";
		cend = zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + sqlconcat(zx,"", "res", "']'" ) + ";";
	}
	if (QueryType === "List") {
		open = zx.config.db.sql_set_prefix +"tfid=" + zx.sql.cidi * zx.sql.cidti_factor + ";"+
		  zx.config.db.sql_set_prefix + "first=' '; "+zx.config.db.sql_set_prefix + zx.config.db.sql_concat_res+"', ``" + cx.tid_name + "``:['"+zx.config.db.sql_concat_postfix+";\n";

		sql =  zx.config.db.sql_set_prefix +"row="+
			    zx.config.db.sql_concat_prefix+
			     "first"+ zx.config.db.sql_concat_seperator +"'[``'"+zx.config.db.sql_concat_seperator +
				 zx.config.db.var_actaul+"tfid"+ zx.config.db.sql_concat_seperator +"'``";

		firstseperator = '';
		secondseperator = ",";
		moreseperators = ',';
		aclose = "]'"+zx.config.db.sql_concat_postfix+";";
		recordseperator = "\n    "+  zx.config.db.sql_set_prefix + "first=', ';";
		cend = zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + sqlconcat(zx,"", "res", "']'" ) + ";";
	}
	if (QueryType === "Dict") {		
		open = zx.config.db.sql_set_prefix +"tfid=" + zx.sql.cidi * zx.sql.cidti_factor + ";\n"+
		   zx.config.db.sql_set_prefix + "first=' '; "+zx.config.db.sql_set_prefix + zx.config.db.sql_concat_res+"',  ``" + cx.tid_name + "``:{'"+sql_concat_postfix+";";
		sql = "\n    "+ zx.config.db.sql_set_prefix +"row=first "+ zx.config.db.sql_concat_seperator +" '";
		if (fields.length < 3) { //name:value
			firstseperator = '';
			secondseperator = ":";
			moreseperators = ',';
			aclose = "'"+zx.config.db.sql_concat_postfix+";";
			recordseperator = "\n    "+  zx.config.db.sql_set_prefix +"first=', ';";
		    cend = zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + sqlconcat(zx,"", "res", "'}'" ) + ";";
		} else { //name:[value,value]
			firstseperator = '';
			secondseperator = ":[";
			moreseperators = ',';
			aclose = "']"+zx.config.db.sql_concat_postfix+";";
			recordseperator = "\n    "+  zx.config.db.sql_set_prefix +"first=', ';";
		    cend = zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + sqlconcat(zx,"", "res", "'}'" ) + ";";
		}
	}

	fields.forEach(function (widget, i) {
		//console.log('fields.forEach:',widget);
		if (i > 0) {
			into += ",";
		}

		into += zx.config.db.var_actaul + "f" + i;

		if (i === 0)
			comma = firstseperator;
		else if (i === 1)
			comma = secondseperator;
		else
			comma = moreseperators;

		if (widget.method === 'hide')
			sql += comma + "``hide``";
		else
            sql += comma + "'"+zx.config.db.sql_concat_seperator+exports.F_F2J(zx, line_obj,"SUBSTRING("+zx.config.db.var_actaul+"f" + i + " FROM 1 FOR 254)")
		                 +  zx.config.db.sql_concat_seperator + "'";

		if (widget.postback !== undefined) {
			postfields++;
			postbacks += '\n  ' + widget.postback;

		}

		if ((widget.f !== undefined) && (widget.f.softcodec !== undefined)) {
			if (widget.f.softcodec !== "") {
				var encoder = zx.softcodecs[widget.f.softcodec];
				if (encoder === undefined)
					encoder = zx.UIsl["SoftCodec-encoder-" + widget.f.softcodec];
				if (encoder === undefined)
					zx.error.log_NoSoftCodec_warning(cx.zx, "NoSoftCodec: 1:", widget.f.softcodec, 0);
				else {
					//var template = hogan.compile(encoder);
					//var FieldSQL = template.render(widget); //pop
                    var FieldSQL =  zx.hogan_ext.compile_render(zx, widget , encoder); 
					SoftCodecs += "\n    " + FieldSQL; //encoder encodes in reverse to the decoder
				}
			}
			//SoftCodec =fb_escapetoString(SoftCodec);
			//console.log('SoftCodec:',SoftCodecs);
		}

		//TODO security - List PK,'s must be cached so they can be validated on updates
		//    this could be a very expensive operation requiring an DB insert for every value that might be updated
		//    look at alternativies - validate when updating bey rerunning that query?
	});

	if ((QueryType === "Dict") && (fields.length === 1)) {
		//name:""
		sql += comma + "[]";
	}

	sql += aclose;
	sql += recordseperator;
	sql += zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + sqlconcat(zx,"", "res","coalesce(row,'\"row_element_is_null\"')","''" ) + ";";

    if (zx.fb25) 
	    emit(zx, 0, open + '\nfor ' + queryx + into + " do \n begin", "");

    if (zx.mysql57) {
		emit(zx, 0, open );
		emit(zx, 0, "begin", "");	
		emit(zx, 0, "    declare done int default false;", "");
		emit(zx, 0, "    declare cur1 cursor for "+queryx+";", "");	
	    emit(zx, 0, "    declare continue handler for not found set done=1;", "");		
		emit(zx, 0, "    set done = 0;", "");
		emit(zx, 0, "    open cur1;", "");
		emit(zx, 0, "    cur1Loop: loop", "");
		emit(zx, 0, "        fetch cur1 "+into+";", "");
		emit(zx, 0, "        if done = 1 then leave cur1Loop; end if;", "");
	}
	
	
	emit(zx, 0, "" + SoftCodecs + "", "");
	emit(zx, 0, "\n    " + sql, "");

	//insert post back instructions
	if (postbacks !== "")
		emit(zx, 0, postbacks, "");

	if (zx.fb25) {
		emit(zx, 0, "\n end", "");	
		emit(zx, 0, cend, "");
	}

    if (zx.mysql57) {
		emit(zx, 0, "    end loop cur1Loop;", "");
		emit(zx, 0, cend, "");
		emit(zx, 0, "end;", "");
	}

	return zx.sql.cidi;
};

exports.start_pass = function (zx /*, line_objects*/
) {
	// console.log('sqlgen_fb start_pass: ',zx.pass);


	zx.sql.dent = 4;
	zx.sql.blocktypes = [];
	zx.sql.script = [];
	zx.sql.filelinemap = [];

	zx.sql.cidi = 0;
	zx.sql.cidti = []; //each table will have id's starting from a range 100000000+  //limits 10 million records per table - 4 hundred tables on one page
	zx.sql.cidti_factor = 10000000;

    if (zx.conf.db.dialect=="fb25")  { 	
		zx.sql.testhead =
		"\n\n\nset term #;\n" +
		"EXECUTE BLOCK RETURNS  (cid  integer,info varchar(200), res blob SUB_TYPE 1)AS \n" +
		"declare pki integer=12345678;\n" +
		"declare pkf integer=12345678;\n" +
		"declare Z$SESSIONID varchar(40)='12345678';\n\n\n";
		zx.sql.testfoot = "\n-- no need to - set term ;#\n";	
	}
		
	if (zx.conf.db.dialect=="mysql57") {
		var pname = "ZZ$"+zx.ShortHash(zx.main_page_name);
		zx.sql.testhead =
		//"\n\n\nDELIMITER $$\nDROP PROCEDURE IF EXISTS "+pname+" $$\n" +
		"CREATE PROCEDURE "+pname+"()\nBEGIN\n" +
		"declare Z$SESSIONID VARCHAR(40);\n" +
		"declare pki INTEGER;\n"+
		"declare pkf INTEGER;\n"+
		"declare cid INTEGER;\n"+
		"declare NEW_CID INTEGER;\n"+
		"declare INFO VARCHAR(1000);\n"+
		"declare RES TEXT;\n"+
		"declare SCRIPTNAMED VARCHAR(250);\n"+		
		"";		
		
	
	
		//console.log('zx.sql.testhead : ',zx.sql.testhead);
	    zx.sql.testfoot = "\nend\n";	
	}
		
	

	if (zx.sql.engine === 'flamerobin') { //flamerobin
		emit(zx, 0, "set term #;", "");
	}

	if (zx.sql.engine !== 'Z$RUN') {
		emit(zx, 0, "EXECUTE BLOCK (", "");
		emit(zx, 0, "pki integer=?,pkf integer=?,upd varchar(30000)=? ", "");
		emit(zx, 0, ")RETURNS  (cid integer, res blob SUB_TYPE 1)AS", "");
	}
	
	emitdeclare(zx, 0,"cond","integer","0");
	emitdeclare(zx, 0, "st","varchar(1000)","''");
	emitdeclare(zx, 0, "row","varchar(1000)","''");
	emitdeclare(zx, 0, "first","varchar(10)","''");
	emitdeclare(zx, 0, "tfid","integer","0");
	if (zx.fb25) {
			emitdeclare(zx, 0, "run_procedure","varchar(254)","''","Passed as page parameter"); //wip
			emitdeclare(zx, 0, "run_procedure_pk","varchar(254)","''");
			emitdeclare(zx, 0, "run_procedure_param","varchar(254)","''");
		}
	emitdeclare(zx, 0, "page_name_hash","varchar(40)","'" + zx.ShortHash(zx.main_page_name) + "'");	
	


	/*other defines*/

	//console.log('sqlgen_fb start_pass declare_above: ',zx.sql.declare_above);
	for (var name in zx.sql.declare_above) {

		var decl = zx.sql.declare_above[name];
		//console.log('declare_above : ',name,decl);
		emitdeclare(zx, 0, exports.emit_var_def(decl.name),decl.db_type,"''");
	}
	for (var i = 0; i < zx.sql.max_f; i++) {
		emitdeclare(zx, 0, "f" + i,"varchar(200)","''");
	}

	if (zx.conf.db.dialect=="fb25")  emit(zx, 0, "BEGIN", "");
	emit(zx, 0, "-- assign_params", "");

	if (zx.conf.db.dialect=="mysql57") {
		emit(zx, 0, "set Z$SESSIONID=@IN_SESSIONID;", "");
		emit(zx, 0, "set pki=@IN_CID;", "");
		emit(zx, 0, "set pkf=@IN_PKREF;", "");
		}

	
   // emit(zx, 0, " CALL Z$RUN_SUP(SESSION_IN, CID_IN, PKREF_IN, UPDATES_IN, NEW_CID, INFO, RES, SCRIPTNAMED);", "");	
	


	/*this is very node dependant and would be moded to a plugin*/
	emit(zx, 0, zx.config.db.sql_set_prefix + zx.config.db.sql_concat_set + "'[{``start``:``true``';", "");
	emito(zx, "Object", "fullstash");
    
    emitset( zx,0,"", "',``Session``:``'","Z$SESSIONID","'``'"     );
    
	var v = {
		table : 'passed',
		field : 'DivoutName'
	};
	var container = zx.dbg.emit_variable_getter(zx, 0, v, "maincontainer", "maincontainer variable_getter");
	emitset( zx,0,"","',``Target``:``#'",container,"'``'");
	//emito(zx, "Target", "#maincontainer");
	
	emito(zx, "Stash", zx.main_page_name.substring(2).replace(/[\/\\]/g, '-')); //windows
    emito(zx, "mtHash",  zx.mtHash); 
	emito(zx, "ContainerId", "GUIDofTheTemplate");
	emits(zx, "``Data``:{``start``:``true``");

	if (zx.conf.db.dialect=="fb25")    emit(zx, 0, "cid = gen_id( Z$CONTEXT_seq, 1 );");
	if (zx.conf.db.dialect=="mysql57") emit(zx, 0, "set cid = (SELECT Z$GEN_CONTEXT_SEQ() );");

	//emit(zx,0,'st=\'select operator_ref from Z$CONTEXT where pk = \'||pki;');
	//emit(zx,0,'execute statement st into operator_ref;');

	//emit(zx,0,"INSERT INTO Z$CONTEXT (PK, TSTAMP, OPERATOR_REF, SESSION_REF) VALUES (:cid,'now', :operator_ref,:z$sessionid );");
	emitset( zx,0,"",  "',``cid``:``'",zx.config.db.var_actaul+"cid", "'``'" );

};

exports.done_pass = function (zx /*, line_objects*/
) {
	// console.log('sqlgen_fb done_pass: ',zx.pass);

	//console.log('sqlgen_fb declare_above: ',zx.sql.declare_above);
	
	emit(zx, 0, "if ( exists(select " + zx.config.db.sql_First1+" valu from Z$VARIABLES where Z$VARIABLES.REF=" + 
		sqlconcat(zx,"","'pass'", zx.config.db.var_actaul+"pki","'-'",zx.config.db.var_actaul+"pkf","'-DivoutName'")
		+zx.config.db.sql_Limit1+ ")) then "+zx.config.db.sql_set_prefix+""+/*zx.config.db.var_actaul+*/ "cid=0;"+zx.config.db.sql_endif_postfix, "");
	  
	emitset( zx,0, "","'}}]'");
	//emit(zx, 0, "/*zx.sql.engine:"+ zx.sql.engine+"*/", "");
		if (zx.conf.db.dialect=="mysql57") {
				emit(zx, 0, "set @res_ret=res;", "");
				emit(zx, 0, "set @cid_ret=cid;", "");
		}	
	
	
	if (zx.conf.db.dialect=="fb25")
	    emit(zx, 0, "suspend;", "");
	
	if (zx.sql.engine === 'Z$RUN') {
		if (zx.conf.db.dialect=="fb25") emit(zx, 0, "END", "");
		if (zx.conf.db.dialect=="mysql57") {
			//	emit(zx, 0, "end$$", "");
			//	emit(zx, 0, "DELIMITER ;", "");
		}
	}


	if (zx.sql.engine === 'node-fb') {
		emit(zx, 0, "END", "");
	}
	if (zx.sql.engine === 'flamerobin') {
		emit(zx, 0, "END#", "");
		emit(zx, 0, "set term ;#", "");
	}

};

var get_variable_table_expression = function (zx,v) {
	var where;
	switch (v.table) {        
	case 'here': {
			where = sqlconcat(zx,"", 
			            vr(zx,"operator$ref"),
						"'-'",
						vr(zx,"page_name_hash"),
						"'-" + v.field + "'"
						);
		}
		break;
	case 'session': {
			where = sqlconcat(zx,"", 
					    "'session-'",
			            vr(zx,"operator$ref"),
						"'-'",
						vr(zx,"z$sessionid"),
						"'-" + v.field + "'"
						);
						
		}
		break;
	case 'params': {
			where = sqlconcat(zx,"", 
					    "'params-'",
			            vr(zx,"z$sessionid"),
						"'-" + v.field + "'"
						);		
		}
		break;        
	case 'my': {
			where = sqlconcat(zx,"", 
			            vr(zx,"operator$ref"),
						"'-" + v.field + "'"
						);		
		}
		break;
	case 'system': {
			where = sqlconcat(zx,"", 
			            "'system'",
						"'-" + v.field + "'"
						);			
		}
		break;
	case 'passed': {
			where = sqlconcat(zx,"", 
			            "'pass'",
						vr(zx,"pki"),
						"'-'",
						vr(zx,"pkf"),						
						"'-" + v.field + "'"						
						);		
		}
		break;

	}
	return where;
};

exports.emit_variable_setter = function (zx, line_obj, v, comment) {
	var where = get_variable_table_expression(zx,v);
    if (where)
    {
	var statement;
	
	if (zx.conf.db.dialect=="fb25")  statement = "UPDATE OR INSERT INTO Z$VARIABLES (REF,VALU) VALUES (coalesce(" + where + ",''),(" + v.params + ")) matching (REF);";
	
	if (zx.conf.db.dialect=="mysql57")
		statement = "INSERT INTO Z$VARIABLES (REF,VALU) VALUES (coalesce(" + where + ",''),(" + v.params + "))ON DUPLICATE KEY UPDATE VALU="+v.params + ";";
	
	emit(zx, line_obj, statement, comment);
    }
    else
    {
        //setting read only or invalid context 
    }
};

exports.emit_variable_getter = function (zx, line_obj, v , coalesce /*, comment*/
) {
    if (v.table === 'key') {
        var keyquery="exists(select * from "
           + zx.conf.db.platform_user_table.user_table_name
           + " where " + zx.conf.db.platform_user_table.user_pk_field + "="+vr(zx,"operator$ref")+" "
           + " and " + zx.conf.db.platform_user_table.user_keys_field + " containing '" + v.field + ",'"
           +")"
        //console.log('emit_variable_getter key : ',keyquery); //process.exit(2);
		return keyquery;
    }


    if (v.table === 'once') {
        
        v.table = v.field.split('_')[0];
        v.field = v.field.split('_')[1];
        var where = get_variable_table_expression(zx,v);
		var oresult;
		if (zx.fb25)    oresult = "((SELECT DO_SHOW FROM Z$ONCE ("+where+", 1, 100, 1))=1)";           
		if (zx.mysql57) oresult = "(select (Z$ONCE("+where+",1,100,1) )=1)";
		return oresult;
    }
    
	var where = get_variable_table_expression(zx,v);
    
	if ((v.table === 'session') && (v.field === 'id'))
		return "("+vr(zx,"z$sessionid")+")" ;
	if ((v.table === 'session') && (v.field === 'master_context'))
		return "("+vr(zx,"pki")+")";	
	if ((v.table === 'session') && (v.field === 'master_offset'))
		return "("+vr(zx,"pkf")+")";
    
	var result = "(coalesce((select " + zx.config.db.sql_First1+" valu from Z$VARIABLES where Z$VARIABLES.REF=" + where + "" + zx.config.db.sql_Limit1+"),'"+coalesce+"'))";
	return result;
};


exports.build_variable_passing = function (zx, fld_obj, v,key, comment) {
	
	var where = "'pass',"+vr(zx,"cid")+",'-',"+vr(zx,"tfid")+",'-" + key + "'";    
	var statement ;
	if (zx.conf.db.dialect=="fb25")  
		statement = "UPDATE OR INSERT INTO Z$VARIABLES (REF,VALU) VALUES (coalesce(" + where + ",''),('" + v + "')) matching (REF);";
	
    if (zx.conf.db.dialect=="mysql57")
		statement = "INSERT INTO Z$VARIABLES (REF,VALU) VALUES (coalesce(" + where + ",''),(" + v.params + "))ON DUPLICATE KEY UPDATE VALU="+v.params + ";";
	
	return statement;
    
};

exports.build_variable_pass_all = function (zx, fld_obj, pass, comment) {
    var links = '';	
	zx.forFields(pass, function (v,key) {
		links += exports.build_variable_passing(zx, fld_obj, v,key, comment);		
		});
    return links;		
};

exports.getPageIndexNumber = function (zx, name) {
return zx.dbu.getPageIndexNumber(zx,name);
//var CurrentPageIndex =  zx.dbu.singleton(zx, "pk", "select pk from z$SP where FILE_NAME='"+name+"'"); 
//return CurrentPageIndex;
}

var make_pk_seq = function (zx,NAME,FIELD) {
var triggerscript;

if (zx.fb25) {
	triggerscript=
	["SET TERM ^ ;",
	"CREATE TRIGGER AI_"+NAME+"_BI FOR "+NAME+" ACTIVE",
	"BEFORE INSERT POSITION 0",
	"AS",
	"BEGIN",
	"  if (new."+FIELD+" is null) then",
	"     select ref from Z$GEN_PK(1) into new."+FIELD+";",
	"END^",
	"SET TERM ; ^"].join('\n');
}

if (zx.mysql57) {
	//console.log('triggerscript : ',triggerscript);
	//DROP TRIGGER test.ins_sum;
	triggerscript=
	["SET TERM ^ ;",	
	 "CREATE TRIGGER \`"+NAME+"_before_insert\` BEFORE INSERT ON \`"+NAME+"\` FOR EACH ROW BEGIN \r\n",
	 "IF (NEW."+FIELD+" IS NULL) THEN ",
	 " INSERT INTO Z$CONTEXT_SEQ (x) VALUES (0); ",
	 " SET NEW."+FIELD+" = (SELECT LAST_INSERT_ID()); ",
	 "END IF;",
	 "END;",
	"SET TERM ; ^"].join('\n');
	//console.log('make_pk_seq: ',triggerscript);

}




return triggerscript;
}


function compare_triggers(a,b) {
  if (a.Table < b.Table)
     return -1;
  if (a.Table > b.Table)
    return 1;
  if (a.Field < b.Field)
     return -1;
  if (a.Field > b.Field)
    return 1;
  return 0;
}


exports.AutoMaticDLL = function (zx,line_obj) {
//console.log('\r\nAutoMaticDLL : ',zx.sql.triggers);   
    zx.sql.triggers.sort(compare_triggers);

    for(var i = 1; i < zx.sql.triggers.length; ){
        if(zx.sql.triggers[i-1] == zx.sql.triggers[i]){
            zx.sql.triggers.splice(i, 1);
        } else {
            i++;
        }
    } 
 
 //console.log('sqlgen_fb AutoMaticDLL: ',zx.sql.triggers);    
 zx.forFields(zx.sql.triggers, function (trigger) {
   var pk_seq = make_pk_seq(zx,trigger.Table,trigger.Field);
   //console.log('    sqlgen_fb AutoMaticDLL for : ',trigger.Table,trigger.Field,pk_seq.substring(0,80));   
   zx.db_update.Prepare_DDL(zx, null, pk_seq, line_obj)
 });
 console.log('\r\nAutoMaticDLL done: ');   
}

exports.init = function (zx) {
	//each type of database generator would be different ,//including noSQL
	//console.log('init sqlgen_fb: ');
	zx.sql = {}; //sql data
	zx.sql.dent = 4;
	zx.sql.blocktypes = [];
	zx.sql.declare_above = [];
	zx.sql.args = [];
	zx.sql.script = [];
    
	zx.sql_escapetoString = fb_escapetoString;

	zx.sql.filelinemap = [];

	zx.sql.engine = 'Z$RUN';

	zx.sql.max_f = 0;
    
    zx.sql.sub_proc_index = 1;
	//     zx.sql.engine='node-fb';
	//     zx.sql.engine='flamerobin';
    zx.sql.triggers =[];
	
	zx.sql.fake_domains = {};//for mysql - maybe others
};
