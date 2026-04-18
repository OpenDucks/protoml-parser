(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ProtoParser = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
const { stripInlineComment } = require("./commentUtils");

function parseBlocks(tokens, options = {}) {
  const result = {};
  let currentBlock = null;

  for (const token of tokens) {
    if (token.type === "meta") {
      result.meta = result.meta || {};
      result.meta[token.key] = token.value;
      continue;
    }

    if (token.type === "macro") {
      result.macros = result.macros || {};
      result.macros[token.name.trim()] = token.file.trim();
      continue;
    }

    if (token.type === "inlineMacro") {
      result.inline_macros = result.inline_macros || {};
      result.inline_macro_errors = result.inline_macro_errors || [];

      if (token.definition?.name) {
        result.inline_macros[token.definition.name.trim()] = {
          template: token.definition.template,
          docs: token.definition.docs || "",
          source: "inline",
          line: token.line,
        };
      } else if (token.error) {
        result.inline_macro_errors.push({
          line: token.line,
          message: token.error,
        });
      }
      continue;
    }

    if (token.type === "directive") {
      result.meta = result.meta || {};
      result.meta[token.name] = token.value;
      continue;
    }

    if (token.type === "tagsImport") {
      result.tags_import = result.tags_import || [];
      result.tags_import.push(token.file.trim());
      continue;
    }

    if (token.type === "participantsImport") {
      result.participants_import = result.participants_import || [];
      result.participants_import.push(token.file.trim());
      continue;
    }

    if (token.type === "macrosImport") {
      result.macros_import = result.macros_import || [];
      result.macros_import.push(token.file.trim());
      continue;
    }

    if (token.type === "import") {
      result.imports = result.imports || {};
      result.imports[token.name.trim()] = {
        file: token.file.trim(),
        format: token.format,
      };
      continue;
    }

    if (token.type === "command") {

      currentBlock = token.value.toLowerCase();
      if (!result[currentBlock]) {
        result[currentBlock] =
          currentBlock === "meeting"
            ? []
            : currentBlock === "participants" || currentBlock === "tags" || currentBlock === "signatures" || currentBlock === "approvals"
            ? {}
            : [];
      }
    }

    if (!currentBlock) continue;

    switch (token.type) {
      case "declaration":
        if (currentBlock === "participants") {
          const [name, alias, email] = token.value.split(",");
          result[currentBlock][token.key] = {
            name: name?.trim(),
            alias: alias?.trim(),
            email: email?.trim(),
          };
        } else if (currentBlock === "signatures") {
          const [name, role, date, note] = token.value.split(",");
          result[currentBlock][token.key] = {
            name: name?.trim(),
            role: role?.trim(),
            date: date?.trim(),
            note: note?.trim(),
          };
        } else if (currentBlock === "approvals") {
          const [label, status, by, date, notes] = token.value.split(",");
          result[currentBlock][token.key] = {
            label: label?.trim(),
            status: status?.trim(),
            by: by?.trim(),
            date: date?.trim(),
            notes: notes?.trim(),
          };
        } else if (currentBlock === "tags") {
          result[currentBlock][token.key] = token.value;
        } else {
          // General key:value map
          result[currentBlock][token.key] = token.value;
        }
        break;

      case "entry":
        if (currentBlock === "tasks") {
          const done = token.value.startsWith("[x]");

          const ptp = token.raw.match(/@ptp=([^\s]+)/)?.[1] || null;
          const subject = [...token.raw.matchAll(/(?:\s|^)=([^\s]+)/g)].pop()?.[1] || null;
          const tag = token.raw.match(/@tag=([^\s]+)/)?.[1] || null;

          const cleanedText = stripInlineComment(
            token.value
            .replace(/^\[(x| )\]/, "")
            .replace(/@ptp=[^\s]+/g, "")
            .replace(/@tag=[^\s]+/g, "")
            .replace(/=[^\s]+/g, "")
            .trim()
          ).trim();

          result[currentBlock].push({
            raw: token.raw, // raw line (für referenceLinker)
            text: cleanedText, // cleaned text for display
            done,
            meta: {
              ptp,
              subject,
              tag,
            },
          });
        } else {
          result[currentBlock].push(token.value);
        }
        break;

      case "heading":
      case "inlineCommand":
      case "text":
        if (currentBlock === "meeting") {
          result[currentBlock].push(token.raw);
        }
        break;
    }
  }

  return result;
}

module.exports = {parseBlocks};

},{"./commentUtils":5}],5:[function(require,module,exports){
function stripInlineComment(text) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }

  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "/" && text[i + 1] === "/") {
      const isCommentStart = i === 0 || /\s/.test(text[i - 1]);
      if (isCommentStart) {
        return text.slice(0, i).trimEnd();
      }
    }
  }

  return text;
}

module.exports = { stripInlineComment };

},{}],6:[function(require,module,exports){
function slugifyHeading(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function collectMeetingHeadings(lines, maxLevel = 6) {
  const headings = [];
  const seenIds = new Map();

  for (const line of lines || []) {
    const match = String(line).match(/^(#{1,6})\s+(.*)$/);
    if (!match) continue;

    const level = match[1].length;
    if (level > maxLevel) continue;

    const text = match[2].trim();
    const baseId = slugifyHeading(text);
    const count = seenIds.get(baseId) || 0;
    seenIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    headings.push({ level, text, id });
  }

  return headings;
}

module.exports = {
  slugifyHeading,
  collectMeetingHeadings,
};

},{}],7:[function(require,module,exports){
const { stripInlineComment } = require("./commentUtils")
const { collectMeetingHeadings } = require("./headingUtils")

function parseInline(ast, options = {}) {
  const parseText = (text) => {
    if (!text || typeof text !== "string") return text

    // Links: -a=url text -a-
    text = text.replace(/-a=([^\s]+)\s(.*?)-a-/g, (_, url, label) =>
      `<a href="${url}" target="_blank">${label}</a>`)

    // Bold: -b Text -b-
    text = text.replace(/-b\s(.*?)-b-/g, (_, content) =>
      `<b>${content}</b>`)

    // Italic: -i Text -i-
    text = text.replace(/-i\s(.*?)-i-/g, (_, content) =>
      `<i>${content}</i>`)

    return text
  }

  // Meeting
  if (Array.isArray(ast.meeting)) {
    const headings = collectMeetingHeadings(ast.meeting)
    let headingIndex = 0

    ast.meeting = ast.meeting.map(line => {
      line = stripInlineComment(line).trim()

      if (line.match(/^#{1,6}\s+/)) {
        const heading = headings[headingIndex++]
        return `<h${heading.level} id="${heading.id}">${parseText(heading.text)}</h${heading.level}>`
      }

      return parseText(line)
    })
  }


  // Notes
  if (Array.isArray(ast.notes)) {
    ast.notes = ast.notes.map(parseText)
  }

  // Tasks
  if (Array.isArray(ast.tasks)) {
    ast.tasks = ast.tasks.map(task => ({
      ...task,
      text: parseText(task.text)
    }))
  }

  // Subjects
  if (ast.subjects) {
    for (const key in ast.subjects) {
      ast.subjects[key] = parseText(ast.subjects[key])
    }
  }

  return ast
}

module.exports = { parseInline }

},{"./commentUtils":5,"./headingUtils":6}],8:[function(require,module,exports){
function extractSection(raw, sectionName, knownSections = ["name", "docs", "template"]) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const header = new RegExp(`^=${escaped}:`, "m").exec(raw);
  if (!header || header.index == null) return "";

  const contentStart = header.index + header[0].length;
  const nextPattern = knownSections
    .filter((name) => name !== sectionName)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  if (!nextPattern) {
    return raw.slice(contentStart).trim();
  }

  const rest = raw.slice(contentStart);
  const nextSectionMatch = new RegExp(`^=(?:${nextPattern}):`, "m").exec(rest);
  const contentEnd = nextSectionMatch ? contentStart + nextSectionMatch.index : raw.length;
  return raw.slice(contentStart, contentEnd).trim();
}

function parseMacroDefinition(raw) {
  const source = String(raw || "").replace(/\r/g, "");
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("@new_macro")) {
    return null;
  }

  const knownSections = ["name", "docs", "template"];
  const name = extractSection(source, "name", knownSections).trim();
  const docs = extractSection(source, "docs", knownSections);
  const template = extractSection(source, "template", knownSections);

  if (!name || !template) {
    return null;
  }

  return {
    name,
    docs,
    template,
    raw: source,
  };
}

function extractInlineMacroBlocks(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const macros = [];
  const keptLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed !== "@new_macro") {
      keptLines.push(lines[index]);
      continue;
    }

    const startLine = index + 1;
    const blockLines = [lines[index]];
    let cursor = index + 1;
    let endedWithExplicitMarker = false;

    while (cursor < lines.length) {
      const currentTrimmed = lines[cursor].trim();
      if (currentTrimmed === "@end_macro") {
        endedWithExplicitMarker = true;
        break;
      }
      if (currentTrimmed === "@new_macro") {
        break;
      }

      blockLines.push(lines[cursor]);
      cursor += 1;
    }

    const parsed = parseMacroDefinition(blockLines.join("\n"));
    macros.push({
      line: startLine,
      raw: blockLines.join("\n"),
      definition: parsed,
      error: parsed ? null : "Inline macro requires both =name: and =template: sections.",
    });

    if (endedWithExplicitMarker) {
      index = cursor;
    } else {
      index = cursor - 1;
    }
  }

  return {
    cleanedText: keptLines.join("\n"),
    macros,
  };
}

module.exports = {
  parseMacroDefinition,
  extractInlineMacroBlocks,
};

},{}],9:[function(require,module,exports){
const { collectMeetingHeadings } = require("./headingUtils");

function resolveReferences(ast, options = {}) {
  const get = (group, id) => {
    if (!ast[group] || !ast[group][id]) {
      if (options.strict)
        throw new Error(`Unresolved reference @${group}=${id}`);
      return { id, unresolved: true };
    }

    const value = ast[group][id];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { id, ...value };
    }

    return { id, label: value };
  };

  const groupAliases = {
    participant: "participants",
    participants: "participants",
    subject: "subjects",
    subjects: "subjects",
    tag: "tags",
    tags: "tags",
    meta: "meta",
    signature: "signatures",
    signatures: "signatures",
    approval: "approvals",
    approvals: "approvals",
  };

  const resolveMetaValue = (key) => {
    if (ast.meta?.[key] != null) {
      return ast.meta[key];
    }
    if (options.strict) {
      throw new Error(`@@ref=meta:${key} not found`);
    }
    return key;
  };

  const resolveStructuredReference = (expression) => {
    const parts = String(expression || "").split(":").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) {
      return expression;
    }

    const group = groupAliases[parts[0]] || parts[0];

    if (group === "meta") {
      return resolveMetaValue(parts[1]);
    }

    const id = parts[1];
    const field = parts[2];

    if (!id) {
      return expression;
    }

    const target = ast[group]?.[id];
    if (target == null) {
      if (options.strict) {
        throw new Error(`@@ref=${expression} not found`);
      }
      return expression;
    }

    if (field) {
      if (target && typeof target === "object" && target[field] != null) {
        return target[field];
      }
      if (field === "id") {
        return id;
      }
      if (!field && typeof target !== "object") {
        return target;
      }
      if (options.strict) {
        throw new Error(`@@ref=${expression} field not found`);
      }
      return expression;
    }

    if (typeof target === "object") {
      return target.label || target.name || target.title || target.status || target.role || id;
    }

    return target;
  };

  const replaceInlineReferences = (line) => {
    let resolved = String(line);

    resolved = resolved.replace(/@@ref=([A-Za-z0-9_:-]+)/g, (_, expression) => {
      return resolveStructuredReference(expression);
    });

    resolved = resolved.replace(/@@e=([A-Za-z0-9_-]+)/g, (_, id) => {
      if (ast.subjects?.[id]) {
        return ast.subjects[id];
      }
      if (ast.participants?.[id]) {
        return ast.participants[id].name;
      }
      if (ast.tags?.[id]) {
        return ast.tags[id];
      }
      if (options.strict) {
        throw new Error(`@@e=${id} not found`);
      }
      return id;
    });

    return resolved;
  };

  const renderSignature = (id) => {
    const signature = ast.signatures?.[id];
    if (!signature) {
      if (options.strict) {
        throw new Error(`@@signature=${id} not found`);
      }
      return `@@signature=${id}`;
    }

    const parts = [
      signature.name ? `<strong>${signature.name}</strong>` : "",
      signature.role ? `<span class="signature-role">${signature.role}</span>` : "",
      signature.date ? `<span class="signature-date">${signature.date}</span>` : "",
      signature.note ? `<span class="signature-note">${signature.note}</span>` : "",
    ].filter(Boolean).join("<br>");

    return `<div class="signature-block"><h3>Signature</h3>${parts}</div>`;
  };

  const renderApproval = (id) => {
    const approval = ast.approvals?.[id];
    if (!approval) {
      if (options.strict) {
        throw new Error(`@@approval=${id} not found`);
      }
      return `@@approval=${id}`;
    }

    const parts = [
      approval.label ? `<strong>${approval.label}</strong>` : "",
      approval.status ? `<span class="approval-status">${approval.status}</span>` : "",
      approval.by ? `<span class="approval-by">${approval.by}</span>` : "",
      approval.date ? `<span class="approval-date">${approval.date}</span>` : "",
      approval.notes ? `<span class="approval-notes">${approval.notes}</span>` : "",
    ].filter(Boolean).join("<br>");

    return `<div class="approval-block"><h3>Approval</h3>${parts}</div>`;
  };

  const renderToc = (block, maxLevel = 3) => {
    const headings = collectMeetingHeadings(block, maxLevel);
    if (!headings.length) {
      return `<nav class="toc"><strong>Table of Contents</strong><p class="toc-empty">(no headings)</p></nav>`;
    }

    const items = headings
      .map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${heading.text}</a></li>`)
      .join("");

    return `<nav class="toc"><strong>Table of Contents</strong><ul>${items}</ul></nav>`;
  };

  const resolveImportedContent = (name) => {
    const entry = ast._importCache?.[name];
    if (!entry) {
      if (options.strict) {
        throw new Error(`@@import=${name} not found`);
      }
      return null;
    }
    return entry.content;
  };

  const expandMacros = (block) => {
    return block.flatMap((line) => {
      const match = line.match(/@@macro=([\w-]+):(.*)/);
      if (!match || !ast._macroCache) return [line];

      const [_, macroName, rawParams] = match;
      const template = ast._macroCache[macroName];
      if (!template) return [line];

      const params = {};
      rawParams.split(";").forEach((p) => {
        const [k, v] = p.split("=");
        params[k.trim()] = v.trim();
      });

      const rendered = template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
        const val = params[key] || "";
        if (val.startsWith("@@e=") || val.startsWith("@@ref=")) {
          return replaceInlineReferences(val);
        }
        return val;
      });

      return [rendered];
    });
  };

  const expandImports = (block) => {
    return block.flatMap((line) => {
      const match = line.match(/^@@(?:import|output)=([^\s]+)$/);
      if (!match) return [line];

      const content = resolveImportedContent(match[1]);
      if (content == null) return [line];

      if (Array.isArray(content)) return content;
      return content.split(/\r?\n/);
    });
  };

  const expandMeetingCommands = (block) => {
    return block.map((line) => {
      const trimmed = String(line).trim();

      const tocMatch = trimmed.match(/^@@toc(?:=(\d+))?$/);
      if (tocMatch) {
        return renderToc(block, Number(tocMatch[1] || 3));
      }

      const signatureMatch = trimmed.match(/^@@signature=([A-Za-z0-9_-]+)$/);
      if (signatureMatch) {
        return renderSignature(signatureMatch[1]);
      }

      const approvalMatch = trimmed.match(/^@@approval=([A-Za-z0-9_-]+)$/);
      if (approvalMatch) {
        return renderApproval(approvalMatch[1]);
      }

      return replaceInlineReferences(line);
    });
  };

  const computeTagStats = () => {
    if (!ast.tags) return;

    const stats = {};
    for (const id in ast.tags) {
      stats[id] = {
        id,
        label: ast.tags[id],
        total: 0,
        open: 0,
        done: 0,
      };
    }

    if (Array.isArray(ast.tasks)) {
      for (const task of ast.tasks) {
        const tagId = task.meta?.tag;
        if (!tagId) continue;

        if (!stats[tagId]) {
          stats[tagId] = {
            id: tagId,
            label: ast.tags?.[tagId] || tagId,
            total: 0,
            open: 0,
            done: 0,
          };
        }

        stats[tagId].total += 1;
        if (task.done) stats[tagId].done += 1;
        else stats[tagId].open += 1;
      }
    }

    ast.tag_stats = stats;
  };

  if (Array.isArray(ast.tasks)) {
    ast.tasks = ast.tasks.map((task) => {
      const out = { ...task };

      const ptpMatch = task.raw.match(/@ptp=([^\s]+)/);
      const subjMatch = [...task.raw.matchAll(/(?:\s|^)=([^\s]+)/g)].pop();
      const tagMatch = task.raw.match(/@tag=([^\s]+)/);

      if (ptpMatch) out.assigned_to = get("participants", ptpMatch[1]);
      if (subjMatch) out.subject = get("subjects", subjMatch[1]);
      if (tagMatch) out.tag = get("tags", tagMatch[1]);

      return out;
    });
  }

  if (Array.isArray(ast.meeting)) {
    ast.meeting = expandImports(ast.meeting);
    ast.meeting = expandMeetingCommands(ast.meeting);
    ast.meeting = expandMacros(ast.meeting);
  }

  computeTagStats();

  return ast;
}



module.exports = {resolveReferences};

},{"./headingUtils":6}],10:[function(require,module,exports){
(function (__dirname){(function (){
const path = require("path")
const { stripInlineComment } = require("./commentUtils")
const { extractInlineMacroBlocks } = require("./macroDefinition")

function tokenize(text) {
  const extracted = extractInlineMacroBlocks(text);
  const lines = extracted.cleanedText.split(/\r?\n/);
  const tokens = [];

  for (const entry of extracted.macros) {
    tokens.push({
      type: "inlineMacro",
      raw: entry.raw,
      line: entry.line,
      definition: entry.definition,
      error: entry.error,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = stripInlineComment(lines[i]).trim();
    const line = i + 1;

    if (raw === "" || raw.startsWith("//")) {
      continue; // skip empty lines and comments
    }
    if (raw.match(/^@\w+:/)) {
      const [key, ...val] = raw.slice(1).split(":");
      tokens.push({type: "meta", raw, key, value: val.join(":").trim(), line});
      continue;
    }

    if (raw.startsWith("@meta=")) {
      const match = raw.match(/^@meta=([^:]+):(.+)$/);
      if (match) {
        tokens.push({
          type: "meta",
          raw,
          key: match[1].trim(),
          value: match[2].trim(),
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@macro ")) {
      const match = raw.match(/^@macro\s+([^\s]+)\s+"(.+?)"$/);
      if (!match) {
        continue;
      }
      const [, name, fileRaw] = match;
      const projectRoot = path.resolve(__dirname, "../../");
      const macroDir = path.join(projectRoot, "macros");
      const file = fileRaw.replace("{{macro_dir}}", macroDir);

      tokens.push({type: "macro", name, file, raw, line});
      continue;
    }

    if (raw.startsWith("@import ")) {
      const match = raw.match(/^@import\s+([^\s]+)\s+"(.+?)"(?:\s+([^\s]+))?$/);
      if (match) {
        const [, name, file, format] = match;
        tokens.push({
          type: "import",
          name,
          file,
          format: (format || "text").toLowerCase(),
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@tags_import ")) {
      const match = raw.match(/^@tags_import\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "tagsImport",
          file: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@participants_import ")) {
      const match = raw.match(/^@participants_import\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "participantsImport",
          file: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@macros_import ")) {
      const match = raw.match(/^@macros_import\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "macrosImport",
          file: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@protocol ")) {
      const match = raw.match(/^@protocol\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "protocol",
          value: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@title ")) {
      const match = raw.match(/^@title\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "title",
          value: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@meeting ")) {
      const match = raw.match(/^@meeting\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "meeting_title",
          value: match[1],
          raw,
          line,
        });
        tokens.push({type: "command", raw: "@meeting", value: "meeting", line});
        continue;
      }
    }

    // Command block e.g. @participants
    if (raw.startsWith("@@")) {
      tokens.push({type: "inlineCommand", raw, command: raw.slice(2), line});
    } else if (raw.startsWith("@")) {
      const value = raw.slice(1).split(":")[0].split("=")[0];
      tokens.push({type: "command", raw, value, line});
    }
    // Declaration with ID e.g. =pt1:Some value
    else if (raw.startsWith("=")) {
      const [left, ...right] = raw.slice(1).split(":");
      tokens.push({
        type: "declaration",
        raw,
        key: left.trim(),
        value: right.join(":").trim(),
        line,
      });
    }
    // List/entry item e.g. - Something
    else if (raw.startsWith("-")) {
      tokens.push({type: "entry", raw, value: raw.slice(1).trim(), line});
    }
    // Markdown header
    else if (raw.match(/^#{1,4}\s+/)) {
      const level = raw.match(/^#+/)[0].length;
      const value = raw.slice(level).trim();
      tokens.push({type: "heading", raw, value, level, line});
    }
    // Fallback
    else {
      tokens.push({type: "text", raw, value: raw, line});
    }
  }
  return tokens;
}

module.exports = {tokenize};

}).call(this)}).call(this,"/../src/core")
},{"./commentUtils":5,"./macroDefinition":8,"path":2}],11:[function(require,module,exports){
(function (__dirname){(function (){
const fs = require("fs");
const path = require("path");
const { getVisibleMetaEntries } = require("./renderUtils");

function loadTheme(themeName, skip = 0) {
  if (skip) {
    return "";
  }
  const themePath = path.join(
    __dirname,
    "./themes",
    `${themeName || "default"}.css`
  );
  try {
    return fs.readFileSync(themePath, "utf8");
  } catch (err) {
    console.warn(`Theme "${themeName}" not found. Using default.`);
    return fs.readFileSync(
      path.join(__dirname, "./themes/default.css"),
      "utf8"
    );
  }
}

function escape(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[c])
  );
}

function renderTemplate(template, context = {}) {
  return String(template).replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key).trim();
    return context[normalizedKey] ?? "";
  });
}

function toCssIdentifier(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderHTML(ast, options = {}) {
  const effectiveTheme = options.theme || ast.meta?.theme || "default";
  const css = loadTheme(effectiveTheme, options.skipTheme);
  const protocolTitle = renderTemplate(
    ast.meta?.protocol || "Protocol - {{date}}",
    {
      ...(ast.meta || {}),
      date: ast.meta?.date || "Untitled",
    }
  );
  const meetingTitle = renderTemplate(
    ast.meta?.meeting_title || "Rendered Meeting",
    ast.meta || {}
  );

  const html = [];

  html.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escape(protocolTitle)}</title>
  <style>${css}</style>
</head>
<body>`);

  html.push(`<h1>${escape(protocolTitle)}</h1>`);

  if (ast.participants) {
    html.push(`<section><h2>Participants</h2><ul>`);
    for (const id in ast.participants) {
      const p = ast.participants[id];
      html.push(`<li>${escape(p.name)} (${escape(p.alias || id)})</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.subjects) {
    html.push(`<section><h2>Subjects</h2><ul>`);
    for (const id in ast.subjects) {
      html.push(`<li><b>${id}:</b> ${ast.subjects[id]}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    html.push(`<section><h2>Tags</h2><div class="tag-summary">`);
    for (const id in ast.tag_stats) {
      const stat = ast.tag_stats[id];
      const tagClass = toCssIdentifier(id);
      html.push(
        `<article class="tag-card tag-${tagClass}">` +
        `<div class="tag-card-head"><span class="tag">${escape(stat.label)}</span><code>@tag=${escape(id)}</code></div>` +
        `<div class="tag-card-stats">` +
        `<span>Total: ${stat.total}</span>` +
        `<span>Open: ${stat.open}</span>` +
        `<span>Done: ${stat.done}</span>` +
        `</div>` +
        `</article>`
      );
    }
    html.push(`</div></section>`);
  }

  if (ast.tasks?.length) {
    html.push(`<section><h2>Tasks</h2><ul>`);
    for (const task of ast.tasks) {
      const cls = [
        task.done ? "done" : "",
        task.meta?.tag ? `task-tag-${toCssIdentifier(task.meta.tag)}` : "",
      ].filter(Boolean).join(" ");
      let extra = [];

      if (task.meta?.ptp && ast.participants?.[task.meta.ptp]) {
        const p = ast.participants[task.meta.ptp];
        extra.push(`Assigned to: ${escape(p.name)}`);
      }

      if (task.meta?.subject && ast.subjects?.[task.meta.subject]) {
        extra.push(
          `Subject: ${escape(ast.subjects[task.meta.subject])}`
        );
      }

      if (task.meta?.tag && ast.tags?.[task.meta.tag]) {
        extra.push(
          `Tag: <span class="tag">${escape(ast.tags[task.meta.tag])}</span>`
        );
      }

      const metaInfo = extra.length
        ? `<div class="meta">${extra.join(" • ")}</div>`
        : "";

      html.push(`<li class="${cls}">${task.text}${metaInfo}</li>`);
    }
    html.push(`</ul></section>`);
  }

  const metaEntries = getVisibleMetaEntries(ast, options);

  if (metaEntries.length) {
    html.push(`<section><h2>Meta</h2><ul>`);
    for (const [key, value] of metaEntries) {
      html.push(`<li><b>${escape(key)}:</b> ${escape(value)}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.notes?.length) {
    html.push(`<section><h2>Notes</h2><ul>`);
    for (const note of ast.notes) {
      html.push(`<li>${note}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.references?.length) {
    html.push(`<section><h2>References</h2><ul>`);
    for (const entry of ast.references) {
      const match = String(entry).match(/^(.+?)\|(.+)$/);
      if (match) {
        html.push(`<li><a href="${escape(match[2].trim())}" target="_blank">${escape(match[1].trim())}</a></li>`);
      } else {
        html.push(`<li>${escape(entry)}</li>`);
      }
    }
    html.push(`</ul></section>`);
  }

  if (ast.attachments?.length) {
    html.push(`<section><h2>Attachments</h2><ul>`);
    for (const entry of ast.attachments) {
      const match = String(entry).match(/^(.+?)\|(.+)$/);
      if (match) {
        html.push(`<li><a href="${escape(match[2].trim())}" target="_blank">${escape(match[1].trim())}</a></li>`);
      } else {
        html.push(`<li>${escape(entry)}</li>`);
      }
    }
    html.push(`</ul></section>`);
  }

  if (ast.meeting?.length) {
    html.push(`<section><h2>${escape(meetingTitle)}</h2>`);
    for (const line of ast.meeting) {
      const trimmed = String(line).trim();
      if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        html.push(line);
      } else {
        html.push(`<p>${line}</p>`);
      }
    }
    html.push(`</section>`);
  }

  html.push(`</body></html>`);
  return html.join("\n");
}

module.exports = renderHTML;
module.exports.loadTheme = loadTheme;

}).call(this)}).call(this,"/../src/renders")
},{"./renderUtils":14,"fs":1,"path":2}],12:[function(require,module,exports){
module.exports = function renderJSON(ast, options = {}) {
  return JSON.stringify(ast, null, 2)
}

},{}],13:[function(require,module,exports){
const {
  convertHtmlToMarkdown,
  getVisibleMetaEntries,
  isProbablyHtml,
  renderStructuredReference,
  renderTemplate,
  stripHtml,
} = require("./renderUtils");

function formatKeyValueList(items) {
  return items.map(([key, value]) => `- **${key}:** ${stripHtml(value)}`).join("\n");
}

function renderObjectSection(lines, title) {
  if (!lines.length) return [];
  return [`## ${title}`, ...lines, ""];
}

function renderMeetingLine(line) {
  const source = String(line || "");
  if (!source.trim()) return "";
  return isProbablyHtml(source) ? convertHtmlToMarkdown(source) : stripHtml(source);
}

function renderMarkdown(ast, options = {}) {
  const lines = [];
  const title = renderTemplate(
    ast.meta?.protocol || "Protocol - {{date}}",
    { ...(ast.meta || {}), date: ast.meta?.date || "Untitled" }
  );
  const meetingTitle = renderTemplate(
    ast.meta?.meeting_title || "Rendered Meeting",
    ast.meta || {}
  );

  lines.push(`# ${stripHtml(title)}`);
  lines.push("");

  const metaEntries = getVisibleMetaEntries(ast, options);

  if (metaEntries.length) {
    lines.push("## Meta");
    lines.push(formatKeyValueList(metaEntries));
    lines.push("");
  }

  if (ast.participants && Object.keys(ast.participants).length) {
    lines.push("## Participants");
    for (const [, participant] of Object.entries(ast.participants)) {
      const alias = participant.alias ? ` (${participant.alias})` : "";
      const email = participant.email ? ` - ${participant.email}` : "";
      lines.push(`- ${participant.name}${alias}${email}`);
    }
    lines.push("");
  }

  if (ast.subjects && Object.keys(ast.subjects).length) {
    lines.push("## Subjects");
    for (const [id, subject] of Object.entries(ast.subjects)) {
      lines.push(`- ${id}: ${stripHtml(subject)}`);
    }
    lines.push("");
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    lines.push("## Tags");
    for (const [id, stat] of Object.entries(ast.tag_stats)) {
      lines.push(`- ${id}: ${stripHtml(stat.label)} (total=${stat.total}, open=${stat.open}, done=${stat.done})`);
    }
    lines.push("");
  }

  if (ast.signatures && Object.keys(ast.signatures).length) {
    lines.push(...renderObjectSection(
      Object.entries(ast.signatures).map(([id, signature]) => {
        const parts = [signature.name, signature.role, signature.date].filter(Boolean);
        const notes = signature.note ? ` - ${stripHtml(signature.note)}` : "";
        return `- ${id}: ${parts.join(" | ")}${notes}`;
      }),
      "Signatures"
    ));
  }

  if (ast.approvals && Object.keys(ast.approvals).length) {
    lines.push(...renderObjectSection(
      Object.entries(ast.approvals).map(([id, approval]) => {
        const parts = [approval.label, approval.status, approval.by, approval.date].filter(Boolean);
        const notes = approval.notes ? ` - ${stripHtml(approval.notes)}` : "";
        return `- ${id}: ${parts.join(" | ")}${notes}`;
      }),
      "Approvals"
    ));
  }

  if (Array.isArray(ast.tasks) && ast.tasks.length) {
    lines.push("## Tasks");
    for (const task of ast.tasks) {
      const marker = task.done ? "[x]" : "[ ]";
      const meta = [];

      if (task.assigned_to?.name) meta.push(`assigned=${task.assigned_to.name}`);
      if (task.subject?.label) meta.push(`subject=${stripHtml(task.subject.label)}`);
      if (task.tag?.label) meta.push(`tag=${stripHtml(task.tag.label)}`);

      lines.push(`- ${marker} ${stripHtml(task.text)}`);
      if (meta.length) {
        lines.push(`  - ${meta.join(" | ")}`);
      }
    }
    lines.push("");
  }

  if (Array.isArray(ast.notes) && ast.notes.length) {
    lines.push("## Notes");
    for (const note of ast.notes) {
      lines.push(`- ${stripHtml(note)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.references) && ast.references.length) {
    lines.push("## References");
    for (const entry of ast.references) {
      lines.push(`- ${renderStructuredReference(entry, true)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.attachments) && ast.attachments.length) {
    lines.push("## Attachments");
    for (const entry of ast.attachments) {
      lines.push(`- ${renderStructuredReference(entry, true)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.meeting) && ast.meeting.length) {
    lines.push(`## ${stripHtml(meetingTitle)}`);
    lines.push("");
    for (const line of ast.meeting) {
      const text = renderMeetingLine(line);
      if (!text) {
        lines.push("");
        continue;
      }
      lines.push(text);
      if (!text.startsWith("#") && !text.startsWith("- ") && !text.startsWith("> ")) {
        lines.push("");
      }
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

module.exports = renderMarkdown;

},{"./renderUtils":14}],14:[function(require,module,exports){
function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&hellip;/gi, "...")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&euro;/gi, "EUR")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Uuml;/gi, "Ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Ouml;/gi, "Ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&szlig;/gi, "ß");
}

function renderTemplate(template, context = {}) {
  return String(template || "").replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key).trim();
    return context[normalizedKey] ?? "";
  });
}

function isTruthySetting(value) {
  const normalized = String(value == null ? "" : value).trim().toLowerCase();
  return ["1", "true", "yes", "on", "hide", "hidden"].includes(normalized);
}

function shouldHideMeta(ast, options = {}) {
  if (options.hideMeta) {
    return true;
  }

  const meta = ast?.meta || {};
  if (isTruthySetting(meta.hide_meta) || isTruthySetting(meta.hideMeta)) {
    return true;
  }

  const outputMeta = String(meta.output_meta == null ? "" : meta.output_meta).trim().toLowerCase();
  return ["hide", "hidden", "false", "none", "off"].includes(outputMeta);
}

function getVisibleMetaEntries(ast, options = {}) {
  if (shouldHideMeta(ast, options)) {
    return [];
  }

  return Object.entries(ast?.meta || {}).filter(([key]) =>
    !["protocol", "meeting_title", "title", "theme", "hide_meta", "hideMeta", "output_meta"].includes(key)
  );
}

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripHtml(text) {
  return normalizeWhitespace(
    decodeEntities(
      String(text || "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/section>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    )
  );
}

function convertHtmlToMarkdown(text) {
  let output = String(text || "");

  output = output
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
      const clean = stripHtml(content);
      return clean ? `\n\n${"#".repeat(Number(level))} ${clean}\n\n` : "\n";
    })
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = stripHtml(label);
      return cleanLabel ? `[${cleanLabel}](${href})` : href;
    })
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `**${stripHtml(content)}**`)
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `*${stripHtml(content)}*`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const clean = stripHtml(content);
      if (!clean) return "";
      return `\n\n> ${clean.split("\n").join("\n> ")}\n\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
      const clean = stripHtml(content);
      return clean ? `- ${clean}\n` : "";
    })
    .replace(/<\/?(ul|ol|nav|section|article|div|p|table|thead|tbody|tr)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return normalizeWhitespace(decodeEntities(output));
}

function convertHtmlToText(text) {
  let output = String(text || "");

  output = output
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<hr\s*\/?>/gi, "\n\n--------------------\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, _level, content) => {
      const clean = stripHtml(content);
      return clean ? `\n\n${clean}\n\n` : "\n";
    })
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = stripHtml(label);
      return cleanLabel ? `${cleanLabel} -> ${href}` : href;
    })
    .replace(/<(b|strong|i|em)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => stripHtml(content))
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const clean = stripHtml(content);
      if (!clean) return "";
      return `\n\n> ${clean.split("\n").join("\n> ")}\n\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
      const clean = stripHtml(content);
      return clean ? `- ${clean}\n` : "";
    })
    .replace(/<\/?(ul|ol|nav|section|article|div|p|table|thead|tbody|tr)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return normalizeWhitespace(decodeEntities(output));
}

function isProbablyHtml(text) {
  return /<([a-z][a-z0-9-]*)(\s|>|\/)/i.test(String(text || ""));
}

function renderStructuredReference(entry, markdown = false) {
  const match = String(entry || "").match(/^(.+?)\|(.+)$/);
  if (!match) {
    return stripHtml(entry);
  }

  const label = stripHtml(match[1].trim());
  const target = match[2].trim();
  return markdown ? `[${label}](${target})` : `${label} -> ${target}`;
}

module.exports = {
  convertHtmlToMarkdown,
  convertHtmlToText,
  decodeEntities,
  isProbablyHtml,
  normalizeWhitespace,
  renderStructuredReference,
  renderTemplate,
  getVisibleMetaEntries,
  shouldHideMeta,
  stripHtml,
};

},{}],15:[function(require,module,exports){
const {
  convertHtmlToText,
  getVisibleMetaEntries,
  isProbablyHtml,
  renderStructuredReference,
  renderTemplate,
  stripHtml,
} = require("./renderUtils");

function renderSection(title, lines) {
  if (!lines.length) return [];
  return [title, "-".repeat(title.length), ...lines, ""];
}

function renderMeetingLine(line) {
  const source = String(line || "");
  if (!source.trim()) return "";
  return isProbablyHtml(source) ? convertHtmlToText(source) : stripHtml(source);
}

function renderText(ast, options = {}) {
  const out = [];
  const title = stripHtml(
    renderTemplate(ast.meta?.protocol || "Protocol - {{date}}", {
      ...(ast.meta || {}),
      date: ast.meta?.date || "Untitled",
    })
  );
  const meetingTitle = stripHtml(
    renderTemplate(ast.meta?.meeting_title || "Rendered Meeting", ast.meta || {})
  );

  out.push(title);
  out.push("=".repeat(title.length));
  out.push("");

  const metaEntries = getVisibleMetaEntries(ast, options);
  out.push(...renderSection("Meta", metaEntries.map(([key, value]) => `${key}: ${stripHtml(value)}`)));

  if (ast.participants && Object.keys(ast.participants).length) {
    out.push(...renderSection(
      "Participants",
      Object.entries(ast.participants).map(([, participant]) => {
        const alias = participant.alias ? ` (${participant.alias})` : "";
        const email = participant.email ? ` - ${participant.email}` : "";
        return `${participant.name}${alias}${email}`;
      })
    ));
  }

  if (ast.subjects && Object.keys(ast.subjects).length) {
    out.push(...renderSection(
      "Subjects",
      Object.entries(ast.subjects).map(([id, subject]) => `${id}: ${stripHtml(subject)}`)
    ));
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    out.push(...renderSection(
      "Tags",
      Object.entries(ast.tag_stats).map(([id, stat]) =>
        `${id}: ${stripHtml(stat.label)} (total=${stat.total}, open=${stat.open}, done=${stat.done})`
      )
    ));
  }

  if (ast.signatures && Object.keys(ast.signatures).length) {
    out.push(...renderSection(
      "Signatures",
      Object.entries(ast.signatures).map(([id, signature]) => {
        const parts = [signature.name, signature.role, signature.date].filter(Boolean);
        const notes = signature.note ? ` - ${stripHtml(signature.note)}` : "";
        return `${id}: ${parts.join(" | ")}${notes}`;
      })
    ));
  }

  if (ast.approvals && Object.keys(ast.approvals).length) {
    out.push(...renderSection(
      "Approvals",
      Object.entries(ast.approvals).map(([id, approval]) => {
        const parts = [approval.label, approval.status, approval.by, approval.date].filter(Boolean);
        const notes = approval.notes ? ` - ${stripHtml(approval.notes)}` : "";
        return `${id}: ${parts.join(" | ")}${notes}`;
      })
    ));
  }

  if (Array.isArray(ast.tasks) && ast.tasks.length) {
    const lines = [];
    for (const task of ast.tasks) {
      const marker = task.done ? "[x]" : "[ ]";
      lines.push(`${marker} ${stripHtml(task.text)}`);

      const meta = [];
      if (task.assigned_to?.name) meta.push(`assigned=${task.assigned_to.name}`);
      if (task.subject?.label) meta.push(`subject=${stripHtml(task.subject.label)}`);
      if (task.tag?.label) meta.push(`tag=${stripHtml(task.tag.label)}`);
      if (meta.length) lines.push(`  ${meta.join(" | ")}`);
    }
    out.push(...renderSection("Tasks", lines));
  }

  if (Array.isArray(ast.notes) && ast.notes.length) {
    out.push(...renderSection("Notes", ast.notes.map((note) => `- ${stripHtml(note)}`)));
  }

  if (Array.isArray(ast.references) && ast.references.length) {
    out.push(...renderSection(
      "References",
      ast.references.map((entry) => renderStructuredReference(entry, false))
    ));
  }

  if (Array.isArray(ast.attachments) && ast.attachments.length) {
    out.push(...renderSection(
      "Attachments",
      ast.attachments.map((entry) => renderStructuredReference(entry, false))
    ));
  }

  if (Array.isArray(ast.meeting) && ast.meeting.length) {
    const meetingLines = [`Title: ${meetingTitle}`, ""];
    for (const line of ast.meeting) {
      const rendered = renderMeetingLine(line);
      meetingLines.push(rendered);
      if (rendered) {
        meetingLines.push("");
      }
    }
    out.push(...renderSection("Meeting", meetingLines));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

module.exports = renderText;

},{"./renderUtils":14}],16:[function(require,module,exports){
const { tokenize } = require("../src/core/tokenizer.js");
const { parseBlocks } = require("../src/core/blockParser.js");
const { resolveReferences } = require("../src/core/referenceLinker.js");
const { parseInline } = require("../src/core/inlineParser.js");
const renderHTML = require("../src/renders/html.js");
const renderJSON = require("../src/renders/json.js");
const renderMarkdown = require("../src/renders/markdown.js");
const renderText = require("../src/renders/text.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function countKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).length
    : 0;
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countTaskStates(tasks = []) {
  let open = 0;
  let done = 0;

  for (const task of tasks) {
    if (task?.done) done += 1;
    else open += 1;
  }

  return { open, done };
}

function buildWarnings(tokens, localAst, resolvedAst) {
  const warnings = [];
  const blockDeclarationGroups = ["participants", "subjects", "tags"];
  let currentBlock = null;
  const declarationSeen = new Map();
  const metaSeen = new Set();

  for (const token of tokens) {
    if (token.type === "command") {
      currentBlock = String(token.value || "").toLowerCase();
      continue;
    }

    if (token.type === "meta" || token.type === "directive") {
      const key = token.type === "directive" ? token.name : token.key;
      if (metaSeen.has(key)) {
        warnings.push({
          severity: "warning",
          message: `Duplicate meta key "${key}" on line ${token.line}.`,
        });
      } else {
        metaSeen.add(key);
      }
    }

    if (token.type === "declaration" && blockDeclarationGroups.includes(currentBlock)) {
      const seenKey = `${currentBlock}:${token.key}`;
      if (declarationSeen.has(seenKey)) {
        warnings.push({
          severity: "warning",
          message: `Duplicate ${currentBlock} ID "${token.key}" on line ${token.line}.`,
        });
      } else {
        declarationSeen.set(seenKey, token.line);
      }
    }
  }

  for (const task of localAst.tasks || []) {
    if (task.meta?.ptp && task.assigned_to?.unresolved) {
      warnings.push({
        severity: "error",
        message: `Unresolved participant reference "@ptp=${task.meta.ptp}" in tasks.`,
      });
    }
    if (task.meta?.subject && task.subject?.unresolved) {
      warnings.push({
        severity: "error",
        message: `Unresolved subject reference "=${task.meta.subject}" in tasks.`,
      });
    }
    if (task.meta?.tag && task.tag?.unresolved) {
      warnings.push({
        severity: "warning",
        message: `Unknown task tag "@tag=${task.meta.tag}".`,
      });
    }
  }

  if ((localAst.tags_import || []).length || (localAst.participants_import || []).length || (localAst.macros_import || []).length || countKeys(localAst.imports)) {
    warnings.push({
      severity: "info",
      message: "Browser mode parses the current source only. @import, @tags_import, @participants_import, and @macros_import are not resolved from disk here.",
    });
  }

  if (countKeys(localAst.macros)) {
    warnings.push({
      severity: "info",
      message: "Local @macro declarations are parsed, but browser mode does not load external macro templates from files.",
    });
  }

  if (!countItems(resolvedAst.meeting) && !countItems(resolvedAst.tasks) && !countItems(resolvedAst.notes)) {
    warnings.push({
      severity: "info",
      message: "This document currently has no meeting, task, or note content to render.",
    });
  }

  return warnings;
}

function buildStats(source, tokens, localAst, resolvedAst) {
  const taskState = countTaskStates(resolvedAst.tasks || []);
  const lines = String(source || "").split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim()).length;

  return {
    characters: String(source || "").length,
    lines: lines.length,
    non_empty_lines: nonEmptyLines,
    tokens: tokens.length,
    meta_keys: countKeys(localAst.meta),
    participants: countKeys(resolvedAst.participants),
    subjects: countKeys(resolvedAst.subjects),
    tags: countKeys(resolvedAst.tags),
    tasks_total: countItems(resolvedAst.tasks),
    tasks_open: taskState.open,
    tasks_done: taskState.done,
    notes: countItems(resolvedAst.notes),
    meeting_lines: countItems(resolvedAst.meeting),
    references: countItems(resolvedAst.references),
    attachments: countItems(resolvedAst.attachments),
    signatures: countKeys(resolvedAst.signatures),
    approvals: countKeys(resolvedAst.approvals),
    imports: countKeys(localAst.imports),
    tag_imports: countItems(localAst.tags_import),
    participants_imports: countItems(localAst.participants_import),
    macros_imports: countItems(localAst.macros_import),
    local_macros: countKeys(localAst.macros),
  };
}

function parseSource(source) {
  const tokens = tokenize(source);
  const localAst = parseBlocks(tokens);
  const resolvedAst = parseInline(resolveReferences(clone(localAst)));
  const stats = buildStats(source, tokens, localAst, resolvedAst);
  const warnings = buildWarnings(tokens, localAst, resolvedAst);

  return {
    tokens,
    localAst,
    ast: resolvedAst,
    stats,
    warnings,
  };
}

function parseTextToHTML(source, options = {}) {
  return renderHTML(parseSource(source).ast, options);
}

function parseTextToJSON(source) {
  return renderJSON(parseSource(source).ast);
}

function parseTextToMarkdown(source, options = {}) {
  return renderMarkdown(parseSource(source).ast, options);
}

function parseTextToText(source, options = {}) {
  return renderText(parseSource(source).ast, options);
}

module.exports = {
  parseSource,
  parseTextToHTML,
  parseTextToJSON,
  parseTextToMarkdown,
  parseTextToText,
};

},{"../src/core/blockParser.js":4,"../src/core/inlineParser.js":7,"../src/core/referenceLinker.js":9,"../src/core/tokenizer.js":10,"../src/renders/html.js":11,"../src/renders/json.js":12,"../src/renders/markdown.js":13,"../src/renders/text.js":15}]},{},[16])(16)
});
