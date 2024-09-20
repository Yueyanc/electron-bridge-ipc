var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ipcMain, BrowserWindow, app } from "electron";
import fs from "node:fs/promises";
class DisposableStore {
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
}
class Disposable {
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
}
__publicField(Disposable, "None", Object.freeze({ dispose() {
} }));
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
let id = 0;
class UniqueContainer {
  constructor(value) {
    __publicField(this, "stack");
    __publicField(this, "id", id++);
    this.value = value;
  }
}
class EventDeliveryQueuePrivate {
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
}
function addAndReturnDisposable(d, store) {
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
class Emitter {
  constructor(options) {
    __publicField(this, "_listeners");
    __publicField(this, "_deliveryQueue");
    __publicField(this, "_disposed");
    __publicField(this, "_options");
    __publicField(this, "_event");
    __publicField(this, "_size", 0);
    var _a;
    this._options = options;
    this._deliveryQueue = (_a = this._options) == null ? void 0 : _a.deliveryQueue;
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
    var _a;
    if ((_a = this._deliveryQueue) == null ? void 0 : _a.current) {
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
      var _a, _b, _c, _d;
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      if (!this._listeners) {
        (_b = (_a = this._options) == null ? void 0 : _a.onWillAddFirstListener) == null ? void 0 : _b.call(_a, this);
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
    var _a, _b, _c, _d;
    (_b = (_a = this._options) == null ? void 0 : _a.onWillRemoveListener) == null ? void 0 : _b.call(_a, this);
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
    var _a, _b, _c;
    if (!this._disposed) {
      this._disposed = true;
      if (((_a = this._deliveryQueue) == null ? void 0 : _a.current) === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        this._listeners = void 0;
        this._size = 0;
      }
      (_c = (_b = this._options) == null ? void 0 : _b.onDidRemoveLastListener) == null ? void 0 : _c.call(_b);
    }
  }
}
class Relay {
  constructor() {
    __publicField(this, "listening", false);
    __publicField(this, "inputEvent", Event.None);
    __publicField(this, "inputEventListener", Disposable.None);
    __publicField(this, "emitter", new Emitter({
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
}
class EventMultiplexer {
  constructor() {
    __publicField(this, "emitter");
    __publicField(this, "hasListeners", false);
    __publicField(this, "events", []);
    this.emitter = new Emitter({
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
    return toDisposable(createSingleCallFunction(dispose2));
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
    var _a;
    (_a = e.listener) == null ? void 0 : _a.dispose();
    e.listener = null;
  }
  dispose() {
    var _a;
    this.emitter.dispose();
    for (const e of this.events) {
      (_a = e.listener) == null ? void 0 : _a.dispose();
    }
    this.events = [];
  }
}
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
const shortcutEvent = Object.freeze((callback, context) => {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
class MutableToken {
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
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
}
class CancellationTokenSource {
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
    var _a;
    if (cancel) {
      this.cancel();
    }
    (_a = this._parentListener) == null ? void 0 : _a.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
}
class CancellationError extends Error {
  constructor() {
    super("Canceled");
    this.name = this.message;
  }
}
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
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
const hasBuffer = typeof Buffer !== "undefined";
class ELBuffer {
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
    return new ELBuffer(actual);
  }
  writeUInt8(value, offset) {
    writeUInt8(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8(this.buffer, offset);
  }
  static alloc(byteLength) {
    if (hasBuffer) {
      return new ELBuffer(Buffer.allocUnsafe(byteLength));
    } else {
      return new ELBuffer(new Uint8Array(byteLength));
    }
  }
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const ret = ELBuffer.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      ret.set(element, offset);
      offset += element.byteLength;
    }
    return ret;
  }
  set(array, offset) {
    if (array instanceof ELBuffer) {
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
    return new ELBuffer(this.buffer.subarray(start, end));
  }
  static fromString(source, options) {
    const dontUseNodeBuffer = (options == null ? void 0 : options.dontUseNodeBuffer) || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new ELBuffer(Buffer.from(source));
    } else {
      if (!textEncoder) {
        textEncoder = new TextEncoder();
      }
      return new ELBuffer(textEncoder.encode(source));
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
}
let textEncoder;
let textDecoder;
const BufferPresets = {
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
};
function createOneByteBuffer(value) {
  const result = ELBuffer.alloc(1);
  result.writeUInt8(value, 0);
  return result;
}
const vqlZero = createOneByteBuffer(0);
function writeInt32VQL(writer, value) {
  if (value === 0) {
    writer.write(vqlZero);
    return;
  }
  let len = 0;
  for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
    len++;
  }
  const scratch = ELBuffer.alloc(len);
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
function writeUInt8(destination, value, offset) {
  destination[offset] = value;
}
function readUInt8(source, offset) {
  return source[offset];
}
class BufferReader {
  constructor(buffer) {
    __publicField(this, "pos", 0);
    this.buffer = buffer;
  }
  read(bytes) {
    const result = this.buffer.slice(this.pos, this.pos + bytes);
    this.pos += result.byteLength;
    return result;
  }
}
class BufferWriter {
  constructor() {
    __publicField(this, "buffers", []);
  }
  get buffer() {
    return ELBuffer.concat(this.buffers);
  }
  write(buffer) {
    this.buffers.push(buffer);
  }
}
function serialize(writer, data) {
  if (typeof data === "undefined") {
    writer.write(BufferPresets.Undefined);
  } else if (typeof data === "string") {
    const buffer = ELBuffer.fromString(data);
    writer.write(BufferPresets.String);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (hasBuffer && Buffer.isBuffer(data)) {
    const buffer = ELBuffer.wrap(data);
    writer.write(BufferPresets.Buffer);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (data instanceof ELBuffer) {
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
    const buffer = ELBuffer.fromString(JSON.stringify(data));
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
class ChannelClient {
  constructor(protocol) {
    __publicField(this, "protocolListener");
    __publicField(this, "state", 0);
    __publicField(this, "activeRequests", /* @__PURE__ */ new Set());
    __publicField(this, "lastRequestId", 0);
    __publicField(this, "handlers", /* @__PURE__ */ new Map());
    __publicField(this, "_onDidInitialize", new Emitter());
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
          return Event.None;
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
    const emitter = new Emitter({
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
    return Event.toPromise(this.onDidInitialize);
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
      disposable = combinedDisposable(toDisposable(cancel), cancellationTokenListener);
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
    dispose(this.activeRequests.values());
    this.activeRequests.clear();
  }
}
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
class ChannelServer {
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
    const disposable = toDisposable(() => {
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
    dispose(this.activeRequests.values());
    this.activeRequests.clear();
  }
}
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
class IPCServer {
  constructor(onDidClientConnect) {
    __publicField(this, "channels", /* @__PURE__ */ new Map());
    __publicField(this, "_connections", /* @__PURE__ */ new Set());
    __publicField(this, "_onDidAddConnection", new Emitter());
    __publicField(this, "onDidAddConnection", this._onDidAddConnection.event);
    __publicField(this, "_onDidRemoveConnection", new Emitter());
    __publicField(this, "onDidRemoveConnection", this._onDidRemoveConnection.event);
    __publicField(this, "disposables", new DisposableStore());
    this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
      const onFirstMessage = Event.once(protocol.onMessage);
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
          connectionPromise = connection ? Promise.resolve(connection) : Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter));
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
    const emitter = new Emitter({
      onWillAddFirstListener: () => {
        disposables = new DisposableStore();
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
        Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, void 0, disposables);
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
}
class Protocol {
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
}
function createScopedOnMessageEvent(senderId, eventName) {
  const onMessage = Event.fromNodeEventEmitter(ipcMain, eventName, (event, message) => ({ event, message }));
  const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId);
  return Event.map(onMessageFromSender, ({ message }) => message ? ELBuffer.wrap(message) : message);
}
const _Server = class _Server extends IPCServer {
  static getOnDidClientConnect() {
    const onHello = Event.fromNodeEventEmitter(ipcMain, "_ipc:hello", ({ sender }) => sender);
    return Event.map(onHello, (webContents) => {
      const id2 = webContents.id;
      const client = _Server.Clients.get(id2);
      client == null ? void 0 : client.dispose();
      const onDidClientReconnect = new Emitter();
      _Server.Clients.set(id2, toDisposable(() => onDidClientReconnect.fire()));
      const onMessage = createScopedOnMessageEvent(id2, "_ipc:message");
      const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id2, "_ipc:disconnect")), onDidClientReconnect.event);
      const protocol = new Protocol(webContents, onMessage);
      return { protocol, onDidClientDisconnect };
    });
  }
  constructor() {
    super(_Server.getOnDidClientConnect());
  }
};
__publicField(_Server, "Clients", /* @__PURE__ */ new Map());
let Server = _Server;
function createServer() {
  ipcMain.handle("_ipc:get-context", ({ sender }) => {
    var _a;
    const windowId = (_a = BrowserWindow.fromId(sender.id)) == null ? void 0 : _a.id;
    return windowId;
  });
  return new Server();
}
var CharCode = /* @__PURE__ */ ((CharCode2) => {
  CharCode2[CharCode2["Null"] = 0] = "Null";
  CharCode2[CharCode2["Backspace"] = 8] = "Backspace";
  CharCode2[CharCode2["Tab"] = 9] = "Tab";
  CharCode2[CharCode2["LineFeed"] = 10] = "LineFeed";
  CharCode2[CharCode2["CarriageReturn"] = 13] = "CarriageReturn";
  CharCode2[CharCode2["Space"] = 32] = "Space";
  CharCode2[CharCode2["ExclamationMark"] = 33] = "ExclamationMark";
  CharCode2[CharCode2["DoubleQuote"] = 34] = "DoubleQuote";
  CharCode2[CharCode2["Hash"] = 35] = "Hash";
  CharCode2[CharCode2["DollarSign"] = 36] = "DollarSign";
  CharCode2[CharCode2["PercentSign"] = 37] = "PercentSign";
  CharCode2[CharCode2["Ampersand"] = 38] = "Ampersand";
  CharCode2[CharCode2["SingleQuote"] = 39] = "SingleQuote";
  CharCode2[CharCode2["OpenParen"] = 40] = "OpenParen";
  CharCode2[CharCode2["CloseParen"] = 41] = "CloseParen";
  CharCode2[CharCode2["Asterisk"] = 42] = "Asterisk";
  CharCode2[CharCode2["Plus"] = 43] = "Plus";
  CharCode2[CharCode2["Comma"] = 44] = "Comma";
  CharCode2[CharCode2["Dash"] = 45] = "Dash";
  CharCode2[CharCode2["Period"] = 46] = "Period";
  CharCode2[CharCode2["Slash"] = 47] = "Slash";
  CharCode2[CharCode2["Digit0"] = 48] = "Digit0";
  CharCode2[CharCode2["Digit1"] = 49] = "Digit1";
  CharCode2[CharCode2["Digit2"] = 50] = "Digit2";
  CharCode2[CharCode2["Digit3"] = 51] = "Digit3";
  CharCode2[CharCode2["Digit4"] = 52] = "Digit4";
  CharCode2[CharCode2["Digit5"] = 53] = "Digit5";
  CharCode2[CharCode2["Digit6"] = 54] = "Digit6";
  CharCode2[CharCode2["Digit7"] = 55] = "Digit7";
  CharCode2[CharCode2["Digit8"] = 56] = "Digit8";
  CharCode2[CharCode2["Digit9"] = 57] = "Digit9";
  CharCode2[CharCode2["Colon"] = 58] = "Colon";
  CharCode2[CharCode2["Semicolon"] = 59] = "Semicolon";
  CharCode2[CharCode2["LessThan"] = 60] = "LessThan";
  CharCode2[CharCode2["Equals"] = 61] = "Equals";
  CharCode2[CharCode2["GreaterThan"] = 62] = "GreaterThan";
  CharCode2[CharCode2["QuestionMark"] = 63] = "QuestionMark";
  CharCode2[CharCode2["AtSign"] = 64] = "AtSign";
  CharCode2[CharCode2["A"] = 65] = "A";
  CharCode2[CharCode2["B"] = 66] = "B";
  CharCode2[CharCode2["C"] = 67] = "C";
  CharCode2[CharCode2["D"] = 68] = "D";
  CharCode2[CharCode2["E"] = 69] = "E";
  CharCode2[CharCode2["F"] = 70] = "F";
  CharCode2[CharCode2["G"] = 71] = "G";
  CharCode2[CharCode2["H"] = 72] = "H";
  CharCode2[CharCode2["I"] = 73] = "I";
  CharCode2[CharCode2["J"] = 74] = "J";
  CharCode2[CharCode2["K"] = 75] = "K";
  CharCode2[CharCode2["L"] = 76] = "L";
  CharCode2[CharCode2["M"] = 77] = "M";
  CharCode2[CharCode2["N"] = 78] = "N";
  CharCode2[CharCode2["O"] = 79] = "O";
  CharCode2[CharCode2["P"] = 80] = "P";
  CharCode2[CharCode2["Q"] = 81] = "Q";
  CharCode2[CharCode2["R"] = 82] = "R";
  CharCode2[CharCode2["S"] = 83] = "S";
  CharCode2[CharCode2["T"] = 84] = "T";
  CharCode2[CharCode2["U"] = 85] = "U";
  CharCode2[CharCode2["V"] = 86] = "V";
  CharCode2[CharCode2["W"] = 87] = "W";
  CharCode2[CharCode2["X"] = 88] = "X";
  CharCode2[CharCode2["Y"] = 89] = "Y";
  CharCode2[CharCode2["Z"] = 90] = "Z";
  CharCode2[CharCode2["OpenSquareBracket"] = 91] = "OpenSquareBracket";
  CharCode2[CharCode2["Backslash"] = 92] = "Backslash";
  CharCode2[CharCode2["CloseSquareBracket"] = 93] = "CloseSquareBracket";
  CharCode2[CharCode2["Caret"] = 94] = "Caret";
  CharCode2[CharCode2["Underline"] = 95] = "Underline";
  CharCode2[CharCode2["BackTick"] = 96] = "BackTick";
  CharCode2[CharCode2["a"] = 97] = "a";
  CharCode2[CharCode2["b"] = 98] = "b";
  CharCode2[CharCode2["c"] = 99] = "c";
  CharCode2[CharCode2["d"] = 100] = "d";
  CharCode2[CharCode2["e"] = 101] = "e";
  CharCode2[CharCode2["f"] = 102] = "f";
  CharCode2[CharCode2["g"] = 103] = "g";
  CharCode2[CharCode2["h"] = 104] = "h";
  CharCode2[CharCode2["i"] = 105] = "i";
  CharCode2[CharCode2["j"] = 106] = "j";
  CharCode2[CharCode2["k"] = 107] = "k";
  CharCode2[CharCode2["l"] = 108] = "l";
  CharCode2[CharCode2["m"] = 109] = "m";
  CharCode2[CharCode2["n"] = 110] = "n";
  CharCode2[CharCode2["o"] = 111] = "o";
  CharCode2[CharCode2["p"] = 112] = "p";
  CharCode2[CharCode2["q"] = 113] = "q";
  CharCode2[CharCode2["r"] = 114] = "r";
  CharCode2[CharCode2["s"] = 115] = "s";
  CharCode2[CharCode2["t"] = 116] = "t";
  CharCode2[CharCode2["u"] = 117] = "u";
  CharCode2[CharCode2["v"] = 118] = "v";
  CharCode2[CharCode2["w"] = 119] = "w";
  CharCode2[CharCode2["x"] = 120] = "x";
  CharCode2[CharCode2["y"] = 121] = "y";
  CharCode2[CharCode2["z"] = 122] = "z";
  CharCode2[CharCode2["OpenCurlyBrace"] = 123] = "OpenCurlyBrace";
  CharCode2[CharCode2["Pipe"] = 124] = "Pipe";
  CharCode2[CharCode2["CloseCurlyBrace"] = 125] = "CloseCurlyBrace";
  CharCode2[CharCode2["Tilde"] = 126] = "Tilde";
  CharCode2[CharCode2["NoBreakSpace"] = 160] = "NoBreakSpace";
  CharCode2[CharCode2["U_Combining_Grave_Accent"] = 768] = "U_Combining_Grave_Accent";
  CharCode2[CharCode2["U_Combining_Acute_Accent"] = 769] = "U_Combining_Acute_Accent";
  CharCode2[CharCode2["U_Combining_Circumflex_Accent"] = 770] = "U_Combining_Circumflex_Accent";
  CharCode2[CharCode2["U_Combining_Tilde"] = 771] = "U_Combining_Tilde";
  CharCode2[CharCode2["U_Combining_Macron"] = 772] = "U_Combining_Macron";
  CharCode2[CharCode2["U_Combining_Overline"] = 773] = "U_Combining_Overline";
  CharCode2[CharCode2["U_Combining_Breve"] = 774] = "U_Combining_Breve";
  CharCode2[CharCode2["U_Combining_Dot_Above"] = 775] = "U_Combining_Dot_Above";
  CharCode2[CharCode2["U_Combining_Diaeresis"] = 776] = "U_Combining_Diaeresis";
  CharCode2[CharCode2["U_Combining_Hook_Above"] = 777] = "U_Combining_Hook_Above";
  CharCode2[CharCode2["U_Combining_Ring_Above"] = 778] = "U_Combining_Ring_Above";
  CharCode2[CharCode2["U_Combining_Double_Acute_Accent"] = 779] = "U_Combining_Double_Acute_Accent";
  CharCode2[CharCode2["U_Combining_Caron"] = 780] = "U_Combining_Caron";
  CharCode2[CharCode2["U_Combining_Vertical_Line_Above"] = 781] = "U_Combining_Vertical_Line_Above";
  CharCode2[CharCode2["U_Combining_Double_Vertical_Line_Above"] = 782] = "U_Combining_Double_Vertical_Line_Above";
  CharCode2[CharCode2["U_Combining_Double_Grave_Accent"] = 783] = "U_Combining_Double_Grave_Accent";
  CharCode2[CharCode2["U_Combining_Candrabindu"] = 784] = "U_Combining_Candrabindu";
  CharCode2[CharCode2["U_Combining_Inverted_Breve"] = 785] = "U_Combining_Inverted_Breve";
  CharCode2[CharCode2["U_Combining_Turned_Comma_Above"] = 786] = "U_Combining_Turned_Comma_Above";
  CharCode2[CharCode2["U_Combining_Comma_Above"] = 787] = "U_Combining_Comma_Above";
  CharCode2[CharCode2["U_Combining_Reversed_Comma_Above"] = 788] = "U_Combining_Reversed_Comma_Above";
  CharCode2[CharCode2["U_Combining_Comma_Above_Right"] = 789] = "U_Combining_Comma_Above_Right";
  CharCode2[CharCode2["U_Combining_Grave_Accent_Below"] = 790] = "U_Combining_Grave_Accent_Below";
  CharCode2[CharCode2["U_Combining_Acute_Accent_Below"] = 791] = "U_Combining_Acute_Accent_Below";
  CharCode2[CharCode2["U_Combining_Left_Tack_Below"] = 792] = "U_Combining_Left_Tack_Below";
  CharCode2[CharCode2["U_Combining_Right_Tack_Below"] = 793] = "U_Combining_Right_Tack_Below";
  CharCode2[CharCode2["U_Combining_Left_Angle_Above"] = 794] = "U_Combining_Left_Angle_Above";
  CharCode2[CharCode2["U_Combining_Horn"] = 795] = "U_Combining_Horn";
  CharCode2[CharCode2["U_Combining_Left_Half_Ring_Below"] = 796] = "U_Combining_Left_Half_Ring_Below";
  CharCode2[CharCode2["U_Combining_Up_Tack_Below"] = 797] = "U_Combining_Up_Tack_Below";
  CharCode2[CharCode2["U_Combining_Down_Tack_Below"] = 798] = "U_Combining_Down_Tack_Below";
  CharCode2[CharCode2["U_Combining_Plus_Sign_Below"] = 799] = "U_Combining_Plus_Sign_Below";
  CharCode2[CharCode2["U_Combining_Minus_Sign_Below"] = 800] = "U_Combining_Minus_Sign_Below";
  CharCode2[CharCode2["U_Combining_Palatalized_Hook_Below"] = 801] = "U_Combining_Palatalized_Hook_Below";
  CharCode2[CharCode2["U_Combining_Retroflex_Hook_Below"] = 802] = "U_Combining_Retroflex_Hook_Below";
  CharCode2[CharCode2["U_Combining_Dot_Below"] = 803] = "U_Combining_Dot_Below";
  CharCode2[CharCode2["U_Combining_Diaeresis_Below"] = 804] = "U_Combining_Diaeresis_Below";
  CharCode2[CharCode2["U_Combining_Ring_Below"] = 805] = "U_Combining_Ring_Below";
  CharCode2[CharCode2["U_Combining_Comma_Below"] = 806] = "U_Combining_Comma_Below";
  CharCode2[CharCode2["U_Combining_Cedilla"] = 807] = "U_Combining_Cedilla";
  CharCode2[CharCode2["U_Combining_Ogonek"] = 808] = "U_Combining_Ogonek";
  CharCode2[CharCode2["U_Combining_Vertical_Line_Below"] = 809] = "U_Combining_Vertical_Line_Below";
  CharCode2[CharCode2["U_Combining_Bridge_Below"] = 810] = "U_Combining_Bridge_Below";
  CharCode2[CharCode2["U_Combining_Inverted_Double_Arch_Below"] = 811] = "U_Combining_Inverted_Double_Arch_Below";
  CharCode2[CharCode2["U_Combining_Caron_Below"] = 812] = "U_Combining_Caron_Below";
  CharCode2[CharCode2["U_Combining_Circumflex_Accent_Below"] = 813] = "U_Combining_Circumflex_Accent_Below";
  CharCode2[CharCode2["U_Combining_Breve_Below"] = 814] = "U_Combining_Breve_Below";
  CharCode2[CharCode2["U_Combining_Inverted_Breve_Below"] = 815] = "U_Combining_Inverted_Breve_Below";
  CharCode2[CharCode2["U_Combining_Tilde_Below"] = 816] = "U_Combining_Tilde_Below";
  CharCode2[CharCode2["U_Combining_Macron_Below"] = 817] = "U_Combining_Macron_Below";
  CharCode2[CharCode2["U_Combining_Low_Line"] = 818] = "U_Combining_Low_Line";
  CharCode2[CharCode2["U_Combining_Double_Low_Line"] = 819] = "U_Combining_Double_Low_Line";
  CharCode2[CharCode2["U_Combining_Tilde_Overlay"] = 820] = "U_Combining_Tilde_Overlay";
  CharCode2[CharCode2["U_Combining_Short_Stroke_Overlay"] = 821] = "U_Combining_Short_Stroke_Overlay";
  CharCode2[CharCode2["U_Combining_Long_Stroke_Overlay"] = 822] = "U_Combining_Long_Stroke_Overlay";
  CharCode2[CharCode2["U_Combining_Short_Solidus_Overlay"] = 823] = "U_Combining_Short_Solidus_Overlay";
  CharCode2[CharCode2["U_Combining_Long_Solidus_Overlay"] = 824] = "U_Combining_Long_Solidus_Overlay";
  CharCode2[CharCode2["U_Combining_Right_Half_Ring_Below"] = 825] = "U_Combining_Right_Half_Ring_Below";
  CharCode2[CharCode2["U_Combining_Inverted_Bridge_Below"] = 826] = "U_Combining_Inverted_Bridge_Below";
  CharCode2[CharCode2["U_Combining_Square_Below"] = 827] = "U_Combining_Square_Below";
  CharCode2[CharCode2["U_Combining_Seagull_Below"] = 828] = "U_Combining_Seagull_Below";
  CharCode2[CharCode2["U_Combining_X_Above"] = 829] = "U_Combining_X_Above";
  CharCode2[CharCode2["U_Combining_Vertical_Tilde"] = 830] = "U_Combining_Vertical_Tilde";
  CharCode2[CharCode2["U_Combining_Double_Overline"] = 831] = "U_Combining_Double_Overline";
  CharCode2[CharCode2["U_Combining_Grave_Tone_Mark"] = 832] = "U_Combining_Grave_Tone_Mark";
  CharCode2[CharCode2["U_Combining_Acute_Tone_Mark"] = 833] = "U_Combining_Acute_Tone_Mark";
  CharCode2[CharCode2["U_Combining_Greek_Perispomeni"] = 834] = "U_Combining_Greek_Perispomeni";
  CharCode2[CharCode2["U_Combining_Greek_Koronis"] = 835] = "U_Combining_Greek_Koronis";
  CharCode2[CharCode2["U_Combining_Greek_Dialytika_Tonos"] = 836] = "U_Combining_Greek_Dialytika_Tonos";
  CharCode2[CharCode2["U_Combining_Greek_Ypogegrammeni"] = 837] = "U_Combining_Greek_Ypogegrammeni";
  CharCode2[CharCode2["U_Combining_Bridge_Above"] = 838] = "U_Combining_Bridge_Above";
  CharCode2[CharCode2["U_Combining_Equals_Sign_Below"] = 839] = "U_Combining_Equals_Sign_Below";
  CharCode2[CharCode2["U_Combining_Double_Vertical_Line_Below"] = 840] = "U_Combining_Double_Vertical_Line_Below";
  CharCode2[CharCode2["U_Combining_Left_Angle_Below"] = 841] = "U_Combining_Left_Angle_Below";
  CharCode2[CharCode2["U_Combining_Not_Tilde_Above"] = 842] = "U_Combining_Not_Tilde_Above";
  CharCode2[CharCode2["U_Combining_Homothetic_Above"] = 843] = "U_Combining_Homothetic_Above";
  CharCode2[CharCode2["U_Combining_Almost_Equal_To_Above"] = 844] = "U_Combining_Almost_Equal_To_Above";
  CharCode2[CharCode2["U_Combining_Left_Right_Arrow_Below"] = 845] = "U_Combining_Left_Right_Arrow_Below";
  CharCode2[CharCode2["U_Combining_Upwards_Arrow_Below"] = 846] = "U_Combining_Upwards_Arrow_Below";
  CharCode2[CharCode2["U_Combining_Grapheme_Joiner"] = 847] = "U_Combining_Grapheme_Joiner";
  CharCode2[CharCode2["U_Combining_Right_Arrowhead_Above"] = 848] = "U_Combining_Right_Arrowhead_Above";
  CharCode2[CharCode2["U_Combining_Left_Half_Ring_Above"] = 849] = "U_Combining_Left_Half_Ring_Above";
  CharCode2[CharCode2["U_Combining_Fermata"] = 850] = "U_Combining_Fermata";
  CharCode2[CharCode2["U_Combining_X_Below"] = 851] = "U_Combining_X_Below";
  CharCode2[CharCode2["U_Combining_Left_Arrowhead_Below"] = 852] = "U_Combining_Left_Arrowhead_Below";
  CharCode2[CharCode2["U_Combining_Right_Arrowhead_Below"] = 853] = "U_Combining_Right_Arrowhead_Below";
  CharCode2[CharCode2["U_Combining_Right_Arrowhead_And_Up_Arrowhead_Below"] = 854] = "U_Combining_Right_Arrowhead_And_Up_Arrowhead_Below";
  CharCode2[CharCode2["U_Combining_Right_Half_Ring_Above"] = 855] = "U_Combining_Right_Half_Ring_Above";
  CharCode2[CharCode2["U_Combining_Dot_Above_Right"] = 856] = "U_Combining_Dot_Above_Right";
  CharCode2[CharCode2["U_Combining_Asterisk_Below"] = 857] = "U_Combining_Asterisk_Below";
  CharCode2[CharCode2["U_Combining_Double_Ring_Below"] = 858] = "U_Combining_Double_Ring_Below";
  CharCode2[CharCode2["U_Combining_Zigzag_Above"] = 859] = "U_Combining_Zigzag_Above";
  CharCode2[CharCode2["U_Combining_Double_Breve_Below"] = 860] = "U_Combining_Double_Breve_Below";
  CharCode2[CharCode2["U_Combining_Double_Breve"] = 861] = "U_Combining_Double_Breve";
  CharCode2[CharCode2["U_Combining_Double_Macron"] = 862] = "U_Combining_Double_Macron";
  CharCode2[CharCode2["U_Combining_Double_Macron_Below"] = 863] = "U_Combining_Double_Macron_Below";
  CharCode2[CharCode2["U_Combining_Double_Tilde"] = 864] = "U_Combining_Double_Tilde";
  CharCode2[CharCode2["U_Combining_Double_Inverted_Breve"] = 865] = "U_Combining_Double_Inverted_Breve";
  CharCode2[CharCode2["U_Combining_Double_Rightwards_Arrow_Below"] = 866] = "U_Combining_Double_Rightwards_Arrow_Below";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_A"] = 867] = "U_Combining_Latin_Small_Letter_A";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_E"] = 868] = "U_Combining_Latin_Small_Letter_E";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_I"] = 869] = "U_Combining_Latin_Small_Letter_I";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_O"] = 870] = "U_Combining_Latin_Small_Letter_O";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_U"] = 871] = "U_Combining_Latin_Small_Letter_U";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_C"] = 872] = "U_Combining_Latin_Small_Letter_C";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_D"] = 873] = "U_Combining_Latin_Small_Letter_D";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_H"] = 874] = "U_Combining_Latin_Small_Letter_H";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_M"] = 875] = "U_Combining_Latin_Small_Letter_M";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_R"] = 876] = "U_Combining_Latin_Small_Letter_R";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_T"] = 877] = "U_Combining_Latin_Small_Letter_T";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_V"] = 878] = "U_Combining_Latin_Small_Letter_V";
  CharCode2[CharCode2["U_Combining_Latin_Small_Letter_X"] = 879] = "U_Combining_Latin_Small_Letter_X";
  CharCode2[CharCode2["LINE_SEPARATOR"] = 8232] = "LINE_SEPARATOR";
  CharCode2[CharCode2["PARAGRAPH_SEPARATOR"] = 8233] = "PARAGRAPH_SEPARATOR";
  CharCode2[CharCode2["NEXT_LINE"] = 133] = "NEXT_LINE";
  CharCode2[CharCode2["U_CIRCUMFLEX"] = 94] = "U_CIRCUMFLEX";
  CharCode2[CharCode2["U_GRAVE_ACCENT"] = 96] = "U_GRAVE_ACCENT";
  CharCode2[CharCode2["U_DIAERESIS"] = 168] = "U_DIAERESIS";
  CharCode2[CharCode2["U_MACRON"] = 175] = "U_MACRON";
  CharCode2[CharCode2["U_ACUTE_ACCENT"] = 180] = "U_ACUTE_ACCENT";
  CharCode2[CharCode2["U_CEDILLA"] = 184] = "U_CEDILLA";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LEFT_ARROWHEAD"] = 706] = "U_MODIFIER_LETTER_LEFT_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_RIGHT_ARROWHEAD"] = 707] = "U_MODIFIER_LETTER_RIGHT_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_UP_ARROWHEAD"] = 708] = "U_MODIFIER_LETTER_UP_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_DOWN_ARROWHEAD"] = 709] = "U_MODIFIER_LETTER_DOWN_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_CENTRED_RIGHT_HALF_RING"] = 722] = "U_MODIFIER_LETTER_CENTRED_RIGHT_HALF_RING";
  CharCode2[CharCode2["U_MODIFIER_LETTER_CENTRED_LEFT_HALF_RING"] = 723] = "U_MODIFIER_LETTER_CENTRED_LEFT_HALF_RING";
  CharCode2[CharCode2["U_MODIFIER_LETTER_UP_TACK"] = 724] = "U_MODIFIER_LETTER_UP_TACK";
  CharCode2[CharCode2["U_MODIFIER_LETTER_DOWN_TACK"] = 725] = "U_MODIFIER_LETTER_DOWN_TACK";
  CharCode2[CharCode2["U_MODIFIER_LETTER_PLUS_SIGN"] = 726] = "U_MODIFIER_LETTER_PLUS_SIGN";
  CharCode2[CharCode2["U_MODIFIER_LETTER_MINUS_SIGN"] = 727] = "U_MODIFIER_LETTER_MINUS_SIGN";
  CharCode2[CharCode2["U_BREVE"] = 728] = "U_BREVE";
  CharCode2[CharCode2["U_DOT_ABOVE"] = 729] = "U_DOT_ABOVE";
  CharCode2[CharCode2["U_RING_ABOVE"] = 730] = "U_RING_ABOVE";
  CharCode2[CharCode2["U_OGONEK"] = 731] = "U_OGONEK";
  CharCode2[CharCode2["U_SMALL_TILDE"] = 732] = "U_SMALL_TILDE";
  CharCode2[CharCode2["U_DOUBLE_ACUTE_ACCENT"] = 733] = "U_DOUBLE_ACUTE_ACCENT";
  CharCode2[CharCode2["U_MODIFIER_LETTER_RHOTIC_HOOK"] = 734] = "U_MODIFIER_LETTER_RHOTIC_HOOK";
  CharCode2[CharCode2["U_MODIFIER_LETTER_CROSS_ACCENT"] = 735] = "U_MODIFIER_LETTER_CROSS_ACCENT";
  CharCode2[CharCode2["U_MODIFIER_LETTER_EXTRA_HIGH_TONE_BAR"] = 741] = "U_MODIFIER_LETTER_EXTRA_HIGH_TONE_BAR";
  CharCode2[CharCode2["U_MODIFIER_LETTER_HIGH_TONE_BAR"] = 742] = "U_MODIFIER_LETTER_HIGH_TONE_BAR";
  CharCode2[CharCode2["U_MODIFIER_LETTER_MID_TONE_BAR"] = 743] = "U_MODIFIER_LETTER_MID_TONE_BAR";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_TONE_BAR"] = 744] = "U_MODIFIER_LETTER_LOW_TONE_BAR";
  CharCode2[CharCode2["U_MODIFIER_LETTER_EXTRA_LOW_TONE_BAR"] = 745] = "U_MODIFIER_LETTER_EXTRA_LOW_TONE_BAR";
  CharCode2[CharCode2["U_MODIFIER_LETTER_YIN_DEPARTING_TONE_MARK"] = 746] = "U_MODIFIER_LETTER_YIN_DEPARTING_TONE_MARK";
  CharCode2[CharCode2["U_MODIFIER_LETTER_YANG_DEPARTING_TONE_MARK"] = 747] = "U_MODIFIER_LETTER_YANG_DEPARTING_TONE_MARK";
  CharCode2[CharCode2["U_MODIFIER_LETTER_UNASPIRATED"] = 749] = "U_MODIFIER_LETTER_UNASPIRATED";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_DOWN_ARROWHEAD"] = 751] = "U_MODIFIER_LETTER_LOW_DOWN_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_UP_ARROWHEAD"] = 752] = "U_MODIFIER_LETTER_LOW_UP_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_LEFT_ARROWHEAD"] = 753] = "U_MODIFIER_LETTER_LOW_LEFT_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_RIGHT_ARROWHEAD"] = 754] = "U_MODIFIER_LETTER_LOW_RIGHT_ARROWHEAD";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_RING"] = 755] = "U_MODIFIER_LETTER_LOW_RING";
  CharCode2[CharCode2["U_MODIFIER_LETTER_MIDDLE_GRAVE_ACCENT"] = 756] = "U_MODIFIER_LETTER_MIDDLE_GRAVE_ACCENT";
  CharCode2[CharCode2["U_MODIFIER_LETTER_MIDDLE_DOUBLE_GRAVE_ACCENT"] = 757] = "U_MODIFIER_LETTER_MIDDLE_DOUBLE_GRAVE_ACCENT";
  CharCode2[CharCode2["U_MODIFIER_LETTER_MIDDLE_DOUBLE_ACUTE_ACCENT"] = 758] = "U_MODIFIER_LETTER_MIDDLE_DOUBLE_ACUTE_ACCENT";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_TILDE"] = 759] = "U_MODIFIER_LETTER_LOW_TILDE";
  CharCode2[CharCode2["U_MODIFIER_LETTER_RAISED_COLON"] = 760] = "U_MODIFIER_LETTER_RAISED_COLON";
  CharCode2[CharCode2["U_MODIFIER_LETTER_BEGIN_HIGH_TONE"] = 761] = "U_MODIFIER_LETTER_BEGIN_HIGH_TONE";
  CharCode2[CharCode2["U_MODIFIER_LETTER_END_HIGH_TONE"] = 762] = "U_MODIFIER_LETTER_END_HIGH_TONE";
  CharCode2[CharCode2["U_MODIFIER_LETTER_BEGIN_LOW_TONE"] = 763] = "U_MODIFIER_LETTER_BEGIN_LOW_TONE";
  CharCode2[CharCode2["U_MODIFIER_LETTER_END_LOW_TONE"] = 764] = "U_MODIFIER_LETTER_END_LOW_TONE";
  CharCode2[CharCode2["U_MODIFIER_LETTER_SHELF"] = 765] = "U_MODIFIER_LETTER_SHELF";
  CharCode2[CharCode2["U_MODIFIER_LETTER_OPEN_SHELF"] = 766] = "U_MODIFIER_LETTER_OPEN_SHELF";
  CharCode2[CharCode2["U_MODIFIER_LETTER_LOW_LEFT_ARROW"] = 767] = "U_MODIFIER_LETTER_LOW_LEFT_ARROW";
  CharCode2[CharCode2["U_GREEK_LOWER_NUMERAL_SIGN"] = 885] = "U_GREEK_LOWER_NUMERAL_SIGN";
  CharCode2[CharCode2["U_GREEK_TONOS"] = 900] = "U_GREEK_TONOS";
  CharCode2[CharCode2["U_GREEK_DIALYTIKA_TONOS"] = 901] = "U_GREEK_DIALYTIKA_TONOS";
  CharCode2[CharCode2["U_GREEK_KORONIS"] = 8125] = "U_GREEK_KORONIS";
  CharCode2[CharCode2["U_GREEK_PSILI"] = 8127] = "U_GREEK_PSILI";
  CharCode2[CharCode2["U_GREEK_PERISPOMENI"] = 8128] = "U_GREEK_PERISPOMENI";
  CharCode2[CharCode2["U_GREEK_DIALYTIKA_AND_PERISPOMENI"] = 8129] = "U_GREEK_DIALYTIKA_AND_PERISPOMENI";
  CharCode2[CharCode2["U_GREEK_PSILI_AND_VARIA"] = 8141] = "U_GREEK_PSILI_AND_VARIA";
  CharCode2[CharCode2["U_GREEK_PSILI_AND_OXIA"] = 8142] = "U_GREEK_PSILI_AND_OXIA";
  CharCode2[CharCode2["U_GREEK_PSILI_AND_PERISPOMENI"] = 8143] = "U_GREEK_PSILI_AND_PERISPOMENI";
  CharCode2[CharCode2["U_GREEK_DASIA_AND_VARIA"] = 8157] = "U_GREEK_DASIA_AND_VARIA";
  CharCode2[CharCode2["U_GREEK_DASIA_AND_OXIA"] = 8158] = "U_GREEK_DASIA_AND_OXIA";
  CharCode2[CharCode2["U_GREEK_DASIA_AND_PERISPOMENI"] = 8159] = "U_GREEK_DASIA_AND_PERISPOMENI";
  CharCode2[CharCode2["U_GREEK_DIALYTIKA_AND_VARIA"] = 8173] = "U_GREEK_DIALYTIKA_AND_VARIA";
  CharCode2[CharCode2["U_GREEK_DIALYTIKA_AND_OXIA"] = 8174] = "U_GREEK_DIALYTIKA_AND_OXIA";
  CharCode2[CharCode2["U_GREEK_VARIA"] = 8175] = "U_GREEK_VARIA";
  CharCode2[CharCode2["U_GREEK_OXIA"] = 8189] = "U_GREEK_OXIA";
  CharCode2[CharCode2["U_GREEK_DASIA"] = 8190] = "U_GREEK_DASIA";
  CharCode2[CharCode2["U_IDEOGRAPHIC_FULL_STOP"] = 12290] = "U_IDEOGRAPHIC_FULL_STOP";
  CharCode2[CharCode2["U_LEFT_CORNER_BRACKET"] = 12300] = "U_LEFT_CORNER_BRACKET";
  CharCode2[CharCode2["U_RIGHT_CORNER_BRACKET"] = 12301] = "U_RIGHT_CORNER_BRACKET";
  CharCode2[CharCode2["U_LEFT_BLACK_LENTICULAR_BRACKET"] = 12304] = "U_LEFT_BLACK_LENTICULAR_BRACKET";
  CharCode2[CharCode2["U_RIGHT_BLACK_LENTICULAR_BRACKET"] = 12305] = "U_RIGHT_BLACK_LENTICULAR_BRACKET";
  CharCode2[CharCode2["U_OVERLINE"] = 8254] = "U_OVERLINE";
  CharCode2[CharCode2["UTF8_BOM"] = 65279] = "UTF8_BOM";
  CharCode2[CharCode2["U_FULLWIDTH_SEMICOLON"] = 65307] = "U_FULLWIDTH_SEMICOLON";
  CharCode2[CharCode2["U_FULLWIDTH_COMMA"] = 65292] = "U_FULLWIDTH_COMMA";
  return CharCode2;
})(CharCode || {});
function isUpperAsciiLetter(code) {
  return code >= CharCode.A && code <= CharCode.Z;
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
        var _a;
        if (typeof propKey === "string") {
          if ((_a = options == null ? void 0 : options.properties) == null ? void 0 : _a.has(propKey)) {
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
  const disposables = new DisposableStore();
  server.registerChannel("fileSystem", ProxyChannel.fromService(new FileSystemService(), disposables));
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
