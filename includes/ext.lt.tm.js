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
		
		this.options = {
			lsprefix: 'mw_lt_'
		};
		
		this.cleanedLS = false;
			
		$.extend( this.options, options );
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
			return localStorage.getItem( this.options.lsprefix + itemName ) !== null;
		},
		
		obtainFromLS: function( itemName ) {
			return JSON.parse( localStorage.getItem( this.options.lsprefix +  itemName ) );
		},
		
		writeToLS: function( itemName, object ) {
			localStorage.setItem( this.options.lsprefix +  itemName, JSON.stringify( object ) )
		},
		
		removeFromLS: function( itemName ) {
			return localStorage.removeItem( this.options.lsprefix +  itemName );
		},
		
		getMemoryHashes: function( args, callback ) {
			var caller = arguments.callee.caller;
			
			var defaults = {
				apiPath: window.wgScriptPath
			};
			
			args = $.extend( {}, defaults, args );
			
			$.getJSON(
				args.apiPath + '/api.php',
				{
					'action': 'query', 
					'list': 'translationmemories',
					'format': 'json',
					'qtmprops': 'version_hash'
				},
				function( data ) {
					if ( data.memories ) {
						callback.call( caller, data.memories );
					}
					else {
						lt.debug( 'tm: failed to fetch memory hash' );
						// TODO
					}
				}
			);	
		},
		
		hashesMatch: function( a, b ) {
			for ( i in a ) {
				if ( b[i] ) {
					if ( a[i].memory_version_hash !== b[i].memory_version_hash ) {
						return false;
					}
				}
				else {
					return false;
				}
			}
			
			return true;
		},
		
		cleanLocalStorage: function( options, callback ) {
			options = $.extend( {}, { forceCheck: false }, options );
			var caller = arguments.callee.caller;
			
			if ( this.cleanedLS && !options.forceCheck ) {
				callback.call( caller );
			}
			else {
				var _this = this;
				lt.debug( 'tm: getting memory hashes' );
				
				this.getMemoryHashes(
					{},
					function( memories ) {
						if ( _this.hashesMatch( _this.obtainFromLS( 'hash' ), memories ) ) {
							lt.debug( 'tm: memory hashes obtained: match' );
						}
						else {
							_this.removeFromLS.apply( _this, [ 'words', 'translations' ] );
							_this.writeToLS( 'hash', memories );
							lt.debug( 'tm: memory hashes obtained: no match; LS cleared' );
						}
						
						_this.cleanedLS = true;
						callback.call( caller );
					}
				);
			}
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
			
			lt.debug( 'tm: obtaining special words from server, offset ' + args.offset );
			
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
						args.allWords.push.apply( args.allWords, data.words );
					}
					else {
						// TODO
					}
					
					if ( data['query-continue'] ) {
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
						lt.debug( 'tm: obtained special words from server' );
						callback.call( self, args.allWords );
					}
				}
			);
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
						_this.writeToLS( 'translations', _this.translations );
					}
				} );
			}
			
			if ( !this.translations.sourceLang.targetLang ) {
				if ( this.canUseLocalStorage() ) {
					this.hasLocalStorage( 'translations', function( isValid ) {
						if ( isValid ) {
							_this.obtainFromLS( 
								'translations',
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
			//var caller = arguments.callee.caller;
			var _this = this;
			var caller = arguments.callee.caller;
			
			var getFromServer = function() {
				_this.obtainWordsFromServer(
					{
						language: language
					},
					function( words ) {
						_this.words[language] = words;
						
						if ( this.canUseLocalStorage() ) {
							_this.writeToLS( 'words', _this.words );
							lt.debug( 'tm: wrote special words to LS' );
						}
						
						callback.call( caller, words );
					}
				);
			};
			
			if ( this.words[language] ) {
				return this.words[language];
			}
			else {
				if ( this.canUseLocalStorage() ) {
					this.cleanLocalStorage( {}, function() {
						var words = _this.obtainFromLS( 'words' );
						
						if ( words !== null && words[language] ) {
							callback.call( caller, words[language] );
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
		}
	};
	
}) ( jQuery, window.liveTranslate );
