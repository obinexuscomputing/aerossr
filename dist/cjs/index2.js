'use strict';

var AeroSSR = require('./AeroSSR-7fe0f7ff.js');
var path = require('path');
var require$$3 = require('fs');
var StaticFileMiddleware = require('./StaticFileMiddleware-531e8867.js');
require('fs/promises');
require('crypto');
require('http');
require('url');
require('zlib');

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var commander = {exports: {}};

var domain;

// This constructor is used to store event handlers. Instantiating this is
// faster than explicitly calling `Object.create(null)` to get a "clean" empty
// object (tested with v8 v4.9).
function EventHandlers() {}
EventHandlers.prototype = Object.create(null);

function EventEmitter() {
  EventEmitter.init.call(this);
}

// nodejs oddity
// require('events') === require('events').EventEmitter
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.usingDomains = false;

EventEmitter.prototype.domain = undefined;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

EventEmitter.init = function() {
  this.domain = null;
  if (EventEmitter.usingDomains) {
    // if there is an active domain, then attach to it.
    if (domain.active ) ;
  }

  if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
    this._events = new EventHandlers();
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events, domain;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  domain = this.domain;

  // If there is no 'error' event listener then throw.
  if (doError) {
    er = arguments[1];
    if (domain) {
      if (!er)
        er = new Error('Uncaught, unspecified "error" event');
      er.domainEmitter = this;
      er.domain = domain;
      er.domainThrown = false;
      domain.emit('error', er);
    } else if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
    // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
    // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = new EventHandlers();
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] = prepend ? [listener, existing] :
                                          [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
                            existing.length + ' ' + type + ' listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        emitWarning(w);
      }
    }
  }

  return target;
}
function emitWarning(e) {
  typeof console.warn === 'function' ? console.warn(e) : console.log(e);
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function _onceWrap(target, type, listener) {
  var fired = false;
  function g() {
    target.removeListener(type, g);
    if (!fired) {
      fired = true;
      listener.apply(target, arguments);
    }
  }
  g.listener = listener;
  return g;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || (list.listener && list.listener === listener)) {
        if (--this._eventsCount === 0)
          this._events = new EventHandlers();
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length; i-- > 0;) {
          if (list[i] === listener ||
              (list[i].listener && list[i].listener === listener)) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (list.length === 1) {
          list[0] = undefined;
          if (--this._eventsCount === 0) {
            this._events = new EventHandlers();
            return this;
          } else {
            delete events[type];
          }
        } else {
          spliceOne(list, position);
        }

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };
    
// Alias for removeListener added in NodeJS 10.0
// https://nodejs.org/api/events.html#events_emitter_off_eventname_listener
EventEmitter.prototype.off = function(type, listener){
    return this.removeListener(type, listener);
};

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = new EventHandlers();
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = new EventHandlers();
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        for (var i = 0, key; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = new EventHandlers();
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        do {
          this.removeListener(type, listeners[listeners.length - 1]);
        } while (listeners[0]);
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, i) {
  var copy = new Array(i);
  while (i--)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

var _polyfillNode_events = /*#__PURE__*/Object.freeze({
	__proto__: null,
	EventEmitter: EventEmitter,
	default: EventEmitter
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_events);

var _polyfillNode_child_process = {};

var _polyfillNode_child_process$1 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	default: _polyfillNode_child_process
});

var require$$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_child_process$1);

var require$$4 = /*@__PURE__*/getAugmentedNamespace(AeroSSR._polyfillNode_util);

(function (module, exports) {
	var EventEmitter = require$$0.EventEmitter;
	var spawn = require$$1.spawn;
	var path$1 = path;
	var dirname = path$1.dirname;
	var basename = path$1.basename;
	var fs = require$$3;

	/**
	 * Inherit `Command` from `EventEmitter.prototype`.
	 */

	require$$4.inherits(Command, EventEmitter);

	/**
	 * Expose the root command.
	 */

	exports = module.exports = new Command();

	/**
	 * Expose `Command`.
	 */

	exports.Command = Command;

	/**
	 * Expose `Option`.
	 */

	exports.Option = Option;

	/**
	 * Initialize a new `Option` with the given `flags` and `description`.
	 *
	 * @param {String} flags
	 * @param {String} description
	 * @api public
	 */

	function Option(flags, description) {
	  this.flags = flags;
	  this.required = flags.indexOf('<') >= 0;
	  this.optional = flags.indexOf('[') >= 0;
	  this.bool = flags.indexOf('-no-') === -1;
	  flags = flags.split(/[ ,|]+/);
	  if (flags.length > 1 && !/^[[<]/.test(flags[1])) this.short = flags.shift();
	  this.long = flags.shift();
	  this.description = description || '';
	}

	/**
	 * Return option name.
	 *
	 * @return {String}
	 * @api private
	 */

	Option.prototype.name = function() {
	  return this.long
	    .replace('--', '')
	    .replace('no-', '');
	};

	/**
	 * Return option name, in a camelcase format that can be used
	 * as a object attribute key.
	 *
	 * @return {String}
	 * @api private
	 */

	Option.prototype.attributeName = function() {
	  return camelcase(this.name());
	};

	/**
	 * Check if `arg` matches the short or long flag.
	 *
	 * @param {String} arg
	 * @return {Boolean}
	 * @api private
	 */

	Option.prototype.is = function(arg) {
	  return this.short === arg || this.long === arg;
	};

	/**
	 * Initialize a new `Command`.
	 *
	 * @param {String} name
	 * @api public
	 */

	function Command(name) {
	  this.commands = [];
	  this.options = [];
	  this._execs = {};
	  this._allowUnknownOption = false;
	  this._args = [];
	  this._name = name || '';
	}

	/**
	 * Add command `name`.
	 *
	 * The `.action()` callback is invoked when the
	 * command `name` is specified via __ARGV__,
	 * and the remaining arguments are applied to the
	 * function for access.
	 *
	 * When the `name` is "*" an un-matched command
	 * will be passed as the first arg, followed by
	 * the rest of __ARGV__ remaining.
	 *
	 * Examples:
	 *
	 *      program
	 *        .version('0.0.1')
	 *        .option('-C, --chdir <path>', 'change the working directory')
	 *        .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
	 *        .option('-T, --no-tests', 'ignore test hook')
	 *
	 *      program
	 *        .command('setup')
	 *        .description('run remote setup commands')
	 *        .action(function() {
	 *          console.log('setup');
	 *        });
	 *
	 *      program
	 *        .command('exec <cmd>')
	 *        .description('run the given remote command')
	 *        .action(function(cmd) {
	 *          console.log('exec "%s"', cmd);
	 *        });
	 *
	 *      program
	 *        .command('teardown <dir> [otherDirs...]')
	 *        .description('run teardown commands')
	 *        .action(function(dir, otherDirs) {
	 *          console.log('dir "%s"', dir);
	 *          if (otherDirs) {
	 *            otherDirs.forEach(function (oDir) {
	 *              console.log('dir "%s"', oDir);
	 *            });
	 *          }
	 *        });
	 *
	 *      program
	 *        .command('*')
	 *        .description('deploy the given env')
	 *        .action(function(env) {
	 *          console.log('deploying "%s"', env);
	 *        });
	 *
	 *      program.parse(process.argv);
	  *
	 * @param {String} name
	 * @param {String} [desc] for git-style sub-commands
	 * @return {Command} the new command
	 * @api public
	 */

	Command.prototype.command = function(name, desc, opts) {
	  if (typeof desc === 'object' && desc !== null) {
	    opts = desc;
	    desc = null;
	  }
	  opts = opts || {};
	  var args = name.split(/ +/);
	  var cmd = new Command(args.shift());

	  if (desc) {
	    cmd.description(desc);
	    this.executables = true;
	    this._execs[cmd._name] = true;
	    if (opts.isDefault) this.defaultExecutable = cmd._name;
	  }
	  cmd._noHelp = !!opts.noHelp;
	  this.commands.push(cmd);
	  cmd.parseExpectedArgs(args);
	  cmd.parent = this;

	  if (desc) return this;
	  return cmd;
	};

	/**
	 * Define argument syntax for the top-level command.
	 *
	 * @api public
	 */

	Command.prototype.arguments = function(desc) {
	  return this.parseExpectedArgs(desc.split(/ +/));
	};

	/**
	 * Add an implicit `help [cmd]` subcommand
	 * which invokes `--help` for the given command.
	 *
	 * @api private
	 */

	Command.prototype.addImplicitHelpCommand = function() {
	  this.command('help [cmd]', 'display help for [cmd]');
	};

	/**
	 * Parse expected `args`.
	 *
	 * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
	 *
	 * @param {Array} args
	 * @return {Command} for chaining
	 * @api public
	 */

	Command.prototype.parseExpectedArgs = function(args) {
	  if (!args.length) return;
	  var self = this;
	  args.forEach(function(arg) {
	    var argDetails = {
	      required: false,
	      name: '',
	      variadic: false
	    };

	    switch (arg[0]) {
	      case '<':
	        argDetails.required = true;
	        argDetails.name = arg.slice(1, -1);
	        break;
	      case '[':
	        argDetails.name = arg.slice(1, -1);
	        break;
	    }

	    if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
	      argDetails.variadic = true;
	      argDetails.name = argDetails.name.slice(0, -3);
	    }
	    if (argDetails.name) {
	      self._args.push(argDetails);
	    }
	  });
	  return this;
	};

	/**
	 * Register callback `fn` for the command.
	 *
	 * Examples:
	 *
	 *      program
	 *        .command('help')
	 *        .description('display verbose help')
	 *        .action(function() {
	 *           // output help here
	 *        });
	 *
	 * @param {Function} fn
	 * @return {Command} for chaining
	 * @api public
	 */

	Command.prototype.action = function(fn) {
	  var self = this;
	  var listener = function(args, unknown) {
	    // Parse any so-far unknown options
	    args = args || [];
	    unknown = unknown || [];

	    var parsed = self.parseOptions(unknown);

	    // Output help if necessary
	    outputHelpIfNecessary(self, parsed.unknown);

	    // If there are still any unknown options, then we simply
	    // die, unless someone asked for help, in which case we give it
	    // to them, and then we die.
	    if (parsed.unknown.length > 0) {
	      self.unknownOption(parsed.unknown[0]);
	    }

	    // Leftover arguments need to be pushed back. Fixes issue #56
	    if (parsed.args.length) args = parsed.args.concat(args);

	    self._args.forEach(function(arg, i) {
	      if (arg.required && args[i] == null) {
	        self.missingArgument(arg.name);
	      } else if (arg.variadic) {
	        if (i !== self._args.length - 1) {
	          self.variadicArgNotLast(arg.name);
	        }

	        args[i] = args.splice(i);
	      }
	    });

	    // Always append ourselves to the end of the arguments,
	    // to make sure we match the number of arguments the user
	    // expects
	    if (self._args.length) {
	      args[self._args.length] = self;
	    } else {
	      args.push(self);
	    }

	    fn.apply(self, args);
	  };
	  var parent = this.parent || this;
	  var name = parent === this ? '*' : this._name;
	  parent.on('command:' + name, listener);
	  if (this._alias) parent.on('command:' + this._alias, listener);
	  return this;
	};

	/**
	 * Define option with `flags`, `description` and optional
	 * coercion `fn`.
	 *
	 * The `flags` string should contain both the short and long flags,
	 * separated by comma, a pipe or space. The following are all valid
	 * all will output this way when `--help` is used.
	 *
	 *    "-p, --pepper"
	 *    "-p|--pepper"
	 *    "-p --pepper"
	 *
	 * Examples:
	 *
	 *     // simple boolean defaulting to false
	 *     program.option('-p, --pepper', 'add pepper');
	 *
	 *     --pepper
	 *     program.pepper
	 *     // => Boolean
	 *
	 *     // simple boolean defaulting to true
	 *     program.option('-C, --no-cheese', 'remove cheese');
	 *
	 *     program.cheese
	 *     // => true
	 *
	 *     --no-cheese
	 *     program.cheese
	 *     // => false
	 *
	 *     // required argument
	 *     program.option('-C, --chdir <path>', 'change the working directory');
	 *
	 *     --chdir /tmp
	 *     program.chdir
	 *     // => "/tmp"
	 *
	 *     // optional argument
	 *     program.option('-c, --cheese [type]', 'add cheese [marble]');
	 *
	 * @param {String} flags
	 * @param {String} description
	 * @param {Function|*} [fn] or default
	 * @param {*} [defaultValue]
	 * @return {Command} for chaining
	 * @api public
	 */

	Command.prototype.option = function(flags, description, fn, defaultValue) {
	  var self = this,
	    option = new Option(flags, description),
	    oname = option.name(),
	    name = option.attributeName();

	  // default as 3rd arg
	  if (typeof fn !== 'function') {
	    if (fn instanceof RegExp) {
	      var regex = fn;
	      fn = function(val, def) {
	        var m = regex.exec(val);
	        return m ? m[0] : def;
	      };
	    } else {
	      defaultValue = fn;
	      fn = null;
	    }
	  }

	  // preassign default value only for --no-*, [optional], or <required>
	  if (!option.bool || option.optional || option.required) {
	    // when --no-* we make sure default is true
	    if (!option.bool) defaultValue = true;
	    // preassign only if we have a default
	    if (defaultValue !== undefined) {
	      self[name] = defaultValue;
	      option.defaultValue = defaultValue;
	    }
	  }

	  // register the option
	  this.options.push(option);

	  // when it's passed assign the value
	  // and conditionally invoke the callback
	  this.on('option:' + oname, function(val) {
	    // coercion
	    if (val !== null && fn) {
	      val = fn(val, self[name] === undefined ? defaultValue : self[name]);
	    }

	    // unassigned or bool
	    if (typeof self[name] === 'boolean' || typeof self[name] === 'undefined') {
	      // if no value, bool true, and we have a default, then use it!
	      if (val == null) {
	        self[name] = option.bool
	          ? defaultValue || true
	          : false;
	      } else {
	        self[name] = val;
	      }
	    } else if (val !== null) {
	      // reassign
	      self[name] = val;
	    }
	  });

	  return this;
	};

	/**
	 * Allow unknown options on the command line.
	 *
	 * @param {Boolean} arg if `true` or omitted, no error will be thrown
	 * for unknown options.
	 * @api public
	 */
	Command.prototype.allowUnknownOption = function(arg) {
	  this._allowUnknownOption = arguments.length === 0 || arg;
	  return this;
	};

	/**
	 * Parse `argv`, settings options and invoking commands when defined.
	 *
	 * @param {Array} argv
	 * @return {Command} for chaining
	 * @api public
	 */

	Command.prototype.parse = function(argv) {
	  // implicit help
	  if (this.executables) this.addImplicitHelpCommand();

	  // store raw args
	  this.rawArgs = argv;

	  // guess name
	  this._name = this._name || basename(argv[1], '.js');

	  // github-style sub-commands with no sub-command
	  if (this.executables && argv.length < 3 && !this.defaultExecutable) {
	    // this user needs help
	    argv.push('--help');
	  }

	  // process argv
	  var parsed = this.parseOptions(this.normalize(argv.slice(2)));
	  var args = this.args = parsed.args;

	  var result = this.parseArgs(this.args, parsed.unknown);

	  // executable sub-commands
	  var name = result.args[0];

	  var aliasCommand = null;
	  // check alias of sub commands
	  if (name) {
	    aliasCommand = this.commands.filter(function(command) {
	      return command.alias() === name;
	    })[0];
	  }

	  if (this._execs[name] === true) {
	    return this.executeSubCommand(argv, args, parsed.unknown);
	  } else if (aliasCommand) {
	    // is alias of a subCommand
	    args[0] = aliasCommand._name;
	    return this.executeSubCommand(argv, args, parsed.unknown);
	  } else if (this.defaultExecutable) {
	    // use the default subcommand
	    args.unshift(this.defaultExecutable);
	    return this.executeSubCommand(argv, args, parsed.unknown);
	  }

	  return result;
	};

	/**
	 * Execute a sub-command executable.
	 *
	 * @param {Array} argv
	 * @param {Array} args
	 * @param {Array} unknown
	 * @api private
	 */

	Command.prototype.executeSubCommand = function(argv, args, unknown) {
	  args = args.concat(unknown);

	  if (!args.length) this.help();
	  if (args[0] === 'help' && args.length === 1) this.help();

	  // <cmd> --help
	  if (args[0] === 'help') {
	    args[0] = args[1];
	    args[1] = '--help';
	  }

	  // executable
	  var f = argv[1];
	  // name of the subcommand, link `pm-install`
	  var bin = basename(f, path$1.extname(f)) + '-' + args[0];

	  // In case of globally installed, get the base dir where executable
	  //  subcommand file should be located at
	  var baseDir;

	  var resolvedLink = fs.realpathSync(f);

	  baseDir = dirname(resolvedLink);

	  // prefer local `./<bin>` to bin in the $PATH
	  var localBin = path$1.join(baseDir, bin);

	  // whether bin file is a js script with explicit `.js` or `.ts` extension
	  var isExplicitJS = false;
	  if (exists(localBin + '.js')) {
	    bin = localBin + '.js';
	    isExplicitJS = true;
	  } else if (exists(localBin + '.ts')) {
	    bin = localBin + '.ts';
	    isExplicitJS = true;
	  } else if (exists(localBin)) {
	    bin = localBin;
	  }

	  args = args.slice(1);

	  var proc;
	  if (AeroSSR.browser$1.platform !== 'win32') {
	    if (isExplicitJS) {
	      args.unshift(bin);
	      // add executable arguments to spawn
	      args = (AeroSSR.browser$1.execArgv || []).concat(args);

	      proc = spawn(AeroSSR.browser$1.argv[0], args, { stdio: 'inherit', customFds: [0, 1, 2] });
	    } else {
	      proc = spawn(bin, args, { stdio: 'inherit', customFds: [0, 1, 2] });
	    }
	  } else {
	    args.unshift(bin);
	    proc = spawn(AeroSSR.browser$1.execPath, args, { stdio: 'inherit' });
	  }

	  var signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
	  signals.forEach(function(signal) {
	    AeroSSR.browser$1.on(signal, function() {
	      if (proc.killed === false && proc.exitCode === null) {
	        proc.kill(signal);
	      }
	    });
	  });
	  proc.on('close', AeroSSR.browser$1.exit.bind(AeroSSR.browser$1));
	  proc.on('error', function(err) {
	    if (err.code === 'ENOENT') {
	      console.error('error: %s(1) does not exist, try --help', bin);
	    } else if (err.code === 'EACCES') {
	      console.error('error: %s(1) not executable. try chmod or run with root', bin);
	    }
	    AeroSSR.browser$1.exit(1);
	  });

	  // Store the reference to the child process
	  this.runningCommand = proc;
	};

	/**
	 * Normalize `args`, splitting joined short flags. For example
	 * the arg "-abc" is equivalent to "-a -b -c".
	 * This also normalizes equal sign and splits "--abc=def" into "--abc def".
	 *
	 * @param {Array} args
	 * @return {Array}
	 * @api private
	 */

	Command.prototype.normalize = function(args) {
	  var ret = [],
	    arg,
	    lastOpt,
	    index;

	  for (var i = 0, len = args.length; i < len; ++i) {
	    arg = args[i];
	    if (i > 0) {
	      lastOpt = this.optionFor(args[i - 1]);
	    }

	    if (arg === '--') {
	      // Honor option terminator
	      ret = ret.concat(args.slice(i));
	      break;
	    } else if (lastOpt && lastOpt.required) {
	      ret.push(arg);
	    } else if (arg.length > 1 && arg[0] === '-' && arg[1] !== '-') {
	      arg.slice(1).split('').forEach(function(c) {
	        ret.push('-' + c);
	      });
	    } else if (/^--/.test(arg) && ~(index = arg.indexOf('='))) {
	      ret.push(arg.slice(0, index), arg.slice(index + 1));
	    } else {
	      ret.push(arg);
	    }
	  }

	  return ret;
	};

	/**
	 * Parse command `args`.
	 *
	 * When listener(s) are available those
	 * callbacks are invoked, otherwise the "*"
	 * event is emitted and those actions are invoked.
	 *
	 * @param {Array} args
	 * @return {Command} for chaining
	 * @api private
	 */

	Command.prototype.parseArgs = function(args, unknown) {
	  var name;

	  if (args.length) {
	    name = args[0];
	    if (this.listeners('command:' + name).length) {
	      this.emit('command:' + args.shift(), args, unknown);
	    } else {
	      this.emit('command:*', args);
	    }
	  } else {
	    outputHelpIfNecessary(this, unknown);

	    // If there were no args and we have unknown options,
	    // then they are extraneous and we need to error.
	    if (unknown.length > 0) {
	      this.unknownOption(unknown[0]);
	    }
	    if (this.commands.length === 0 &&
	        this._args.filter(function(a) { return a.required; }).length === 0) {
	      this.emit('command:*');
	    }
	  }

	  return this;
	};

	/**
	 * Return an option matching `arg` if any.
	 *
	 * @param {String} arg
	 * @return {Option}
	 * @api private
	 */

	Command.prototype.optionFor = function(arg) {
	  for (var i = 0, len = this.options.length; i < len; ++i) {
	    if (this.options[i].is(arg)) {
	      return this.options[i];
	    }
	  }
	};

	/**
	 * Parse options from `argv` returning `argv`
	 * void of these options.
	 *
	 * @param {Array} argv
	 * @return {Array}
	 * @api public
	 */

	Command.prototype.parseOptions = function(argv) {
	  var args = [],
	    len = argv.length,
	    literal,
	    option,
	    arg;

	  var unknownOptions = [];

	  // parse options
	  for (var i = 0; i < len; ++i) {
	    arg = argv[i];

	    // literal args after --
	    if (literal) {
	      args.push(arg);
	      continue;
	    }

	    if (arg === '--') {
	      literal = true;
	      continue;
	    }

	    // find matching Option
	    option = this.optionFor(arg);

	    // option is defined
	    if (option) {
	      // requires arg
	      if (option.required) {
	        arg = argv[++i];
	        if (arg == null) return this.optionMissingArgument(option);
	        this.emit('option:' + option.name(), arg);
	      // optional arg
	      } else if (option.optional) {
	        arg = argv[i + 1];
	        if (arg == null || (arg[0] === '-' && arg !== '-')) {
	          arg = null;
	        } else {
	          ++i;
	        }
	        this.emit('option:' + option.name(), arg);
	      // bool
	      } else {
	        this.emit('option:' + option.name());
	      }
	      continue;
	    }

	    // looks like an option
	    if (arg.length > 1 && arg[0] === '-') {
	      unknownOptions.push(arg);

	      // If the next argument looks like it might be
	      // an argument for this option, we pass it on.
	      // If it isn't, then it'll simply be ignored
	      if ((i + 1) < argv.length && argv[i + 1][0] !== '-') {
	        unknownOptions.push(argv[++i]);
	      }
	      continue;
	    }

	    // arg
	    args.push(arg);
	  }

	  return { args: args, unknown: unknownOptions };
	};

	/**
	 * Return an object containing options as key-value pairs
	 *
	 * @return {Object}
	 * @api public
	 */
	Command.prototype.opts = function() {
	  var result = {},
	    len = this.options.length;

	  for (var i = 0; i < len; i++) {
	    var key = this.options[i].attributeName();
	    result[key] = key === this._versionOptionName ? this._version : this[key];
	  }
	  return result;
	};

	/**
	 * Argument `name` is missing.
	 *
	 * @param {String} name
	 * @api private
	 */

	Command.prototype.missingArgument = function(name) {
	  console.error("error: missing required argument `%s'", name);
	  AeroSSR.browser$1.exit(1);
	};

	/**
	 * `Option` is missing an argument, but received `flag` or nothing.
	 *
	 * @param {String} option
	 * @param {String} flag
	 * @api private
	 */

	Command.prototype.optionMissingArgument = function(option, flag) {
	  if (flag) {
	    console.error("error: option `%s' argument missing, got `%s'", option.flags, flag);
	  } else {
	    console.error("error: option `%s' argument missing", option.flags);
	  }
	  AeroSSR.browser$1.exit(1);
	};

	/**
	 * Unknown option `flag`.
	 *
	 * @param {String} flag
	 * @api private
	 */

	Command.prototype.unknownOption = function(flag) {
	  if (this._allowUnknownOption) return;
	  console.error("error: unknown option `%s'", flag);
	  AeroSSR.browser$1.exit(1);
	};

	/**
	 * Variadic argument with `name` is not the last argument as required.
	 *
	 * @param {String} name
	 * @api private
	 */

	Command.prototype.variadicArgNotLast = function(name) {
	  console.error("error: variadic arguments must be last `%s'", name);
	  AeroSSR.browser$1.exit(1);
	};

	/**
	 * Set the program version to `str`.
	 *
	 * This method auto-registers the "-V, --version" flag
	 * which will print the version number when passed.
	 *
	 * @param {String} str
	 * @param {String} [flags]
	 * @return {Command} for chaining
	 * @api public
	 */

	Command.prototype.version = function(str, flags) {
	  if (arguments.length === 0) return this._version;
	  this._version = str;
	  flags = flags || '-V, --version';
	  var versionOption = new Option(flags, 'output the version number');
	  this._versionOptionName = versionOption.long.substr(2) || 'version';
	  this.options.push(versionOption);
	  this.on('option:' + this._versionOptionName, function() {
	    AeroSSR.browser$1.stdout.write(str + '\n');
	    AeroSSR.browser$1.exit(0);
	  });
	  return this;
	};

	/**
	 * Set the description to `str`.
	 *
	 * @param {String} str
	 * @param {Object} argsDescription
	 * @return {String|Command}
	 * @api public
	 */

	Command.prototype.description = function(str, argsDescription) {
	  if (arguments.length === 0) return this._description;
	  this._description = str;
	  this._argsDescription = argsDescription;
	  return this;
	};

	/**
	 * Set an alias for the command
	 *
	 * @param {String} alias
	 * @return {String|Command}
	 * @api public
	 */

	Command.prototype.alias = function(alias) {
	  var command = this;
	  if (this.commands.length !== 0) {
	    command = this.commands[this.commands.length - 1];
	  }

	  if (arguments.length === 0) return command._alias;

	  if (alias === command._name) throw new Error('Command alias can\'t be the same as its name');

	  command._alias = alias;
	  return this;
	};

	/**
	 * Set / get the command usage `str`.
	 *
	 * @param {String} str
	 * @return {String|Command}
	 * @api public
	 */

	Command.prototype.usage = function(str) {
	  var args = this._args.map(function(arg) {
	    return humanReadableArgName(arg);
	  });

	  var usage = '[options]' +
	    (this.commands.length ? ' [command]' : '') +
	    (this._args.length ? ' ' + args.join(' ') : '');

	  if (arguments.length === 0) return this._usage || usage;
	  this._usage = str;

	  return this;
	};

	/**
	 * Get or set the name of the command
	 *
	 * @param {String} str
	 * @return {String|Command}
	 * @api public
	 */

	Command.prototype.name = function(str) {
	  if (arguments.length === 0) return this._name;
	  this._name = str;
	  return this;
	};

	/**
	 * Return prepared commands.
	 *
	 * @return {Array}
	 * @api private
	 */

	Command.prototype.prepareCommands = function() {
	  return this.commands.filter(function(cmd) {
	    return !cmd._noHelp;
	  }).map(function(cmd) {
	    var args = cmd._args.map(function(arg) {
	      return humanReadableArgName(arg);
	    }).join(' ');

	    return [
	      cmd._name +
	        (cmd._alias ? '|' + cmd._alias : '') +
	        (cmd.options.length ? ' [options]' : '') +
	        (args ? ' ' + args : ''),
	      cmd._description
	    ];
	  });
	};

	/**
	 * Return the largest command length.
	 *
	 * @return {Number}
	 * @api private
	 */

	Command.prototype.largestCommandLength = function() {
	  var commands = this.prepareCommands();
	  return commands.reduce(function(max, command) {
	    return Math.max(max, command[0].length);
	  }, 0);
	};

	/**
	 * Return the largest option length.
	 *
	 * @return {Number}
	 * @api private
	 */

	Command.prototype.largestOptionLength = function() {
	  var options = [].slice.call(this.options);
	  options.push({
	    flags: '-h, --help'
	  });
	  return options.reduce(function(max, option) {
	    return Math.max(max, option.flags.length);
	  }, 0);
	};

	/**
	 * Return the largest arg length.
	 *
	 * @return {Number}
	 * @api private
	 */

	Command.prototype.largestArgLength = function() {
	  return this._args.reduce(function(max, arg) {
	    return Math.max(max, arg.name.length);
	  }, 0);
	};

	/**
	 * Return the pad width.
	 *
	 * @return {Number}
	 * @api private
	 */

	Command.prototype.padWidth = function() {
	  var width = this.largestOptionLength();
	  if (this._argsDescription && this._args.length) {
	    if (this.largestArgLength() > width) {
	      width = this.largestArgLength();
	    }
	  }

	  if (this.commands && this.commands.length) {
	    if (this.largestCommandLength() > width) {
	      width = this.largestCommandLength();
	    }
	  }

	  return width;
	};

	/**
	 * Return help for options.
	 *
	 * @return {String}
	 * @api private
	 */

	Command.prototype.optionHelp = function() {
	  var width = this.padWidth();

	  // Append the help information
	  return this.options.map(function(option) {
	    return pad(option.flags, width) + '  ' + option.description +
	      ((option.bool && option.defaultValue !== undefined) ? ' (default: ' + JSON.stringify(option.defaultValue) + ')' : '');
	  }).concat([pad('-h, --help', width) + '  ' + 'output usage information'])
	    .join('\n');
	};

	/**
	 * Return command help documentation.
	 *
	 * @return {String}
	 * @api private
	 */

	Command.prototype.commandHelp = function() {
	  if (!this.commands.length) return '';

	  var commands = this.prepareCommands();
	  var width = this.padWidth();

	  return [
	    'Commands:',
	    commands.map(function(cmd) {
	      var desc = cmd[1] ? '  ' + cmd[1] : '';
	      return (desc ? pad(cmd[0], width) : cmd[0]) + desc;
	    }).join('\n').replace(/^/gm, '  '),
	    ''
	  ].join('\n');
	};

	/**
	 * Return program help documentation.
	 *
	 * @return {String}
	 * @api private
	 */

	Command.prototype.helpInformation = function() {
	  var desc = [];
	  if (this._description) {
	    desc = [
	      this._description,
	      ''
	    ];

	    var argsDescription = this._argsDescription;
	    if (argsDescription && this._args.length) {
	      var width = this.padWidth();
	      desc.push('Arguments:');
	      desc.push('');
	      this._args.forEach(function(arg) {
	        desc.push('  ' + pad(arg.name, width) + '  ' + argsDescription[arg.name]);
	      });
	      desc.push('');
	    }
	  }

	  var cmdName = this._name;
	  if (this._alias) {
	    cmdName = cmdName + '|' + this._alias;
	  }
	  var usage = [
	    'Usage: ' + cmdName + ' ' + this.usage(),
	    ''
	  ];

	  var cmds = [];
	  var commandHelp = this.commandHelp();
	  if (commandHelp) cmds = [commandHelp];

	  var options = [
	    'Options:',
	    '' + this.optionHelp().replace(/^/gm, '  '),
	    ''
	  ];

	  return usage
	    .concat(desc)
	    .concat(options)
	    .concat(cmds)
	    .join('\n');
	};

	/**
	 * Output help information for this command
	 *
	 * @api public
	 */

	Command.prototype.outputHelp = function(cb) {
	  if (!cb) {
	    cb = function(passthru) {
	      return passthru;
	    };
	  }
	  AeroSSR.browser$1.stdout.write(cb(this.helpInformation()));
	  this.emit('--help');
	};

	/**
	 * Output help information and exit.
	 *
	 * @api public
	 */

	Command.prototype.help = function(cb) {
	  this.outputHelp(cb);
	  AeroSSR.browser$1.exit();
	};

	/**
	 * Camel-case the given `flag`
	 *
	 * @param {String} flag
	 * @return {String}
	 * @api private
	 */

	function camelcase(flag) {
	  return flag.split('-').reduce(function(str, word) {
	    return str + word[0].toUpperCase() + word.slice(1);
	  });
	}

	/**
	 * Pad `str` to `width`.
	 *
	 * @param {String} str
	 * @param {Number} width
	 * @return {String}
	 * @api private
	 */

	function pad(str, width) {
	  var len = Math.max(0, width - str.length);
	  return str + Array(len + 1).join(' ');
	}

	/**
	 * Output help information if necessary
	 *
	 * @param {Command} command to output help for
	 * @param {Array} array of options to search for -h or --help
	 * @api private
	 */

	function outputHelpIfNecessary(cmd, options) {
	  options = options || [];
	  for (var i = 0; i < options.length; i++) {
	    if (options[i] === '--help' || options[i] === '-h') {
	      cmd.outputHelp();
	      AeroSSR.browser$1.exit(0);
	    }
	  }
	}

	/**
	 * Takes an argument an returns its human readable equivalent for help usage.
	 *
	 * @param {Object} arg
	 * @return {String}
	 * @api private
	 */

	function humanReadableArgName(arg) {
	  var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

	  return arg.required
	    ? '<' + nameOutput + '>'
	    : '[' + nameOutput + ']';
	}

	// for versions before node v0.8 when there weren't `fs.existsSync`
	function exists(file) {
	  try {
	    if (fs.statSync(file).isFile()) {
	      return true;
	    }
	  } catch (e) {
	    return false;
	  }
	} 
} (commander, commander.exports));

var commanderExports = commander.exports;

async function initializeSSR(directory) {
    const projectRoot = path.resolve(directory);
    const publicDir = path.join(projectRoot, 'public');
    const logDir = path.join(projectRoot, 'logs');
    const logFilePath = path.join(logDir, 'server.log');
    // Ensure directories exist
    await require$$3.promises.mkdir(publicDir, { recursive: true });
    await require$$3.promises.mkdir(logDir, { recursive: true });
    // Create a default index.html file
    const indexHtmlPath = path.join(publicDir, 'index.html');
    const defaultHtmlContent = `
<!DOCTYPE html>
<html>
<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AeroSSR App</title>
</head>
<body>
        <h1>Welcome to AeroSSR</h1>
        <div id="app"></div>
</body>
</html>
    `;
    await require$$3.promises.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    // Create an empty log file
    await require$$3.promises.writeFile(logFilePath, '', 'utf-8');
    console.log(`Initialized a new AeroSSR project in ${projectRoot}`);
}
function configureMiddleware(app, path) {
    // Add static file middleware
    app.use(new StaticFileMiddleware.StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'ignore',
        compression: true,
        etag: true,
    }).middleware());
    // Add logging middleware
    app.use(async (req, res, next) => {
        const start = Date.now();
        await next();
        console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
    });
    // Add error handling middleware
    app.use(async (req, res, next) => {
        try {
            await next();
        }
        catch (error) {
            console.error(error);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    });
}

const program = new commanderExports.Command();
// Define CLI version and description
program
    .version('1.0.0')
    .description('AeroSSR CLI for managing server-side rendering configurations');
// Command to initialize a new SSR project
program
    .command('init')
    .description('Initialize a new AeroSSR project')
    .option('-d, --directory <path>', 'Specify the directory for the project', '.')
    .action((options) => {
    const directory = options.directory;
    initializeSSR(directory);
    console.log(`Initialized a new AeroSSR project in ${directory}`);
});
// Command to configure middlewares
program
    .command('middleware')
    .description('Configure middlewares for AeroSSR')
    .option('-n, --name <name>', 'Specify middleware name')
    .option('-p, --path <path>', 'Specify middleware path')
    .action((options) => {
    const { name, path } = options;
    if (!name || !path) {
        console.error('Both middleware name and path are required.');
        return;
    }
    configureMiddleware(name);
    console.log(`Middleware ${name} configured at ${path}`);
});
// Command to view configuration
program
    .command('config')
    .description('View or update AeroSSR configuration')
    .option('-u, --update <key=value>', 'Update a configuration key-value pair')
    .action((options) => {
    if (options.update) {
        const [key, value] = options.update.split('=');
        if (!key || !value) {
            console.error('Invalid key-value pair for configuration update.');
            return;
        }
        // Placeholder for updating the configuration
        console.log(`Configuration updated: ${key} = ${value}`);
    }
    else {
        // Placeholder for displaying the configuration
        console.log('Displaying current configuration...');
    }
});
// Parse the CLI arguments
program.parse(process.argv);
//# sourceMappingURL=index2.js.map
