
// consts
var B_HOST = 'b.hatena.ne.jp';
var B_HTTP = 'http://' + B_HOST + '/';
var B_STATIC_HOST = 'b.st-hatena.com';
var B_STATIC_HTTP = 'http://' + B_STATIC_HOST + '/';
var B_API_STATIC_HOST = 'api.b.st-hatena.com';
var B_API_STATIC_HTTP = 'http://' + B_API_STATIC_HOST + '/';

if (Deferred.WebDatabase) {
    var Database = Deferred.WebDatabase;
    // Database.debugMessage = true;
    var Model = Database.Model, SQL = Database.SQL;
}

// utility
var p = function() {
    console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
}

var sprintf = function (str) {
    var args = Array.prototype.slice.call(arguments, 1);
    return str.replace(/%[sdf]/g, function(m) { return sprintf._SPRINTF_HASH[m](args.shift()) });
};

sprintf._SPRINTF_HASH = {
    '%s': String,
    '%d': parseInt,
    '%f': parseFloat,
};

var $K = function(i) { return function() { return i } };

if (typeof Deferred != 'undefined') {
    Deferred.prototype._fire = function (okng, value) {
        var next = "ok";
        try {
            value = this.callback[okng].call(this, value);
        } catch (e) {
            next  = "ng";
            if (Deferred.debug) console.error(e);
            value = e;
        }
        if (value instanceof Deferred) {
            value._next = this._next;
        } else {
            if (this._next) this._next._fire(next, value);
        }
        return this;
    }
    // Deferred.debug = true;
}


if (typeof jQuery != 'undefined') {
    // setter/getter extend version
    jQuery.extend = jQuery.fn.extend = function() {
        // copy reference to target object
        var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !jQuery.isFunction(target) )
            target = {};

        // extend jQuery itself if only one argument is passed
        if ( length == i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ )
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null )
                // Extend the base object
                for ( var name in options ) {
                    var getterFlag = false;
                    var src, copy;
                    if ( options.__lookupGetter__ &&  options.__lookupGetter__(name) !== undefined ) {
                        target.__defineGetter__(name, options.__lookupGetter__(name));
                        getterFlag = true;
                    } else {
                        copy = options[ name ];
                    }

                    // Prevent never-ending loop
                    if ( target === copy )
                        continue;

                    // Recurse if we're merging object values
                    if ( deep && !getterFlag && copy && typeof copy === "object" && !copy.nodeType ) {
                        src = target[ name ];
                        target[ name ] = jQuery.extend( deep, 
                            // Never move original objects, clone them
                            src || ( copy.length != null ? [ ] : { } )
                        , copy );

                    // Don't bring in undefined values
                    } else {
                        if ( options.__lookupSetter__ && options.__lookupSetter__(name) !== undefined ) {
                            target.__defineSetter__(name, options.__lookupSetter__(name));
                        }
                        if ( copy !== undefined && !getterFlag) {
                            target[ name ] = copy;
                        }
                    }

                }

        // Return the modified object
        return target;
    };

    jQuery.httpSuccess = function( xhr ) {
        try {
            // IE error sometimes returns 1223 when it should be 204 so treat it as success, see #1450
            return !xhr.status && (location.protocol == "file:" || location.protocol == "chrome-extension:") ||
                ( xhr.status >= 200 && xhr.status < 300 ) || xhr.status == 304 || xhr.status == 1223;
        } catch(e){}
        return false;
    };

    var URI = function(schema, host, port, path, search, hash) {
        if (this instanceof URI) {
            this.init.apply(this, arguments);
        } else {
           var i = function () {};
           i.prototype = URI.prototype;
           var o = new i;
           URI.apply(o, arguments);
           return o;
        }
    }

    URI.URI_REGEXP = new RegExp('^([^:/]+)://([^:/]+)(?::(\\d{1,5}))?(/[^?#]*?)(\\?[^#]*)?(#.*)?$');
    URI.parse = function(url) {
        var m = url.match(URI.URI_REGEXP);
        if (!m) throw new Error('invalid uri: ' + url);
        m.shift();
        return URI.apply(null, m);
    }

    URI.prototype = {
        init: function(schema, host, port, path, search, hash) {
            this.schema = schema || '';
            this.host = host || '';
            this.port = port || '';
            this.path = path || '';
            this.search = search || '';
            this.hash = hash || '';
        },
        get path_query() {
            return this.path + this.search;
        },
        get encodeURI() {
            return encodeURIComponent(this.href);
        },
        param: function(obj) {
            var pair = this._getSearchHash();
            if (typeof obj === 'string' || obj instanceof String) {
                return pair[obj];
            } else {
                var updated = false;
                for (var key in obj) {
                    if (obj[key] === null || typeof obj[key] == 'undefined') {
                        delete pair[key];
                    } else {
                        pair[key] = obj[key];
                    }
                    updated = true;
                }
                if (updated) {
                    var res = [];
                    for (var key in pair) {
                        res.push([encodeURIComponent(key), encodeURIComponent(pair[key])].join('='));
                    }
                    if (res.length) {
                        this.search = '?' + res.join('&');
                    } else {
                        this.search = '';
                    }
                }
            }
        },
        _getSearchHash: function() {
            if (this.search.indexOf('?') != 0) {
                return {};
            } else {
                var query = this.search.substring(1);
                return this._queries(query);
            }
        },
        _queries: function(query) {
             var res = {};
             query.split('&').forEach(function(q) {
                 var kv = q.split('=',2);
                 res[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
             });
             return res;
        },
        get entryURL() {
            var url = [
                this.host,
                (this.port ? ':' + this.port : ''),
                this.path,
                this.search,
                this.hash.replace(/#/, '%23')
            ].join('');
            if (this.isHTTPS) url = 's/' + url;
            return B_HTTP + 'entry/' + url;
        },
        get isHTTPS() {
            return this.schema == 'https';
        },
        get href() {
            return [
                this.schema, '://',
                this.host,
                (this.port ? ':' + this.port : ''),
                this.path,
                this.search,
                this.hash
            ].join('');
        },
        toString: function() {
            return this.href;
        }
    }

    var Timer = {
        get now() {
            return (new Date).getTime();
        },
        create: function(interval, repeatCount, Global) {
            var currentCount = 0;
            var interval = interval || 60; // ms
            var repeatCount = repeatCount || 0;
            if (!Global) Global = window;
            var _running = false;
            var sid;

            var timer = $({});
            jQuery.extend(timer, {
                start: function() {
                    sid = Global.setInterval(function() {
                        timer.loop();
                    }, interval);
                },
                reset: function() {
                    timer.stop();
                    currentCount = 0;
                },
                stop: function() {
                    if (sid) Global.clearInterval(sid);
                    sid = null;
                },
                get running() { return !!sid },
                loop: function() {
                    if (!timer.running) return;

                    currentCount++;
                    if (repeatCount && currentCount >= repeatCount) {
                        timer.stop();
                        timer.trigger('timer', [currentCount]);
                        timer.trigger('timerComplete', [currentCount]);
                        return;
                    }
                    timer.trigger('timer', currentCount);
                },
            });
            return timer;
        }
    }

    var ExpireCache = function(key, defaultExpire, seriarizer, sweeperDelay) {
        this.key = key || 'default-key';
        this.defaultExpire = defaultExpire || 60 * 30; // 30分
        this.seriarizer = ExpireCache.Seriarizer[seriarizer];
        if (!sweeperDelay)
            sweeperDelay = 60 * 60 * 4; // 四時間
        this.sweeper = Timer.create(1000 * sweeperDelay);
        var self = this;
        this.sweeper.bind('timer', function() {
            self.sweepHandler();
        });
        this.sweeper.start();
    }

    ExpireCache.__defineGetter__('now', function() { return new Date-0 });

    ExpireCache.shared = {};
    ExpireCache.clearAllCaches = function() { ExpireCache.shared = {} };
    ExpireCache.Seriarizer = {};
    ExpireCache.Seriarizer.JSON = {
        seriarize: function(value) { return JSON.stringify(value) },
        deseriarize: function(value) { return JSON.parse(value) },
    }

    ExpireCache.prototype = {
        sweepHandler: function() {
            for (var key in this.cache) {
                this._update(key);
            }
        },
        get key() { return this._key },
        set key(value) {
            this._key = value || 'global';
            if (!ExpireCache.shared[this.sharedKey])
                ExpireCache.shared[this.sharedKey] = {};
        },
        get sharedKey() { return '_cache_' + this._key },
        get cache() { 
            var c = ExpireCache.shared[this.sharedKey];
            if (c) {
                return c;
            } else {
                return (ExpireCache.shared[this.sharedKey] = {});
            }
        },
        deseriarize: function ExpireCache_deseriarize(value) {
            if (!this.seriarizer) return value;

            return this.seriarizer.deseriarize(value);
        },
        seriarize: function ExpireCache_seriarize(value) {
            if (!this.seriarizer) return value;

            return this.seriarizer.seriarize(value);
        },
        get: function ExpireCache_get (key) {
            return this.has(key) ? this.deseriarize(this.cache[key][0]) : null;
        },
        _update: function ExpireCache__update(key) {
            if (!this.cache[key]) return;
            var tmp = this.cache[key];
            if (ExpireCache.now >= tmp[1]) {
                delete this.cache[key]
            }
        },
        has: function ExpireCache_has(key) {
            this._update(key);
            return !!this.cache[key];
        },
        clear: function ExpireCache_clear(key) {
            if (this.cache[key]) {
                delete this.cache[key];
                return true;
            } else {
                return false;
            }
        },
        clearAll: function ExpireCache_clearAll() {
            delete ExpireCache.shared[this.sharedKey];
            ExpireCache.shared[this.sharedKey] = {};
        },
        set: function ExpireCache_set(key, value, expire) {
            if (!expire) expire = this.defaultExpire;
            var e = ExpireCache.now + (expire * 1000);
            this.cache[key] = [this.seriarize(value), e];
        },
    }

    var HTTPCache = function(key, options) {
        if (!options) options = {};
        this.options = options;
        this.cache = new ExpireCache('http-' + key, options.expire, options.seriarizer);
    }

    HTTPCache.prototype = {
        createURL: function HTTPCache_createURL (url) {
            if (this.options.encoder)
                url = this.options.encoder(url);
            return (this.options.baseURL || '') + url;
        },
        isValid: function(url) {
            return true;
        },
        get: function HTTPCache_get(url) {
            if (!this.isValid(url)) {
                return Deferred.next($K(null));
            }

            var cache = this.cache;
            if (cache.has(url)) {
                var val = cache.get(url);
                return Deferred.next($K(val));
            } else {
                var self = this;
                var d = new Deferred();
                $.get(this.createURL(url)).next(function(res) {
                    d.call(self.setResCache(url, res));
                }).error(function() {
                    cache.set(url, null);
                    d.call(null);
                });
                return d;
            }
        },
        setResCache: function HTTPCache_setResCache(url, res) {
            var cache = this.cache;
            var val = res;
            if (this.options.json) {
                // ({foo: 'bar'}) な JSON 対策
                if (val.indexOf('(') == 0) {
                    val = val.substring(1);
                    val = val.substr(0, val.lastIndexOf(')'));
                }
                val = JSON.parse(val);
            }
            cache.set(url, val);
            p('http not using cache: ' + url);
            return cache.get(url);
        },
        clear: function HTTPCache_clear (url) {
            p('http cache clear: ' + url);
            return this.cache.clear(url);
        },
        clearAll: function HTTPCache_clearAll () {
            return this.cache.clearAll();
        },
        has: function HTTPCache_has (url) {
            return this.cache.has(url);
        }
    }

    HTTPCache.encodeBookmarkURL = function(url) {
        return encodeURIComponent((url || '').replace(/#/, '%23'));
    }

    HTTPCache.counter = new HTTPCache('counterCache', {
        expire: 60 * 15,
        baseURL: B_API_STATIC_HTTP + 'entry.count?url=',
        encoder: HTTPCache.encodeBookmarkURL,
    });

    HTTPCache.counter.isValid = function(url) {
        // XXX
        if (url.indexOf('https') == 0) {
            return false;
        } else {
            return true;
        }
    };

    /*
    HTTPCache.counter.createFilter = function(ev) {
        let filters = eval( '(' + HTTPCache.counter.prefs.get('counterIgnoreList') + ')');
        HTTPCache.counter.setFilter(filters);
    };

    HTTPCache.counter.setFilter = function(filters) {
        HTTPCache.counter.filters = filters.map(function(v) new RegExp(v));
    }

    HTTPCache.counter.loadHandler = function(ev) {
        HTTPCache.counter.createFilter();
        HTTPCache.counter.prefs.createListener('counterIgnoreList', HTTPCache.counter.createFilter);
    };
    */

    HTTPCache.comment = new HTTPCache('commentCache', {
        expire: 60 * 15,
        baseURL: B_HTTP + 'entry/jsonlite/?url=',
        seriarizer: 'JSON',
        json: true,
        encoder: HTTPCache.encodeBookmarkURL,
    });

    HTTPCache.entry = new HTTPCache('entryCache', {
        expire: 60 * 4,
        baseURL: B_HTTP + 'my.entry?url=',
        seriarizer: 'JSON',
        json: true,
        encoder: HTTPCache.encodeBookmarkURL,
    });

}
