/**
 * JavasSript for the Live Translate extension.
 * @see http://www.mediawiki.org/wiki/Extension:Live_Translate
 * 
 * @licence GNU GPL v3 or later
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 * 
 * This file holds the lt.memory class.
 */

( function( $, lt ) {
	
	/**
	 * An lt.memory acts as abstraction layer via which special words
	 * (words for which a translation is specified in the wiki) and
	 * translations of those special words can be accessed. It takes
	 * care of obtaining these via the API and utilizing caching in 
	 * memory and LocalStorage where appropriate and possible.
	 * 
	 * @constructor
	 * @since 1.2
	 */
	lt.memory = function( options ) {
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
	
	lt.memory.singleton = function() {
		if ( typeof lt.memoryinstance === 'undefined' ) {
			lt.memoryinstance = new lt.memory();
		}
		
		return lt.memoryinstance;
	}
	
	lt.memory.prototype = {
		
		/**
		 * Returns if LocalStorage can be used or not.
		 * 
		 * @protected
		 * @since 1.2 
		 * 
		 * @return {boolean}
		 */
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
			lt.debug( 'tm: removing item from LS: ' + this.options.lsprefix + itemName );
			localStorage.removeItem( this.options.lsprefix +  itemName );
		},
		
		getMemoryHashes: function( args, callback ) {
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
						callback( data.memories );
					}
					else {
						lt.debug( 'tm: failed to fetch memory hash' );
						// TODO
					}
				}
			);	
		},
		
		hashesMatch: function( a, b ) {
			if ( a === null || b === null ) {
				return false;
			}
			
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
			
			for ( i in b ) {
				if ( !a[i] ) {
					return false;
				}
			}
			
			return true;
		},
		
		cleanLocalStorage: function( options, callback ) {
			options = $.extend( {}, { forceCheck: false }, options );
			
			if ( this.cleanedLS && !options.forceCheck ) {
				callback();
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
							_this.removeFromLS( 'words' );
							_this.removeFromLS( 'translations' );
							_this.writeToLS( 'hash', memories );
							lt.debug( 'tm: memory hashes obtained: no match; LS cleared' );
						}
						
						_this.cleanedLS = true;
						callback();
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
			
			lt.debug( 'tm: obtaining translations from server' );
			
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
						lt.debug( 'tm: obtained translations from server' );
						callback( data.translations );
					}
					else {
						// TODO
					}
				}
			);	
		},
		
		obtainWordsFromServer: function( args, callback ) {
			var _this = this;
			
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
						_this.obtainWordsFromServer(
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
						callback( args.allWords );
					}
				}
			);
		},
		
		/**
		 * 
		 */
		getTranslations: function( args, callback ) {
			var _this = this;
			
			var defaults = {
				source: 'en',
				target: 'en',
				words: []
			};
			
			var translations = {};
			
			args = $.extend( {}, defaults, args );
			
			if ( !this.translations[args.source] ) {
				this.translations[args.source] = {};
			}
			
			var mergeInTranslations = function( words ) {
				lt.debug( 'tm: merging in translations' );
				var wordsAdded = [];
				
				$.each( args.words, function( index, word ) {
					if ( !!words[word] ) {
						translations[word] = words[word];
						_this.translations[args.source][args.target][word] = words[word];
						wordsAdded.push( index );
					}
				} );
				
				args.words = $.grep( args.words, function( e, index ) {
					return $.inArray( index, wordsAdded ) === -1;
				} );
			};
			
			var getFromServer = function() {
				_this.obtainTranslationsFromServer( args, function( obtainedTranslations ) {
					mergeInTranslations( obtainedTranslations );
					
					if ( _this.canUseLocalStorage() ) {
						_this.writeToLS( 'translations', _this.translations );
						lt.debug( 'tm: wrote translations to LS' );
					}
					
					callback( translations );
				} );
			};
			
			if ( this.translations[args.source][args.target] ) {
				mergeInTranslations( this.translations[args.source][args.target] );
			}
			else {
				this.translations[args.source][args.target] = {};
			}
			
			if ( args.words.length == 0 ) {
				callback( translations );
			}
			else {
				if ( this.canUseLocalStorage() ) {
					this.cleanLocalStorage( {}, function() {
						var lsTranslations = _this.obtainFromLS( 'translations' );
						
						if ( lsTranslations !== null && lsTranslations[args.source] && lsTranslations[args.source][args.target] ) {
							mergeInTranslations( lsTranslations[args.source][args.target] );
						}
						
						if ( args.words.length == 0 ) {
							callback( translations );
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
			var _this = this;
			
			var getFromServer = function() {
				_this.obtainWordsFromServer(
					{
						language: language
					},
					function( words ) {
						_this.words[language] = words;
						
						if ( _this.canUseLocalStorage() ) {
							_this.writeToLS( 'words', _this.words );
							lt.debug( 'tm: wrote special words to LS' );
						}
						
						callback( words );
					}
				);
			};
			
			if ( this.words[language] ) {
				callback( this.words[language] );
			}
			else {
				if ( this.canUseLocalStorage() ) {
					this.cleanLocalStorage( {}, function() {
						var words = _this.obtainFromLS( 'words' );
						
						if ( words !== null && words[language] ) {
							callback( words[language] );
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
