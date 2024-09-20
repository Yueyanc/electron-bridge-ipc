"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
const electron = require("electron");
var DisposableStore = class {
  constructor() {
    __publicField(this, "_isDisposed", false);
    __publicField(this, "_toDispose", /* @__PURE__ */ new Set());
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.clear();
  }
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  add(o) {
    if (!o) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    if (this._isDisposed) {
      console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack);
    } else {
      this._toDispose.add(o);
    }
    return o;
  }
};
var Disposable = (_a = class {
  constructor() {
    __publicField(this, "_store", new DisposableStore());
  }
  dispose() {
    this._store.dispose();
  }
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
}, __publicField(_a, "None", Object.freeze({ dispose() {
} })), _a);
function dispose(arg) {
  if (arg && Symbol.iterator in arg) {
    const errors = [];
    for (const d of arg) {
      if (d) {
        try {
          d.dispose();
        } catch (e) {
          errors.push(e);
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new Error("Encountered errors while disposing of store");
    }
    return Array.isArray(arg) ? [] : arg;
  } else if (arg && "dispose" in arg) {
    arg.dispose();
    return arg;
  }
}
function combinedDisposable(...disposables) {
  const parent = toDisposable(() => dispose(disposables));
  return parent;
}
function toDisposable(fn) {
  return {
    dispose: fn
  };
}
var id = 0;
var UniqueContainer = class {
  constructor(value) {
    __publicField(this, "stack");
    __publicField(this, "id", id++);
    this.value = value;
  }
};
var EventDeliveryQueuePrivate = class {
  constructor() {
    __publicField(this, "i", -1);
    __publicField(this, "end", 0);
    __publicField(this, "current");
    __publicField(this, "value");
  }
  enqueue(emitter, value, end) {
    this.i = 0;
    this.end = end;
    this.current = emitter;
    this.value = value;
  }
  reset() {
    this.i = this.end;
    this.current = void 0;
    this.value = void 0;
  }
};
function addAndReturnDisposable(d, store) {
  if (Array.isArray(store)) {
    store.push(d);
  } else if (store) {
    store.add(d);
  }
  return d;
}
var Emitter = class {
  constructor(options) {
    __publicField(this, "_listeners");
    __publicField(this, "_deliveryQueue");
    __publicField(this, "_disposed");
    __publicField(this, "_options");
    __publicField(this, "_event");
    __publicField(this, "_size", 0);
    var _a2;
    this._options = options;
    this._deliveryQueue = (_a2 = this._options) == null ? void 0 : _a2.deliveryQueue;
  }
  _deliver(listener, value) {
    if (!listener) {
      return;
    }
    listener.value(value);
  }
  _deliverQueue(dq) {
    const listeners = dq.current._listeners;
    while (dq.i < dq.end) {
      this._deliver(listeners[dq.i++], dq.value);
    }
    dq.reset();
  }
  fire(event) {
    var _a2;
    if ((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) {
      this._deliverQueue(this._deliveryQueue);
    }
    if (!this._listeners) ;
    else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
  }
  get event() {
    this._event = (callback, thisArgs, disposables) => {
      var _a2, _b, _c, _d;
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      if (!this._listeners) {
        (_b = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b.call(_a2, this);
        this._listeners = contained;
        (_d = (_c = this._options) == null ? void 0 : _c.onDidAddFirstListener) == null ? void 0 : _d.call(_c, this);
      } else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ?? (this._deliveryQueue = new EventDeliveryQueuePrivate());
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._size++;
      const result = toDisposable(() => {
        this._removeListener(contained);
      });
      if (disposables instanceof DisposableStore) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
      }
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    var _a2, _b, _c, _d;
    (_b = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b.call(_a2, this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      (_d = (_c = this._options) == null ? void 0 : _c.onDidRemoveLastListener) == null ? void 0 : _d.call(_c, this);
      this._size = 0;
      return;
    }
    const listeners = this._listeners;
    const index = listeners.indexOf(listener);
    if (index === -1) {
      console.log("disposed?", this._disposed);
      console.log("size?", this._size);
      console.log("arr?", JSON.stringify(this._listeners));
      throw new Error("Attempted to dispose unknown listener");
    }
    this._size--;
    listeners[index] = void 0;
    const adjustDeliveryQueue = this._deliveryQueue.current === this;
    let n = 0;
    for (let i = 0; i < listeners.length; i++) {
      if (listeners[i]) {
        listeners[n++] = listeners[i];
      } else if (adjustDeliveryQueue) {
        this._deliveryQueue.end--;
        if (n < this._deliveryQueue.i) {
          this._deliveryQueue.i--;
        }
      }
    }
    listeners.length = n;
  }
  dispose() {
    var _a2, _b, _c;
    if (!this._disposed) {
      this._disposed = true;
      if (((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        this._listeners = void 0;
        this._size = 0;
      }
      (_c = (_b = this._options) == null ? void 0 : _b.onDidRemoveLastListener) == null ? void 0 : _c.call(_b);
    }
  }
};
var Event;
((Event2) => {
  function buffer(event, flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let listener = event((e) => {
      if (buffer2) {
        buffer2.push(e);
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = () => {
      buffer2 == null ? void 0 : buffer2.forEach((e) => emitter.fire(e));
      buffer2 = null;
    };
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          if (flushAfterTimeout) {
            setTimeout(flush);
          } else {
            flush();
          }
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  Event2.buffer = buffer;
  Event2.None = () => Disposable.None;
  function snapshot(event, disposable) {
    let listener;
    const options = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener == null ? void 0 : listener.dispose();
      }
    };
    const emitter = new Emitter(options);
    disposable == null ? void 0 : disposable.add(emitter);
    return emitter.event;
  }
  function signal(event) {
    return event;
  }
  Event2.signal = signal;
  function filter(event, filter2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((e) => filter2(e) && listener.call(thisArgs, e), null, disposables), disposable);
  }
  Event2.filter = filter;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  Event2.any = any;
  function map(event, map2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map2(i)), null, disposables), disposable);
  }
  Event2.map = map;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      const result = event((e) => {
        if (didFire) {
          return;
        } else if (result) {
          result.dispose();
        } else {
          didFire = true;
        }
        return listener.call(thisArgs, e);
      }, null, disposables);
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  Event2.once = once;
  function toPromise(event) {
    return new Promise((resolve) => once(event)(resolve));
  }
  Event2.toPromise = toPromise;
  function fromNodeEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
})(Event || (Event = {}));
var shortcutEvent = Object.freeze((callback, context) => {
  const handle = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle);
    }
  };
});
var CancellationToken;
((CancellationToken2) => {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var hasBuffer = typeof Buffer !== "undefined";
var ELBuffer = class _ELBuffer {
  constructor(buffer) {
    __publicField(this, "buffer");
    __publicField(this, "byteLength");
    this.buffer = buffer;
    this.byteLength = this.buffer.byteLength;
  }
  static wrap(actual) {
    if (hasBuffer && !Buffer.isBuffer(actual)) {
      actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
    }
    return new _ELBuffer(actual);
  }
  writeUInt8(value, offset) {
    writeUInt8(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8(this.buffer, offset);
  }
  static alloc(byteLength) {
    if (hasBuffer) {
      return new _ELBuffer(Buffer.allocUnsafe(byteLength));
    } else {
      return new _ELBuffer(new Uint8Array(byteLength));
    }
  }
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const ret = _ELBuffer.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      ret.set(element, offset);
      offset += element.byteLength;
    }
    return ret;
  }
  set(array, offset) {
    if (array instanceof _ELBuffer) {
      this.buffer.set(array.buffer, offset);
    } else if (array instanceof Uint8Array) {
      this.buffer.set(array, offset);
    } else if (array instanceof ArrayBuffer) {
      this.buffer.set(new Uint8Array(array), offset);
    } else if (ArrayBuffer.isView(array)) {
      this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
    } else {
      throw new TypeError(`Unknown argument 'array'`);
    }
  }
  slice(start, end) {
    return new _ELBuffer(this.buffer.subarray(start, end));
  }
  static fromString(source, options) {
    const dontUseNodeBuffer = (options == null ? void 0 : options.dontUseNodeBuffer) || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new _ELBuffer(Buffer.from(source));
    } else {
      if (!textEncoder) {
        textEncoder = new TextEncoder();
      }
      return new _ELBuffer(textEncoder.encode(source));
    }
  }
  toString() {
    if (hasBuffer) {
      return this.buffer.toString();
    } else {
      if (!textDecoder) {
        textDecoder = new TextDecoder();
      }
      return textDecoder.decode(this.buffer);
    }
  }
};
var textEncoder;
var textDecoder;
({
  Undefined: createOneByteBuffer(
    0
    /* Undefined */
  ),
  String: createOneByteBuffer(
    1
    /* String */
  ),
  Buffer: createOneByteBuffer(
    2
    /* Buffer */
  ),
  ELBuffer: createOneByteBuffer(
    3
    /* ELBuffer */
  ),
  Array: createOneByteBuffer(
    4
    /* Array */
  ),
  Object: createOneByteBuffer(
    5
    /* Object */
  ),
  Uint: createOneByteBuffer(
    6
    /* Int */
  )
});
function createOneByteBuffer(value) {
  const result = ELBuffer.alloc(1);
  result.writeUInt8(value, 0);
  return result;
}
createOneByteBuffer(0);
function writeUInt8(destination, value, offset) {
  destination[offset] = value;
}
function readUInt8(source, offset) {
  return source[offset];
}
function validateIPC(channel) {
  if (!channel || !channel.startsWith("_ipc:")) {
    throw new Error(`Unsupported event IPC channel '${channel}'`);
  }
  return true;
}
function createPreload() {
  electron.contextBridge.exposeInMainWorld("__el_bridge", {
    ipcRenderer: {
      send(channel, ...args) {
        if (validateIPC(channel)) {
          electron.ipcRenderer.send(channel, ...args);
        }
      },
      invoke(channel, ...args) {
        validateIPC(channel);
        return electron.ipcRenderer.invoke(channel, ...args);
      },
      on(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.on(channel, listener);
        return this;
      },
      once(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.once(channel, listener);
        return this;
      },
      removeListener(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.removeListener(channel, listener);
        return this;
      }
    }
  });
}
createPreload();
