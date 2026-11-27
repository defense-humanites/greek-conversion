// Built-ins newer than ES2020 that the library uses, for engines that lack
// them: the QuickJS of the archived `quickjs` package, which provides the
// same module as quickjs-ng. quickjs-ng has them all. Each is defined only if
// missing, non-enumerable, as the built-in would be.
(function () {
  function define(target, name, value) {
    if (!(name in target)) {
      Object.defineProperty(target, name, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
  define(Object, "hasOwn", function (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  });
  function at(index) {
    const length = this.length;
    const relative = Math.trunc(index) || 0;
    const k = relative >= 0 ? relative : length + relative;
    return k < 0 || k >= length ? undefined : this[k];
  }
  define(Array.prototype, "at", at);
  define(String.prototype, "at", at);
  [Int8Array, Uint8Array, Uint16Array, Int32Array, Uint32Array].forEach(
    function (type) {
      define(type.prototype, "at", at);
    },
  );
  define(String.prototype, "replaceAll", function (search, replacement) {
    if (search instanceof RegExp) {
      if (!search.global) {
        throw new TypeError("replaceAll must be called with a global RegExp");
      }
      return this.replace(search, replacement);
    }
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.replace(new RegExp(escaped, "g"), replacement);
  });
})();
