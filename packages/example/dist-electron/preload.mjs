"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
const electron = require("electron");
var R = class {
  constructor() {
    __publicField(this, "_isDisposed", false);
    __publicField(this, "_toDispose", /* @__PURE__ */ new Set());
  }
  dispose() {
    this._isDisposed || (this._isDisposed = true, this.clear());
  }
  clear() {
    if (this._toDispose.size !== 0) try {
      A(this._toDispose);
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
    __publicField(this, "_store", new R());
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
function A(t2) {
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
function Q(...t2) {
  return g(() => A(t2));
}
function g(t2) {
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
var y = class {
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
      var _a2, _b, _c, _d;
      if (this._disposed) return _.None;
      n && (e = e.bind(n));
      let i = new q(e);
      this._listeners ? this._listeners instanceof q ? (this._deliveryQueue ?? (this._deliveryQueue = new Z()), this._listeners = [this._listeners, i]) : this._listeners.push(i) : ((_b = (_a2 = this._options) == null ? void 0 : _a2.onWillAddFirstListener) == null ? void 0 : _b.call(_a2, this), this._listeners = i, (_d = (_c = this._options) == null ? void 0 : _c.onDidAddFirstListener) == null ? void 0 : _d.call(_c, this)), this._size++;
      let r = g(() => {
        this._removeListener(i);
      });
      return s instanceof R ? s.add(r) : Array.isArray(s) && s.push(r), r;
    }, this._event;
  }
  _removeListener(e) {
    var _a2, _b, _c, _d;
    if ((_b = (_a2 = this._options) == null ? void 0 : _a2.onWillRemoveListener) == null ? void 0 : _b.call(_a2, this), !this._listeners) return;
    if (this._size === 1) {
      this._listeners = void 0, (_d = (_c = this._options) == null ? void 0 : _c.onDidRemoveLastListener) == null ? void 0 : _d.call(_c, this), this._size = 0;
      return;
    }
    let n = this._listeners, s = n.indexOf(e);
    if (s === -1) throw console.log("disposed?", this._disposed), console.log("size?", this._size), console.log("arr?", JSON.stringify(this._listeners)), new Error("Attempted to dispose unknown listener");
    this._size--, n[s] = void 0;
    let i = this._deliveryQueue.current === this, r = 0;
    for (let o = 0; o < n.length; o++) n[o] ? n[r++] = n[o] : i && (this._deliveryQueue.end--, r < this._deliveryQueue.i && this._deliveryQueue.i--);
    n.length = r;
  }
  dispose() {
    var _a2, _b, _c;
    this._disposed || (this._disposed = true, ((_a2 = this._deliveryQueue) == null ? void 0 : _a2.current) === this && this._deliveryQueue.reset(), this._listeners && (this._listeners = void 0, this._size = 0), (_c = (_b = this._options) == null ? void 0 : _b.onDidRemoveLastListener) == null ? void 0 : _c.call(_b));
  }
}, m;
((b) => {
  function t2(l, c = false, p = [], d) {
    let u = p.slice(), f = l((L) => {
      u ? u.push(L) : C.fire(L);
    });
    d && d.add(f);
    let h = () => {
      u == null ? void 0 : u.forEach((L) => C.fire(L)), u = null;
    }, C = new y({ onWillAddFirstListener() {
      f || (f = l((L) => C.fire(L)), d && d.add(f));
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
    } }, u = new y(d);
    return c == null ? void 0 : c.add(u), u.event;
  }
  function s(l) {
    return l;
  }
  b.signal = s;
  function i(l, c, p) {
    return n((d, u = null, f) => l((h) => c(h) && d.call(u, h), null, f), p);
  }
  b.filter = i;
  function r(...l) {
    return (c, p = null, d) => {
      let u = Q(...l.map((f) => f((h) => c.call(p, h))));
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
  function v(l) {
    return new Promise((c) => a(l)(c));
  }
  b.toPromise = v;
  function T(l, c, p = (d) => d) {
    let d = (...C) => h.fire(p(...C)), u = () => l.on(c, d), f = () => l.removeListener(c, d), h = new y({ onWillAddFirstListener: u, onDidRemoveLastListener: f });
    return h.event;
  }
  b.fromNodeEventEmitter = T;
})(m || (m = {}));
var te = Object.freeze((t2, e) => {
  let n = setTimeout(t2.bind(e), 0);
  return { dispose() {
    clearTimeout(n);
  } };
});
var U;
((s) => {
  function t2(i) {
    return i === s.None || i === s.Cancelled ? true : !i || typeof i != "object" ? false : typeof i.isCancellationRequested == "boolean" && typeof i.onCancellationRequested == "function";
  }
  s.isCancellationToken = t2, s.None = Object.freeze({ isCancellationRequested: false, onCancellationRequested: m.None }), s.Cancelled = Object.freeze({ isCancellationRequested: true, onCancellationRequested: te });
})(U || (U = {}));
var M = typeof Buffer < "u", E = class t {
  constructor(e) {
    __publicField(this, "buffer");
    __publicField(this, "byteLength");
    this.buffer = e, this.byteLength = this.buffer.byteLength;
  }
  static wrap(e) {
    return M && !Buffer.isBuffer(e) && (e = Buffer.from(e.buffer, e.byteOffset, e.byteLength)), new t(e);
  }
  writeUInt8(e, n) {
    de(this.buffer, e, n);
  }
  readUInt8(e) {
    return ue(this.buffer, e);
  }
  static alloc(e) {
    return M ? new t(Buffer.allocUnsafe(e)) : new t(new Uint8Array(e));
  }
  static concat(e, n) {
    if (typeof n > "u") {
      n = 0;
      for (let r = 0, o = e.length; r < o; r++) n += e[r].byteLength;
    }
    let s = t.alloc(n), i = 0;
    for (let r = 0, o = e.length; r < o; r++) {
      let a = e[r];
      s.set(a, i), i += a.byteLength;
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
    return !((n == null ? void 0 : n.dontUseNodeBuffer) || false) && M ? new t(Buffer.from(e)) : (K || (K = new TextEncoder()), new t(K.encode(e)));
  }
  toString() {
    return M ? this.buffer.toString() : (X || (X = new TextDecoder()), X.decode(this.buffer));
  }
}, K, X;
({ Undefined: w(0), String: w(1), Buffer: w(2), ELBuffer: w(3), Array: w(4), Object: w(5), Uint: w(6) });
function w(t2) {
  let e = E.alloc(1);
  return e.writeUInt8(t2, 0), e;
}
w(0);
function de(t2, e, n) {
  t2[n] = e;
}
function ue(t2, e) {
  return t2[e];
}
function N(t2) {
  if (!t2 || !t2.startsWith("_ipc:")) throw new Error(`Unsupported event IPC channel '${t2}'`);
  return true;
}
function Ne() {
  electron.contextBridge.exposeInMainWorld("__el_bridge", { ipcRenderer: { send(t2, ...e) {
    N(t2) && electron.ipcRenderer.send(t2, ...e);
  }, invoke(t2, ...e) {
    return N(t2), electron.ipcRenderer.invoke(t2, ...e);
  }, on(t2, e) {
    return N(t2), electron.ipcRenderer.on(t2, e), this;
  }, once(t2, e) {
    return N(t2), electron.ipcRenderer.once(t2, e), this;
  }, removeListener(t2, e) {
    return N(t2), electron.ipcRenderer.removeListener(t2, e), this;
  } } });
}
Ne();
