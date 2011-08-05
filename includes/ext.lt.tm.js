/**
 * JavasSript for the Live Translate extension.
 * @see http://www.mediawiki.org/wiki/Extension:Live_Translate
 * 
 * @licence GNU GPL v3 or later
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 */

( function( $, lt ) {
	
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

		hasLocalStorage: function( itemName ) {
			return localStorage.getItem( itemName ) !== null;
		},
		
		getMemoryHashes: function( args, callback ) {
			var defaults = {
				apiPath: window.wgScriptPath
			};
			
			args = $.extend( {}, defaults, args );
			
			if ( !this.canUseLocalStorage() ) {
				return false;
			}
			
			$.getJSON(
				args.apiPath + '/api.php',
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
		
		localStorageIsValid: function( itemName, callback ) {
			if ( !this.hasLocalStorage( itemName ) ) {
				return callback.call( this, false );
			}
			
			this.getMemoryHashes(
				{},
				function( memories ) {
					m = JSON.stringify( memories );
					debugger;
					callback.call( this, localStorage.getItem( 'lt_hash' ) == memories );
				}
			);
		},
		
		obtainTranslationsFromServer: function( args, callback ) {
			var defaults = {
				offset: -1,
				words: [],
				language: 'en',
				apiPath: window.wgScriptPath
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
				allWords: [],
				language: 'en',
				apiPath: window.wgScriptPath
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
			
			var self = this;
			
			$.getJSON(
				args.apiPath + '/api.php',
				requestArgs,
				function( data ) {
					if ( data.words ) {
						args.allWords.push.apply( data.words );
					}
					else {
						// TODO
					}
					
					if ( data['query-continue'] ) {
						debugger;
						self.obtainWordsFromServer(
							{
							offset: data['query-continue'].livetranslate.ltcontinue,
							language: args.language,
							allWords: args.allWords
							},
							callback
						);
					}
					else {
						alert('hax');
						callback.call( _this, args.allWords );
					}
				}
			);
		},
		
		obtainTranslationsFromLS: function() {
			return JSON.parse( localStorage.getItem( 'lt_memory' ) );
		},
		
		writeWordsToLS: function() {
			// TODO
			localStorage.setItem( 'lt_words', JSON.stringify( this.words ) )
		},
		
		writeTranslationsToLS: function() {
			// TODO
			localStorage.setItem( 'lt_translations', JSON.stringify( this.translations ) )
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
			
			if ( !this.translations.sourceLang ) {
				this.translations.sourceLang = {};
			}
			
			// TODO: diff needed words w/ stored ones, and only request unknowns
			
			this.getFromServer = function() {
				self.obtainTranslationsFromServer( args, function( words ) {
					_this.words.language = words;
					callback( words );
					
					if ( _this.canUseLocalStorage() ) {
						_this.writeWordsToLS();
					}
				} );
			}
			
			if ( !this.translations.sourceLang.targetLang ) {
				if ( this.canUseLocalStorage() ) {
					this.localStorageIsValid( 'words', function( isValid ) {
						if ( isValid ) {
							_this.obtainFromLS( 
								'words',
								function( translations ) {
									_this.translations.sourceLang.targetLang = translations;
									callback( translations );
								}
							);
						}
						else {
							getFromServer();
						}
					} );
				}
				else {
					getFromServer();
				}
			}
		},
		
		getSpecialWords: function( language, callback ) {
			if ( !this.words.language ) {
				if ( this.canUseLocalStorage() ) {
					var foo = 'bar';
					
					this.localStorageIsValid( 'translations', function( isValid ) {
						if ( isValid ) {
							_this.obtainFromLS( 
								'translations',
								function( words ) {
									_this.words.language = words;
									callback( words );
								}
							);
						}
						else {
							alert('bar');
							
							this.obtainWordsFromServer(
								{
									language: language
								},
								function( words ) {
									alert('baz');
									this.words.language = words;
									
									if ( this.canUseLocalStorage() ) {
										this.writeWordsToLS();
									}
									alert('foo');
									callback( words );
								}
							);
						}
					} );
				}
				else {
					//getFromServer();
				}				
			}
			
			return this.translations;
		}
	};
	
}) ( jQuery, window.liveTranslate );
