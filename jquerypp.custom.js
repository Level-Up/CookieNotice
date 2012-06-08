(function( $ ) {

	var getComputedStyle = document.defaultView && document.defaultView.getComputedStyle,
		rupper = /([A-Z])/g,
		rdashAlpha = /-([a-z])/ig,
		fcamelCase = function( all, letter ) {
			return letter.toUpperCase();
		},
		getStyle = function( elem ) {
			if ( getComputedStyle ) {
				return getComputedStyle(elem, null);
			}
			else if ( elem.currentStyle ) {
				return elem.currentStyle;
			}
		},
		rfloat = /float/i,
		rnumpx = /^-?\d+(?:px)?$/i,
		rnum = /^-?\d/;

	$.styles = function( el, styles ) {
		if (!el ) {
			return null;
		}
		var currentS = getStyle(el),
			oldName, val, style = el.style,
			results = {},
			i = 0,
			left, rsLeft, camelCase, name;

		for (; i < styles.length; i++ ) {
			name = styles[i];
			oldName = name.replace(rdashAlpha, fcamelCase);

			if ( rfloat.test(name) ) {
				name = jQuery.support.cssFloat ? "float" : "styleFloat";
				oldName = "cssFloat";
			}

			if ( getComputedStyle ) {
				name = name.replace(rupper, "-$1").toLowerCase();
				val = currentS.getPropertyValue(name);
				if ( name === "opacity" && val === "" ) {
					val = "1";
				}
				results[oldName] = val;
			} else {
				camelCase = name.replace(rdashAlpha, fcamelCase);
				results[oldName] = currentS[name] || currentS[camelCase];


				if (!rnumpx.test(results[oldName]) && rnum.test(results[oldName]) ) { //convert to px
					// Remember the original values
					left = style.left;
					rsLeft = el.runtimeStyle.left;

					// Put in the new values to get a computed value out
					el.runtimeStyle.left = el.currentStyle.left;
					style.left = camelCase === "fontSize" ? "1em" : (results[oldName] || 0);
					results[oldName] = style.pixelLeft + "px";

					// Revert the changed values
					style.left = left;
					el.runtimeStyle.left = rsLeft;
				}

			}
		}

		return results;
	};

	/**
	 * @function jQuery.fn.styles
	 * @parent jQuery.styles
	 * @plugin jQuery.styles
	 *
	 * Returns a set of computed styles. Pass the names of the styles you want to
	 * retrieve as arguments:
	 *
	 *      $("div").styles('float','display')
	 *      // -> { cssFloat: "left", display: "block" }
	 *
	 * @param {String} style pass the names of the styles to retrieve as the argument list
	 * @return {Object} an object of `style` : `value` pairs
	 */
	$.fn.styles = function() {
		return $.styles(this[0], $.makeArray(arguments));
	};
})(jQuery);
(function ($) {

	var animationNum = 0,
		//Animation events implies animations right?
		//gets the last editable stylesheet or creates one
		getLastStyleSheet = function () {
			var sheets = document.styleSheets,
				x = sheets.length - 1,
				foundSheet = null,
				style;

			while (x >= 0 && !foundSheet) {
				if (sheets[x].cssRules || sheets[x].rules) {
					//any stylesheet which we can access cssRules is good
					foundSheet = sheets[x];
				}
				x -= 1;
			}

			if (!foundSheet) {
				style = document.createElement('style');
				document.getElementsByTagName('head')[0].appendChild(style);
				if (!window.createPopup) { /* For Safari */
					style.appendChild(document.createTextNode(''));
				}
				foundSheet = sheets[sheets.length - 1];
			}

			return foundSheet;
		},

		//removes an animation rule from a sheet
		removeAnimation = function (sheet, name) {
			for (var j = sheet.cssRules.length - 1; j >= 0; j--) {
				var rule = sheet.cssRules[j];
				// 7 means the keyframe rule
				if (rule.type === 7 && rule.name == name) {
					sheet.deleteRule(j)
					return;
				}
			}
		},

		/**
		 * Returns whether the animation should be passed to the original
		 * jQuery.fn.animate.
		 */
		passThrough = function (props, ops) {
			var nonElement = !(this[0] && this[0].nodeType),
				isInline = !nonElement && $(this).css("display") === "inline" && $(this).css("float") === "none";

			for (var name in props) {
				if (props[name] == 'show' || props[name] == 'hide' // jQuery does something with these two values
					|| jQuery.isArray(props[name]) // Arrays for individual easing
					|| props[name] < 0 // Negative values not handled the same
					|| name == 'zIndex' || name == 'z-index'
					// Firefox doesn't animate 'auto' properties
					// https://bugzilla.mozilla.org/show_bug.cgi?id=571344
					// || (browser.prefix == '-moz-' && (name == 'font-size' || name == 'fontSize'))
					) {  // unit-less value
					return true;
				}
			}

			return props.jquery === true || browser === null ||
				jQuery.isEmptyObject(props) || // Animating empty properties
				jQuery.isPlainObject(ops) || // Second parameter is an object - anifast only handles numbers
				typeof ops == 'string' || // Second parameter is a string like 'slow' TODO: remove
				isInline || nonElement;
		},

		/**
		 * Return the CSS number (with px added as the default unit if the value is a number)
		 */
		cssNumber = function(origName, value) {
			if (typeof value === "number" && !jQuery.cssNumber[ origName ]) {
				return value += "px";
			}
			return value;
		},

		/**
		 * Feature detection borrowed by Modernizr
		 */
		getBrowserProperties = function(){
			var t,
				el = document.createElement('fakeelement'),
				transitions = {
					'transition': {
						transitionEnd : 'transitionEnd',
						prefix : ''
					},
					/*
					'OTransition': {
						transitionEnd : 'oTransitionEnd',
						prefix : '-o-'
					},
					'MSTransition': {
						transitionEnd : 'msTransitionEnd',
						prefix : '-ms-'
					},
					*/
					'MozTransition': {
						transitionEnd : 'animationend',
						prefix : '-moz-'
					},
					'WebkitTransition': {
						transitionEnd : 'webkitAnimationEnd',
						prefix : '-webkit-'
					}
				}

			for(t in transitions){
				if( el.style[t] !== undefined ){
					return transitions[t];
				}
			}
			return null;
		},

		// Properties that Firefox can't animate if set to 'auto'
		// https://bugzilla.mozilla.org/show_bug.cgi?id=571344
		ffProps = {
			top : function(el) {
				return el.position().top;
			},
			left : function(el) {
				return el.position().left;
			},
			width : function(el) {
				return el.width();
			},
			height : function(el) {
				return el.height();
			},
			fontSize : function(el) {
				return '1em';
			}
		},

		browser = getBrowserProperties(),

		/**
		 * Add browser specific prefix
		 */
		addPrefix = function(properties) {
			var result = {};
			jQuery.each(properties, function(name, value) {
				result[browser.prefix + name] = value;
			});
			return result;
		},

		// The animation cache
		cache = [],

		/**
		 * Returns the animation name for a given style. It either uses a cached
		 * version or adds it to the stylesheet, removing the oldest style if the
		 * cache has reached a certain size.
		 */
		getAnimation = function(style) {
			var lastSheet, name, last;

			// Look up the cached style, set it to that name and reset age if found
			// increment the age for any other animation
			$.each(cache, function(i, animation) {
				if(style === animation.style) {
					name = animation.name;
					animation.age = 0;
				} else {
					animation.age += 1;
				}
			});

			if(!name) { // Add a new style
				lastSheet = getLastStyleSheet()
				name = "animate" + (animationNum++);
				// get the last sheet and insert this rule into it
				lastSheet.insertRule("@" + browser.prefix + "keyframes " + name + ' ' + style,
					lastSheet.cssRules.length);

				cache.push({
					name : name,
					style : style,
					age : 0
				});

				// Sort the cache by age
				cache.sort(function(first, second) {
					return first.age - second.age;
				});

				// Remove the last (oldest) item from the cache if it has more than 20 items
				if(cache.length > 20) {
					last = cache.pop();
					removeAnimation(lastSheet, last.name);
				}
			}

			return name;
		},

		oldanimate = jQuery.fn.animate;

	/**
	 * @function jQuery.fn.animate
	 * @parent jQuery.animate
	 *
	 * Animate CSS properties using native CSS animations, if possible.
	 * Uses the original [jQuery.fn.animate()](http://api.jquery.com/animate/) otherwise.
	 *
	 * @param {Object} props The CSS properties to animate
	 * @param {Integer|String|Object} [speed=400] The animation duration in ms.
	 * Will use jQuery.fn.animate if a string or object is passed
	 * @param {Function} [callback] A callback to execute once the animation is complete
	 * @return {jQuery} The jQuery element
	 */
	jQuery.fn.animate = function (props, speed, callback) {
		//default to normal animations if browser doesn't support them
		if (passThrough.apply(this, arguments)) {
			return oldanimate.apply(this, arguments);
		}
		if (jQuery.isFunction(speed)) {
			callback = speed;
		}

		this.queue('fx', function(done) {

			// Add everything to the animation queue
			// Most of of these calls need to happen once per element
			var current, //current CSS values
				properties = [], // The list of properties passed
				to = "",
				prop,
				self = $(this),
				duration = jQuery.fx.speeds[speed] || speed || jQuery.fx.speeds._default,
				//the animation keyframe name
				animationName,
				// The key used to store the animation hook
				dataKey = animationName + '.run',
				//the text for the keyframe
				style = "{ from {",
				// The animation end event handler.
				// Will be called both on animation end and after calling .stop()
				animationEnd = function (currentCSS, exec) {
					self.css(currentCSS);
					
					self.css(addPrefix({
						"animation-duration" : "",
						"animation-name" : "",
						"animation-fill-mode" : ""
					}));

					if (callback && exec) {
						// Call success, pass the DOM element as the this reference
						callback.call(self[0], true)
					}

					jQuery.removeData(self, dataKey, true);
				}

			for(prop in props) {
				properties.push(prop);
			}

			if(browser.prefix === '-moz-') {
				// Normalize 'auto' properties in FF
				$.each(properties, function(i, prop) {
					var converter = ffProps[jQuery.camelCase(prop)];
					if(converter && self.css(prop) == 'auto') {
						self.css(prop, converter(self));
					}
				});
			}

			// Use jQuery.styles
			current = self.styles.apply(self, properties);
			jQuery.each(properties, function(i, cur) {
				// Convert a camelcased property name
				var name = cur.replace(/([A-Z]|^ms)/g, "-$1" ).toLowerCase();
				style += name + " : " + cssNumber(cur, current[cur]) + "; ";
				to += name + " : " + cssNumber(cur, props[cur]) + "; ";
			});

			style += "} to {" + to + " }}";

			animationName = getAnimation(style);

			// Add a hook which will be called when the animation stops
			jQuery._data(this, dataKey, {
				stop : function(gotoEnd) {
					// Pause the animation
					self.css(addPrefix({
						'animation-play-state' : 'paused'
					}));
					// Unbind the animation end handler
					self.off(browser.transitionEnd, animationEnd);
					if(!gotoEnd) { // We were told not to finish the animation
						// Call animationEnd but set the CSS to the current computed style
						animationEnd(self.styles.apply(self, properties), false);
					} else {
						// Finish animaion
						animationEnd(props, true);
					}
				}
			});

			// set this element to point to that animation
			self.css(addPrefix({
				"animation-duration" : duration + "ms",
				"animation-name" : animationName,
				"animation-fill-mode": "forwards"
			}));

			self.one(browser.transitionEnd, function() {
				// Call animationEnd using the current properties
				animationEnd(props, true);
				done();
			});

		});

		return this;
	};
})(jQuery);
(function($){
    /**
     * @page jQuery.toJSON jQuery.toJSON
     * @parent jquerymx.lang
     * 
     *     jQuery.toJSON( json-serializble )
     * 
     * Converts the given argument into a JSON respresentation.
     * 
     * If an object has a "toJSON" function, that will 
     * be used to get the representation.
     * Non-integer/string keys are skipped in the 
     * object, as are keys that point to a function.
     * 
     * json-serializble:
     * The *thing* to be converted.
     */
    $.toJSON = function(o, replacer, space, recurse)
    {
        if (typeof(JSON) == 'object' && JSON.stringify)
            return JSON.stringify(o, replacer, space);

        if (!recurse && $.isFunction(replacer))
            o = replacer("", o);

        if (typeof space == "number")
            space = "          ".substring(0, space);
        space = (typeof space == "string") ? space.substring(0, 10) : "";
        
        var type = typeof(o);
    
        if (o === null)
            return "null";
    
        if (type == "undefined" || type == "function")
            return undefined;
        
        if (type == "number" || type == "boolean")
            return o + "";
    
        if (type == "string")
            return $.quoteString(o);
    
        if (type == 'object')
        {
            if (typeof o.toJSON == "function") 
                return $.toJSON( o.toJSON(), replacer, space, true );
            
            if (o.constructor === Date)
            {
                var month = o.getUTCMonth() + 1;
                if (month < 10) month = '0' + month;

                var day = o.getUTCDate();
                if (day < 10) day = '0' + day;

                var year = o.getUTCFullYear();
                
                var hours = o.getUTCHours();
                if (hours < 10) hours = '0' + hours;
                
                var minutes = o.getUTCMinutes();
                if (minutes < 10) minutes = '0' + minutes;
                
                var seconds = o.getUTCSeconds();
                if (seconds < 10) seconds = '0' + seconds;
                
                var milli = o.getUTCMilliseconds();
                if (milli < 100) milli = '0' + milli;
                if (milli < 10) milli = '0' + milli;

                return '"' + year + '-' + month + '-' + day + 'T' +
                             hours + ':' + minutes + ':' + seconds + 
                             '.' + milli + 'Z"'; 
            }

            var process = ($.isFunction(replacer)) ?
                function (k, v) { return replacer(k, v); } :
                function (k, v) { return v; },
                nl = (space) ? "\n" : "",
                sp = (space) ? " " : "";

            if (o.constructor === Array) 
            {
                var ret = [];
                for (var i = 0; i < o.length; i++)
                    ret.push(( $.toJSON( process(i, o[i]), replacer, space, true ) || "null" ).replace(/^/gm, space));

                return "[" + nl + ret.join("," + nl) + nl + "]";
            }
        
            var pairs = [], proplist;
            if ($.isArray(replacer)) {
                proplist = $.map(replacer, function (v) {
                    return (typeof v == "string" || typeof v == "number") ?
                        v + "" :
                        null;
                });
            }
            for (var k in o) {
                var name, val, type = typeof k;

                if (proplist && $.inArray(k + "", proplist) == -1)
                    continue;

                if (type == "number")
                    name = '"' + k + '"';
                else if (type == "string")
                    name = $.quoteString(k);
                else
                    continue;  //skip non-string or number keys
            
                val = $.toJSON( process(k, o[k]), replacer, space, true );
            
                if (typeof val == "undefined")
                    continue;  //skip pairs where the value is a function.
            
                pairs.push((name + ":" + sp + val).replace(/^/gm, space));
            }

            return "{" + nl + pairs.join("," + nl) + nl + "}";
        }
    };

    /** 
     * @function jQuery.evalJSON
     * Evaluates a given piece of json source.
     **/
    $.evalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        return eval("(" + src + ")");
    };
    
    /** 
     * @function jQuery.secureEvalJSON
     * Evals JSON in a way that is *more* secure.
     **/
    $.secureEvalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        
        var filtered = src;
        filtered = filtered.replace(/\\["\\\/bfnrtu]/g, '@');
        filtered = filtered.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
        filtered = filtered.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        
        if (/^[\],:{}\s]*$/.test(filtered))
            return eval("(" + src + ")");
        else
            throw new SyntaxError("Error parsing JSON, source is not valid.");
    };

    /** 
     * @function jQuery.quoteString
     * 
     * Returns a string-repr of a string, escaping quotes intelligently.  
     * Mostly a support function for toJSON.
     * 
     * Examples:
     * 
     *      jQuery.quoteString("apple") //-> "apple"
     * 
     *      jQuery.quoteString('"Where are we going?", she asked.')
     *        // -> "\"Where are we going?\", she asked."
     **/
    $.quoteString = function(string)
    {
        if (string.match(_escapeable))
        {
            return '"' + string.replace(_escapeable, function (a) 
            {
                var c = _meta[a];
                if (typeof c === 'string') return c;
                c = a.charCodeAt();
                return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return '"' + string + '"';
    };
    
    var _escapeable = /["\\\x00-\x1f\x7f-\x9f]/g;
    
    var _meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    };
})(jQuery);
(function() {
    // break
    /**
     * @function jQuery.cookie
     * @parent jquerypp
     * @plugin jquery/dom/cookie
     * @author Klaus Hartl/klaus.hartl@stilbuero.de
     *
     * `jQuery.cookie(name, [value], [options])` lets you create, read and remove cookies. It is the
     * [jQuery cookie plugin](https://github.com/carhartl/jquery-cookie) written by [Klaus Hartl](stilbuero.de)
     * and dual licensed under the [MIT](http://www.opensource.org/licenses/mit-license.php)
     * and [GPL](http://www.gnu.org/licenses/gpl.html) licenses.
     *
	 * ## Examples
	 * 
	 * Set the value of a cookie.
	 *  
	 *      $.cookie('the_cookie', 'the_value');
	 * 
	 * Create a cookie with all available options.
	 *
     *      $.cookie('the_cookie', 'the_value', {
     *          expires: 7,
     *          path: '/',
     *          domain: 'jquery.com',
     *          secure: true
     *      });
	 *
	 * Create a session cookie.
	 *
     *      $.cookie('the_cookie', 'the_value');
	 *
	 * Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
	 * used when the cookie was set.
	 *
     *      $.cookie('the_cookie', null);
	 *
	 * Get the value of a cookie.
     *
	 *      $.cookie('the_cookie');
     *
     * @param {String} [name] The name of the cookie.
     * @param {String} [value] The value of the cookie.
     * @param {Object} [options] An object literal containing key/value pairs to provide optional cookie attributes. Values can be:
     *
     * - `expires` - Either an integer specifying the expiration date from now on in days or a Date object. If a negative value is specified (e.g. a date in the past), the cookie will be deleted. If set to null or omitted, the cookie will be a session cookie and will not be retained when the the browser exits.
     * - `domain` - The domain name
     * - `path` - The value of the path atribute of the cookie (default: path of page that created the cookie).
     * - `secure` - If true, the secure attribute of the cookie will be set and the cookie transmission will require a secure protocol (like HTTPS).
     *
     * @return {String} the value of the cookie or {undefined} when setting the cookie.
     */
    jQuery.cookie = function(name, value, options) {
        if (typeof value != 'undefined') { // name and value given, set cookie
            options = options ||
            {};
            if (value === null) {
                value = '';
                options.expires = -1;
            }
            if (typeof value == 'object' && jQuery.toJSON) {
                value = jQuery.toJSON(value);
            }
            var expires = '';
            if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
                var date;
                if (typeof options.expires == 'number') {
                    date = new Date();
                    date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
                }
                else {
                    date = options.expires;
                }
                expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
            }
            // CAUTION: Needed to parenthesize options.path and options.domain
            // in the following expressions, otherwise they evaluate to undefined
            // in the packed version for some reason...
            var path = options.path ? '; path=' + (options.path) : '';
            var domain = options.domain ? '; domain=' + (options.domain) : '';
            var secure = options.secure ? '; secure' : '';
            document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
        }
        else { // only name given, get cookie
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            if (jQuery.evalJSON && cookieValue && cookieValue.match(/^\s*\{/)) {
                try {
                    cookieValue = jQuery.evalJSON(cookieValue);
                }
                catch (e) {
                }
            }
            return cookieValue;
        }
    };

})(jQuery);
(function() {

	var event = jQuery.event,

		//helper that finds handlers by type and calls back a function, this is basically handle
		// events - the events object
		// types - an array of event types to look for
		// callback(type, handlerFunc, selector) - a callback
		// selector - an optional selector to filter with, if there, matches by selector
		//     if null, matches anything, otherwise, matches with no selector
		findHelper = function( events, types, callback, selector ) {
			var t, type, typeHandlers, all, h, handle, 
				namespaces, namespace,
				match;
			for ( t = 0; t < types.length; t++ ) {
				type = types[t];
				all = type.indexOf(".") < 0;
				if (!all ) {
					namespaces = type.split(".");
					type = namespaces.shift();
					namespace = new RegExp("(^|\\.)" + namespaces.slice(0).sort().join("\\.(?:.*\\.)?") + "(\\.|$)");
				}
				typeHandlers = (events[type] || []).slice(0);

				for ( h = 0; h < typeHandlers.length; h++ ) {
					handle = typeHandlers[h];
					
					match = (all || namespace.test(handle.namespace));
					
					if(match){
						if(selector){
							if (handle.selector === selector  ) {
								callback(type, handle.origHandler || handle.handler);
							}
						} else if (selector === null){
							callback(type, handle.origHandler || handle.handler, handle.selector);
						}
						else if (!handle.selector ) {
							callback(type, handle.origHandler || handle.handler);
							
						} 
					}
					
					
				}
			}
		};

	/**
	 * Finds event handlers of a given type on an element.
	 * @param {HTMLElement} el
	 * @param {Array} types an array of event names
	 * @param {String} [selector] optional selector
	 * @return {Array} an array of event handlers
	 */
	event.find = function( el, types, selector ) {
		var events = ( $._data(el) || {} ).events,
			handlers = [],
			t, liver, live;

		if (!events ) {
			return handlers;
		}
		findHelper(events, types, function( type, handler ) {
			handlers.push(handler);
		}, selector);
		return handlers;
	};
	/**
	 * Finds all events.  Group by selector.
	 * @param {HTMLElement} el the element
	 * @param {Array} types event types
	 */
	event.findBySelector = function( el, types ) {
		var events = $._data(el).events,
			selectors = {},
			//adds a handler for a given selector and event
			add = function( selector, event, handler ) {
				var select = selectors[selector] || (selectors[selector] = {}),
					events = select[event] || (select[event] = []);
				events.push(handler);
			};

		if (!events ) {
			return selectors;
		}
		//first check live:
		/*$.each(events.live || [], function( i, live ) {
			if ( $.inArray(live.origType, types) !== -1 ) {
				add(live.selector, live.origType, live.origHandler || live.handler);
			}
		});*/
		//then check straight binds
		findHelper(events, types, function( type, handler, selector ) {
			add(selector || "", type, handler);
		}, null);

		return selectors;
	};
	event.supportTouch = "ontouchend" in document;
	
	$.fn.respondsTo = function( events ) {
		if (!this.length ) {
			return false;
		} else {
			//add default ?
			return event.find(this[0], $.isArray(events) ? events : [events]).length > 0;
		}
	};
	$.fn.triggerHandled = function( event, data ) {
		event = (typeof event == "string" ? $.Event(event) : event);
		this.trigger(event, data);
		return event.handled;
	};
	/**
	 * Only attaches one event handler for all types ...
	 * @param {Array} types llist of types that will delegate here
	 * @param {Object} startingEvent the first event to start listening to
	 * @param {Object} onFirst a function to call 
	 */
	event.setupHelper = function( types, startingEvent, onFirst ) {
		if (!onFirst ) {
			onFirst = startingEvent;
			startingEvent = null;
		}
		var add = function( handleObj ) {

			var bySelector, selector = handleObj.selector || "";
			if ( selector ) {
				bySelector = event.find(this, types, selector);
				if (!bySelector.length ) {
					$(this).delegate(selector, startingEvent, onFirst);
				}
			}
			else {
				//var bySelector = event.find(this, types, selector);
				if (!event.find(this, types, selector).length ) {
					event.add(this, startingEvent, onFirst, {
						selector: selector,
						delegate: this
					});
				}

			}

		},
			remove = function( handleObj ) {
				var bySelector, selector = handleObj.selector || "";
				if ( selector ) {
					bySelector = event.find(this, types, selector);
					if (!bySelector.length ) {
						$(this).undelegate(selector, startingEvent, onFirst);
					}
				}
				else {
					if (!event.find(this, types, selector).length ) {
						event.remove(this, startingEvent, onFirst, {
							selector: selector,
							delegate: this
						});
					}
				}
			};
		$.each(types, function() {
			event.special[this] = {
				add: add,
				remove: remove,
				setup: function() {},
				teardown: function() {}
			};
		});
	};
})(jQuery);
(function($){
/**
 * @class jQuery.Hover
 * @plugin jquery/event/hover
 * @download  http://jmvcsite.heroku.com/pluginify?plugins[]=jquery/event/hover/hover.js
 * @parent jQuery.event.hover
 *
 * Creates a new hover. The constructor should not be called directly.
 *
 * An instance of `$.Hover` is passed as the second argument to each
 * [jQuery.event.hover] event handler:
 *
 *      $('#menu').on("hoverinit", function(ev, hover) {
 *          // Set the hover distance to 20px
 *          hover.distance(20);
 *      });
 */
$.Hover = function(){
	this._delay =  $.Hover.delay;
	this._distance = $.Hover.distance;
	this._leave = $.Hover.leave
};
/**
 * @Static
 */
$.extend($.Hover,{
	/**
	 * @attribute delay
	 *
	 * `$.Hover.delay` is the delay (in milliseconds) after which the hover is
	 * activated by default.
	 *
	 * Set this value as a global default. The default is 100ms.
	 *
	 *      // Set the global hover delay to 1 second
	 *      $.Hover.delay = 1000;
	 */
	delay: 100,
	/**
	 * @attribute distance
	 *
	 * `$.Hover.distance` is the maximum distance (in pixels) that the mouse is allowed to
	 * travel within the time of [jQuery.Hover.delay] in order to activate a hover.
	 *
	 * Set this value as a global default. The default is 10px.
	 *
	 *      // Set the global hover distance to 1 pixel
	 *      $.Hover.distance = 1;
	 */
	distance: 10,
	leave : 0
})

/**
 * @Prototype
 */
$.extend($.Hover.prototype,{
	/**
	 * `hover.delay(time)` sets the delay (in ms) for this hover.
	 * This method should only be used in [jQuery.event.hover.hoverinit hoverinit]:
	 *
	 *      $('.hoverable').on('hoverinit', function(ev, hover) {
	 *          // Set the delay to 500ms
	 *          hover.delay(500);
	 *      });
	 *
	 * @param {Number} delay the number of milliseconds used to determine a hover
	 * @return {$.Hover} The hover object
	 */
	delay: function( delay ) {
		this._delay = delay;
		return this;
	},
	/**
	 * `hover.distance(px) sets the maximum distance (in pixels) the mouse is allowed to travel in order to activate
	 * the hover. This method should only be used in [jQuery.event.hover.hoverinit hoverinit]:
	 *
	 *      $('.hoverable').on('hoverinit', function(ev, hover) {
	 *          // Set the distance to 1px
	 *          hover.distance(1);
	 *      });
	 *
	 * @param {Number} distance the max distance in pixels a mouse can move to be considered a hover
	 * @return {$.Hover} The hover object
	 */
	distance: function( distance ) {
		this._distance = distance;
		return this;
	},
	/**
	 * `hover.leave(delay)` sets a delay for how long the hover should stay active after the mouse left.
	 * This method should only be used in [jQuery.event.hover.hoverinit hoverinit]:
	 *
	 *      $('.hoverable').on('hoverinit', function(ev, hover) {
	 *          // Stay active for another second after the mouse left
	 *          hover.leave(1000);
	 *      });
	 *
	 * @param {Number} delay the number of milliseconds the hover should stay active after the mouse leaves
	 * @return {$.Hover} The hover object
	 */
	leave : function(leave){
		this._leave = leave;
		return this;
	}
})
var event = $.event, 
	handle  = event.handle,
	onmouseenter = function(ev){
		//now start checking mousemoves to update location
		var delegate = ev.delegateTarget || ev.currentTarget;
		var selector = ev.handleObj.selector;
		//prevents another mouseenter until current has run its course
		if($.data(delegate,"_hover"+selector)){
			return;
		}
		$.data(delegate,"_hover"+selector, true)
		var loc = {
				pageX : ev.pageX,
				pageY : ev.pageY
			}, 
			dist = 0, 
			timer, 
			enteredEl = this, 
			hovered = false,
			lastEv = ev, 
			hover = new $.Hover(),
			leaveTimer,
			callHoverLeave = function(){
				$.each(event.find(delegate, ["hoverleave"], selector), function(){
					this.call(enteredEl, ev, hover)
				})
				cleanUp();
			},
			mouseenter = function(ev){
				clearTimeout(leaveTimer);
				dist += Math.pow( ev.pageX-loc.pageX, 2 ) + Math.pow( ev.pageY-loc.pageY, 2 ); 
				loc = {
					pageX : ev.pageX,
					pageY : ev.pageY
				}
				lastEv = ev
			},
			mouseleave = function(ev){
				clearTimeout(timer);
				// go right away
				if(hovered){
					if(hover._leave === 0){
						callHoverLeave();
					}else{
						clearTimeout(leaveTimer);
						leaveTimer = setTimeout(function(){
							callHoverLeave();
						}, hover._leave)
					}
				}else{
					cleanUp();
				}
			},
			cleanUp = function(){
				$(enteredEl).unbind("mouseleave",mouseleave)
				$(enteredEl).unbind("mousemove",mouseenter);
				$.removeData(delegate,"_hover"+selector)
			};
		
		$(enteredEl).bind("mousemove",mouseenter).bind("mouseleave", mouseleave);
		$.each(event.find(delegate, ["hoverinit"], selector), function(){
			this.call(enteredEl, ev, hover)
		})
		
		timer = setTimeout(function(){
			//check that we aren't moveing around
			if(dist < hover._distance && $(enteredEl).queue().length == 0){
				$.each(event.find(delegate, ["hoverenter"], selector), function(){
					this.call(enteredEl, lastEv, hover)
				})
				hovered = true;
				return;
			}else{
				dist = 0;
				timer = setTimeout(arguments.callee, hover._delay)
			}
		}, hover._delay)
		
	};

/**
 * @add jQuery.event.special
 */
event.setupHelper( [
/**
 * @attribute hoverinit
 * @parent jQuery.event.hover
 *
 * `hoverinit` is called when a hover is about to start (on `mouseenter`). Listen for `hoverinit` events to configure
 * [jQuery.Hover::delay delay] and [jQuery.Hover::distance distance]
 * for this specific event:
 *
 *      $(".option").on("hoverinit", function(ev, hover){
 *          //set the distance to 10px
 *          hover.distance(10);
 *          //set the delay to 200ms
 *          hover.delay(10);
 *          // End the hover one second after the mouse leaves
 *          hover.leave(1000);
 *      })
 */
"hoverinit", 
/**
 * @attribute hoverenter
 * @parent jQuery.event.hover
 *
 * `hoverenter` events are called when the mouses less than [jQuery.Hover.prototype.distance] pixels in
 * [jQuery.Hover.prototype.delay delay] milliseconds.
 *
 *      $(".option").on("hoverenter", function(ev, hover){
 *          $(this).addClass("hovering");
 *      })
 */
"hoverenter",
/**
 * @attribute hoverleave
 * @parent jQuery.event.hover
 *
 * `hoverleave` is called when the mouse leaves an element that has been hovered.
 *
 *      $(".option").on("hoverleave", function(ev, hover){
 *          $(this).removeClass("hovering");
 *      })
 */
"hoverleave",
/**
 * @attribute hovermove
 * @parent jQuery.event.hover
 *
 * `hovermove` is called when a `mousemove` occurs on an element that has been hovered.
 *
 *      $(".option").on("hovermove", function(ev, hover){
 *          // not sure why you would want to listen for this
 *          // but we provide it just in case
 *      })
 */
"hovermove"], "mouseenter", onmouseenter )
		

	
})(jQuery)