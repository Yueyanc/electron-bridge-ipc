var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b, _c;
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ipcMain, BrowserWindow, app } from "electron";
import fs from "node:fs/promises";
var R$1 = class R {
  constructor() {
    __publicField(this, "_isDisposed", false);
    __publicField(this, "_toDispose", /* @__PURE__ */ new Set());
  }
  dispose() {
    this._isDisposed || (this._isDisposed = true, this.clear());
  }
  clear() {
    if (this._toDispose.size !== 0) try {
      A$1(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  add(e) {
    if (!e) return e;
    if (e === this) throw new Error("Cannot register a disposable on itself!");
    return this._isDisposed ? console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack) : this._toDispose.add(e), e;
  }
}, _ = (_a = class {
  constructor() {
    __publicField(this, "_store", new R$1());
  }
  dispose() {
    this._store.dispose();
  }
  _register(e) {
    if (e === this) throw new Error("Cannot register a disposable on itself!");
    return this._store.add(e);
  }
}, __publicField(_a, "None", Object.freeze({ dispose() {
} })), _a);
function A$1(t2) {
  if (t2 && Symbol.iterator in t2) {
    let e = [];
    for (let n of t2) if (n) try {
      n.dispose();
    } catch (s) {
      e.push(s);
    }
    if (e.length === 1) throw e[0];
    if (e.length > 1) throw new Error("Encountered errors while disposing of store");
    return Array.isArray(t2) ? [] : t2;
  } else if (t2 && "dispose" in t2) return t2.dispose(), t2;
}
function Q$1(...t2) {
  return g$1(() => A$1(t2));
}
function g$1(t2) {
  return { dispose: t2 };
}
var oe = 0, q = class {
  constructor(e) {
    __publicField(this, "stack");
    __publicField(this, "id", oe++);
    this.value = e;
  }
}, Z = class {
  constructor() {
    __publicField(this, "i", -1);
    __publicField(this, "end", 0);
    __publicField(this, "current");
    __publicField(this, "value");
  }
  enqueue(e, n, s) {
    this.i = 0, this.end = s, this.current = e, this.value = n;
  }
  reset() {
    this.i = this.end, this.current = void 0, this.value = void 0;
  }
};
function ae(t2, e) {
  return Array.isArray(e) ? e.push(t2) : e && e.add(t2), t2;
}
function le(t2, e) {
  let n = this, s = false, i2;
  return function() {
    if (s) return i2;
    if (s = true, e) ;
    else i2 = t2.apply(n, arguments);
    return i2;
  };
}
var y$1 = class y {
  constructor(e) {
    __publicField(this, "_listeners");
    __publicField(this, "_deliveryQueue");
    __publicField(this, "_disposed");
    __publicField(this, "_options");
    __publicField(this, "_event");
    __publicField(this, "_size", 0);
    var _a2;
    this._options = e, this._deliveryQueue = (_a2 = this._options) == null ? void 0 : _a2.deliveryQueue;
  }
  _deliver(e, n) {
    e && e.value(n);
  }
  _deliverQueue(e) {
    let n = e.current._listeners;
    for (; e.i < e.end; ) this._deliver(n[e.i++], e.value);
    e.reset();
  }
  fire(e) {
    var _a2;
    if (((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) && this._deliverQueue(this._deliveryQueue), this._listeners) if (this._listeners instanceof q) this._deliver(this._listeners, e);
    else {
      let n = this._deliveryQueue;
      n.enqueue(this, e, this._listeners.length), this._deliverQueue(n);
    }
  }
  get event() {
    return this._event = (e, n, s) => {
      var _a2, _b2, _c2, _d;
      if (this._disposed) return _.None;
      n && (e = e.bind(n));
      let i2 = new q(e);
      this._listeners ? this._listeners instanceof q ? (this._deliveryQueue ?? (this._deliveryQueue = new Z()), this._listeners = [this._listeners, i2]) : this._listeners.push(i2) : ((_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b2.call(_a2, this), this._listeners = i2, (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidAddFirstListener) == null ? void 0 : _d.call(_c2, this)), this._size++;
      let r = g$1(() => {
        this._removeListener(i2);
      });
      return s instanceof R$1 ? s.add(r) : Array.isArray(s) && s.push(r), r;
    }, this._event;
  }
  _removeListener(e) {
    var _a2, _b2, _c2, _d;
    if ((_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b2.call(_a2, this), !this._listeners) return;
    if (this._size === 1) {
      this._listeners = void 0, (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidRemoveLastListener) == null ? void 0 : _d.call(_c2, this), this._size = 0;
      return;
    }
    let n = this._listeners, s = n.indexOf(e);
    if (s === -1) throw console.log("disposed?", this._disposed), console.log("size?", this._size), console.log("arr?", JSON.stringify(this._listeners)), new Error("Attempted to dispose unknown listener");
    this._size--, n[s] = void 0;
    let i2 = this._deliveryQueue.current === this, r = 0;
    for (let o = 0; o < n.length; o++) n[o] ? n[r++] = n[o] : i2 && (this._deliveryQueue.end--, r < this._deliveryQueue.i && this._deliveryQueue.i--);
    n.length = r;
  }
  dispose() {
    var _a2, _b2, _c2;
    this._disposed || (this._disposed = true, ((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this && this._deliveryQueue.reset(), this._listeners && (this._listeners = void 0, this._size = 0), (_c2 = (_b2 = this._options) == null ? void 0 : _b2.onDidRemoveLastListener) == null ? void 0 : _c2.call(_b2));
  }
}, j = class {
  constructor() {
    __publicField(this, "listening", false);
    __publicField(this, "inputEvent", m.None);
    __publicField(this, "inputEventListener", _.None);
    __publicField(this, "emitter", new y$1({ onDidAddFirstListener: () => {
      this.listening = true, this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
    }, onDidRemoveLastListener: () => {
      this.listening = false, this.inputEventListener.dispose();
    } }));
    __publicField(this, "event", this.emitter.event);
  }
  set input(e) {
    this.inputEvent = e, this.listening && (this.inputEventListener.dispose(), this.inputEventListener = e(this.emitter.fire, this.emitter));
  }
  dispose() {
    this.inputEventListener.dispose(), this.emitter.dispose();
  }
}, W$1 = class W {
  constructor() {
    __publicField(this, "emitter");
    __publicField(this, "hasListeners", false);
    __publicField(this, "events", []);
    this.emitter = new y$1({ onWillAddFirstListener: () => this.onFirstListenerAdd(), onDidRemoveLastListener: () => this.onLastListenerRemove() });
  }
  get event() {
    return this.emitter.event;
  }
  add(e) {
    let n = { event: e, listener: null };
    return this.events.push(n), this.hasListeners && this.hook(n), g$1(le(() => {
      this.hasListeners && this.unhook(n);
      let i2 = this.events.indexOf(n);
      this.events.splice(i2, 1);
    }));
  }
  onFirstListenerAdd() {
    this.hasListeners = true, this.events.forEach((e) => this.hook(e));
  }
  onLastListenerRemove() {
    this.hasListeners = false, this.events.forEach((e) => this.unhook(e));
  }
  hook(e) {
    e.listener = e.event((n) => this.emitter.fire(n));
  }
  unhook(e) {
    var _a2;
    (_a2 = e.listener) == null ? void 0 : _a2.dispose(), e.listener = null;
  }
  dispose() {
    var _a2;
    this.emitter.dispose();
    for (let e of this.events) (_a2 = e.listener) == null ? void 0 : _a2.dispose();
    this.events = [];
  }
}, m;
((b) => {
  function t2(l, c = false, p = [], d) {
    let u = p.slice(), f = l((L2) => {
      u ? u.push(L2) : C.fire(L2);
    });
    d && d.add(f);
    let h = () => {
      u == null ? void 0 : u.forEach((L2) => C.fire(L2)), u = null;
    }, C = new y$1({ onWillAddFirstListener() {
      f || (f = l((L2) => C.fire(L2)), d && d.add(f));
    }, onDidAddFirstListener() {
      u && (c ? setTimeout(h) : h());
    }, onDidRemoveLastListener() {
      f && f.dispose(), f = null;
    } });
    return d && d.add(C), C.event;
  }
  b.buffer = t2, b.None = () => _.None;
  function n(l, c) {
    let p, d = { onWillAddFirstListener() {
      p = l(u.fire, u);
    }, onDidRemoveLastListener() {
      p == null ? void 0 : p.dispose();
    } }, u = new y$1(d);
    return c == null ? void 0 : c.add(u), u.event;
  }
  function s(l) {
    return l;
  }
  b.signal = s;
  function i2(l, c, p) {
    return n((d, u = null, f) => l((h) => c(h) && d.call(u, h), null, f), p);
  }
  b.filter = i2;
  function r(...l) {
    return (c, p = null, d) => {
      let u = Q$1(...l.map((f) => f((h) => c.call(p, h))));
      return ae(u, d);
    };
  }
  b.any = r;
  function o(l, c, p) {
    return n((d, u = null, f) => l((h) => d.call(u, c(h)), null, f), p);
  }
  b.map = o;
  function a(l) {
    return (c, p = null, d) => {
      let u = false, f = l((h) => {
        if (!u) return f ? f.dispose() : u = true, c.call(p, h);
      }, null, d);
      return u && f.dispose(), f;
    };
  }
  b.once = a;
  function v2(l) {
    return new Promise((c) => a(l)(c));
  }
  b.toPromise = v2;
  function T2(l, c, p = (d) => d) {
    let d = (...C) => h.fire(p(...C)), u = () => l.on(c, d), f = () => l.removeListener(c, d), h = new y$1({ onWillAddFirstListener: u, onDidRemoveLastListener: f });
    return h.event;
  }
  b.fromNodeEventEmitter = T2;
})(m || (m = {}));
var te = Object.freeze((t2, e) => {
  let n = setTimeout(t2.bind(e), 0);
  return { dispose() {
    clearTimeout(n);
  } };
}), z = class {
  constructor() {
    __publicField(this, "_isCancelled", false);
    __publicField(this, "_emitter", null);
  }
  cancel() {
    this._isCancelled || (this._isCancelled = true, this._emitter && (this._emitter.fire(void 0), this.dispose()));
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    return this._isCancelled ? te : (this._emitter || (this._emitter = new y$1()), this._emitter.event);
  }
  dispose() {
    this._emitter && (this._emitter.dispose(), this._emitter = null);
  }
}, $ = class {
  constructor(e) {
    __publicField(this, "_token");
    __publicField(this, "_parentListener");
    this._parentListener = e && e.onCancellationRequested(this.cancel, this);
  }
  get token() {
    return this._token || (this._token = new z()), this._token;
  }
  cancel() {
    this._token ? this._token instanceof z && this._token.cancel() : this._token = U.Cancelled;
  }
  dispose(e = false) {
    var _a2;
    e && this.cancel(), (_a2 = this._parentListener) == null ? void 0 : _a2.dispose(), this._token ? this._token instanceof z && this._token.dispose() : this._token = U.None;
  }
}, I = class extends Error {
  constructor() {
    super("Canceled"), this.name = this.message;
  }
};
function G$1(t2) {
  let e = new $(), n = t2(e.token), s = new Promise((i2, r) => {
    let o = e.token.onCancellationRequested(() => {
      o.dispose(), r(new I());
    });
    Promise.resolve(n).then((a) => {
      o.dispose(), e.dispose(), i2(a);
    }, (a) => {
      o.dispose(), e.dispose(), r(a);
    });
  });
  return new class {
    cancel() {
      e.cancel(), e.dispose();
    }
    then(i2, r) {
      return s.then(i2, r);
    }
    catch(i2) {
      return this.then(void 0, i2);
    }
    finally(i2) {
      return s.finally(i2);
    }
  }();
}
var U;
((s) => {
  function t2(i2) {
    return i2 === s.None || i2 === s.Cancelled ? true : !i2 || typeof i2 != "object" ? false : typeof i2.isCancellationRequested == "boolean" && typeof i2.onCancellationRequested == "function";
  }
  s.isCancellationToken = t2, s.None = Object.freeze({ isCancellationRequested: false, onCancellationRequested: m.None }), s.Cancelled = Object.freeze({ isCancellationRequested: true, onCancellationRequested: te });
})(U || (U = {}));
var M$1 = typeof Buffer < "u", E = class t {
  constructor(e) {
    __publicField(this, "buffer");
    __publicField(this, "byteLength");
    this.buffer = e, this.byteLength = this.buffer.byteLength;
  }
  static wrap(e) {
    return M$1 && !Buffer.isBuffer(e) && (e = Buffer.from(e.buffer, e.byteOffset, e.byteLength)), new t(e);
  }
  writeUInt8(e, n) {
    de(this.buffer, e, n);
  }
  readUInt8(e) {
    return ue(this.buffer, e);
  }
  static alloc(e) {
    return M$1 ? new t(Buffer.allocUnsafe(e)) : new t(new Uint8Array(e));
  }
  static concat(e, n) {
    if (typeof n > "u") {
      n = 0;
      for (let r = 0, o = e.length; r < o; r++) n += e[r].byteLength;
    }
    let s = t.alloc(n), i2 = 0;
    for (let r = 0, o = e.length; r < o; r++) {
      let a = e[r];
      s.set(a, i2), i2 += a.byteLength;
    }
    return s;
  }
  set(e, n) {
    if (e instanceof t) this.buffer.set(e.buffer, n);
    else if (e instanceof Uint8Array) this.buffer.set(e, n);
    else if (e instanceof ArrayBuffer) this.buffer.set(new Uint8Array(e), n);
    else if (ArrayBuffer.isView(e)) this.buffer.set(new Uint8Array(e.buffer, e.byteOffset, e.byteLength), n);
    else throw new TypeError("Unknown argument 'array'");
  }
  slice(e, n) {
    return new t(this.buffer.subarray(e, n));
  }
  static fromString(e, n) {
    return !((n == null ? void 0 : n.dontUseNodeBuffer) || false) && M$1 ? new t(Buffer.from(e)) : (K$1 || (K$1 = new TextEncoder()), new t(K$1.encode(e)));
  }
  toString() {
    return M$1 ? this.buffer.toString() : (X || (X = new TextDecoder()), X.decode(this.buffer));
  }
}, K$1, X;
var x = { Undefined: w$1(0), String: w$1(1), Buffer: w$1(2), ELBuffer: w$1(3), Array: w$1(4), Object: w$1(5), Uint: w$1(6) };
function w$1(t2) {
  let e = E.alloc(1);
  return e.writeUInt8(t2, 0), e;
}
var ce = w$1(0);
function P$1(t2, e) {
  if (e === 0) {
    t2.write(ce);
    return;
  }
  let n = 0;
  for (let i2 = e; i2 !== 0; i2 = i2 >>> 7) n++;
  let s = E.alloc(n);
  for (let i2 = 0; e !== 0; i2++) s.buffer[i2] = e & 127, e = e >>> 7, e > 0 && (s.buffer[i2] |= 128);
  t2.write(s);
}
function B$1(t2) {
  let e = 0;
  for (let n = 0; ; n += 7) {
    let s = t2.read(1);
    if (e |= (s.buffer[0] & 127) << n, !(s.buffer[0] & 128)) return e;
  }
}
function de(t2, e, n) {
  t2[n] = e;
}
function ue(t2, e) {
  return t2[e];
}
var k$1 = class k {
  constructor(e) {
    __publicField(this, "pos", 0);
    this.buffer = e;
  }
  read(e) {
    let n = this.buffer.slice(this.pos, this.pos + e);
    return this.pos += n.byteLength, n;
  }
}, O$1 = class O {
  constructor() {
    __publicField(this, "buffers", []);
  }
  get buffer() {
    return E.concat(this.buffers);
  }
  write(e) {
    this.buffers.push(e);
  }
};
function S$1(t2, e) {
  if (typeof e > "u") t2.write(x.Undefined);
  else if (typeof e == "string") {
    let n = E.fromString(e);
    t2.write(x.String), P$1(t2, n.byteLength), t2.write(n);
  } else if (M$1 && Buffer.isBuffer(e)) {
    let n = E.wrap(e);
    t2.write(x.Buffer), P$1(t2, n.byteLength), t2.write(n);
  } else if (e instanceof E) t2.write(x.ELBuffer), P$1(t2, e.byteLength), t2.write(e);
  else if (Array.isArray(e)) {
    t2.write(x.Array), P$1(t2, e.length);
    for (let n of e) S$1(t2, n);
  } else if (typeof e == "number" && (e | 0) === e) t2.write(x.Uint), P$1(t2, e);
  else {
    let n = E.fromString(JSON.stringify(e));
    t2.write(x.Object), P$1(t2, n.byteLength), t2.write(n);
  }
}
function D(t2) {
  switch (t2.read(1).readUInt8(0)) {
    case 0:
      return;
    case 1:
      return t2.read(B$1(t2)).toString();
    case 2:
      return t2.read(B$1(t2)).buffer;
    case 3:
      return t2.read(B$1(t2));
    case 4: {
      let n = B$1(t2), s = [];
      for (let i2 = 0; i2 < n; i2++) s.push(D(t2));
      return s;
    }
    case 5:
      return JSON.parse(t2.read(B$1(t2)).toString());
    case 6:
      return B$1(t2);
  }
}
function Y(t2) {
  return typeof t2 == "function";
}
var ee = class {
  constructor(e) {
    __publicField(this, "protocolListener");
    __publicField(this, "state", 0);
    __publicField(this, "activeRequests", /* @__PURE__ */ new Set());
    __publicField(this, "lastRequestId", 0);
    __publicField(this, "handlers", /* @__PURE__ */ new Map());
    __publicField(this, "_onDidInitialize", new y$1());
    __publicField(this, "isDisposed", false);
    __publicField(this, "onDidInitialize", this._onDidInitialize.event);
    this.protocol = e;
    this.protocolListener = this.protocol.onMessage((n) => this.onBuffer(n));
  }
  getChannel(e) {
    let n = this;
    return { call(s, i2, r) {
      return n.isDisposed ? Promise.reject(new I()) : n.requestPromise(e, s, i2, r);
    }, listen(s, i2) {
      return n.isDisposed ? m.None : n.requestEvent(e, s, i2);
    } };
  }
  requestEvent(e, n, s) {
    let i2 = this.lastRequestId++, o = { id: i2, type: 102, channelName: e, name: n, arg: s }, a = null, v2 = new y$1({ onWillAddFirstListener: () => {
      a = G$1((b) => this.whenInitialized()), a.then(() => {
        a = null, this.activeRequests.add(v2), this.sendRequest(o);
      });
    }, onDidRemoveLastListener: () => {
      a ? (a.cancel(), a = null) : (this.activeRequests.delete(v2), this.sendRequest({ id: i2, type: 103 }));
    } }), T2 = (b) => v2.fire(b.data);
    return this.handlers.set(i2, T2), v2.event;
  }
  get onDidInitializePromise() {
    return m.toPromise(this.onDidInitialize);
  }
  whenInitialized() {
    return this.state === 1 ? Promise.resolve() : this.onDidInitializePromise;
  }
  requestPromise(e, n, s, i2 = U.None) {
    let r = this.lastRequestId++, a = { id: r, type: 100, channelName: e, name: n, arg: s };
    if (i2.isCancellationRequested) return Promise.reject(new I());
    let v2;
    return new Promise((b, l) => {
      if (i2.isCancellationRequested) return l(new I());
      let c = () => {
        let f = (h) => {
          switch (h.type) {
            case 201:
              this.handlers.delete(r), b(h.data);
              break;
            case 202: {
              this.handlers.delete(r);
              let C = new Error(h.data.message);
              C.stack = Array.isArray(h.data.stack) ? h.data.stack.join(`
`) : h.data.stack, C.name = h.data.name, l(C);
              break;
            }
            case 203:
              this.handlers.delete(r), l(h.data);
              break;
          }
        };
        this.handlers.set(r, f), this.sendRequest(a);
      }, p = null;
      this.state === 1 ? c() : (p = G$1((f) => this.whenInitialized()), p.then(() => {
        p = null, c();
      }));
      let d = () => {
        p ? (p.cancel(), p = null) : this.sendRequest({ id: r, type: 101 }), l(new I());
      }, u = i2.onCancellationRequested(d);
      v2 = Q$1(g$1(d), u), this.activeRequests.add(v2);
    }).finally(() => {
      v2.dispose(), this.activeRequests.delete(v2);
    });
  }
  sendRequest(e) {
    switch (e.type) {
      case 100:
      case 102: {
        this.send([e.type, e.id, e.channelName, e.name], e.arg);
        return;
      }
      case 101:
      case 103:
        this.send([e.type, e.id]);
    }
  }
  send(e, n = void 0) {
    let s = new O$1();
    return S$1(s, e), S$1(s, n), this.sendBuffer(s.buffer);
  }
  sendBuffer(e) {
    try {
      return this.protocol.send(e), e.byteLength;
    } catch {
      return 0;
    }
  }
  onBuffer(e) {
    let n = new k$1(e), s = D(n), i2 = D(n);
    switch (s[0]) {
      case 200:
        return this.onResponse({ type: s[0] });
      case 201:
      case 202:
      case 204:
      case 203:
        this.onResponse({ type: s[0], id: s[1], data: i2 });
    }
  }
  onResponse(e) {
    var _a2;
    if (e.type === 200) {
      this.state = 1, this._onDidInitialize.fire();
      return;
    }
    (_a2 = this.handlers.get(e.id)) == null ? void 0 : _a2(e);
  }
  dispose() {
    this.isDisposed = true, this.protocolListener && (this.protocolListener.dispose(), this.protocolListener = null), A$1(this.activeRequests.values()), this.activeRequests.clear();
  }
};
function pe(t2) {
  return t2[Math.floor(Math.random() * t2.length)];
}
var ne = class {
  constructor(e, n) {
    __publicField(this, "channels", /* @__PURE__ */ new Map());
    __publicField(this, "protocolListener");
    __publicField(this, "activeRequests", /* @__PURE__ */ new Map());
    this.protocol = e;
    this.ctx = n;
    this.protocolListener = this.protocol.onMessage((s) => this.onRawMessage(s)), this.sendResponse({ type: 200 });
  }
  onRawMessage(e) {
    let n = new k$1(e), s = D(n), i2 = D(n);
    switch (s[0]) {
      case 100:
        return this.onPromise({ type: 100, id: s[1], channelName: s[2], name: s[3], arg: i2 });
    }
  }
  onPromise(e) {
    let n = this.channels.get(e.channelName);
    if (!n) return;
    let s;
    try {
      s = n.call(this.ctx, e.name, e.arg);
    } catch (o) {
      s = Promise.reject(o);
    }
    let i2 = e.id;
    s.then((o) => {
      this.sendResponse({ id: i2, data: o, type: 201 });
    }, (o) => {
      o instanceof Error ? this.sendResponse({ id: i2, data: { message: o.message, name: o.name, stack: o.stack ? o.stack.split(`
`) : void 0 }, type: 202 }) : this.sendResponse({ id: i2, data: o, type: 203 });
    }).finally(() => {
      this.activeRequests.delete(e.id);
    });
    let r = g$1(() => {
    });
    this.activeRequests.set(e.id, r);
  }
  sendResponse(e) {
    switch (e.type) {
      case 200: {
        this.send([e.type]);
        return;
      }
      case 201:
      case 202:
      case 204:
      case 203: {
        this.send([e.type, e.id], e.data);
      }
    }
  }
  send(e, n = void 0) {
    let s = new O$1();
    return S$1(s, e), S$1(s, n), this.sendBuffer(s.buffer);
  }
  sendBuffer(e) {
    try {
      return this.protocol.send(e), e.byteLength;
    } catch {
      return 0;
    }
  }
  registerChannel(e, n) {
    this.channels.set(e, n);
  }
  dispose() {
    this.protocolListener && (this.protocolListener.dispose(), this.protocolListener = null), A$1(this.activeRequests.values()), this.activeRequests.clear();
  }
};
function se(t2) {
  return { call(e, n, s) {
    return t2.then((i2) => i2.call(e, n, s));
  }, listen(e, n) {
    let s = new j();
    return t2.then((i2) => s.input = i2.listen(e, n)), s.event;
  } };
}
var H$1 = class H {
  constructor(e) {
    __publicField(this, "channels", /* @__PURE__ */ new Map());
    __publicField(this, "_connections", /* @__PURE__ */ new Set());
    __publicField(this, "_onDidAddConnection", new y$1());
    __publicField(this, "onDidAddConnection", this._onDidAddConnection.event);
    __publicField(this, "_onDidRemoveConnection", new y$1());
    __publicField(this, "onDidRemoveConnection", this._onDidRemoveConnection.event);
    __publicField(this, "disposables", new R$1());
    this.disposables.add(e(({ protocol: n, onDidClientDisconnect: s }) => {
      let i2 = m.once(n.onMessage);
      this.disposables.add(i2((r) => {
        let o = new k$1(r), a = D(o), v2 = new ne(n, a), T2 = new ee(n);
        this.channels.forEach((l, c) => v2.registerChannel(c, l));
        let b = { channelServer: v2, channelClient: T2, ctx: a };
        this._connections.add(b), this._onDidAddConnection.fire(b), this.disposables.add(s(() => {
          v2.dispose(), T2.dispose(), this._connections.delete(b), this._onDidRemoveConnection.fire(b);
        }));
      }));
    }));
  }
  get connections() {
    let e = [];
    return this._connections.forEach((n) => e.push(n)), e;
  }
  getChannel(e, n) {
    let s = this;
    return { call(i2, r, o) {
      let a;
      if (Y(n)) {
        let T2 = pe(s.connections.filter(n));
        a = T2 ? Promise.resolve(T2) : m.toPromise(m.filter(s.onDidAddConnection, n));
      } else a = n.routeCall(s, i2, r);
      let v2 = a.then((T2) => T2.channelClient.getChannel(e));
      return se(v2).call(i2, r, o);
    }, listen(i2, r) {
      if (Y(n)) return s.getMulticastEvent(e, n, i2, r);
      let o = n.routeEvent(s, i2, r).then((a) => a.channelClient.getChannel(e));
      return se(o).listen(i2, r);
    } };
  }
  getMulticastEvent(e, n, s, i2) {
    let r = this, o, a = new y$1({ onWillAddFirstListener: () => {
      o = new R$1();
      let v2 = new W$1(), T2 = /* @__PURE__ */ new Map(), b = (c) => {
        let d = c.channelClient.getChannel(e).listen(s, i2), u = v2.add(d);
        T2.set(c, u);
      }, l = (c) => {
        let p = T2.get(c);
        p && (p.dispose(), T2.delete(c));
      };
      r.connections.filter(n).forEach(b), m.filter(r.onDidAddConnection, n)(b, void 0, o), r.onDidRemoveConnection(l, void 0, o), v2.event(a.fire, a, o), o.add(v2);
    }, onDidRemoveLastListener: () => {
      o == null ? void 0 : o.dispose(), o = void 0;
    } });
    return a.event;
  }
  registerChannel(e, n) {
    this.channels.set(e, n);
    for (let s of this._connections) s.channelServer.registerChannel(e, n);
  }
  dispose() {
    this.disposables.dispose();
    for (let e of this._connections) e.channelClient.dispose(), e.channelServer.dispose();
    this._connections.clear(), this.channels.clear(), this._onDidAddConnection.dispose(), this._onDidRemoveConnection.dispose();
  }
};
var V = class {
  constructor(e, n) {
    this.sender = e;
    this.onMessage = n;
  }
  send(e) {
    try {
      this.sender.send("_ipc:message", e.buffer);
    } catch {
    }
  }
  disconnect() {
    this.sender.send("_ipc:disconnect", null);
  }
};
function ie(t2, e) {
  let n = m.fromNodeEventEmitter(ipcMain, e, (i2, r) => ({ event: i2, message: r })), s = m.filter(n, ({ event: i2 }) => i2.sender.id === t2);
  return m.map(s, ({ message: i2 }) => i2 && E.wrap(i2));
}
var J = (_b = class extends H$1 {
  static getOnDidClientConnect() {
    let e = m.fromNodeEventEmitter(ipcMain, "_ipc:hello", ({ sender: n }) => n);
    return m.map(e, (n) => {
      var _a2;
      let s = n.id;
      (_a2 = _b.Clients.get(s)) == null ? void 0 : _a2.dispose();
      let r = new y$1();
      _b.Clients.set(s, g$1(() => r.fire()));
      let o = ie(s, "_ipc:message"), a = m.any(m.signal(ie(s, "_ipc:disconnect")), r.event);
      return { protocol: new V(n, o), onDidClientDisconnect: a };
    });
  }
  constructor() {
    super(_b.getOnDidClientConnect());
  }
}, __publicField(_b, "Clients", /* @__PURE__ */ new Map()), _b);
function Fe() {
  return ipcMain.handle("_ipc:get-context", ({ sender: t2 }) => {
    var _a2;
    return (_a2 = BrowserWindow.fromId(t2.id)) == null ? void 0 : _a2.id;
  }), new J();
}
var g = class {
  constructor() {
    __publicField(this, "_isDisposed", false);
    __publicField(this, "_toDispose", /* @__PURE__ */ new Set());
  }
  dispose() {
    this._isDisposed || (this._isDisposed = true, this.clear());
  }
  clear() {
    if (this._toDispose.size !== 0) try {
      k2(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  add(n) {
    if (!n) return n;
    if (n === this) throw new Error("Cannot register a disposable on itself!");
    return this._isDisposed ? console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack) : this._toDispose.add(n), n;
  }
}, L = (_c = class {
  constructor() {
    __publicField(this, "_store", new g());
  }
  dispose() {
    this._store.dispose();
  }
  _register(n) {
    if (n === this) throw new Error("Cannot register a disposable on itself!");
    return this._store.add(n);
  }
}, __publicField(_c, "None", Object.freeze({ dispose() {
} })), _c);
function k2(i2) {
  if (i2 && Symbol.iterator in i2) {
    let n = [];
    for (let t2 of i2) if (t2) try {
      t2.dispose();
    } catch (r) {
      n.push(r);
    }
    if (n.length === 1) throw n[0];
    if (n.length > 1) throw new Error("Encountered errors while disposing of store");
    return Array.isArray(i2) ? [] : i2;
  } else if (i2 && "dispose" in i2) return i2.dispose(), i2;
}
function G(...i2) {
  return B(() => k2(i2));
}
function B(i2) {
  return { dispose: i2 };
}
var H2 = 0, v = class {
  constructor(n) {
    __publicField(this, "stack");
    __publicField(this, "id", H2++);
    this.value = n;
  }
}, w = class {
  constructor() {
    __publicField(this, "i", -1);
    __publicField(this, "end", 0);
    __publicField(this, "current");
    __publicField(this, "value");
  }
  enqueue(n, t2, r) {
    this.i = 0, this.end = r, this.current = n, this.value = t2;
  }
  reset() {
    this.i = this.end, this.current = void 0, this.value = void 0;
  }
};
function M(i2, n) {
  return Array.isArray(n) ? n.push(i2) : n && n.add(i2), i2;
}
var A = class {
  constructor(n) {
    __publicField(this, "_listeners");
    __publicField(this, "_deliveryQueue");
    __publicField(this, "_disposed");
    __publicField(this, "_options");
    __publicField(this, "_event");
    __publicField(this, "_size", 0);
    var _a2;
    this._options = n, this._deliveryQueue = (_a2 = this._options) == null ? void 0 : _a2.deliveryQueue;
  }
  _deliver(n, t2) {
    n && n.value(t2);
  }
  _deliverQueue(n) {
    let t2 = n.current._listeners;
    for (; n.i < n.end; ) this._deliver(t2[n.i++], n.value);
    n.reset();
  }
  fire(n) {
    var _a2;
    if (((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) && this._deliverQueue(this._deliveryQueue), this._listeners) if (this._listeners instanceof v) this._deliver(this._listeners, n);
    else {
      let t2 = this._deliveryQueue;
      t2.enqueue(this, n, this._listeners.length), this._deliverQueue(t2);
    }
  }
  get event() {
    return this._event = (n, t2, r) => {
      var _a2, _b2, _c2, _d;
      if (this._disposed) return L.None;
      t2 && (n = n.bind(t2));
      let b = new v(n);
      this._listeners ? this._listeners instanceof v ? (this._deliveryQueue ?? (this._deliveryQueue = new w()), this._listeners = [this._listeners, b]) : this._listeners.push(b) : ((_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b2.call(_a2, this), this._listeners = b, (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidAddFirstListener) == null ? void 0 : _d.call(_c2, this)), this._size++;
      let _2 = B(() => {
        this._removeListener(b);
      });
      return r instanceof g ? r.add(_2) : Array.isArray(r) && r.push(_2), _2;
    }, this._event;
  }
  _removeListener(n) {
    var _a2, _b2, _c2, _d;
    if ((_b2 = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b2.call(_a2, this), !this._listeners) return;
    if (this._size === 1) {
      this._listeners = void 0, (_d = (_c2 = this._options) == null ? void 0 : _c2.onDidRemoveLastListener) == null ? void 0 : _d.call(_c2, this), this._size = 0;
      return;
    }
    let t2 = this._listeners, r = t2.indexOf(n);
    if (r === -1) throw console.log("disposed?", this._disposed), console.log("size?", this._size), console.log("arr?", JSON.stringify(this._listeners)), new Error("Attempted to dispose unknown listener");
    this._size--, t2[r] = void 0;
    let b = this._deliveryQueue.current === this, _2 = 0;
    for (let c = 0; c < t2.length; c++) t2[c] ? t2[_2++] = t2[c] : b && (this._deliveryQueue.end--, _2 < this._deliveryQueue.i && this._deliveryQueue.i--);
    t2.length = _2;
  }
  dispose() {
    var _a2, _b2, _c2;
    this._disposed || (this._disposed = true, ((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this && this._deliveryQueue.reset(), this._listeners && (this._listeners = void 0, this._size = 0), (_c2 = (_b2 = this._options) == null ? void 0 : _b2.onDidRemoveLastListener) == null ? void 0 : _c2.call(_b2));
  }
};
var y2;
((x2) => {
  function i2(u, s = false, E2 = [], l) {
    let e = E2.slice(), f = u((D2) => {
      e ? e.push(D2) : U2.fire(D2);
    });
    l && l.add(f);
    let o = () => {
      e == null ? void 0 : e.forEach((D2) => U2.fire(D2)), e = null;
    }, U2 = new A({ onWillAddFirstListener() {
      f || (f = u((D2) => U2.fire(D2)), l && l.add(f));
    }, onDidAddFirstListener() {
      e && (s ? setTimeout(o) : o());
    }, onDidRemoveLastListener() {
      f && f.dispose(), f = null;
    } });
    return l && l.add(U2), U2.event;
  }
  x2.buffer = i2, x2.None = () => L.None;
  function t2(u, s) {
    let E2, l = { onWillAddFirstListener() {
      E2 = u(e.fire, e);
    }, onDidRemoveLastListener() {
      E2 == null ? void 0 : E2.dispose();
    } }, e = new A(l);
    return s == null ? void 0 : s.add(e), e.event;
  }
  function r(u) {
    return u;
  }
  x2.signal = r;
  function b(u, s, E2) {
    return t2((l, e = null, f) => u((o) => s(o) && l.call(e, o), null, f), E2);
  }
  x2.filter = b;
  function _2(...u) {
    return (s, E2 = null, l) => {
      let e = G(...u.map((f) => f((o) => s.call(E2, o))));
      return M(e, l);
    };
  }
  x2.any = _2;
  function c(u, s, E2) {
    return t2((l, e = null, f) => u((o) => l.call(e, s(o)), null, f), E2);
  }
  x2.map = c;
  function m2(u) {
    return (s, E2 = null, l) => {
      let e = false, f = u((o) => {
        if (!e) return f ? f.dispose() : e = true, s.call(E2, o);
      }, null, l);
      return e && f.dispose(), f;
    };
  }
  x2.once = m2;
  function p(u) {
    return new Promise((s) => m2(u)(s));
  }
  x2.toPromise = p;
  function I2(u, s, E2 = (l) => l) {
    let l = (...U2) => o.fire(E2(...U2)), e = () => u.on(s, l), f = () => u.removeListener(s, l), o = new A({ onWillAddFirstListener: e, onDidRemoveLastListener: f });
    return o.event;
  }
  x2.fromNodeEventEmitter = I2;
})(y2 || (y2 = {}));
var O2 = typeof Buffer < "u", R2 = class i {
  constructor(n) {
    __publicField(this, "buffer");
    __publicField(this, "byteLength");
    this.buffer = n, this.byteLength = this.buffer.byteLength;
  }
  static wrap(n) {
    return O2 && !Buffer.isBuffer(n) && (n = Buffer.from(n.buffer, n.byteOffset, n.byteLength)), new i(n);
  }
  writeUInt8(n, t2) {
    W2(this.buffer, n, t2);
  }
  readUInt8(n) {
    return K(this.buffer, n);
  }
  static alloc(n) {
    return O2 ? new i(Buffer.allocUnsafe(n)) : new i(new Uint8Array(n));
  }
  static concat(n, t2) {
    if (typeof t2 > "u") {
      t2 = 0;
      for (let _2 = 0, c = n.length; _2 < c; _2++) t2 += n[_2].byteLength;
    }
    let r = i.alloc(t2), b = 0;
    for (let _2 = 0, c = n.length; _2 < c; _2++) {
      let m2 = n[_2];
      r.set(m2, b), b += m2.byteLength;
    }
    return r;
  }
  set(n, t2) {
    if (n instanceof i) this.buffer.set(n.buffer, t2);
    else if (n instanceof Uint8Array) this.buffer.set(n, t2);
    else if (n instanceof ArrayBuffer) this.buffer.set(new Uint8Array(n), t2);
    else if (ArrayBuffer.isView(n)) this.buffer.set(new Uint8Array(n.buffer, n.byteOffset, n.byteLength), t2);
    else throw new TypeError("Unknown argument 'array'");
  }
  slice(n, t2) {
    return new i(this.buffer.subarray(n, t2));
  }
  static fromString(n, t2) {
    return !((t2 == null ? void 0 : t2.dontUseNodeBuffer) || false) && O2 ? new i(Buffer.from(n)) : (F || (F = new TextEncoder()), new i(F.encode(n)));
  }
  toString() {
    return O2 ? this.buffer.toString() : (S || (S = new TextDecoder()), S.decode(this.buffer));
  }
}, F, S;
({ Undefined: T(0), String: T(1), Buffer: T(2), ELBuffer: T(3), Array: T(4), Object: T(5), Uint: T(6) });
function T(i2) {
  let n = R2.alloc(1);
  return n.writeUInt8(i2, 0), n;
}
T(0);
function W2(i2, n, t2) {
  i2[t2] = n;
}
function K(i2, n) {
  return i2[n];
}
function P(i2) {
  return i2 >= 65 && i2 <= 90;
}
function N(i2, n = 0) {
  if (!i2 || n > 200) return i2;
  if (typeof i2 == "object") {
    switch (i2.$mid) {
      case 2:
        return new RegExp(i2.source, i2.flags);
      case 17:
        return new Date(i2.source);
    }
    if (i2 instanceof R2 || i2 instanceof Uint8Array) return i2;
    if (Array.isArray(i2)) for (let t2 = 0; t2 < i2.length; ++t2) i2[t2] = N(i2[t2], n + 1);
    else for (let t2 in i2) Object.hasOwnProperty.call(i2, t2) && (i2[t2] = N(i2[t2], n + 1));
  }
  return i2;
}
var Q;
((b) => {
  function i2(_2) {
    return _2.startsWith("onDynamic") && P(_2.charCodeAt(9));
  }
  function n(_2) {
    return _2[0] === "o" && _2[1] === "n" && P(_2.charCodeAt(2));
  }
  function t2(_2, c, m2) {
    let p = _2, I2 = m2 && m2.disableMarshalling, x2 = /* @__PURE__ */ new Map();
    for (let u in p) n(u) && x2.set(u, y2.buffer(p[u], true, void 0, c));
    return new class {
      listen(u, s, E2) {
        let l = x2.get(s);
        if (l) return l;
        let e = p[s];
        if (typeof e == "function") {
          if (i2(s)) return e.call(p, E2);
          if (n(s)) return x2.set(s, y2.buffer(p[s], true, void 0, c)), x2.get(s);
        }
        throw new Error(`Event not found: ${s}`);
      }
      call(u, s, E2) {
        let l = p[s];
        if (typeof l == "function") {
          if (!I2 && Array.isArray(E2)) for (let f = 0; f < E2.length; f++) E2[f] = N(E2[f]);
          let e = l.apply(p, E2);
          return e instanceof Promise || (e = Promise.resolve(e)), e;
        }
        throw new Error(`Method not found: ${s}`);
      }
    }();
  }
  b.fromService = t2;
  function r(_2, c) {
    return new Proxy({}, { get(m2, p) {
      var _a2;
      if (typeof p == "string") return ((_a2 = c == null ? void 0 : c.properties) == null ? void 0 : _a2.has(p)) ? c.properties.get(p) : async function(...I2) {
        return await _2.call(p, I2);
      };
      throw new Error(`Property not found: ${String(p)}`);
    } });
  }
  b.toService = r;
})(Q || (Q = {}));
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
  const server = Fe();
  const disposables = new g();
  server.registerChannel("fileSystem", Q.fromService(new FileSystemService(), disposables));
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
