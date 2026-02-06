// Polyfills loaded before Expo/AppEntry.
// This provides a FormData implementation for environments where it is missing at startup.

/* eslint-disable no-undef */
if (typeof global.FormData === "undefined") {
  class FormDataPolyfill {
    constructor() {
      this._parts = [];
    }

    append(name, value, filename) {
      let partValue = value;

      if (value && typeof value === "object" && "uri" in value) {
        partValue = {
          ...value,
          name: filename ?? value.name,
        };
      } else if (filename !== undefined) {
        partValue = {
          uri: value,
          name: filename,
        };
      }

      this._parts.push([String(name), partValue]);
    }

    set(name, value, filename) {
      this.delete(name);
      this.append(name, value, filename);
    }

    get(name) {
      const found = this._parts.find(([key]) => key === String(name));
      return found ? found[1] : null;
    }

    getAll(name) {
      return this._parts
        .filter(([key]) => key === String(name))
        .map(([, value]) => value);
    }

    has(name) {
      return this._parts.some(([key]) => key === String(name));
    }

    delete(name) {
      const target = String(name);
      this._parts = this._parts.filter(([key]) => key !== target);
    }

    forEach(callback, thisArg) {
      this._parts.forEach(([key, value]) => {
        callback.call(thisArg, value, key, this);
      });
    }

    *entries() {
      for (const [key, value] of this._parts) {
        yield [key, value];
      }
    }

    *keys() {
      for (const [key] of this._parts) {
        yield key;
      }
    }

    *values() {
      for (const [, value] of this._parts) {
        yield value;
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }

    // React Native fetch expects getParts() on FormData instances.
    getParts() {
      return this._parts.map(([key, value]) => {
        if (typeof value === "object" && value && "uri" in value) {
          return {
            ...value,
            fieldName: key,
            name: value.name ?? "file",
          };
        }

        return {
          string: String(value),
          fieldName: key,
        };
      });
    }
  }

  global.FormData = FormDataPolyfill;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.log("[polyfills] FormData was missing; polyfill installed.");
  }
} else if (typeof __DEV__ !== "undefined" && __DEV__) {
  // eslint-disable-next-line no-console
  console.log("[polyfills] FormData already available; no polyfill needed.");
}
/* eslint-enable no-undef */

/* eslint-disable no-undef */
// WebSocket polyfill
if (typeof global.WebSocket === "undefined") {
  try {
    const { WebSocket } = require("react-native");
    if (WebSocket) {
      global.WebSocket = WebSocket;

      if (typeof __DEV__ !== "undefined" && __DEV__) {
        // eslint-disable-next-line no-console
        console.log(
          "[polyfills] WebSocket was missing; polyfill installed from react-native.",
        );
      }
    }
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[polyfills] WebSocket polyfill failed:", e);
    }
  }
} else if (typeof __DEV__ !== "undefined" && __DEV__) {
  // eslint-disable-next-line no-console
  console.log("[polyfills] WebSocket already available; no polyfill needed.");
}
/* eslint-enable no-undef */
