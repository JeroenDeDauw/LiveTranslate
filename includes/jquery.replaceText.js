/*
 * jQuery replaceText - v1.1 - 11/21/2009
 * http://benalman.com/projects/jquery-replacetext-plugin/
 * 
 * Copyright (c) 2009 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
( function ( $ ) { 
	$.fn.replaceText=function(b,a,c){return this.each(function(){var f=this.firstChild,g,e,d=[];if(f){do{if(f.nodeType===3){g=f.nodeValue;e=g.replace(b,a);if(e!==g){if(!c&&/</.test(e)){$(f).before(e);d.push(f)}else{f.nodeValue=e}}}}while(f=f.nextSibling)}d.length&&$(d).remove()})};
} )( jQuery );

/**
 * Regex text escaping function.
 * Borrowed from http://simonwillison.net/2006/Jan/20/escape/
 */
RegExp.escape = function( text ) {
	if ( !arguments.callee.sRE ) {
		var specials = [  '/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ];
	    arguments.callee.sRE = new RegExp( '(\\' + specials.join('|\\') + ')', 'g' );
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}