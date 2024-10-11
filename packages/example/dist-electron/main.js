var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b, _c;
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ipcMain, BrowserWindow, app } from "electron";
import fs from "node:fs/promises";
var DisposableStore$1 = class DisposableStore {
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
      dispose$1(this._toDispose);
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
var Disposable$1 = (_a = class {
  constructor() {
    __publicField(this, "_store", new DisposableStore$1());
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
function dispose$1(arg) {
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
function combinedDisposable$1(...disposables) {
  const parent = toDisposable$1(() => dispose$1(disposables));
  return parent;
}
function toDisposable$1(fn) {
  return {
    dispose: fn
  };
}
var id$1 = 0;
var UniqueContainer$1 = class UniqueContainer {
  constructor(value) {
    __publicField(this, "stack");
    __publicField(this, "id", id$1++);
    this.value = value;
  }
};
var EventDeliveryQueuePrivate$1 = class EventDeliveryQueuePrivate {
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
function addAndReturnDisposable$1(d, store) {
  if (Array.isArray(store)) {
    store.push(d);
  } else if (store) {
    store.add(d);
  }
  return d;
}
function createSingleCallFunction(fn, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function() {
    if (didCall) {
      return result;
    }
    didCall = true;
    {
      result = fn.apply(_this, arguments);
    }
    return result;
  };
}
var Emitter$1 = class Emitter {
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
    else if (this._listeners instanceof UniqueContainer$1) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
  }
  get event() {
    this._event = (callback, thisArgs, disposables) => {
      var _a2, _b2, _c2, _d;
      if (this._disposed) {
        return Disposable$1.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer$1(callback);
      if (!this._listeners) {
        (_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b2.call(_a2, this);
        this._listeners = contained;
        (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidAddFirstListener) == null ? void 0 : _d.call(_c2, this);
      } else if (this._listeners instanceof UniqueContainer$1) {
        this._deliveryQueue ?? (this._deliveryQueue = new EventDeliveryQueuePrivate$1());
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._size++;
      const result = toDisposable$1(() => {
        this._removeListener(contained);
      });
      if (disposables instanceof DisposableStore$1) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
      }
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    var _a2, _b2, _c2, _d;
    (_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b2.call(_a2, this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidRemoveLastListener) == null ? void 0 : _d.call(_c2, this);
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
    var _a2, _b2, _c2;
    if (!this._disposed) {
      this._disposed = true;
      if (((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        this._listeners = void 0;
        this._size = 0;
      }
      (_c2 = (_b2 = this._options) == null ? void 0 : _b2.onDidRemoveLastListener) == null ? void 0 : _c2.call(_b2);
    }
  }
};
var Relay = class {
  constructor() {
    __publicField(this, "listening", false);
    __publicField(this, "inputEvent", Event$1.None);
    __publicField(this, "inputEventListener", Disposable$1.None);
    __publicField(this, "emitter", new Emitter$1({
      onDidAddFirstListener: () => {
        this.listening = true;
        this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
      },
      onDidRemoveLastListener: () => {
        this.listening = false;
        this.inputEventListener.dispose();
      }
    }));
    __publicField(this, "event", this.emitter.event);
  }
  set input(event) {
    this.inputEvent = event;
    if (this.listening) {
      this.inputEventListener.dispose();
      this.inputEventListener = event(this.emitter.fire, this.emitter);
    }
  }
  dispose() {
    this.inputEventListener.dispose();
    this.emitter.dispose();
  }
};
var EventMultiplexer = class {
  constructor() {
    __publicField(this, "emitter");
    __publicField(this, "hasListeners", false);
    __publicField(this, "events", []);
    this.emitter = new Emitter$1({
      onWillAddFirstListener: () => this.onFirstListenerAdd(),
      onDidRemoveLastListener: () => this.onLastListenerRemove()
    });
  }
  get event() {
    return this.emitter.event;
  }
  add(event) {
    const e = { event, listener: null };
    this.events.push(e);
    if (this.hasListeners) {
      this.hook(e);
    }
    const dispose2 = () => {
      if (this.hasListeners) {
        this.unhook(e);
      }
      const idx = this.events.indexOf(e);
      this.events.splice(idx, 1);
    };
    return toDisposable$1(createSingleCallFunction(dispose2));
  }
  onFirstListenerAdd() {
    this.hasListeners = true;
    this.events.forEach((e) => this.hook(e));
  }
  onLastListenerRemove() {
    this.hasListeners = false;
    this.events.forEach((e) => this.unhook(e));
  }
  hook(e) {
    e.listener = e.event((r) => this.emitter.fire(r));
  }
  unhook(e) {
    var _a2;
    (_a2 = e.listener) == null ? void 0 : _a2.dispose();
    e.listener = null;
  }
  dispose() {
    var _a2;
    this.emitter.dispose();
    for (const e of this.events) {
      (_a2 = e.listener) == null ? void 0 : _a2.dispose();
    }
    this.events = [];
  }
};
var Event$1;
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
    const emitter = new Emitter$1({
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
  Event2.None = () => Disposable$1.None;
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
    const emitter = new Emitter$1(options);
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
      const disposable = combinedDisposable$1(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable$1(disposable, disposables);
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
    const result = new Emitter$1({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
})(Event$1 || (Event$1 = {}));
var shortcutEvent = Object.freeze((callback, context) => {
  const handle = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle);
    }
  };
});
var MutableToken = class {
  constructor() {
    __publicField(this, "_isCancelled", false);
    __publicField(this, "_emitter", null);
  }
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter$1();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
};
var CancellationTokenSource = class {
  constructor(parent) {
    __publicField(this, "_token");
    __publicField(this, "_parentListener");
    this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
  }
  get token() {
    if (!this._token) {
      this._token = new MutableToken();
    }
    return this._token;
  }
  cancel() {
    if (!this._token) {
      this._token = CancellationToken.Cancelled;
    } else if (this._token instanceof MutableToken) {
      this._token.cancel();
    }
  }
  dispose(cancel = false) {
    var _a2;
    if (cancel) {
      this.cancel();
    }
    (_a2 = this._parentListener) == null ? void 0 : _a2.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
};
var CancellationError = class extends Error {
  constructor() {
    super("Canceled");
    this.name = this.message;
  }
};
function createCancelablePromise(callback) {
  const source = new CancellationTokenSource();
  const thenable = callback(source.token);
  const promise = new Promise((resolve, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose();
      reject(new CancellationError());
    });
    Promise.resolve(thenable).then((value) => {
      subscription.dispose();
      source.dispose();
      resolve(value);
    }, (err) => {
      subscription.dispose();
      source.dispose();
      reject(err);
    });
  });
  return new class {
    cancel() {
      source.cancel();
      source.dispose();
    }
    then(resolve, reject) {
      return promise.then(resolve, reject);
    }
    catch(reject) {
      return this.then(void 0, reject);
    }
    finally(onfinally) {
      return promise.finally(onfinally);
    }
  }();
}
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
    onCancellationRequested: Event$1.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var hasBuffer$1 = typeof Buffer !== "undefined";
var ELBuffer$1 = class _ELBuffer {
  constructor(buffer) {
    __publicField(this, "buffer");
    __publicField(this, "byteLength");
    this.buffer = buffer;
    this.byteLength = this.buffer.byteLength;
  }
  static wrap(actual) {
    if (hasBuffer$1 && !Buffer.isBuffer(actual)) {
      actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
    }
    return new _ELBuffer(actual);
  }
  writeUInt8(value, offset) {
    writeUInt8$1(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8$1(this.buffer, offset);
  }
  static alloc(byteLength) {
    if (hasBuffer$1) {
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
    if (!dontUseNodeBuffer && hasBuffer$1) {
      return new _ELBuffer(Buffer.from(source));
    } else {
      if (!textEncoder$1) {
        textEncoder$1 = new TextEncoder();
      }
      return new _ELBuffer(textEncoder$1.encode(source));
    }
  }
  toString() {
    if (hasBuffer$1) {
      return this.buffer.toString();
    } else {
      if (!textDecoder$1) {
        textDecoder$1 = new TextDecoder();
      }
      return textDecoder$1.decode(this.buffer);
    }
  }
};
var textEncoder$1;
var textDecoder$1;
var BufferPresets = {
  Undefined: createOneByteBuffer$1(
    0
    /* Undefined */
  ),
  String: createOneByteBuffer$1(
    1
    /* String */
  ),
  Buffer: createOneByteBuffer$1(
    2
    /* Buffer */
  ),
  ELBuffer: createOneByteBuffer$1(
    3
    /* ELBuffer */
  ),
  Array: createOneByteBuffer$1(
    4
    /* Array */
  ),
  Object: createOneByteBuffer$1(
    5
    /* Object */
  ),
  Uint: createOneByteBuffer$1(
    6
    /* Int */
  )
};
function createOneByteBuffer$1(value) {
  const result = ELBuffer$1.alloc(1);
  result.writeUInt8(value, 0);
  return result;
}
var vqlZero = createOneByteBuffer$1(0);
function writeInt32VQL(writer, value) {
  if (value === 0) {
    writer.write(vqlZero);
    return;
  }
  let len = 0;
  for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
    len++;
  }
  const scratch = ELBuffer$1.alloc(len);
  for (let i = 0; value !== 0; i++) {
    scratch.buffer[i] = value & 127;
    value = value >>> 7;
    if (value > 0) {
      scratch.buffer[i] |= 128;
    }
  }
  writer.write(scratch);
}
function readIntVQL(reader) {
  let value = 0;
  for (let n = 0; ; n += 7) {
    const next = reader.read(1);
    value |= (next.buffer[0] & 127) << n;
    if (!(next.buffer[0] & 128)) {
      return value;
    }
  }
}
function writeUInt8$1(destination, value, offset) {
  destination[offset] = value;
}
function readUInt8$1(source, offset) {
  return source[offset];
}
var BufferReader = class {
  constructor(buffer) {
    __publicField(this, "pos", 0);
    this.buffer = buffer;
  }
  read(bytes) {
    const result = this.buffer.slice(this.pos, this.pos + bytes);
    this.pos += result.byteLength;
    return result;
  }
};
var BufferWriter = class {
  constructor() {
    __publicField(this, "buffers", []);
  }
  get buffer() {
    return ELBuffer$1.concat(this.buffers);
  }
  write(buffer) {
    this.buffers.push(buffer);
  }
};
function serialize(writer, data) {
  if (typeof data === "undefined") {
    writer.write(BufferPresets.Undefined);
  } else if (typeof data === "string") {
    const buffer = ELBuffer$1.fromString(data);
    writer.write(BufferPresets.String);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (hasBuffer$1 && Buffer.isBuffer(data)) {
    const buffer = ELBuffer$1.wrap(data);
    writer.write(BufferPresets.Buffer);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (data instanceof ELBuffer$1) {
    writer.write(BufferPresets.ELBuffer);
    writeInt32VQL(writer, data.byteLength);
    writer.write(data);
  } else if (Array.isArray(data)) {
    writer.write(BufferPresets.Array);
    writeInt32VQL(writer, data.length);
    for (const el of data) {
      serialize(writer, el);
    }
  } else if (typeof data === "number" && (data | 0) === data) {
    writer.write(BufferPresets.Uint);
    writeInt32VQL(writer, data);
  } else {
    const buffer = ELBuffer$1.fromString(JSON.stringify(data));
    writer.write(BufferPresets.Object);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  }
}
function deserialize(reader) {
  const type = reader.read(1).readUInt8(0);
  switch (type) {
    case 0:
      return void 0;
    case 1:
      return reader.read(readIntVQL(reader)).toString();
    case 2:
      return reader.read(readIntVQL(reader)).buffer;
    case 3:
      return reader.read(readIntVQL(reader));
    case 4: {
      const length = readIntVQL(reader);
      const result = [];
      for (let i = 0; i < length; i++) {
        result.push(deserialize(reader));
      }
      return result;
    }
    case 5: {
      return JSON.parse(reader.read(readIntVQL(reader)).toString());
    }
    case 6:
      return readIntVQL(reader);
  }
}
function isFunction(obj) {
  return typeof obj === "function";
}
var ChannelClient = class {
  constructor(protocol) {
    __publicField(this, "protocolListener");
    __publicField(this, "state", 0);
    __publicField(this, "activeRequests", /* @__PURE__ */ new Set());
    __publicField(this, "lastRequestId", 0);
    __publicField(this, "handlers", /* @__PURE__ */ new Map());
    __publicField(this, "_onDidInitialize", new Emitter$1());
    __publicField(this, "isDisposed", false);
    __publicField(this, "onDidInitialize", this._onDidInitialize.event);
    this.protocol = protocol;
    this.protocolListener = this.protocol.onMessage((msg) => this.onBuffer(msg));
  }
  getChannel(channelName) {
    const that = this;
    return {
      call(command, arg, cancellationToken) {
        if (that.isDisposed) {
          return Promise.reject(new CancellationError());
        }
        return that.requestPromise(channelName, command, arg, cancellationToken);
      },
      listen(event, arg) {
        if (that.isDisposed) {
          return Event$1.None;
        }
        return that.requestEvent(channelName, event, arg);
      }
    };
  }
  requestEvent(channelName, name, arg) {
    const id2 = this.lastRequestId++;
    const type = 102;
    const request = { id: id2, type, channelName, name, arg };
    let uninitializedPromise = null;
    const emitter = new Emitter$1({
      onWillAddFirstListener: () => {
        uninitializedPromise = createCancelablePromise((_) => this.whenInitialized());
        uninitializedPromise.then(() => {
          uninitializedPromise = null;
          this.activeRequests.add(emitter);
          this.sendRequest(request);
        });
      },
      onDidRemoveLastListener: () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel();
          uninitializedPromise = null;
        } else {
          this.activeRequests.delete(emitter);
          this.sendRequest({
            id: id2,
            type: 103
            /* EventDispose */
          });
        }
      }
    });
    const handler = (res) => emitter.fire(res.data);
    this.handlers.set(id2, handler);
    return emitter.event;
  }
  get onDidInitializePromise() {
    return Event$1.toPromise(this.onDidInitialize);
  }
  whenInitialized() {
    if (this.state === 1) {
      return Promise.resolve();
    } else {
      return this.onDidInitializePromise;
    }
  }
  requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
    const id2 = this.lastRequestId++;
    const type = 100;
    const request = { id: id2, type, channelName, name, arg };
    if (cancellationToken.isCancellationRequested) {
      return Promise.reject(new CancellationError());
    }
    let disposable;
    const result = new Promise((c, e) => {
      if (cancellationToken.isCancellationRequested) {
        return e(new CancellationError());
      }
      const doRequest = () => {
        const handler = (response) => {
          switch (response.type) {
            case 201:
              this.handlers.delete(id2);
              c(response.data);
              break;
            case 202: {
              this.handlers.delete(id2);
              const error = new Error(response.data.message);
              error.stack = Array.isArray(response.data.stack) ? response.data.stack.join("\n") : response.data.stack;
              error.name = response.data.name;
              e(error);
              break;
            }
            case 203:
              this.handlers.delete(id2);
              e(response.data);
              break;
          }
        };
        this.handlers.set(id2, handler);
        this.sendRequest(request);
      };
      let uninitializedPromise = null;
      if (this.state === 1) {
        doRequest();
      } else {
        uninitializedPromise = createCancelablePromise((_) => this.whenInitialized());
        uninitializedPromise.then(() => {
          uninitializedPromise = null;
          doRequest();
        });
      }
      const cancel = () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel();
          uninitializedPromise = null;
        } else {
          this.sendRequest({
            id: id2,
            type: 101
            /* PromiseCancel */
          });
        }
        e(new CancellationError());
      };
      const cancellationTokenListener = cancellationToken.onCancellationRequested(cancel);
      disposable = combinedDisposable$1(toDisposable$1(cancel), cancellationTokenListener);
      this.activeRequests.add(disposable);
    });
    return result.finally(() => {
      disposable.dispose();
      this.activeRequests.delete(disposable);
    });
  }
  sendRequest(request) {
    switch (request.type) {
      case 100:
      case 102: {
        this.send([request.type, request.id, request.channelName, request.name], request.arg);
        return;
      }
      case 101:
      case 103: {
        this.send([request.type, request.id]);
      }
    }
  }
  send(header, body = void 0) {
    const writer = new BufferWriter();
    serialize(writer, header);
    serialize(writer, body);
    return this.sendBuffer(writer.buffer);
  }
  sendBuffer(message) {
    try {
      this.protocol.send(message);
      return message.byteLength;
    } catch (err) {
      return 0;
    }
  }
  onBuffer(msg) {
    const reader = new BufferReader(msg);
    const header = deserialize(reader);
    const body = deserialize(reader);
    const type = header[0];
    switch (type) {
      case 200:
        return this.onResponse({ type: header[0] });
      case 201:
      case 202:
      case 204:
      case 203:
        this.onResponse({ type: header[0], id: header[1], data: body });
    }
  }
  onResponse(response) {
    if (response.type === 200) {
      this.state = 1;
      this._onDidInitialize.fire();
      return;
    }
    const handler = this.handlers.get(response.id);
    handler == null ? void 0 : handler(response);
  }
  dispose() {
    this.isDisposed = true;
    if (this.protocolListener) {
      this.protocolListener.dispose();
      this.protocolListener = null;
    }
    dispose$1(this.activeRequests.values());
    this.activeRequests.clear();
  }
};
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
var ChannelServer = class {
  constructor(protocol, ctx) {
    __publicField(this, "channels", /* @__PURE__ */ new Map());
    __publicField(this, "protocolListener");
    __publicField(this, "activeRequests", /* @__PURE__ */ new Map());
    this.protocol = protocol;
    this.ctx = ctx;
    this.protocolListener = this.protocol.onMessage((msg) => this.onRawMessage(msg));
    this.sendResponse({
      type: 200
      /* Initialize */
    });
  }
  onRawMessage(msg) {
    const reader = new BufferReader(msg);
    const header = deserialize(reader);
    const body = deserialize(reader);
    const type = header[0];
    switch (type) {
      case 100:
        return this.onPromise({ type: 100, id: header[1], channelName: header[2], name: header[3], arg: body });
    }
  }
  onPromise(request) {
    const channel = this.channels.get(request.channelName);
    if (!channel) {
      return;
    }
    let promise;
    try {
      promise = channel.call(this.ctx, request.name, request.arg);
    } catch (e) {
      promise = Promise.reject(e);
    }
    const id2 = request.id;
    promise.then((data) => {
      this.sendResponse({
        id: id2,
        data,
        type: 201
        /* PromiseSuccess */
      });
    }, (err) => {
      if (err instanceof Error) {
        this.sendResponse({
          id: id2,
          data: {
            message: err.message,
            name: err.name,
            stack: err.stack ? err.stack.split("\n") : void 0
          },
          type: 202
          /* PromiseError */
        });
      } else {
        this.sendResponse({
          id: id2,
          data: err,
          type: 203
          /* PromiseErrorObj */
        });
      }
    }).finally(() => {
      this.activeRequests.delete(request.id);
    });
    const disposable = toDisposable$1(() => {
    });
    this.activeRequests.set(request.id, disposable);
  }
  sendResponse(response) {
    switch (response.type) {
      case 200: {
        this.send([response.type]);
        return;
      }
      case 201:
      case 202:
      case 204:
      case 203: {
        this.send([response.type, response.id], response.data);
      }
    }
  }
  send(header, body = void 0) {
    const writer = new BufferWriter();
    serialize(writer, header);
    serialize(writer, body);
    return this.sendBuffer(writer.buffer);
  }
  sendBuffer(message) {
    try {
      this.protocol.send(message);
      return message.byteLength;
    } catch (err) {
      return 0;
    }
  }
  registerChannel(channelName, channel) {
    this.channels.set(channelName, channel);
  }
  dispose() {
    if (this.protocolListener) {
      this.protocolListener.dispose();
      this.protocolListener = null;
    }
    dispose$1(this.activeRequests.values());
    this.activeRequests.clear();
  }
};
function getDelayedChannel(promise) {
  return {
    call(command, arg, cancellationToken) {
      return promise.then((c) => c.call(command, arg, cancellationToken));
    },
    listen(event, arg) {
      const relay = new Relay();
      promise.then((c) => relay.input = c.listen(event, arg));
      return relay.event;
    }
  };
}
var IPCServer = class {
  constructor(onDidClientConnect) {
    __publicField(this, "channels", /* @__PURE__ */ new Map());
    __publicField(this, "_connections", /* @__PURE__ */ new Set());
    __publicField(this, "_onDidAddConnection", new Emitter$1());
    __publicField(this, "onDidAddConnection", this._onDidAddConnection.event);
    __publicField(this, "_onDidRemoveConnection", new Emitter$1());
    __publicField(this, "onDidRemoveConnection", this._onDidRemoveConnection.event);
    __publicField(this, "disposables", new DisposableStore$1());
    this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
      const onFirstMessage = Event$1.once(protocol.onMessage);
      this.disposables.add(onFirstMessage((msg) => {
        const reader = new BufferReader(msg);
        const ctx = deserialize(reader);
        const channelServer = new ChannelServer(protocol, ctx);
        const channelClient = new ChannelClient(protocol);
        this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel));
        const connection = { channelServer, channelClient, ctx };
        this._connections.add(connection);
        this._onDidAddConnection.fire(connection);
        this.disposables.add(onDidClientDisconnect(() => {
          channelServer.dispose();
          channelClient.dispose();
          this._connections.delete(connection);
          this._onDidRemoveConnection.fire(connection);
        }));
      }));
    }));
  }
  get connections() {
    const result = [];
    this._connections.forEach((ctx) => result.push(ctx));
    return result;
  }
  getChannel(channelName, routerOrClientFilter) {
    const that = this;
    return {
      call(command, arg, cancellationToken) {
        let connectionPromise;
        if (isFunction(routerOrClientFilter)) {
          const connection = getRandomElement(that.connections.filter(routerOrClientFilter));
          connectionPromise = connection ? Promise.resolve(connection) : Event$1.toPromise(Event$1.filter(that.onDidAddConnection, routerOrClientFilter));
        } else {
          connectionPromise = routerOrClientFilter.routeCall(that, command, arg);
        }
        const channelPromise = connectionPromise.then((connection) => connection.channelClient.getChannel(channelName));
        return getDelayedChannel(channelPromise).call(command, arg, cancellationToken);
      },
      listen(event, arg) {
        if (isFunction(routerOrClientFilter)) {
          return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg);
        }
        const channelPromise = routerOrClientFilter.routeEvent(that, event, arg).then((connection) => connection.channelClient.getChannel(channelName));
        return getDelayedChannel(channelPromise).listen(event, arg);
      }
    };
  }
  getMulticastEvent(channelName, clientFilter, eventName, arg) {
    const that = this;
    let disposables;
    const emitter = new Emitter$1({
      onWillAddFirstListener: () => {
        disposables = new DisposableStore$1();
        const eventMultiplexer = new EventMultiplexer();
        const map = /* @__PURE__ */ new Map();
        const onDidAddConnection = (connection) => {
          const channel = connection.channelClient.getChannel(channelName);
          const event = channel.listen(eventName, arg);
          const disposable = eventMultiplexer.add(event);
          map.set(connection, disposable);
        };
        const onDidRemoveConnection = (connection) => {
          const disposable = map.get(connection);
          if (!disposable) {
            return;
          }
          disposable.dispose();
          map.delete(connection);
        };
        that.connections.filter(clientFilter).forEach(onDidAddConnection);
        Event$1.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, void 0, disposables);
        that.onDidRemoveConnection(onDidRemoveConnection, void 0, disposables);
        eventMultiplexer.event(emitter.fire, emitter, disposables);
        disposables.add(eventMultiplexer);
      },
      onDidRemoveLastListener: () => {
        disposables == null ? void 0 : disposables.dispose();
        disposables = void 0;
      }
    });
    return emitter.event;
  }
  registerChannel(channelName, channel) {
    this.channels.set(channelName, channel);
    for (const connection of this._connections) {
      connection.channelServer.registerChannel(channelName, channel);
    }
  }
  dispose() {
    this.disposables.dispose();
    for (const connection of this._connections) {
      connection.channelClient.dispose();
      connection.channelServer.dispose();
    }
    this._connections.clear();
    this.channels.clear();
    this._onDidAddConnection.dispose();
    this._onDidRemoveConnection.dispose();
  }
};
var Protocol = class {
  constructor(sender, onMessage) {
    this.sender = sender;
    this.onMessage = onMessage;
  }
  send(message) {
    try {
      this.sender.send("_ipc:message", message.buffer);
    } catch (e) {
    }
  }
  disconnect() {
    this.sender.send("_ipc:disconnect", null);
  }
};
function createScopedOnMessageEvent(senderId, eventName) {
  const onMessage = Event$1.fromNodeEventEmitter(ipcMain, eventName, (event, message) => ({ event, message }));
  const onMessageFromSender = Event$1.filter(onMessage, ({ event }) => event.sender.id === senderId);
  return Event$1.map(onMessageFromSender, ({ message }) => message ? ELBuffer$1.wrap(message) : message);
}
var Server = (_b = class extends IPCServer {
  static getOnDidClientConnect() {
    const onHello = Event$1.fromNodeEventEmitter(ipcMain, "_ipc:hello", ({ sender }) => sender);
    return Event$1.map(onHello, (webContents) => {
      const id2 = webContents.id;
      const client = _b.Clients.get(id2);
      client == null ? void 0 : client.dispose();
      const onDidClientReconnect = new Emitter$1();
      _b.Clients.set(id2, toDisposable$1(() => onDidClientReconnect.fire()));
      const onMessage = createScopedOnMessageEvent(id2, "_ipc:message");
      const onDidClientDisconnect = Event$1.any(Event$1.signal(createScopedOnMessageEvent(id2, "_ipc:disconnect")), onDidClientReconnect.event);
      const protocol = new Protocol(webContents, onMessage);
      return { protocol, onDidClientDisconnect };
    });
  }
  constructor() {
    super(_b.getOnDidClientConnect());
  }
}, __publicField(_b, "Clients", /* @__PURE__ */ new Map()), _b);
function createServer() {
  ipcMain.handle("_ipc:get-context", ({ sender }) => {
    var _a2;
    const windowId = (_a2 = BrowserWindow.fromId(sender.id)) == null ? void 0 : _a2.id;
    return windowId;
  });
  return new Server();
}
var DisposableStore2 = class {
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
var Disposable = (_c = class {
  constructor() {
    __publicField(this, "_store", new DisposableStore2());
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
}, __publicField(_c, "None", Object.freeze({ dispose() {
} })), _c);
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
var UniqueContainer2 = class {
  constructor(value) {
    __publicField(this, "stack");
    __publicField(this, "id", id++);
    this.value = value;
  }
};
var EventDeliveryQueuePrivate2 = class {
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
var Emitter2 = class {
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
    else if (this._listeners instanceof UniqueContainer2) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
  }
  get event() {
    this._event = (callback, thisArgs, disposables) => {
      var _a2, _b2, _c2, _d;
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer2(callback);
      if (!this._listeners) {
        (_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b2.call(_a2, this);
        this._listeners = contained;
        (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidAddFirstListener) == null ? void 0 : _d.call(_c2, this);
      } else if (this._listeners instanceof UniqueContainer2) {
        this._deliveryQueue ?? (this._deliveryQueue = new EventDeliveryQueuePrivate2());
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._size++;
      const result = toDisposable(() => {
        this._removeListener(contained);
      });
      if (disposables instanceof DisposableStore2) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
      }
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    var _a2, _b2, _c2, _d;
    (_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b2.call(_a2, this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidRemoveLastListener) == null ? void 0 : _d.call(_c2, this);
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
    var _a2, _b2, _c2;
    if (!this._disposed) {
      this._disposed = true;
      if (((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        this._listeners = void 0;
        this._size = 0;
      }
      (_c2 = (_b2 = this._options) == null ? void 0 : _b2.onDidRemoveLastListener) == null ? void 0 : _c2.call(_b2);
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
    const emitter = new Emitter2({
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
    const emitter = new Emitter2(options);
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
    const result = new Emitter2({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
})(Event || (Event = {}));
var hasBuffer = typeof Buffer !== "undefined";
var ELBuffer = class _ELBuffer2 {
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
    return new _ELBuffer2(actual);
  }
  writeUInt8(value, offset) {
    writeUInt8(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8(this.buffer, offset);
  }
  static alloc(byteLength) {
    if (hasBuffer) {
      return new _ELBuffer2(Buffer.allocUnsafe(byteLength));
    } else {
      return new _ELBuffer2(new Uint8Array(byteLength));
    }
  }
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const ret = _ELBuffer2.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      ret.set(element, offset);
      offset += element.byteLength;
    }
    return ret;
  }
  set(array, offset) {
    if (array instanceof _ELBuffer2) {
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
    return new _ELBuffer2(this.buffer.subarray(start, end));
  }
  static fromString(source, options) {
    const dontUseNodeBuffer = (options == null ? void 0 : options.dontUseNodeBuffer) || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new _ELBuffer2(Buffer.from(source));
    } else {
      if (!textEncoder) {
        textEncoder = new TextEncoder();
      }
      return new _ELBuffer2(textEncoder.encode(source));
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
function isUpperAsciiLetter(code) {
  return code >= 65 && code <= 90;
}
function revive(obj, depth = 0) {
  if (!obj || depth > 200) {
    return obj;
  }
  if (typeof obj === "object") {
    switch (obj.$mid) {
      case 2:
        return new RegExp(obj.source, obj.flags);
      case 17:
        return new Date(obj.source);
    }
    if (obj instanceof ELBuffer || obj instanceof Uint8Array) {
      return obj;
    }
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; ++i) {
        obj[i] = revive(obj[i], depth + 1);
      }
    } else {
      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          obj[key] = revive(obj[key], depth + 1);
        }
      }
    }
  }
  return obj;
}
var ProxyChannel;
((ProxyChannel2) => {
  function propertyIsDynamicEvent(name) {
    return name.startsWith("onDynamic") && isUpperAsciiLetter(name.charCodeAt(9));
  }
  function propertyIsEvent(name) {
    return name[0] === "o" && name[1] === "n" && isUpperAsciiLetter(name.charCodeAt(2));
  }
  function fromService(service, disposables, options) {
    const handler = service;
    const disableMarshalling = options && options.disableMarshalling;
    const mapEventNameToEvent = /* @__PURE__ */ new Map();
    for (const key in handler) {
      if (propertyIsEvent(key)) {
        mapEventNameToEvent.set(key, Event.buffer(handler[key], true, void 0, disposables));
      }
    }
    return new class {
      listen(_, event, arg) {
        const eventImpl = mapEventNameToEvent.get(event);
        if (eventImpl) {
          return eventImpl;
        }
        const target = handler[event];
        if (typeof target === "function") {
          if (propertyIsDynamicEvent(event)) {
            return target.call(handler, arg);
          }
          if (propertyIsEvent(event)) {
            mapEventNameToEvent.set(event, Event.buffer(handler[event], true, void 0, disposables));
            return mapEventNameToEvent.get(event);
          }
        }
        throw new Error(`Event not found: ${event}`);
      }
      call(_, command, args) {
        const target = handler[command];
        if (typeof target === "function") {
          if (!disableMarshalling && Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
              args[i] = revive(args[i]);
            }
          }
          let res = target.apply(handler, args);
          if (!(res instanceof Promise)) {
            res = Promise.resolve(res);
          }
          return res;
        }
        throw new Error(`Method not found: ${command}`);
      }
    }();
  }
  ProxyChannel2.fromService = fromService;
  function toService(channel, options) {
    return new Proxy({}, {
      get(_target, propKey) {
        var _a2;
        if (typeof propKey === "string") {
          if ((_a2 = options == null ? void 0 : options.properties) == null ? void 0 : _a2.has(propKey)) {
            return options.properties.get(propKey);
          }
          return async function(...args) {
            const result = await channel.call(propKey, args);
            return result;
          };
        }
        throw new Error(`Property not found: ${String(propKey)}`);
      }
    });
  }
  ProxyChannel2.toService = toService;
})(ProxyChannel || (ProxyChannel = {}));
class FileSystemService {
  stat(source) {
    return fs.stat(source);
  }
}
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  const server = createServer();
  const disposables = new DisposableStore2();
  server.registerChannel("fileSystem", ProxyChannel.fromService(new FileSystemService(), disposables));
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
