/**
 * JavasSript for the Live Translate extension.
 * @see http://www.mediawiki.org/wiki/Extension:Live_Translate
 * 
 * @licence GNU GPL v3 or later
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 */

( function ( $, lt ) { $.fn.liveTranslate = function( options ) {
	
	var _this = this;
	
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
		
		_this.memory = new lt.memory();
		
		_this.runningJobs = 0;
		
		_this.attr( {
			style: 'display:inline; float:right',
		} ).attr( 'class', 'notranslate' );
		
		_this.html( lt.msg( 'livetranslate-translate-to' ) );
		
		_this.select = $( '<select />' );
		
		for ( langCode in options.languages ) {
			_this.select.append( $( '<option />' ).attr( 'value', langCode ).text( options.languages[langCode] ) );
		}
		
		_this.translateButton = $( '<button />' ).attr( {
			id: 'livetranslatebutton',
		} ).text( lt.msg( 'livetranslate-button-translate' ) ).click( function() {
			$( this ).attr( "disabled", true ).text( lt.msg( 'livetranslate-button-translating' ) );
			
			_this.obatinAndInsetSpecialWords( _this.doTranslations );
		} ); // .button()
		
		_this.revertButton = $( '<button />' ).attr( {
			id: 'ltrevertbutton',
			style: 'display:none'
		} ).text( lt.msg( 'livetranslate-button-revert' ) ).click( function() {
			$( this ).hide();
		} ); // .button()
		
		_this.append( _this.select, _this.translateButton, _this.revertButton );
	};
	
	this.doTranslations = function() {
		debugger;
		_this.runningJobs = 2;
		
		//_this.doLocalTranslation( _this.completeTranslationProcess );
		//_this.doRemoteTranslation( _this.completeTranslationProcess );
	};
	
	this.doLocalTranslation = function( callback ) {
		var caller = arguments.callee.caller;
		
		_this.memory.getTranslations(
			{
				source: _this.currentLang,
				target: _this.select.val(),
				words: _this.specialWords
			},
			function( translations ) {
				$.each( $( "span.notranslate" ), function( i, v ) {
					var currentText = $(v).text();
					
					if ( translations[currentText] ) {
						$( v ).text( translations[currentText] );
					}
				});
				
				callback.call( caller );
			}
		);
	};
	
	this.doRemoteTranslation = function( callback ) {
		var translator = new translationService();
		translator.done = _this.completeTranslationProcess;
		lt.debug( 'Initiating remote translation' );
		translator.translateElement( $( '#bodyContent' ), sourceLang, targetLang );
	};
	
	this.completeTranslationProcess = function() {
		if ( !_this.runningJobs-- ) {
			lt.debug('done');
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
		var caller = arguments.callee.caller;
		
		// TODO: only run at first translation
		_this.memory.getSpecialWords( _this.currentLang, function( specialWords ) {
			_this.specialWords = specialWords;
			_this.insertSpecialWords( specialWords );
			
			callback.call( caller );
		} );
	};
	
//	/**
//	 * Disables the translation button and then either kicks of insertion of
//	 * notranslate spans around special words, or when this already happened,
//	 * the actual translation process.
//	 */
//	setupTranslationFeatures = function() {
//		$( this ).attr( "disabled", true ).text( lt.msg( 'livetranslate-button-translating' ) );
//		
//		if ( originalHtml === false ) {
//			obtainAndInsertTranslations( -1 );
//		}
//		else {
//			initiateTranslating();
//		}
//	}
//	
//	/**
//	 * Queries a batch of special words in the source language, finds them in the page,
//	 * and wraps the into notranslate spans. If there are no more words, the translation
//	 * process is initaiated, otherwise the function calls itself again.
//	 */
//	function obtainAndInsertTranslations( offset ) {
//		var requestArgs = {
//			'action': 'query',
//			'format': 'json',
//			'list': 'livetranslate',
//			'ltlanguage': currentLang
//		};
//		
//		if ( offset > 0 ) {
//			requestArgs['ltcontinue'] = offset;
//		}
//		
//		$.getJSON(
//			wgScriptPath + '/api.php',
//			requestArgs,
//			function( data ) {
//				if ( data.words ) {
//					insertNoTranslateTags( data.words );						
//				}
//				else if ( data.error && data.error.info ) {
//					alert( data.error.info );
//				}
//				else {
//					for ( i in data ) {
//						alert( lt.msg( 'livetranslate-dictionary-error' ) );
//						break;
//					}
//				}
//				
//				originalHtml = $( '#bodyContent' ).html();
//				
//				if ( data['query-continue'] ) {
//					obtainAndInsertTranslations( data['query-continue'].livetranslate.ltcontinue );
//				}
//				else {
//					initiateTranslating();
//				}
//			}
//		);	
//	}
//	
//	/**
//	 * Initiates the translation process.
//	 * First all special words are found and send to the local API,
//	 * and then replaced by their translation in the response. Then
//	 * the Google Translate translation is initiated.
//	 */
//	function initiateTranslating() {
//		var words = getSpecialWords();
//		var newLang = $( '#livetranslatelang' ).val();
//		
//		if ( words.length == 0 ) {
//			initiateRemoteTranslating( currentLang, newLang );
//		}
//		else {
//			$.getJSON(
//				wgScriptPath + '/api.php',
//				{
//					'action': 'livetranslate',
//					'format': 'json',
//					'from': currentLang,
//					'to': newLang,
//					'words': words.join( '|' )
//				},
//				function( data ) {
//					if ( data.translations ) {
//						replaceSpecialWords( data.translations );
//					}
//					initiateRemoteTranslating( currentLang, newLang );
//				}
//			);			
//		}
//	}
//	
//	/**
//	 * Shows the original page content, simply by setting the html to a stored copy of the original.
//	 * Also re-binds the jQuery events, as they get lost when doing the html replace.
//	 */
//	showOriginal = function() {
//		currentLang = window.sourceLang;
//		$( '#bodyContent' ).html( originalHtml );
//		$( '#livetranslatebutton' ).attr( "disabled", false ).text( lt.msg( 'livetranslate-button-translate' ) );		
//		$( '#livetranslatebutton' ).click( setupTranslationFeatures );	
//		$( '#ltrevertbutton' ).click( showOriginal );	
//	}
//	
//	// Initial binding of the button click events.
//	$( '#livetranslatebutton' ).click( setupTranslationFeatures );	
//	$( '#ltrevertbutton' ).click( showOriginal );	
//	
//	
//	/**
//	 * Inserts notranslate spans around the words specified in the passed array in the page content.
//	 * 
//	 * @param {Array} words
//	 */
//	function insertNoTranslateTags( words ) {
//		for ( i in words ) {
//			$( '#bodyContent *' ).replaceText( 
//				new RegExp( "(\\W)*" + RegExp.escape( words[i] ) + "(\\W)*", "g" ),
//				function( str ) {
//					return '<span class="notranslate">' + str + '</span>';
//				}
//			);
//		}
//	}
//	
//	/**
//	 * Finds the special words in the page contents by getting the contents of all
//	 * notranslate spans and pushing them onto an array.
//	 * 
//	 * @returns {Array}
//	 */ 
//	function getSpecialWords() {
//		var words = [];
//		
//		$.each($( 'span.notranslate' ), function( i, v ) {
//			words.push( $(v).text() );
//		});
//		
//		return words;
//	}
//	
//	/**
//	 * Replaced the special words in the page content by looping over them,
//	 * and checking if there is a matching translation in the provided object.
//	 * 
//	 * @param {object} translations
//	 */
//	function replaceSpecialWords( translations ) {
//		$.each($("span.notranslate"), function(i,v) {
//			var currentText = $(v).text();
//			if ( translations[currentText] ) {
//				$(v).text( translations[currentText] );
//			}
//		});		
//	}
//	
//	/**
//	 * Initiates the remote translation process.
//	 * 
//	 * @param {string} sourceLang
//	 * @param {string} targetLang
//	 */
//	function initiateRemoteTranslating( sourceLang, targetLang ) {
//		var translator = new translationService();
//		translator.done = handleTranslationCompletion;
//		lt.debug( 'Initiating remote translation' );
//		translator.translateElement( $( '#bodyContent' ), sourceLang, targetLang );
//	}
//	
//	function handleTranslationCompletion( targetLang ) {
//		lt.debug( 'Remote translation completed' );
//		currentLang = targetLang;
//		$( '#livetranslatebutton' ).attr( "disabled", false ).text( lt.msg( 'livetranslate-button-translate' ) );
//		$( '#ltrevertbutton' ).css( 'display', 'inline' );
//	}
	
	this.setup();
	
	return this;
	
}; } )( jQuery, window.liveTranslate );