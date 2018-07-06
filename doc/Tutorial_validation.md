# UX Validation (&& Assistance)
TODO:
-------------------------------------------------------
# Validation

Form validation helps us to ensure that users fill out forms in the correct format, 
making sure that submitted data will work successfully with our applications. 

We want to get the right data, in the right format — our applications won't work properly if our user's data is stored in the incorrect format, if they don't enter the correct information, or omit information altogether.

We want to protect our users' accounts — by forcing our users to enter secure passwords, it makes it easier to protect their account information.

We want to protect ourselves — there are many ways that malicious users can misuse unprotected forms to damage the application they are part of (see Website security).

Validation versus Codecs - Codecs translate user input and output, instead of strict validation, allow slacker validation and use a codec to transform to a more strict storage format.


https://developer.mozilla.org/en-US/docs/Learn/HTML/Forms/Form_validation

Whitelist, or inclusive validation defines a set of valid characters while blacklist, 
or exclusive validation defines a set of invalid characters to try to remove.
The first concept of good input validation is whitelisting versus blacklisting. 
Blacklisting is useful and safe at the client UX level but is dangerous at the server side - best to avoid it both sides.

https://blog.securityinnovation.com/blog/2011/03/input_validation_using_regular_expressions.html#article

## Client and server side
Validation is specified either at the model, view or controller level. The actual validation specified is projected into both
at the client side code to give the user feedback on what he should be doing, and at the server side 
to avoid hacking attempts. The validation is as implementation independent as possible, 

-- Notice however practically some advance validations may require custom code or settings for the server and the client side. For example JS Regex and SQL Similar use different regex syntax, so we may have to specify both.

-- Notice currently it only implements Client side validation - server side must still be implemented

-------------------------------------------------------
# Mechanism

Server SQL validation
	start transaction
	update all fields 
	run sql validation script, if fails, make error message for client, abort transaction
	produce new page
	Commit	
	-- uses different regex expressions to the client
	++ Validating/aborting within a transaction gives the highest level of protection.
	
Server JS validation	
	Need the database field values in a javascript object stored server side before sending the stash to client.
	run js validation script, if fails, make error message for client
	++ uses same validation code server and client side

Client side JS validation


How does this get implemented in SQL-MVC ?
	Named validator classes are stored in memory, when they are used in the 
	model or the view then the field values out of the class is injected into the qualia of the field.
	
	The UI elements extract the qualia from the field to inject code into the HTML .
	The JS in the client validates and enables actions
		
-- Notice currently it only implements Client side validation - server side must still be implemented

## Alternative Mechanism

The change log can also be stored in a cookie or on the server side  rather than accepting partial changes on the server .. needs some server side code.
A cookie is useful as it can keep changes even when the network has failed.

## Expressions 
Evaluate against compile time const values
Evaluate against "Aggregate" values
defer: Evaluate against database const value
defer: Evaluate against page global elements
defer: Evaluate against record local elements


# UX validation vs codecs
http://mathjs.org/docs/datatypes/units.html
https://www.npmjs.com/package/convert-units
-------------------------------------------------------
# UX implementation

Changing a form to a table of forms must still work with validations
Multi-step forms, Use milestone submissions + always display a progress bar(With text also), Simple UI to build the multi screen form progress barr
Re-evaluate all the fields with each field change
Field Validation
	Field Validation while typing - after after 3 chars / 1.2 second delay	
	Alerts as “Validation Message/ colour” close to the error field while editing with Disabled submit buttons (save may still work but not submit).
		Validation messages are part of the field html/css structure
	Help Symbols (?), Dynamic help that pops up only after the user has not typed anything in a while ( 5 seconds),tool tip messages
	Error feedback did you mean "......" click able  for spelling mistakes suggestions
	Positive feedback indicating good input Ok "name looks great"

Blocking
	Field by field Validation keep/capture focus on the field that has to be corrected - is this anti-pattern?
	
	Server side validation  - Alerts as a UI popup widget on submit.
		alerts as “Validation Summary” at the top on submit or while editing.	
	

## Blocking type
	Blocking is how validation affects the user interface
	Indicate -	simply highlight the field error - no blocking
	Warn	-	aggressively warn about the field error - no blocking
	Form	-	prevent the user leaving the form
	Field	-	prevent the user leaving the field - the field will not update to the database
	


## UX scenario's
	1) creating a new from - fill in a form, save some stuff, come back later and update, finally when all is valid, sign of and submit / activate.
	2) update a 'live' form - a form that must never be invalid - when it is saved it must be valid, cannot come back and correct.
	3) Variation on live form, Deactivate a form, edit, reactivate.
	4) update a copy of a live form, when all correct, copy over the changes.	

## Typical simple work flow	
	Display simple empty form
	The user captures some fields, if not valid it won't let them save to the database, 
	The user aborts and all changes are lost

	
## Typical complex work flow
	Display -> "Job Step 1 of 6"
	The user captures some fields, when valid then show or enable buttons [Optional Page] [Next->]
	The next page loads and again progressively we complete the details.
	If we abort out at any time we can come back again and the earlier steps will have the data filled in, we can resume.
	

-------------------------------------------------------
# Syntax

Declaration
--:{validator:"VALIDATORNAME",
		pattern:"JS-REGEX" ,
		similar:"SQL-REGEX",
		jsscript:CDV_CHECK,
		sqlscript:CDV_CHECK,
		length:{5,20}																	-- or length_min length_max  size_min	
		min:1,max:140 		
		expression:"((Aggregate(Balance) + Aggregate(values)) > Aggregate(Limit))",		-- should be a boolean evaluation
		expression:"(VALIDATORNAME & VALIDATORNAME | VALIDATORNAME)",					-- should be a boolean evaluation		
		And:",,"																		-- ListOf other VALIDATORNAME's  could use & in expression
		Or:",,"																			-- ListOf other VALIDATORNAME's  could use || in expression
		Assign:"max=Aggregate(Limit)-Aggregate(Balance)-Aggregate(values)" 				-- Updates the element max whenever the Aggregate change
		Aggregate:AggregateName															-- the result is shared by this name
		
        fails:"The email address must be valid",
		pass:"The email address is be valid",
		blank:"Valid email",
		placeholder:"Enter valid Email"}


 
Use	
NAME,   --:{Action:Edit,pattern="[A-D]{3}",placeholder:"What needs to be done (tab to save)"}
EMAIL,   --:{Action:Edit,placeholder:"Email for regular updates",validator:EMAIL}
BUDGET,  --:{Action:Edit,placeholder:"Monthly Budget",max:1000}


better:
BUDGET,  --:{Action:Edit,placeholder:"Monthly Budget",max:Aggregate(Limit)}



button (title:"View all",Indicate='AggregateName')	 -- warn on button
button (title:"View all",Block='AggregateName')	     -- disable button 
button (title:"View all",Enable='AggregateName')	 -- enable button
	
 

 
validator will translate short format to long format that is easy to use in ui_elements
	such as "range" will be translated to valid_range_min and valid_range_max


-------------------------------------------------------
	
## Examples

Simple Named validations
	--:{validator:"name",length:{5,20}}	-- or length_min length_max  size_min	
	--:{validator:"age1",min:1,max:140 }	
	--:{validator:"age2",pattern:"(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}",Aggregate:Age}	
	--:{validator:"age3",regex:/^[0-9]\d*$/}	
		
	--:{validator:"Gender",range:['male','female']}	  -- better to use lists for this
	
Complex validations	
	--:{validator:"CDV",script:CDV_CHECK}	

--:{validator:"EMAIL",pattern:"^[a-zA-Z0–9.!#$%&’*+\/=?^_`{|}~-]+@[a-zA-Z0–9](?:[a-zA-Z0–9-]{0,61} [a-zA-Z0–9])?(?:\.[a-zA-Z0–9](?:[a-zA-Z0–9-]{0,61}[a-zA-Z0–9])?)*$" 
                      ,fails:"The email address must be valid"
					  ,pass:"The email address is be valid",
					  ,blank:"Valid email",
					  placeholder:"Enter valid Email"}
--:{validator:"TWEET",pattern:"^@[A-Za-z0-9_]{1,15}$",fails:"The twitter handle must be valid check https://help.twitter.com/en/managing-your-account/twitter-username-rules for more info "}
--:{validator:"SMS",pattern:"^\+[0-9_]{1,15}$",pass:"The sms number must be a valid phone number "}
--:{validator:"BLANK",pattern:"^$",pass:"This Field must be filled."}
--:{validator:"NONBLANK",pattern:".+",pass:"This Field must be filled."}

wrong --:{validator:"OptionalIMContact",validate_any:"+BLANK,-EMAIL,-TWEET",fails:"Either a EMAIL or Twitter handle MUST be filled."}
wrong --:{validator:"MustHaveIMContact",validate_any:"+EMAIL,+TWEET",pass:"Either a EMAIL or Twitter handle can be filled in."}

--:{validator:"Limit",expression:"((Aggregate(Balance) + Aggregate(values)) > Aggregate(Limit))",Aggregate:Limit}	



-------------------------------------------------------
# Research and comments

https://www.uxmatters.com/mt/archives/2006/07/label-placement-in-forms.php
	Must read
	it’s advisable to NOT use bold fonts for input field labels. 

https://designmodo.com/ux-form-validation/

https://www.ventureharbour.com/form-design-best-practices/
Insights:
	Multi-step forms out-perform single-step forms + Use milestone submissions + always display a progress bar(With text also)
	Avoid placing questions side-by-side.
	Clearly explain what’s next upon clicking the submit button
	For mobile  Question fields and buttons should be at least 48 pixels high. & All form labels & placeholder fonts should be above 16px
		 Use the right keyboard (to match the input data you need).
	
https://www.nngroup.com/articles/form-design-placeholders/	
Insights:
	Label for field should be fixed top - use placeholder as a suggestion of input format - Never use all caps, sentence case is better.
	
https://medium.com/@andrew.burton/form-validation-best-practices-8e3bec7d0549	
Use the holy trinity of colour change, message text, and icons for accessible validation	

https://www.smashingmagazine.com/2017/06/designing-efficient-web-forms/
Labels are not help text. Use succinct, short, descriptive labels (a word or two) 

https://www.uxmatters.com/mt/archives/2006/07/label-placement-in-forms.php


https://uxplanet.org/designing-more-efficient-forms-assistance-and-validation-f26a5241199d
https://developer.telerik.com/featured/form-validation-right-mobile-applications/

http://parsleyjs.org/doc/index.html#validators
	do not proceed with field validation when less than 3 chars have been input. Do not assault your users with error messages too soon!
	Quick error removal: when a field is detected and shown as invalid, further checks are done on each keypress to try to quickly remove error messages once the field is ok.
	One error at the time

https://codecraft.tv/courses/angular/forms/model-driven-validation/	
Insights:
	terms used: Validator, invalid, ,pristine , dirty(has been changed), touched(user click on field but left it unchanged)
				show error only when  invalid&&(dirty||touched)  // this conflicts with parsleyjs rule: 3 chars 
				show green only when  valid&&(dirty||touched)
	Angular is kak (code intensive)
	
https://www.culttt.com/2012/08/08/really-simple-inline-javascript-validation/	


https://itnext.io/https-medium-com-joshstudley-form-field-validation-with-html-and-a-little-javascript-1bda6a4a4c8c

	
-------------------------------------------------------

# Implementation strategy

Fake the UI

implement Aggregate classes - consider client side codec's

implement Update Aggregate targets

implement the validator definition & storage 

implement the validator evaluation

Real UI

