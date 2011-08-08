/**
 * JavasSript for the Live Translate extension.
 * @see http://www.mediawiki.org/wiki/Extension:Live_Translate
 * 
 * @licence GNU GPL v3 or later
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 */

( function ( $, lt ) { $.fn.liveTranslate = function( options ) {
	
	var _this = this;
	
	this.doTranslations = function() {
		_this.runningJobs = 2;
		
		_this.doLocalTranslation( _this.completeTranslationProcess );
		_this.doRemoteTranslation( _this.completeTranslationProcess );
	};
	
	this.findSpecialWords = function() {
		var words = [];
		
		$.each( $( "span.notranslate" ), function( i, v ) {
			words.push( $.trim( $( v ).text() ) );
		} );
		
		return words;
	};
	
	this.doLocalTranslation = function( callback ) {
		_this.memory.getTranslations(
			{
				source: _this.currentLang,
				target: _this.select.val(),
				words: _this.findSpecialWords()
			},
			function( translations ) {
				$.each( $( "span.notranslate" ), function( i, v ) {
					var currentText = $(v).text();
					var trimmedText = $.trim( currentText );
					
					if ( translations[trimmedText] ) {
						$( v ).text( currentText.replace( trimmedText, translations[trimmedText] ) );
					}
				});
				
				callback();
			}
		);
	};
	
	this.doRemoteTranslation = function( callback ) {
		var translator = new window.translationService();
		translator.done = callback;
		lt.debug( 'Initiating remote translation' );
		translator.translateElement( $( '#bodyContent' ), _this.currentLang, _this.select.val() );
	};
	
	this.completeTranslationProcess = function() {
		if ( !--_this.runningJobs ) {
			_this.translateButton.attr( "disabled", false ).text( lt.msg( 'livetranslate-button-translate' ) );
			_this.select.attr( "disabled", false );
			_this.revertButton.css( 'display', 'inline' );
		}
	};
	
	/**
	 * Inserts notranslate spans around the words specified in the passed array in the page content.
	 * 
	 * @param {Array} words
	 */
	this.insertSpecialWords = function( words ) {
		lt.debug( 'inserting special words' );
		
		for ( i in words ) {
			$( '#bodyContent *' ).replaceText( 
				new RegExp( "(\\W)*" + RegExp.escape( words[i] ) + "(\\W)*", "g" ),
				function( str ) {
					return '<span class="notranslate">' + str + '</span>';
				}
			);
		}
	};
	
	this.obatinAndInsetSpecialWords = function( callback ) {
		// TODO: only run at first translation
		_this.memory.getSpecialWords( _this.currentLang, function( specialWords ) {
			_this.specialWords = specialWords;
			_this.insertSpecialWords( specialWords );
			
			callback();
		} );
	};
	
	this.setup = function() {
		var defaults = {
			languages: {},
			sourcelang: 'en'
		};
		
		$.extend( options, defaults );
		
		$.each( this.attr( 'languages' ).split( '||' ), function( i, lang ) {
			var parts = lang.split( '|' );
			options.languages[parts[0]] = parts[1]; 
		} );
		
		_this.currentLang = this.attr( 'sourcelang' );
		
		// For the "show original" feature.
		_this.originalHtml = false;
		
		_this.textAreaElement = document.createElement( 'textarea' );
		
		_this.uniqueId = Math.random().toString().substring( 2 );
		
		_this.memory = lt.memory.singleton();
		
		_this.runningJobs = 0;
		
		_this.buildHtml();
		
		_this.bindEvents();
	};
	
	this.buildHtml = function() {
		_this.attr( {
			style: 'display:inline; float:right',
		} ).attr( 'class', 'notranslate' );
		
		_this.html( lt.msg( 'livetranslate-translate-to' ) );
		
		_this.select = $( '<select />' ).attr( {
			id: 'ltselect' + _this.uniqueId,
		} );
		
		for ( langCode in options.languages ) {
			_this.select.append( $( '<option />' ).attr( 'value', langCode ).text( options.languages[langCode] ) );
		}
		
		_this.translateButton = $( '<button />' ).attr( {
			id: 'livetranslatebutton' + _this.uniqueId,
		} ).text( lt.msg( 'livetranslate-button-translate' ) ); // .button()
		
		_this.revertButton = $( '<button />' ).attr( {
			id: 'ltrevertbutton' + _this.uniqueId,
			style: 'display:none'
		} ).text( lt.msg( 'livetranslate-button-revert' ) ); // .button()
		
		_this.append( _this.select, _this.translateButton, _this.revertButton );	
	};
	
	this.bindEvents = function() {
		_this.translateButton.click( function() {
			_this.originalHtml = $( '#bodyContent' ).html();
			
			$( this ).attr( "disabled", true ).text( lt.msg( 'livetranslate-button-translating' ) );
			_this.select.attr( "disabled", true );
			
			_this.obatinAndInsetSpecialWords( _this.doTranslations );
		} );
		
		_this.revertButton.click( function() {
			// Replace the body content wth it's original value.
			// This un-binds the jQuery selectors and event handlers.
			$( '#bodyContent' ).html( _this.originalHtml );
			
			// Re-assing the controls.
			_this.select = $( '#ltselect' + _this.uniqueId );
			_this.translateButton = $( '#livetranslatebutton' + _this.uniqueId );
			_this.revertButton = $( '#ltrevertbutton' + _this.uniqueId );
			
			// Re-bind the events to the controls.
			_this.bindEvents();
		} )
	};
	
	this.setup();
	
	return this;
	
}; } )( jQuery, window.liveTranslate );