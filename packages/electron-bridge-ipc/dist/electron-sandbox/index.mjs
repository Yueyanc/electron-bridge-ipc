// common/utils/Disposable.ts
var DisposableStore = class {
  _isDisposed = false;
  _toDispose = /* @__PURE__ */ new Set();
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
var Disposable = class {
  _store = new DisposableStore();
  static None = Object.freeze({ dispose() {
  } });
  dispose() {
    this._store.dispose();
  }
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
};
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

// common/event.ts
var id = 0;
var UniqueContainer = class {
  constructor(value) {
    this.value = value;
  }
  stack;
  id = id++;
};
var EventDeliveryQueuePrivate = class {
  i = -1;
  end = 0;
  current;
  value;
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
  _listeners;
  _deliveryQueue;
  _disposed;
  _options;
  _event;
  _size = 0;
  constructor(options) {
    this._options = options;
    this._deliveryQueue = this._options?.deliveryQueue;
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
    if (this._deliveryQueue?.current) {
      this._deliverQueue(this._deliveryQueue);
    }
    if (!this._listeners) {
    } else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
  }
  get event() {
    this._event = (callback, thisArgs, disposables) => {
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      if (!this._listeners) {
        this._options?.onWillAddFirstListener?.(this);
        this._listeners = contained;
        this._options?.onDidAddFirstListener?.(this);
      } else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ??= new EventDeliveryQueuePrivate();
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
    this._options?.onWillRemoveListener?.(this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      this._options?.onDidRemoveLastListener?.(this);
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
    if (!this._disposed) {
      this._disposed = true;
      if (this._deliveryQueue?.current === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        this._listeners = void 0;
        this._size = 0;
      }
      this._options?.onDidRemoveLastListener?.();
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
      buffer2?.forEach((e) => emitter.fire(e));
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
        listener?.dispose();
      }
    };
    const emitter = new Emitter(options);
    disposable?.add(emitter);
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

// common/utils/buffer.ts
var hasBuffer = typeof Buffer !== "undefined";
var ELBuffer = class _ELBuffer {
  buffer;
  byteLength;
  constructor(buffer) {
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
    const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
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
var BufferPresets = {
  Undefined: createOneByteBuffer(0 /* Undefined */),
  String: createOneByteBuffer(1 /* String */),
  Buffer: createOneByteBuffer(2 /* Buffer */),
  ELBuffer: createOneByteBuffer(3 /* ELBuffer */),
  Array: createOneByteBuffer(4 /* Array */),
  Object: createOneByteBuffer(5 /* Object */),
  Uint: createOneByteBuffer(6 /* Int */)
};
function createOneByteBuffer(value) {
  const result = ELBuffer.alloc(1);
  result.writeUInt8(value, 0);
  return result;
}
var vqlZero = createOneByteBuffer(0);
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
var BufferReader = class {
  constructor(buffer) {
    this.buffer = buffer;
  }
  pos = 0;
  read(bytes) {
    const result = this.buffer.slice(this.pos, this.pos + bytes);
    this.pos += result.byteLength;
    return result;
  }
};
var BufferWriter = class {
  buffers = [];
  get buffer() {
    return ELBuffer.concat(this.buffers);
  }
  write(buffer) {
    this.buffers.push(buffer);
  }
};
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
    case 0 /* Undefined */:
      return void 0;
    case 1 /* String */:
      return reader.read(readIntVQL(reader)).toString();
    case 2 /* Buffer */:
      return reader.read(readIntVQL(reader)).buffer;
    case 3 /* ELBuffer */:
      return reader.read(readIntVQL(reader));
    case 4 /* Array */: {
      const length = readIntVQL(reader);
      const result = [];
      for (let i = 0; i < length; i++) {
        result.push(deserialize(reader));
      }
      return result;
    }
    case 5 /* Object */: {
      return JSON.parse(reader.read(readIntVQL(reader)).toString());
    }
    case 6 /* Int */:
      return readIntVQL(reader);
  }
}

// common/proxyChannel.ts
function isUpperAsciiLetter(code) {
  return code >= 65 /* A */ && code <= 90 /* Z */;
}
function revive(obj, depth = 0) {
  if (!obj || depth > 200) {
    return obj;
  }
  if (typeof obj === "object") {
    switch (obj.$mid) {
      case 2 /* Regexp */:
        return new RegExp(obj.source, obj.flags);
      case 17 /* Date */:
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
        mapEventNameToEvent.set(
          key,
          Event.buffer(
            handler[key],
            true,
            void 0,
            disposables
          )
        );
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
            mapEventNameToEvent.set(
              event,
              Event.buffer(
                handler[event],
                true,
                void 0,
                disposables
              )
            );
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
    return new Proxy(
      {},
      {
        get(_target, propKey) {
          if (typeof propKey === "string") {
            if (options?.properties?.has(propKey)) {
              return options.properties.get(propKey);
            }
            if (propertyIsEvent(propKey)) {
              return channel.listen(propKey);
            }
            return async function(...args) {
              const result = await channel.call(propKey, args);
              return result;
            };
          }
          throw new Error(`Property not found: ${String(propKey)}`);
        }
      }
    );
  }
  ProxyChannel2.toService = toService;
})(ProxyChannel || (ProxyChannel = {}));

// electron-sandbox/globals.ts
var bridge = globalThis.__el_bridge;
var ipcRenderer = bridge.ipcRenderer;

// common/cancellation.ts
var shortcutEvent = Object.freeze((callback, context) => {
  const handle = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle);
    }
  };
});
var MutableToken = class {
  _isCancelled = false;
  _emitter = null;
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
};
var CancellationTokenSource = class {
  _token = void 0;
  _parentListener = void 0;
  constructor(parent) {
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
    if (cancel) {
      this.cancel();
    }
    this._parentListener?.dispose();
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
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));

// common/ipc.ts
var ChannelClient = class {
  constructor(protocol) {
    this.protocol = protocol;
    this.protocolListener = this.protocol.onMessage(
      (msg) => this.onBuffer(msg)
    );
  }
  protocolListener;
  state = 0 /* Uninitialized */;
  activeRequests = /* @__PURE__ */ new Set();
  lastRequestId = 0;
  handlers = /* @__PURE__ */ new Map();
  _onDidInitialize = new Emitter();
  isDisposed = false;
  onDidInitialize = this._onDidInitialize.event;
  getChannel(channelName) {
    const that = this;
    return {
      call(command, arg, cancellationToken) {
        if (that.isDisposed) {
          return Promise.reject(new CancellationError());
        }
        return that.requestPromise(
          channelName,
          command,
          arg,
          cancellationToken
        );
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
    const type = 102 /* EventListen */;
    const request = { id: id2, type, channelName, name, arg };
    let uninitializedPromise = null;
    const emitter = new Emitter({
      onWillAddFirstListener: () => {
        uninitializedPromise = createCancelablePromise(
          (_) => this.whenInitialized()
        );
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
          this.sendRequest({ id: id2, type: 103 /* EventDispose */ });
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
    if (this.state === 1 /* Idle */) {
      return Promise.resolve();
    } else {
      return this.onDidInitializePromise;
    }
  }
  requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
    const id2 = this.lastRequestId++;
    const type = 100 /* Promise */;
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
            case 201 /* PromiseSuccess */:
              this.handlers.delete(id2);
              c(response.data);
              break;
            case 202 /* PromiseError */: {
              this.handlers.delete(id2);
              const error = new Error(response.data.message);
              error.stack = Array.isArray(response.data.stack) ? response.data.stack.join("\n") : response.data.stack;
              error.name = response.data.name;
              e(error);
              break;
            }
            case 203 /* PromiseErrorObj */:
              this.handlers.delete(id2);
              e(response.data);
              break;
          }
        };
        this.handlers.set(id2, handler);
        this.sendRequest(request);
      };
      let uninitializedPromise = null;
      if (this.state === 1 /* Idle */) {
        doRequest();
      } else {
        uninitializedPromise = createCancelablePromise(
          (_) => this.whenInitialized()
        );
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
          this.sendRequest({ id: id2, type: 101 /* PromiseCancel */ });
        }
        e(new CancellationError());
      };
      const cancellationTokenListener = cancellationToken.onCancellationRequested(cancel);
      disposable = combinedDisposable(
        toDisposable(cancel),
        cancellationTokenListener
      );
      this.activeRequests.add(disposable);
    });
    return result.finally(() => {
      disposable.dispose();
      this.activeRequests.delete(disposable);
    });
  }
  sendRequest(request) {
    switch (request.type) {
      case 100 /* Promise */:
      case 102 /* EventListen */: {
        this.send(
          [request.type, request.id, request.channelName, request.name],
          request.arg
        );
        return;
      }
      case 101 /* PromiseCancel */:
      case 103 /* EventDispose */: {
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
      case 200 /* Initialize */:
        return this.onResponse({ type: header[0] });
      case 201 /* PromiseSuccess */:
      case 202 /* PromiseError */:
      case 204 /* EventFire */:
      case 203 /* PromiseErrorObj */:
        this.onResponse({ type: header[0], id: header[1], data: body });
    }
  }
  onResponse(response) {
    if (response.type === 200 /* Initialize */) {
      this.state = 1 /* Idle */;
      this._onDidInitialize.fire();
      return;
    }
    const handler = this.handlers.get(response.id);
    handler?.(response);
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
};
var ChannelServer = class {
  constructor(protocol, ctx) {
    this.protocol = protocol;
    this.ctx = ctx;
    this.protocolListener = this.protocol.onMessage(
      (msg) => this.onRawMessage(msg)
    );
    this.sendResponse({ type: 200 /* Initialize */ });
  }
  channels = /* @__PURE__ */ new Map();
  protocolListener;
  activeRequests = /* @__PURE__ */ new Map();
  pendingRequests = /* @__PURE__ */ new Map();
  onRawMessage(msg) {
    const reader = new BufferReader(msg);
    const header = deserialize(reader);
    const body = deserialize(reader);
    const type = header[0];
    switch (type) {
      case 100 /* Promise */:
        return this.onPromise({
          type: 100 /* Promise */,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body
        });
      case 102 /* EventListen */:
        return this.onEventListen({
          type,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body
        });
    }
  }
  collectPendingRequest(request) {
    let pendingRequests = this.pendingRequests.get(request.channelName);
    if (!pendingRequests) {
      pendingRequests = [];
      this.pendingRequests.set(request.channelName, pendingRequests);
    }
    const timer = setTimeout(() => {
      console.error(`Unknown channel: ${request.channelName}`);
      if (request.type === 100 /* Promise */) {
        this.sendResponse({
          id: request.id,
          data: { name: "Unknown channel", message: `Channel name '${request.channelName}' timed out after ${200}ms`, stack: void 0 },
          type: 202 /* PromiseError */
        });
      }
    }, 200);
    pendingRequests.push({ request, timeoutTimer: timer });
  }
  onEventListen(request) {
    const channel = this.channels.get(request.channelName);
    if (!channel) {
      this.collectPendingRequest(request);
      return;
    }
    const id2 = request.id;
    const event = channel.listen(this.ctx, request.name, request.arg);
    const disposable = event((data) => this.sendResponse({ id: id2, data, type: 204 /* EventFire */ }));
    this.activeRequests.set(request.id, disposable);
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
    promise.then(
      (data) => {
        this.sendResponse({ id: id2, data, type: 201 /* PromiseSuccess */ });
      },
      (err) => {
        if (err instanceof Error) {
          this.sendResponse({
            id: id2,
            data: {
              message: err.message,
              name: err.name,
              stack: err.stack ? err.stack.split("\n") : void 0
            },
            type: 202 /* PromiseError */
          });
        } else {
          this.sendResponse({
            id: id2,
            data: err,
            type: 203 /* PromiseErrorObj */
          });
        }
      }
    ).finally(() => {
      this.activeRequests.delete(request.id);
    });
    const disposable = toDisposable(() => {
    });
    this.activeRequests.set(request.id, disposable);
  }
  sendResponse(response) {
    switch (response.type) {
      case 200 /* Initialize */: {
        const msgLength = this.send([response.type]);
        return;
      }
      case 201 /* PromiseSuccess */:
      case 202 /* PromiseError */:
      case 204 /* EventFire */:
      case 203 /* PromiseErrorObj */: {
        const msgLength = this.send(
          [response.type, response.id],
          response.data
        );
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
};
var IPCClient = class {
  channelClient;
  channelServer;
  constructor(protocol, ctx) {
    const writer = new BufferWriter();
    serialize(writer, ctx);
    protocol.send(writer.buffer);
    this.channelClient = new ChannelClient(protocol);
    this.channelServer = new ChannelServer(protocol, ctx);
  }
  getChannels() {
  }
  getChannel(channelName) {
    return this.channelClient.getChannel(channelName);
  }
  registerChannel(channelName, channel) {
    this.channelServer.registerChannel(channelName, channel);
  }
  dispose() {
    this.channelClient.dispose();
    this.channelServer.dispose();
  }
};

// common/protocol.ts
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

// electron-sandbox/ipc.ts
var Client = class _Client extends IPCClient {
  protocol;
  static createProtocol() {
    const onMessage = Event.fromNodeEventEmitter(ipcRenderer, "_ipc:message", (_, message) => ELBuffer.wrap(message));
    ipcRenderer.send("_ipc:hello");
    return new Protocol(ipcRenderer, onMessage);
  }
  constructor(id2) {
    const protocol = _Client.createProtocol();
    super(protocol, id2);
    this.protocol = protocol;
  }
  dispose() {
    this.protocol.disconnect();
    super.dispose();
  }
};

// electron-sandbox/index.ts
var client;
async function createClient() {
  const context = await ipcRenderer.invoke("_ipc:get-context");
  return client = new Client(context.windowId);
}
function useService(channelName) {
  return ProxyChannel.toService(client.getChannel(channelName));
}
export {
  createClient,
  useService
};
