/**
 * JavasSript for the Live Translate extension.
 * @see http://www.mediawiki.org/wiki/Extension:Live_Translate
 * 
 * @licence GNU GPL v3 or later
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 */

( function( lt ) {
	
	lt.memory = function( options ) {
		var _this = this;
		
		// Words to not translate using the translation services.
		// { en: [foo, bar, baz], nl: [ ... ] }
		this.words = {};
		
		// List of translations.
		// { en: { nl: { foo_en: foo_nl }, de: { bar_en: bar_de } }, nl: { ... } }
		this.translations = {};
	};
	
	lt.memory.prototype = {
			
		canUseLocalStorage: function() {
			try {
				return 'localStorage' in window && window['localStorage'] !== null;
			} catch ( e ) {
				return false;
			}
		},
	
		hasLocalStorage: function() {
			if ( !_this.canUseLocalStorage() ) {
				return false;
			}
			
			var memory = localStorage.getItem( 'lt_memory' );
			debugger;
			return memory;
		},
		
		getMemoryHashes: function( callback ) {
			$.getJSON(
				wgScriptPath + '/api.php',
				{
					'action': 'translationmemories',
					'format': 'json',
					'props': 'version_hash'
				},
				function( data ) {
					if ( data.memories ) {
						callback( data.memories );
					}
					else {
						// TODO
					}
				}
			);		
		},
		
		localStorageIsValid: function() {
			if ( !_this.hasLocalStorage() ) {
				return false;
			}
			
			_this.getMemoryHashes();
		},
		
		obtainTranslationsFromServer: function( args, callback ) {
			var defaults = {
				offset: -1,
				words: [],
				language: 'en',
				apiPath: wgScriptPath
			};
			
			args = $.extend( {}, defaults, args );
			
			$.getJSON(
				args.apiPath + '/api.php',
				{
					'action': 'livetranslate',
					'format': 'json',
					'from': args.source,
					'to': args.target,
					'words': args.words.join( '|' )
				},
				function( data ) {
					if ( data.translations ) {
						replaceSpecialWords( data.translations );
					}
					initiateRemoteTranslating( currentLang, newLang );
				}
			);	
		},
		
		obtainWordsFromServer: function( args, callback ) {
			var defaults = {
				offset: -1,
				translations: [],
				language: 'en',
				apiPath: wgScriptPath
			};
			
			args = $.extend( {}, defaults, args );
			
			var requestArgs = {
				'action': 'query',
				'format': 'json',
				'list': 'livetranslate',
				'ltlanguage': args.language
			};
			
			if ( args.offset > 0 ) {
				requestArgs['ltcontinue'] = args.offset;
			}
			
			$.getJSON(
				args.apiPath + '/api.php',
				requestArgs,
				function( data ) {
					words = [];
					
					if ( data.words ) {
						words = data.words;
					}
					else {
						// TODO
					}
					
					if ( data['query-continue'] ) {
						obtainAndInsertTranslations( data['query-continue'].livetranslate.ltcontinue );
					else {
						callback( words );
					}
				}
			);
		},
		
		obtainTranslationsFromLS: function() {
			return JSON.parse( localStorage.getItem( 'lt_memory' ) );
		},
		
		writeWordsToLS: function() {
			// TODO
			localStorage.setItem( 'lt_words', JSON.stringify( _this.words ) )
		},
		
		writeTranslationsToLS: function() {
			// TODO
			localStorage.setItem( 'lt_translations', JSON.stringify( _this.translations ) )
		},
		
		/**
		 * 
		 */
		getTranslations: function( args, callback ) {
			
			var defaults = {
				source: 'en',
				target: 'en',
				words: []
			};
			
			args = $.extend( {}, defaults, args );
			
			sourceLang = args.source;
			targetLang = args.target;
			
			if ( !_this.translations.sourceLang ) {
				_this.translations.sourceLang = {};
			}
			// TODO: diff needed words w/ stored ones, and only request unknowns
			if ( !_this.translations.sourceLang.targetLang ) {
				if ( _this.canUseLocalStorage() && _this.localStorageIsValid( 'words' ) ) {
					_this.obtainFromLS( 
						'words',
						function( translations ) {
							_this.translations.sourceLang.targetLang = translations;
							callback( translations );
						}
					);
				}
				else {
					_this.obtainWordssFromServer( args, function( words ) {
						_this.words.language = words;
						callback( words );
						
						if ( _this.canUseLocalStorage() ) {
							_this.writeWordsToLS();
						}
					} );
				}
			}
		},
		
		getSpecialWords: function( language, callback ) {
			if ( !_this.words.language ) {
				if ( _this.canUseLocalStorage() && _this.localStorageIsValid( 'translations' ) ) {
					_this.obtainFromLS( 
						'translations',
						function( words ) {
							_this.words.language = words;
							callback( words );
						}
					);
				}
				else {
					_this.obtainWordsFromServer( -1, [], function( words ) {
						_this.words.language = words;
						callback( words );
						
						if ( _this.canUseLocalStorage() ) {
							_this.writeWordsToLS();
						}
					} );
				}				
			}
			
			return _this.translations;
		}
	};
	
}) ( window.liveTranslate );
