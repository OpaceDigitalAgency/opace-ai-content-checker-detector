var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn2, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn2 && (res = (0, fn2[__getOwnPropNames(fn2)[0]])(fn2 = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// packages/cycle5-browser/node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs
var ort_wasm_bundle_min_exports = {};
__export(ort_wasm_bundle_min_exports, {
  InferenceSession: () => ts,
  TRACE: () => xr,
  TRACE_EVENT_BEGIN: () => Pe,
  TRACE_EVENT_END: () => Ue,
  TRACE_FUNC_BEGIN: () => _e,
  TRACE_FUNC_END: () => De,
  Tensor: () => de,
  default: () => au,
  env: () => Y,
  registerBackend: () => qe
});
async function Vr(n = {}) {
  var t = n, a = !!globalThis.window, u = !!globalThis.WorkerGlobalScope, o = u && self.name?.startsWith("em-pthread");
  t.mountExternalData = (e, r) => {
    e.startsWith("./") && (e = e.substring(2)), (t.Rb || (t.Rb = /* @__PURE__ */ new Map())).set(e, r);
  }, t.unmountExternalData = () => {
    delete t.Rb, delete t.kc, delete t.jc, delete t.lc;
  }, globalThis.SharedArrayBuffer ?? new WebAssembly.Memory({ initial: 0, maximum: 0, shared: true }).buffer.constructor;
  var d, c, l = (e, r) => {
    throw r;
  }, m = import.meta.url, h = "";
  if (a || u) {
    try {
      h = new URL(".", m).href;
    } catch {
    }
    u && (c = (e) => {
      var r = new XMLHttpRequest();
      return r.open("GET", e, false), r.responseType = "arraybuffer", r.send(null), new Uint8Array(r.response);
    }), d = async (e) => {
      if (k(e)) return new Promise((i, s) => {
        var f = new XMLHttpRequest();
        f.open("GET", e, true), f.responseType = "arraybuffer", f.onload = () => {
          f.status == 200 || f.status == 0 && f.response ? i(f.response) : s(f.status);
        }, f.onerror = s, f.send(null);
      });
      var r = await fetch(e, { credentials: "same-origin" });
      if (r.ok) return r.arrayBuffer();
      throw Error(r.status + " : " + r.url);
    };
  }
  var g, b, y, T, I, _, $ = console.log.bind(console), v = console.error.bind(console), O = $, N = v, D = false, k = (e) => e.startsWith("file://");
  function w() {
    ge.buffer != H.buffer && ee();
  }
  if (o) {
    let e = function(r) {
      try {
        var i = r.data, s = i.Pb;
        if (s === "load") {
          let f = [];
          self.onmessage = (p) => f.push(p), _ = () => {
            postMessage({ Pb: "loaded" });
            for (let p of f) e(p);
            self.onmessage = e;
          };
          for (let p of i.Zb) t[p] && !t[p].proxy || (t[p] = (...E) => {
            postMessage({ Pb: "callHandler", Yb: p, args: E });
          }, p == "print" && (O = t[p]), p == "printErr" && (N = t[p]));
          ge = i.dc, ee(), b = i.ec, Ut(), it();
        } else if (s === "run") {
          (function(f) {
            var p = (w(), W)[f + 52 >>> 2 >>> 0];
            f = (w(), W)[f + 56 >>> 2 >>> 0], sr(p, p - f), P(p);
          })(i.Ob), zt(i.Ob, 0, 0, 1, 0, 0), wn(), Nt(i.Ob), Z ||= true;
          try {
            Ao(i.bc, i.Tb);
          } catch (f) {
            if (f != "unwind") throw f;
          }
        } else i.target !== "setimmediate" && (s === "checkMailbox" ? Z && rt() : s && (N(`worker: received unknown command ${s}`), N(i)));
      } catch (f) {
        throw tr(), f;
      }
    };
    var Ss = e, Z = false;
    self.onunhandledrejection = (r) => {
      throw r.reason || r;
    }, self.onmessage = e;
  }
  var H, ne, pe, B, W, re, me, A, K2, je = false;
  function ee() {
    var e = ge.buffer;
    t.HEAP8 = H = new Int8Array(e), pe = new Int16Array(e), t.HEAPU8 = ne = new Uint8Array(e), new Uint16Array(e), t.HEAP32 = B = new Int32Array(e), t.HEAPU32 = W = new Uint32Array(e), re = new Float32Array(e), me = new Float64Array(e), A = new BigInt64Array(e), new BigUint64Array(e);
  }
  function he() {
    je = true, o ? _() : Ee.Ta();
  }
  function j(e) {
    throw N(e = "Aborted(" + e + ")"), D = true, e = new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info."), I?.(e), e;
  }
  function q() {
    return { a: { T: fa, f: Io, w: Bo, e: Lo, k: _o, h: Do, L: Po, b: Uo, G: xo, ta: vn, j: Co, M: In, Ja: Bn, pa: Ln, ra: _n, Ka: Dn, Ha: Pn, Aa: Un, Ga: xn, Z: Cn, qa: Mn, na: Rn, Ia: Nn, oa: Fn, Pa: Mo, Da: Ro, la: Fo, ua: ko, ia: Wo, U: Go, Ca: Nt, Ma: $o, xa: zo, ya: Ho, za: jo, va: $n, wa: zn, ja: Hn, Ra: Yo, Oa: Xo, W: Qo, V: Zo, Na: Jo, F: Ko, La: ea, ma: ta, u: Vo, H: na, R: at, ka: oa, ba: ra, Sa: aa, Ea: Yn, Fa: Jn, sa: ye, I: qn, Y: Xn, Ba: Qn, X: Zn, $: ja, N: Wa, aa: Ha, O: ka, v: _a, d: pa, m: la, n: ca, r: va, ca: Ra, E: Ma, o: wa, P: Na, C: Ga, J: Ca, da: xa, ea: Ua, z: Oa, Q: Pa, fa: Da, y: Ba, D: Fa, c: da, q: ha, i: ma, _: Va, l: ya, p: ga, s: ba, t: Ea, x: Aa, S: La, A: $a, K: Ia, B: za, ga: Sa, ha: Ta, g: ia, a: ge, Qa: V } };
  }
  async function Ut() {
    function e(s, f) {
      return Ee = s.exports, Ee = (function() {
        var p = Ee, E = (x) => () => x() >>> 0, S = (x) => (R) => x(R) >>> 0;
        return (p = Object.assign({}, p)).sb = E(p.sb), p.ub = S(p.ub), p.Ib = S(p.Ib), p.Jb = E(p.Jb), p.Nb = S(p.Nb), p;
      })(), mn.push(Ee.vb), s = Ee, t._OrtInit = s.Ua, t._OrtGetLastError = s.Va, t._OrtCreateSessionOptions = s.Wa, t._OrtAppendExecutionProvider = s.Xa, t._OrtAddFreeDimensionOverride = s.Ya, t._OrtAddSessionConfigEntry = s.Za, t._OrtReleaseSessionOptions = s._a, t._OrtCreateSession = s.$a, t._OrtReleaseSession = s.ab, t._OrtGetInputOutputCount = s.bb, t._OrtGetInputOutputMetadata = s.cb, t._OrtFree = s.db, t._OrtCreateTensor = s.eb, t._OrtGetTensorData = s.fb, t._OrtReleaseTensor = s.gb, t._OrtCreateRunOptions = s.hb, t._OrtAddRunConfigEntry = s.ib, t._OrtReleaseRunOptions = s.jb, t._OrtCreateBinding = s.kb, t._OrtBindInput = s.lb, t._OrtBindOutput = s.mb, t._OrtClearBoundOutputs = s.nb, t._OrtReleaseBinding = s.ob, t._OrtRunWithBinding = s.pb, t._OrtRun = s.qb, t._OrtEndProfiling = s.rb, st = s.sb, Kn = t._free = s.tb, er = t._malloc = s.ub, zt = s.xb, tr = s.yb, nr = s.zb, rr = s.Ab, Ht = s.Bb, or = s.Cb, ar = s.Db, C = s.Eb, Je = s.Fb, sr = s.Gb, P = s.Hb, jt = s.Ib, U = s.Jb, ir = s.Kb, Vt = s.Lb, ur = s.Mb, fr = s.Nb, cr = s.wb, b = f, Ee;
    }
    var r, i = q();
    return t.instantiateWasm ? new Promise((s) => {
      t.instantiateWasm(i, (f, p) => {
        s(e(f, p));
      });
    }) : o ? e(new WebAssembly.Instance(b, q()), b) : (K2 ??= t.locateFile ? t.locateFile ? t.locateFile("ort-wasm-simd-threaded.wasm", h) : h + "ort-wasm-simd-threaded.wasm" : new URL("ort-wasm-simd-threaded.wasm", import.meta.url).href, r = await (async function(s) {
      var f = K2;
      if (!g && !k(f)) try {
        var p = fetch(f, { credentials: "same-origin" });
        return await WebAssembly.instantiateStreaming(p, s);
      } catch (E) {
        N(`wasm streaming compile failed: ${E}`), N("falling back to ArrayBuffer instantiation");
      }
      return (async function(E, S) {
        try {
          var x = await (async function(R) {
            if (!g) try {
              var X = await d(R);
              return new Uint8Array(X);
            } catch {
            }
            if (R == K2 && g) R = new Uint8Array(g);
            else {
              if (!c) throw "both async and sync fetching of the wasm failed";
              R = c(R);
            }
            return R;
          })(E);
          return await WebAssembly.instantiate(x, S);
        } catch (R) {
          N(`failed to asynchronously prepare wasm: ${R}`), j(R);
        }
      })(f, s);
    })(i), e(r.instance, r.module));
  }
  class Se {
    name = "ExitStatus";
    constructor(r) {
      this.message = `Program terminated with exit(${r})`, this.status = r;
    }
  }
  var ve = (e) => {
    e.terminate(), e.onmessage = () => {
    };
  }, Ve = [], Re = 0, te = null, ue = (e) => {
    ce.length == 0 && (yn(), bn(ce[0]));
    var r = ce.pop();
    if (!r) return 6;
    Ne.push(r), Oe[e.Ob] = r, r.Ob = e.Ob;
    var i = { Pb: "run", bc: e.ac, Tb: e.Tb, Ob: e.Ob };
    return r.postMessage(i, e.Xb), 0;
  }, se = 0, L = (e, r, ...i) => {
    var s, f = 16 * i.length, p = U(), E = jt(f), S = E >>> 3;
    for (s of i) typeof s == "bigint" ? ((w(), A)[S++ >>> 0] = 1n, (w(), A)[S++ >>> 0] = s) : ((w(), A)[S++ >>> 0] = 0n, (w(), me)[S++ >>> 0] = s);
    return e = nr(e, 0, f, E, r), P(p), e;
  };
  function V(e) {
    if (o) return L(0, 1, e);
    if (y = e, !(0 < se)) {
      for (var r of Ne) ve(r);
      for (r of ce) ve(r);
      ce = [], Ne = [], Oe = {}, D = true;
    }
    l(0, new Se(e));
  }
  function fe(e) {
    if (o) return L(1, 0, e);
    ye(e);
  }
  var ye = (e) => {
    if (y = e, o) throw fe(e), "unwind";
    V(e);
  }, ce = [], Ne = [], mn = [], Oe = {}, hn = (e) => {
    var r = e.Ob;
    delete Oe[r], ce.push(e), Ne.splice(Ne.indexOf(e), 1), e.Ob = 0, rr(r);
  };
  function wn() {
    mn.forEach((e) => e());
  }
  var bn = (e) => new Promise((r) => {
    e.onmessage = (f) => {
      var p = f.data;
      if (f = p.Pb, p.Sb && p.Sb != st()) {
        var E = Oe[p.Sb];
        E ? E.postMessage(p, p.Xb) : N(`Internal error! Worker sent a message "${f}" to target pthread ${p.Sb}, but that thread no longer exists!`);
      } else f === "checkMailbox" ? rt() : f === "spawnThread" ? ue(p) : f === "cleanupThread" ? Rt(() => {
        hn(Oe[p.cc]);
      }) : f === "loaded" ? (e.loaded = true, r(e)) : p.target === "setimmediate" ? e.postMessage(p) : f === "uncaughtException" ? e.onerror(p.error) : f === "callHandler" ? t[p.Yb](...p.args) : f && N(`worker sent an unknown command ${f}`);
    }, e.onerror = (f) => {
      throw N(`worker sent an error! ${f.filename}:${f.lineno}: ${f.message}`), f;
    };
    var i, s = [];
    for (i of []) t.propertyIsEnumerable(i) && s.push(i);
    e.postMessage({ Pb: "load", Zb: s, dc: ge, ec: b });
  });
  function yn() {
    var e = new Worker((() => {
      let r = URL;
      return import.meta.url > "file:" && import.meta.url < "file;" ? new r("ort.wasm.bundle.min.mjs", import.meta.url) : new URL(import.meta.url);
    })(), { type: "module", workerData: "em-pthread", name: "em-pthread" });
    ce.push(e);
  }
  var ge, gn = [], M = (e) => {
    var r = gn[e];
    return r || (gn[e] = r = cr.get(e)), r;
  }, Ao = (e, r) => {
    se = 0, e = M(e)(r), 0 < se ? y = e : Ht(e);
  }, tt = [], nt = 0;
  function Io(e) {
    var r = new xt(e >>>= 0);
    return (w(), H)[r.Qb + 12 >>> 0] == 0 && (En(r, true), nt--), Tn(r, false), tt.push(r), fr(e);
  }
  var Fe = 0, Bo = () => {
    C(0, 0);
    var e = tt.pop();
    ir(e.Ub), Fe = 0;
  };
  function En(e, r) {
    r = r ? 1 : 0, (w(), H)[e.Qb + 12 >>> 0] = r;
  }
  function Tn(e, r) {
    r = r ? 1 : 0, (w(), H)[e.Qb + 13 >>> 0] = r;
  }
  class xt {
    constructor(r) {
      this.Ub = r, this.Qb = r - 24;
    }
  }
  var Ct = (e) => {
    var r = Fe;
    if (!r) return Je(0), 0;
    var i = new xt(r);
    (w(), W)[i.Qb + 16 >>> 2 >>> 0] = r;
    var s = (w(), W)[i.Qb + 4 >>> 2 >>> 0];
    if (!s) return Je(0), r;
    for (var f of e) {
      if (f === 0 || f === s) break;
      if (ur(f, s, i.Qb + 16)) return Je(f), r;
    }
    return Je(s), r;
  };
  function Lo() {
    return Ct([]);
  }
  function _o(e) {
    return Ct([e >>> 0]);
  }
  function Do(e, r, i, s) {
    return Ct([e >>> 0, r >>> 0, i >>> 0, s >>> 0]);
  }
  var Po = () => {
    var e = tt.pop();
    e || j("no exception to throw");
    var r = e.Ub;
    throw (w(), H)[e.Qb + 13 >>> 0] == 0 && (tt.push(e), Tn(e, true), En(e, false), nt++), Vt(r), Fe = r;
  };
  function Uo(e, r, i) {
    var s = new xt(e >>>= 0);
    throw r >>>= 0, i >>>= 0, (w(), W)[s.Qb + 16 >>> 2 >>> 0] = 0, (w(), W)[s.Qb + 4 >>> 2 >>> 0] = r, (w(), W)[s.Qb + 8 >>> 2 >>> 0] = i, Vt(e), nt++, Fe = e;
  }
  var xo = () => nt;
  function Sn(e, r, i, s) {
    return o ? L(2, 1, e, r, i, s) : vn(e, r, i, s);
  }
  function vn(e, r, i, s) {
    if (e >>>= 0, r >>>= 0, i >>>= 0, s >>>= 0, !globalThis.SharedArrayBuffer) return 6;
    var f = [];
    return o && f.length === 0 ? Sn(e, r, i, s) : (e = { ac: i, Ob: e, Tb: s, Xb: f }, o ? (e.Pb = "spawnThread", postMessage(e, f), 0) : ue(e));
  }
  function Co(e) {
    throw Fe ||= e >>> 0, Fe;
  }
  var On = globalThis.TextDecoder && new TextDecoder(), An = (e, r = 0, i, s) => {
    var f = r >>>= 0;
    if (i = f + i, s) s = i;
    else {
      for (; e[f] && !(f >= i); ) ++f;
      s = f;
    }
    if (16 < s - r && e.buffer && On) return On.decode(e.buffer instanceof ArrayBuffer ? e.subarray(r, s) : e.slice(r, s));
    for (f = ""; r < s; ) if (128 & (i = e[r++])) {
      var p = 63 & e[r++];
      if ((224 & i) == 192) f += String.fromCharCode((31 & i) << 6 | p);
      else {
        var E = 63 & e[r++];
        65536 > (i = (240 & i) == 224 ? (15 & i) << 12 | p << 6 | E : (7 & i) << 18 | p << 12 | E << 6 | 63 & e[r++]) ? f += String.fromCharCode(i) : (i -= 65536, f += String.fromCharCode(55296 | i >> 10, 56320 | 1023 & i));
      }
    } else f += String.fromCharCode(i);
    return f;
  }, Mt = (e, r, i) => (e >>>= 0) ? An((w(), ne), e, r, i) : "";
  function In(e, r, i) {
    return o ? L(3, 1, e, r, i) : 0;
  }
  function Bn(e, r) {
    if (o) return L(4, 1, e, r);
  }
  function Ln(e, r) {
    if (o) return L(5, 1, e, r);
  }
  function _n(e, r, i) {
    if (o) return L(6, 1, e, r, i);
  }
  function Dn(e, r, i) {
    return o ? L(7, 1, e, r, i) : 0;
  }
  function Pn(e, r) {
    if (o) return L(8, 1, e, r);
  }
  function Un(e, r, i) {
    if (o) return L(9, 1, e, r, i);
  }
  function xn(e, r, i, s) {
    if (o) return L(10, 1, e, r, i, s);
  }
  function Cn(e, r, i, s) {
    if (o) return L(11, 1, e, r, i, s);
  }
  function Mn(e, r, i, s) {
    if (o) return L(12, 1, e, r, i, s);
  }
  function Rn(e) {
    if (o) return L(13, 1, e);
  }
  function Nn(e, r) {
    if (o) return L(14, 1, e, r);
  }
  function Fn(e, r, i) {
    if (o) return L(15, 1, e, r, i);
  }
  var Mo = () => j("");
  function Ro(e) {
    zt(e >>> 0, !u, 1, !a, 131072, false), wn();
  }
  var Rt = (e) => {
    if (!D) try {
      if (e(), !(0 < se)) try {
        o ? st() && Ht(y) : ye(y);
      } catch (r) {
        r instanceof Se || r == "unwind" || l(0, r);
      }
    } catch (r) {
      r instanceof Se || r == "unwind" || l(0, r);
    }
  }, No = !Atomics.waitAsync || globalThis.navigator?.userAgent && 91 > Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) || [])[2]);
  function Nt(e) {
    e >>>= 0, No || (Atomics.waitAsync((w(), B), e >>> 2, e).value.then(rt), e += 128, Atomics.store((w(), B), e >>> 2, 1));
  }
  var rt = () => Rt(() => {
    var e = st();
    e && (Nt(e), ar());
  });
  function Fo(e, r) {
    (e >>>= 0) == r >>> 0 ? setTimeout(rt) : o ? postMessage({ Sb: e, Pb: "checkMailbox" }) : (e = Oe[e]) && e.postMessage({ Pb: "checkMailbox" });
  }
  var Ft = [];
  function ko(e, r, i, s, f) {
    for (r >>>= 0, f >>>= 0, Ft.length = 0, i = f >>> 3, s = f + s >>> 3; i < s; ) {
      var p;
      p = (w(), A)[i++ >>> 0] ? (w(), A)[i++ >>> 0] : (w(), me)[i++ >>> 0], Ft.push(p);
    }
    return (r ? lr[r] : ua[e])(...Ft);
  }
  var Wo = () => {
    se = 0;
  };
  function Go(e) {
    e >>>= 0, o ? postMessage({ Pb: "cleanupThread", cc: e }) : hn(Oe[e]);
  }
  function $o(e) {
  }
  function zo(e, r) {
    e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e), r >>>= 0, e = new Date(1e3 * e), (w(), B)[r >>> 2 >>> 0] = e.getUTCSeconds(), (w(), B)[r + 4 >>> 2 >>> 0] = e.getUTCMinutes(), (w(), B)[r + 8 >>> 2 >>> 0] = e.getUTCHours(), (w(), B)[r + 12 >>> 2 >>> 0] = e.getUTCDate(), (w(), B)[r + 16 >>> 2 >>> 0] = e.getUTCMonth(), (w(), B)[r + 20 >>> 2 >>> 0] = e.getUTCFullYear() - 1900, (w(), B)[r + 24 >>> 2 >>> 0] = e.getUTCDay(), e = (e.getTime() - Date.UTC(e.getUTCFullYear(), 0, 1, 0, 0, 0, 0)) / 864e5 | 0, (w(), B)[r + 28 >>> 2 >>> 0] = e;
  }
  var kn = (e) => e % 4 == 0 && (e % 100 != 0 || e % 400 == 0), Wn = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Gn = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function Ho(e, r) {
    e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e), r >>>= 0, e = new Date(1e3 * e), (w(), B)[r >>> 2 >>> 0] = e.getSeconds(), (w(), B)[r + 4 >>> 2 >>> 0] = e.getMinutes(), (w(), B)[r + 8 >>> 2 >>> 0] = e.getHours(), (w(), B)[r + 12 >>> 2 >>> 0] = e.getDate(), (w(), B)[r + 16 >>> 2 >>> 0] = e.getMonth(), (w(), B)[r + 20 >>> 2 >>> 0] = e.getFullYear() - 1900, (w(), B)[r + 24 >>> 2 >>> 0] = e.getDay();
    var i = (kn(e.getFullYear()) ? Wn : Gn)[e.getMonth()] + e.getDate() - 1 | 0;
    (w(), B)[r + 28 >>> 2 >>> 0] = i, (w(), B)[r + 36 >>> 2 >>> 0] = -60 * e.getTimezoneOffset(), i = new Date(e.getFullYear(), 6, 1).getTimezoneOffset();
    var s = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
    e = 0 | (i != s && e.getTimezoneOffset() == Math.min(s, i)), (w(), B)[r + 32 >>> 2 >>> 0] = e;
  }
  function jo(e) {
    e >>>= 0;
    var r = new Date((w(), B)[e + 20 >>> 2 >>> 0] + 1900, (w(), B)[e + 16 >>> 2 >>> 0], (w(), B)[e + 12 >>> 2 >>> 0], (w(), B)[e + 8 >>> 2 >>> 0], (w(), B)[e + 4 >>> 2 >>> 0], (w(), B)[e >>> 2 >>> 0], 0), i = (w(), B)[e + 32 >>> 2 >>> 0], s = r.getTimezoneOffset(), f = new Date(r.getFullYear(), 6, 1).getTimezoneOffset(), p = new Date(r.getFullYear(), 0, 1).getTimezoneOffset(), E = Math.min(p, f);
    return 0 > i ? (w(), B)[e + 32 >>> 2 >>> 0] = +(f != p && E == s) : 0 < i != (E == s) && (f = Math.max(p, f), r.setTime(r.getTime() + 6e4 * ((0 < i ? E : f) - s))), (w(), B)[e + 24 >>> 2 >>> 0] = r.getDay(), i = (kn(r.getFullYear()) ? Wn : Gn)[r.getMonth()] + r.getDate() - 1 | 0, (w(), B)[e + 28 >>> 2 >>> 0] = i, (w(), B)[e >>> 2 >>> 0] = r.getSeconds(), (w(), B)[e + 4 >>> 2 >>> 0] = r.getMinutes(), (w(), B)[e + 8 >>> 2 >>> 0] = r.getHours(), (w(), B)[e + 12 >>> 2 >>> 0] = r.getDate(), (w(), B)[e + 16 >>> 2 >>> 0] = r.getMonth(), (w(), B)[e + 20 >>> 2 >>> 0] = r.getYear(), e = r.getTime(), BigInt(isNaN(e) ? -1 : e / 1e3);
  }
  function $n(e, r, i, s, f, p, E) {
    return o ? L(16, 1, e, r, i, s, f, p, E) : -52;
  }
  function zn(e, r, i, s, f, p) {
    if (o) return L(17, 1, e, r, i, s, f, p);
  }
  var Ye = {}, Vo = () => performance.timeOrigin + performance.now();
  function Hn(e, r) {
    if (o) return L(18, 1, e, r);
    if (Ye[e] && (clearTimeout(Ye[e].id), delete Ye[e]), !r) return 0;
    var i = setTimeout(() => {
      delete Ye[e], Rt(() => or(e, performance.timeOrigin + performance.now()));
    }, r);
    return Ye[e] = { id: i, mc: r }, 0;
  }
  var Ae = (e, r, i) => {
    var s = (w(), ne);
    if (r >>>= 0, 0 < i) {
      var f = r;
      i = r + i - 1;
      for (var p = 0; p < e.length; ++p) {
        var E = e.codePointAt(p);
        if (127 >= E) {
          if (r >= i) break;
          s[r++ >>> 0] = E;
        } else if (2047 >= E) {
          if (r + 1 >= i) break;
          s[r++ >>> 0] = 192 | E >> 6, s[r++ >>> 0] = 128 | 63 & E;
        } else if (65535 >= E) {
          if (r + 2 >= i) break;
          s[r++ >>> 0] = 224 | E >> 12, s[r++ >>> 0] = 128 | E >> 6 & 63, s[r++ >>> 0] = 128 | 63 & E;
        } else {
          if (r + 3 >= i) break;
          s[r++ >>> 0] = 240 | E >> 18, s[r++ >>> 0] = 128 | E >> 12 & 63, s[r++ >>> 0] = 128 | E >> 6 & 63, s[r++ >>> 0] = 128 | 63 & E, p++;
        }
      }
      s[r >>> 0] = 0, e = r - f;
    } else e = 0;
    return e;
  };
  function Yo(e, r, i, s) {
    e >>>= 0, r >>>= 0, i >>>= 0, s >>>= 0;
    var f = (/* @__PURE__ */ new Date()).getFullYear(), p = new Date(f, 0, 1).getTimezoneOffset();
    f = new Date(f, 6, 1).getTimezoneOffset();
    var E = Math.max(p, f);
    (w(), W)[e >>> 2 >>> 0] = 60 * E, (w(), B)[r >>> 2 >>> 0] = +(p != f), e = (r = (S) => {
      var x = Math.abs(S);
      return `UTC${0 <= S ? "-" : "+"}${String(Math.floor(x / 60)).padStart(2, "0")}${String(x % 60).padStart(2, "0")}`;
    })(p), r = r(f), f < p ? (Ae(e, i, 17), Ae(r, s, 17)) : (Ae(e, s, 17), Ae(r, i, 17));
  }
  var Jo = () => Date.now(), qo = 1;
  function Xo(e, r, i) {
    if (i >>>= 0, !(0 <= e && 3 >= e)) return 28;
    if (e === 0) e = Date.now();
    else {
      if (!qo) return 52;
      e = performance.timeOrigin + performance.now();
    }
    return e = Math.round(1e6 * e), (w(), A)[i >>> 3 >>> 0] = BigInt(e), 0;
  }
  var kt = [];
  function Qo(e, r, i) {
    e >>>= 0, r >>>= 0, i >>>= 0, kt.length = 0;
    for (var s; s = (w(), ne)[r++ >>> 0]; ) {
      var f = s != 105;
      i += (f &= s != 112) && i % 8 ? 4 : 0, kt.push(s == 112 ? (w(), W)[i >>> 2 >>> 0] : s == 106 ? (w(), A)[i >>> 3 >>> 0] : s == 105 ? (w(), B)[i >>> 2 >>> 0] : (w(), me)[i >>> 3 >>> 0]), i += f ? 8 : 4;
    }
    return lr[e](...kt);
  }
  var Zo = () => {
  };
  function Ko(e, r) {
    return N(Mt(e >>> 0, r >>> 0));
  }
  var ea = () => {
    throw se += 1, "unwind";
  };
  function ta() {
    return 4294901760;
  }
  var na = () => navigator.hardwareConcurrency, Ie = {}, Wt = (e) => {
    for (var r = 0, i = 0; i < e.length; ++i) {
      var s = e.charCodeAt(i);
      127 >= s ? r++ : 2047 >= s ? r += 2 : 55296 <= s && 57343 >= s ? (r += 4, ++i) : r += 3;
    }
    return r;
  }, ot = (e) => {
    var r;
    return (r = /\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(e)) ? +r[1] : (r = /:(\d+):\d+(?:\)|$)/.exec(e)) ? 2147483648 | +r[1] : 0;
  }, jn = (e) => {
    for (var r of e) (e = ot(r)) && (Ie[e] = r);
  };
  function ra() {
    var e = Error().stack.toString().split(`
`);
    return e[0] == "Error" && e.shift(), jn(e), Ie.Vb = ot(e[3]), Ie.$b = e, Ie.Vb;
  }
  function at(e) {
    if (!(e = Ie[e >>> 0])) return 0;
    var r;
    if (r = /^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(e)) e = r[1];
    else if (r = /^\s+at (.*) \(.*\)$/.exec(e)) e = r[1];
    else {
      if (!(r = /^(.+?)@/.exec(e))) return 0;
      e = r[1];
    }
    Kn(at.Wb ?? 0), r = Wt(e) + 1;
    var i = er(r);
    return i && Ae(e, i, r), at.Wb = i, at.Wb;
  }
  function oa(e) {
    e >>>= 0;
    var r = (w(), ne).length;
    if (e <= r || 4294901760 < e) return false;
    for (var i = 1; 4 >= i; i *= 2) {
      var s = r * (1 + 0.2 / i);
      s = Math.min(s, e + 100663296);
      e: {
        s = (Math.min(4294901760, 65536 * Math.ceil(Math.max(e, s) / 65536)) - ge.buffer.byteLength + 65535) / 65536 | 0;
        try {
          ge.grow(s), ee();
          var f = 1;
          break e;
        } catch {
        }
        f = void 0;
      }
      if (f) return true;
    }
    return false;
  }
  function aa(e, r, i) {
    if (e >>>= 0, r >>>= 0, Ie.Vb == e) var s = Ie.$b;
    else (s = Error().stack.toString().split(`
`))[0] == "Error" && s.shift(), jn(s);
    for (var f = 3; s[f] && ot(s[f]) != e; ) ++f;
    for (e = 0; e < i && s[e + f]; ++e) (w(), B)[r + 4 * e >>> 2 >>> 0] = ot(s[e + f]);
    return e;
  }
  var Gt, $t = {}, Vn = () => {
    if (!Gt) {
      var e, r = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: "./this.program" };
      for (e in $t) $t[e] === void 0 ? delete r[e] : r[e] = $t[e];
      var i = [];
      for (e in r) i.push(`${e}=${r[e]}`);
      Gt = i;
    }
    return Gt;
  };
  function Yn(e, r) {
    if (o) return L(19, 1, e, r);
    e >>>= 0, r >>>= 0;
    var i, s = 0, f = 0;
    for (i of Vn()) {
      var p = r + s;
      (w(), W)[e + f >>> 2 >>> 0] = p, s += Ae(i, p, 1 / 0) + 1, f += 4;
    }
    return 0;
  }
  function Jn(e, r) {
    if (o) return L(20, 1, e, r);
    e >>>= 0, r >>>= 0;
    var i = Vn();
    for (var s of ((w(), W)[e >>> 2 >>> 0] = i.length, e = 0, i)) e += Wt(s) + 1;
    return (w(), W)[r >>> 2 >>> 0] = e, 0;
  }
  function qn(e) {
    return o ? L(21, 1, e) : 52;
  }
  function Xn(e, r, i, s) {
    return o ? L(22, 1, e, r, i, s) : 52;
  }
  function Qn(e, r, i, s) {
    return o ? L(23, 1, e, r, i, s) : 70;
  }
  var sa = [null, [], []];
  function Zn(e, r, i, s) {
    if (o) return L(24, 1, e, r, i, s);
    r >>>= 0, i >>>= 0, s >>>= 0;
    for (var f = 0, p = 0; p < i; p++) {
      var E = (w(), W)[r >>> 2 >>> 0], S = (w(), W)[r + 4 >>> 2 >>> 0];
      r += 8;
      for (var x = 0; x < S; x++) {
        var R = e, X = (w(), ne)[E + x >>> 0], le = sa[R];
        X === 0 || X === 10 ? ((R === 1 ? O : N)(An(le)), le.length = 0) : le.push(X);
      }
      f += S;
    }
    return (w(), W)[s >>> 2 >>> 0] = f, 0;
  }
  function ia(e) {
    return e >>> 0;
  }
  o || (function() {
    for (var e = t.numThreads - 1; e--; ) yn();
    Ve.push(async () => {
      var r = (async function() {
        if (!o) return Promise.all(ce.map(bn));
      })();
      Re++, await r, --Re == 0 && te && (r = te, te = null, r());
    });
  })(), o || (ge = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true }), ee()), t.wasmBinary && (g = t.wasmBinary), t.stackSave = () => U(), t.stackRestore = (e) => P(e), t.stackAlloc = (e) => jt(e), t.setValue = function(e, r, i = "i8") {
    switch (i.endsWith("*") && (i = "*"), i) {
      case "i1":
      case "i8":
        (w(), H)[e >>> 0] = r;
        break;
      case "i16":
        (w(), pe)[e >>> 1 >>> 0] = r;
        break;
      case "i32":
        (w(), B)[e >>> 2 >>> 0] = r;
        break;
      case "i64":
        (w(), A)[e >>> 3 >>> 0] = BigInt(r);
        break;
      case "float":
        (w(), re)[e >>> 2 >>> 0] = r;
        break;
      case "double":
        (w(), me)[e >>> 3 >>> 0] = r;
        break;
      case "*":
        (w(), W)[e >>> 2 >>> 0] = r;
        break;
      default:
        j(`invalid type for setValue: ${i}`);
    }
  }, t.getValue = function(e, r = "i8") {
    switch (r.endsWith("*") && (r = "*"), r) {
      case "i1":
      case "i8":
        return (w(), H)[e >>> 0];
      case "i16":
        return (w(), pe)[e >>> 1 >>> 0];
      case "i32":
        return (w(), B)[e >>> 2 >>> 0];
      case "i64":
        return (w(), A)[e >>> 3 >>> 0];
      case "float":
        return (w(), re)[e >>> 2 >>> 0];
      case "double":
        return (w(), me)[e >>> 3 >>> 0];
      case "*":
        return (w(), W)[e >>> 2 >>> 0];
      default:
        j(`invalid type for getValue: ${r}`);
    }
  }, t.UTF8ToString = Mt, t.stringToUTF8 = Ae, t.lengthBytesUTF8 = Wt;
  var st, Kn, er, zt, tr, nr, rr, Ht, or, ar, C, Je, sr, P, jt, U, ir, Vt, ur, fr, cr, Ee, ua = [V, fe, Sn, In, Bn, Ln, _n, Dn, Pn, Un, xn, Cn, Mn, Rn, Nn, Fn, $n, zn, Hn, Yn, Jn, qn, Xn, Qn, Zn], lr = { 1011284: (e, r, i, s, f) => {
    if (t === void 0 || !t.Rb) return 1;
    if ((e = Mt(Number(e >>> 0))).startsWith("./") && (e = e.substring(2)), !(e = t.Rb.get(e))) return 2;
    if (r = Number(r >>> 0), i = Number(i >>> 0), s = Number(s >>> 0), r + i > e.byteLength) return 3;
    try {
      let p = e.subarray(r, r + i);
      switch (f) {
        case 0:
          (w(), ne).set(p, s >>> 0);
          break;
        case 1:
          t.fc ? t.fc(s, p) : t.ic(s, p);
          break;
        default:
          return 4;
      }
      return 0;
    } catch {
      return 4;
    }
  }, 1012108: () => typeof wasmOffsetConverter < "u" };
  function fa() {
    return typeof wasmOffsetConverter < "u";
  }
  function ca(e, r, i, s) {
    var f = U();
    try {
      return M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function la(e, r, i) {
    var s = U();
    try {
      return M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      C(1, 0);
    }
  }
  function da(e) {
    var r = U();
    try {
      M(e)();
    } catch (i) {
      if (P(r), i !== i + 0) throw i;
      C(1, 0);
    }
  }
  function pa(e, r) {
    var i = U();
    try {
      return M(e)(r);
    } catch (s) {
      if (P(i), s !== s + 0) throw s;
      C(1, 0);
    }
  }
  function ma(e, r, i) {
    var s = U();
    try {
      M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      C(1, 0);
    }
  }
  function ha(e, r) {
    var i = U();
    try {
      M(e)(r);
    } catch (s) {
      if (P(i), s !== s + 0) throw s;
      C(1, 0);
    }
  }
  function wa(e, r, i, s, f, p, E) {
    var S = U();
    try {
      return M(e)(r, i, s, f, p, E);
    } catch (x) {
      if (P(S), x !== x + 0) throw x;
      C(1, 0);
    }
  }
  function ba(e, r, i, s, f, p) {
    var E = U();
    try {
      M(e)(r, i, s, f, p);
    } catch (S) {
      if (P(E), S !== S + 0) throw S;
      C(1, 0);
    }
  }
  function ya(e, r, i, s) {
    var f = U();
    try {
      M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function ga(e, r, i, s, f) {
    var p = U();
    try {
      M(e)(r, i, s, f);
    } catch (E) {
      if (P(p), E !== E + 0) throw E;
      C(1, 0);
    }
  }
  function Ea(e, r, i, s, f, p, E) {
    var S = U();
    try {
      M(e)(r, i, s, f, p, E);
    } catch (x) {
      if (P(S), x !== x + 0) throw x;
      C(1, 0);
    }
  }
  function Ta(e, r, i, s, f, p, E) {
    var S = U();
    try {
      M(e)(r, i, s, f, p, E);
    } catch (x) {
      if (P(S), x !== x + 0) throw x;
      C(1, 0);
    }
  }
  function Sa(e, r, i, s, f, p, E, S) {
    var x = U();
    try {
      M(e)(r, i, s, f, p, E, S);
    } catch (R) {
      if (P(x), R !== R + 0) throw R;
      C(1, 0);
    }
  }
  function va(e, r, i, s, f) {
    var p = U();
    try {
      return M(e)(r, i, s, f);
    } catch (E) {
      if (P(p), E !== E + 0) throw E;
      C(1, 0);
    }
  }
  function Oa(e, r, i) {
    var s = U();
    try {
      return M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      C(1, 0);
    }
  }
  function Aa(e, r, i, s, f, p, E, S) {
    var x = U();
    try {
      M(e)(r, i, s, f, p, E, S);
    } catch (R) {
      if (P(x), R !== R + 0) throw R;
      C(1, 0);
    }
  }
  function Ia(e, r, i, s, f, p, E, S, x, R, X, le) {
    var we = U();
    try {
      M(e)(r, i, s, f, p, E, S, x, R, X, le);
    } catch (be) {
      if (P(we), be !== be + 0) throw be;
      C(1, 0);
    }
  }
  function Ba(e, r, i) {
    var s = U();
    try {
      return M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      return C(1, 0), 0n;
    }
  }
  function La(e, r, i, s, f, p, E, S, x) {
    var R = U();
    try {
      M(e)(r, i, s, f, p, E, S, x);
    } catch (X) {
      if (P(R), X !== X + 0) throw X;
      C(1, 0);
    }
  }
  function _a(e) {
    var r = U();
    try {
      return M(e)();
    } catch (i) {
      if (P(r), i !== i + 0) throw i;
      C(1, 0);
    }
  }
  function Da(e, r) {
    var i = U();
    try {
      return M(e)(r);
    } catch (s) {
      if (P(i), s !== s + 0) throw s;
      return C(1, 0), 0n;
    }
  }
  function Pa(e) {
    var r = U();
    try {
      return M(e)();
    } catch (i) {
      if (P(r), i !== i + 0) throw i;
      return C(1, 0), 0n;
    }
  }
  function Ua(e, r, i, s) {
    var f = U();
    try {
      return M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function xa(e, r, i, s, f) {
    var p = U();
    try {
      return M(e)(r, i, s, f);
    } catch (E) {
      if (P(p), E !== E + 0) throw E;
      C(1, 0);
    }
  }
  function Ca(e, r, i, s, f, p) {
    var E = U();
    try {
      return M(e)(r, i, s, f, p);
    } catch (S) {
      if (P(E), S !== S + 0) throw S;
      C(1, 0);
    }
  }
  function Ma(e, r, i, s, f, p) {
    var E = U();
    try {
      return M(e)(r, i, s, f, p);
    } catch (S) {
      if (P(E), S !== S + 0) throw S;
      C(1, 0);
    }
  }
  function Ra(e, r, i, s, f, p) {
    var E = U();
    try {
      return M(e)(r, i, s, f, p);
    } catch (S) {
      if (P(E), S !== S + 0) throw S;
      C(1, 0);
    }
  }
  function Na(e, r, i, s, f, p, E, S) {
    var x = U();
    try {
      return M(e)(r, i, s, f, p, E, S);
    } catch (R) {
      if (P(x), R !== R + 0) throw R;
      C(1, 0);
    }
  }
  function Fa(e, r, i, s, f) {
    var p = U();
    try {
      return M(e)(r, i, s, f);
    } catch (E) {
      if (P(p), E !== E + 0) throw E;
      return C(1, 0), 0n;
    }
  }
  function ka(e, r, i, s) {
    var f = U();
    try {
      return M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function Wa(e, r, i, s) {
    var f = U();
    try {
      return M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function Ga(e, r, i, s, f, p, E, S, x, R, X, le) {
    var we = U();
    try {
      return M(e)(r, i, s, f, p, E, S, x, R, X, le);
    } catch (be) {
      if (P(we), be !== be + 0) throw be;
      C(1, 0);
    }
  }
  function $a(e, r, i, s, f, p, E, S, x, R, X) {
    var le = U();
    try {
      M(e)(r, i, s, f, p, E, S, x, R, X);
    } catch (we) {
      if (P(le), we !== we + 0) throw we;
      C(1, 0);
    }
  }
  function za(e, r, i, s, f, p, E, S, x, R, X, le, we, be, Ya, Ja) {
    var qa = U();
    try {
      M(e)(r, i, s, f, p, E, S, x, R, X, le, we, be, Ya, Ja);
    } catch (Yt) {
      if (P(qa), Yt !== Yt + 0) throw Yt;
      C(1, 0);
    }
  }
  function Ha(e, r, i) {
    var s = U();
    try {
      return M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      C(1, 0);
    }
  }
  function ja(e, r, i) {
    var s = U();
    try {
      return M(e)(r, i);
    } catch (f) {
      if (P(s), f !== f + 0) throw f;
      C(1, 0);
    }
  }
  function Va(e, r, i, s) {
    var f = U();
    try {
      M(e)(r, i, s);
    } catch (p) {
      if (P(f), p !== p + 0) throw p;
      C(1, 0);
    }
  }
  function it() {
    if (0 < Re) te = it;
    else if (o) T?.(t), he();
    else {
      for (var e = Ve; 0 < e.length; ) e.shift()(t);
      0 < Re ? te = it : (t.calledRun = true, D || (he(), T?.(t)));
    }
  }
  return o || (Ee = await Ut(), it()), t.PTR_SIZE = 4, je ? t : new Promise((e, r) => {
    T = e, I = r;
  });
}
var Jt, Xa, Qa, Za, qt, F, ut, Ka, Xt, ft, Be, qe, es, dr, Qt, pr, mr, hr, wr, J, Zt, Y, br, yr, gr, Er, Kt, Tr, Sr, vr, Or, Ar, Ir, Le, Xe, Br, Lr, _r, Dr, Pr, Ur, Q, ct, de, en, xr, Cr, _e, De, Pe, Ue, tn, lt, Mr, ts, Rr, Nr, Fr, kr, Wr, nn, Te, dt, Hr, $r, zr, ns, jr, Yr, rs, os, Jr, Qr, an, as, oe, Zr, on, ss, is, Kr, us, qr, eo, Xr, to, pt, sn, un, St, no, fs, cs, ls, mt, z, xe, ae, Ze, G, vt, ro, oo, ds, ps, ms, ke, hs, ao, so, We, Ot, Ge, io, uo, At, It, fo, fn, Ke, cn, ws, ht, wt, $e, bs, co, Qe, bt, yt, lo, gt, Et, Tt, rn, Me, ie, et, Lt, _t, Bt, ln, dn, ze, He, gs, po, mo, ho, wo, bo, yo, go, pn, Eo, Es, Dt, To, vo, So, Pt, Ts, Oo, Gr, au;
var init_ort_wasm_bundle_min = __esm({
  "packages/cycle5-browser/node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs"() {
    Jt = Object.defineProperty;
    Xa = Object.getOwnPropertyDescriptor;
    Qa = Object.getOwnPropertyNames;
    Za = Object.prototype.hasOwnProperty;
    qt = ((n) => typeof __require < "u" ? __require : typeof Proxy < "u" ? new Proxy(n, { get: (t, a) => (typeof __require < "u" ? __require : t)[a] }) : n)(function(n) {
      if (typeof __require < "u") return __require.apply(this, arguments);
      throw Error('Dynamic require of "' + n + '" is not supported');
    });
    F = (n, t, a) => () => {
      if (a) throw a[0];
      try {
        return n && (t = n(n = 0)), t;
      } catch (u) {
        throw a = [u], u;
      }
    };
    ut = (n, t) => {
      for (var a in t) Jt(n, a, { get: t[a], enumerable: true });
    };
    Ka = (n, t, a, u) => {
      if (t && typeof t == "object" || typeof t == "function") for (let o of Qa(t)) !Za.call(n, o) && o !== a && Jt(n, o, { get: () => t[o], enumerable: !(u = Xa(t, o)) || u.enumerable });
      return n;
    };
    Xt = (n) => Ka(Jt({}, "__esModule", { value: true }), n);
    Qt = F(() => {
      "use strict";
      ft = /* @__PURE__ */ new Map(), Be = [], qe = (n, t, a) => {
        if (t && typeof t.init == "function" && typeof t.createInferenceSessionHandler == "function") {
          let u = ft.get(n);
          if (u === void 0) ft.set(n, { backend: t, priority: a });
          else {
            if (u.priority > a) return;
            if (u.priority === a && u.backend !== t) throw new Error(`cannot register backend "${n}" using priority ${a}`);
          }
          if (a >= 0) {
            let o = Be.indexOf(n);
            o !== -1 && Be.splice(o, 1);
            for (let d = 0; d < Be.length; d++) if (ft.get(Be[d]).priority <= a) {
              Be.splice(d, 0, n);
              return;
            }
            Be.push(n);
          }
          return;
        }
        throw new TypeError("not a valid backend");
      }, es = async (n) => {
        let t = ft.get(n);
        if (!t) return "backend not found.";
        if (t.initialized) return t.backend;
        if (t.aborted) return t.error;
        {
          let a = !!t.initPromise;
          try {
            return a || (t.initPromise = t.backend.init(n)), await t.initPromise, t.initialized = true, t.backend;
          } catch (u) {
            return a || (t.error = `${u}`, t.aborted = true), t.error;
          } finally {
            delete t.initPromise;
          }
        }
      }, dr = async (n) => {
        let t = n.executionProviders || [], a = t.map((m) => typeof m == "string" ? m : m.name), u = a.length === 0 ? Be : a, o, d = [], c = /* @__PURE__ */ new Set();
        for (let m of u) {
          let h = await es(m);
          typeof h == "string" ? d.push({ name: m, err: h }) : (o || (o = h), o === h && c.add(m));
        }
        if (!o) throw new Error(`no available backend found. ERR: ${d.map((m) => `[${m.name}] ${m.err}`).join(", ")}`);
        for (let { name: m, err: h } of d) a.includes(m) && console.warn(`removing requested execution provider "${m}" from session options because it is not available: ${h}`);
        let l = t.filter((m) => c.has(typeof m == "string" ? m : m.name));
        return [o, new Proxy(n, { get: (m, h) => h === "executionProviders" ? l : Reflect.get(m, h) })];
      };
    });
    pr = F(() => {
      "use strict";
      Qt();
    });
    hr = F(() => {
      "use strict";
      mr = "1.29.0";
    });
    Zt = F(() => {
      "use strict";
      hr();
      wr = "warning", J = { wasm: {}, webgl: {}, webgpu: {}, versions: { common: mr }, set logLevel(n) {
        if (n !== void 0) {
          if (typeof n != "string" || ["verbose", "info", "warning", "error", "fatal"].indexOf(n) === -1) throw new Error(`Unsupported logging level: ${n}`);
          wr = n;
        }
      }, get logLevel() {
        return wr;
      } };
      Object.defineProperty(J, "logLevel", { enumerable: true });
    });
    br = F(() => {
      "use strict";
      Zt();
      Y = J;
    });
    Er = F(() => {
      "use strict";
      yr = (n, t) => {
        let a = typeof document < "u" ? document.createElement("canvas") : new OffscreenCanvas(1, 1);
        a.width = n.dims[3], a.height = n.dims[2];
        let u = a.getContext("2d");
        if (u != null) {
          let o, d;
          t?.tensorLayout !== void 0 && t.tensorLayout === "NHWC" ? (o = n.dims[2], d = n.dims[3]) : (o = n.dims[3], d = n.dims[2]);
          let c = t?.format !== void 0 ? t.format : "RGB", l = t?.norm, m, h;
          l === void 0 || l.mean === void 0 ? m = [255, 255, 255, 255] : typeof l.mean == "number" ? m = [l.mean, l.mean, l.mean, l.mean] : (m = [l.mean[0], l.mean[1], l.mean[2], 0], l.mean[3] !== void 0 && (m[3] = l.mean[3])), l === void 0 || l.bias === void 0 ? h = [0, 0, 0, 0] : typeof l.bias == "number" ? h = [l.bias, l.bias, l.bias, l.bias] : (h = [l.bias[0], l.bias[1], l.bias[2], 0], l.bias[3] !== void 0 && (h[3] = l.bias[3]));
          let g = d * o, b = 0, y = g, T = g * 2, I = -1;
          c === "RGBA" ? (b = 0, y = g, T = g * 2, I = g * 3) : c === "RGB" ? (b = 0, y = g, T = g * 2) : c === "RBG" && (b = 0, T = g, y = g * 2);
          for (let _ = 0; _ < d; _++) for (let $ = 0; $ < o; $++) {
            let v = (n.data[b++] - h[0]) * m[0], O = (n.data[y++] - h[1]) * m[1], N = (n.data[T++] - h[2]) * m[2], D = I === -1 ? 255 : (n.data[I++] - h[3]) * m[3];
            u.fillStyle = "rgba(" + v + "," + O + "," + N + "," + D + ")", u.fillRect($, _, 1, 1);
          }
          if ("toDataURL" in a) return a.toDataURL();
          throw new Error("toDataURL is not supported");
        } else throw new Error("Can not access image data");
      }, gr = (n, t) => {
        let a = typeof document < "u" ? document.createElement("canvas").getContext("2d") : new OffscreenCanvas(1, 1).getContext("2d"), u;
        if (a != null) {
          let o, d, c;
          t?.tensorLayout !== void 0 && t.tensorLayout === "NHWC" ? (o = n.dims[2], d = n.dims[1], c = n.dims[3]) : (o = n.dims[3], d = n.dims[2], c = n.dims[1]);
          let l = t !== void 0 && t.format !== void 0 ? t.format : "RGB", m = t?.norm, h, g;
          m === void 0 || m.mean === void 0 ? h = [255, 255, 255, 255] : typeof m.mean == "number" ? h = [m.mean, m.mean, m.mean, m.mean] : (h = [m.mean[0], m.mean[1], m.mean[2], 255], m.mean[3] !== void 0 && (h[3] = m.mean[3])), m === void 0 || m.bias === void 0 ? g = [0, 0, 0, 0] : typeof m.bias == "number" ? g = [m.bias, m.bias, m.bias, m.bias] : (g = [m.bias[0], m.bias[1], m.bias[2], 0], m.bias[3] !== void 0 && (g[3] = m.bias[3]));
          let b = d * o;
          if (t !== void 0 && (t.format !== void 0 && c === 4 && t.format !== "RGBA" || c === 3 && t.format !== "RGB" && t.format !== "BGR")) throw new Error("Tensor format doesn't match input tensor dims");
          let y = 4, T = 0, I = 1, _ = 2, $ = 3, v = 0, O = b, N = b * 2, D = -1;
          l === "RGBA" ? (v = 0, O = b, N = b * 2, D = b * 3) : l === "RGB" ? (v = 0, O = b, N = b * 2) : l === "RBG" && (v = 0, N = b, O = b * 2), u = a.createImageData(o, d);
          for (let k = 0; k < d * o; T += y, I += y, _ += y, $ += y, k++) u.data[T] = (n.data[v++] - g[0]) * h[0], u.data[I] = (n.data[O++] - g[1]) * h[1], u.data[_] = (n.data[N++] - g[2]) * h[2], u.data[$] = D === -1 ? 255 : (n.data[D++] - g[3]) * h[3];
        } else throw new Error("Can not access image data");
        return u;
      };
    });
    Ir = F(() => {
      "use strict";
      ct();
      Kt = (n, t) => {
        if (n === void 0) throw new Error("Image buffer must be defined");
        if (t.height === void 0 || t.width === void 0) throw new Error("Image height and width must be defined");
        if (t.tensorLayout === "NHWC") throw new Error("NHWC Tensor layout is not supported yet");
        let { height: a, width: u } = t, o = t.norm ?? { mean: 255, bias: 0 }, d, c;
        typeof o.mean == "number" ? d = [o.mean, o.mean, o.mean, o.mean] : d = [o.mean[0], o.mean[1], o.mean[2], o.mean[3] ?? 255], typeof o.bias == "number" ? c = [o.bias, o.bias, o.bias, o.bias] : c = [o.bias[0], o.bias[1], o.bias[2], o.bias[3] ?? 0];
        let l = t.format !== void 0 ? t.format : "RGBA", m = t.tensorFormat !== void 0 && t.tensorFormat !== void 0 ? t.tensorFormat : "RGB", h = a * u, g = m === "RGBA" ? new Float32Array(h * 4) : new Float32Array(h * 3), b = 4, y = 0, T = 1, I = 2, _ = 3, $ = 0, v = h, O = h * 2, N = -1;
        l === "RGB" && (b = 3, y = 0, T = 1, I = 2, _ = -1), m === "RGBA" ? N = h * 3 : m === "RBG" ? ($ = 0, O = h, v = h * 2) : m === "BGR" && (O = 0, v = h, $ = h * 2);
        for (let k = 0; k < h; k++, y += b, I += b, T += b, _ += b) g[$++] = (n[y] + c[0]) / d[0], g[v++] = (n[T] + c[1]) / d[1], g[O++] = (n[I] + c[2]) / d[2], N !== -1 && _ !== -1 && (g[N++] = (n[_] + c[3]) / d[3]);
        return m === "RGBA" ? new Q("float32", g, [1, 4, a, u]) : new Q("float32", g, [1, 3, a, u]);
      }, Tr = async (n, t) => {
        let a = typeof HTMLImageElement < "u" && n instanceof HTMLImageElement, u = typeof ImageData < "u" && n instanceof ImageData, o = typeof ImageBitmap < "u" && n instanceof ImageBitmap, d = typeof n == "string", c, l = t ?? {}, m = () => {
          if (typeof document < "u") return document.createElement("canvas");
          if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(1, 1);
          throw new Error("Canvas is not supported");
        }, h = (g) => typeof HTMLCanvasElement < "u" && g instanceof HTMLCanvasElement || g instanceof OffscreenCanvas ? g.getContext("2d") : null;
        if (a) {
          let g = m();
          g.width = n.width, g.height = n.height;
          let b = h(g);
          if (b != null) {
            let y = n.height, T = n.width;
            if (t !== void 0 && t.resizedHeight !== void 0 && t.resizedWidth !== void 0 && (y = t.resizedHeight, T = t.resizedWidth), t !== void 0) {
              if (l = t, t.tensorFormat !== void 0) throw new Error("Image input config format must be RGBA for HTMLImageElement");
              l.tensorFormat = "RGBA", l.height = y, l.width = T;
            } else l.tensorFormat = "RGBA", l.height = y, l.width = T;
            b.drawImage(n, 0, 0), c = b.getImageData(0, 0, T, y).data;
          } else throw new Error("Can not access image data");
        } else if (u) {
          let g, b;
          if (t !== void 0 && t.resizedWidth !== void 0 && t.resizedHeight !== void 0 ? (g = t.resizedHeight, b = t.resizedWidth) : (g = n.height, b = n.width), t !== void 0 && (l = t), l.format = "RGBA", l.height = g, l.width = b, t !== void 0) {
            let y = m();
            y.width = b, y.height = g;
            let T = h(y);
            if (T != null) T.putImageData(n, 0, 0), c = T.getImageData(0, 0, b, g).data;
            else throw new Error("Can not access image data");
          } else c = n.data;
        } else if (o) {
          if (t === void 0) throw new Error("Please provide image config with format for Imagebitmap");
          let g = m();
          g.width = n.width, g.height = n.height;
          let b = h(g);
          if (b != null) {
            let y = n.height, T = n.width;
            return b.drawImage(n, 0, 0, T, y), c = b.getImageData(0, 0, T, y).data, l.height = y, l.width = T, Kt(c, l);
          } else throw new Error("Can not access image data");
        } else {
          if (d) return new Promise((g, b) => {
            let y = m(), T = h(y);
            if (!n || !T) return b();
            let I = new Image();
            I.crossOrigin = "Anonymous", I.src = n, I.onload = () => {
              y.width = I.width, y.height = I.height, T.drawImage(I, 0, 0, y.width, y.height);
              let _ = T.getImageData(0, 0, y.width, y.height);
              l.height = y.height, l.width = y.width, g(Kt(_.data, l));
            };
          });
          throw new Error("Input data provided is not supported - aborted tensor creation");
        }
        if (c !== void 0) return Kt(c, l);
        throw new Error("Input data provided is not supported - aborted tensor creation");
      }, Sr = (n, t) => {
        let { width: a, height: u, download: o, dispose: d } = t, c = [1, u, a, 4];
        return new Q({ location: "texture", type: "float32", texture: n, dims: c, download: o, dispose: d });
      }, vr = (n, t) => {
        let { dataType: a, dims: u, download: o, dispose: d } = t;
        return new Q({ location: "gpu-buffer", type: a ?? "float32", gpuBuffer: n, dims: u, download: o, dispose: d });
      }, Or = (n, t) => {
        let { dataType: a, dims: u, download: o, dispose: d } = t;
        return new Q({ location: "ml-tensor", type: a ?? "float32", mlTensor: n, dims: u, download: o, dispose: d });
      }, Ar = (n, t, a) => new Q({ location: "cpu-pinned", type: n, data: t, dims: a ?? [t.length] });
    });
    _r = F(() => {
      "use strict";
      Le = /* @__PURE__ */ new Map([["float32", Float32Array], ["uint8", Uint8Array], ["int8", Int8Array], ["uint16", Uint16Array], ["int16", Int16Array], ["int32", Int32Array], ["bool", Uint8Array], ["float64", Float64Array], ["uint32", Uint32Array], ["int4", Uint8Array], ["uint4", Uint8Array]]), Xe = /* @__PURE__ */ new Map([[Float32Array, "float32"], [Uint8Array, "uint8"], [Int8Array, "int8"], [Uint16Array, "uint16"], [Int16Array, "int16"], [Int32Array, "int32"], [Float64Array, "float64"], [Uint32Array, "uint32"]]), Br = false, Lr = () => {
        if (!Br) {
          Br = true;
          let n = typeof BigInt64Array < "u" && BigInt64Array.from, t = typeof BigUint64Array < "u" && BigUint64Array.from, a = globalThis.Float16Array, u = typeof a < "u" && a.from;
          n && (Le.set("int64", BigInt64Array), Xe.set(BigInt64Array, "int64")), t && (Le.set("uint64", BigUint64Array), Xe.set(BigUint64Array, "uint64")), u ? (Le.set("float16", a), Xe.set(a, "float16")) : Le.set("float16", Uint16Array);
        }
      };
    });
    Ur = F(() => {
      "use strict";
      ct();
      Dr = (n) => {
        let t = 1;
        for (let a = 0; a < n.length; a++) {
          let u = n[a];
          if (typeof u != "number" || !Number.isSafeInteger(u)) throw new TypeError(`dims[${a}] must be an integer, got: ${u}`);
          if (u < 0) throw new RangeError(`dims[${a}] must be a non-negative integer, got: ${u}`);
          t *= u;
        }
        return t;
      }, Pr = (n, t) => {
        switch (n.location) {
          case "cpu":
            return new Q(n.type, n.data, t);
          case "cpu-pinned":
            return new Q({ location: "cpu-pinned", data: n.data, type: n.type, dims: t });
          case "texture":
            return new Q({ location: "texture", texture: n.texture, type: n.type, dims: t });
          case "gpu-buffer":
            return new Q({ location: "gpu-buffer", gpuBuffer: n.gpuBuffer, type: n.type, dims: t });
          case "ml-tensor":
            return new Q({ location: "ml-tensor", mlTensor: n.mlTensor, type: n.type, dims: t });
          default:
            throw new Error(`tensorReshape: tensor location ${n.location} is not supported`);
        }
      };
    });
    ct = F(() => {
      "use strict";
      Er();
      Ir();
      _r();
      Ur();
      Q = class {
        constructor(t, a, u) {
          Lr();
          let o, d;
          if (typeof t == "object" && "location" in t) switch (this.dataLocation = t.location, o = t.type, d = t.dims, t.location) {
            case "cpu-pinned": {
              let l = Le.get(o);
              if (!l) throw new TypeError(`unsupported type "${o}" to create tensor from pinned buffer`);
              if (!(t.data instanceof l)) throw new TypeError(`buffer should be of type ${l.name}`);
              this.cpuData = t.data;
              break;
            }
            case "texture": {
              if (o !== "float32") throw new TypeError(`unsupported type "${o}" to create tensor from texture`);
              this.gpuTextureData = t.texture, this.downloader = t.download, this.disposer = t.dispose;
              break;
            }
            case "gpu-buffer": {
              if (o !== "float32" && o !== "float16" && o !== "int32" && o !== "int64" && o !== "uint32" && o !== "uint8" && o !== "bool" && o !== "uint4" && o !== "int4") throw new TypeError(`unsupported type "${o}" to create tensor from gpu buffer`);
              this.gpuBufferData = t.gpuBuffer, this.downloader = t.download, this.disposer = t.dispose;
              break;
            }
            case "ml-tensor": {
              if (o !== "float32" && o !== "float16" && o !== "int32" && o !== "int64" && o !== "uint32" && o !== "uint64" && o !== "int8" && o !== "uint8" && o !== "bool" && o !== "uint4" && o !== "int4") throw new TypeError(`unsupported type "${o}" to create tensor from MLTensor`);
              this.mlTensorData = t.mlTensor, this.downloader = t.download, this.disposer = t.dispose;
              break;
            }
            default:
              throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`);
          }
          else {
            let l, m;
            if (typeof t == "string") if (o = t, m = u, t === "string") {
              if (!Array.isArray(a)) throw new TypeError("A string tensor's data must be a string array.");
              l = a;
            } else {
              let h = Le.get(t);
              if (h === void 0) throw new TypeError(`Unsupported tensor type: ${t}.`);
              if (Array.isArray(a)) {
                if (t === "float16" && h === Uint16Array || t === "uint4" || t === "int4") throw new TypeError(`Creating a ${t} tensor from number array is not supported. Please use ${h.name} as data.`);
                t === "uint64" || t === "int64" ? l = h.from(a, BigInt) : l = h.from(a);
              } else if (a instanceof h) l = a;
              else if (a instanceof Uint8ClampedArray) if (t === "uint8") l = Uint8Array.from(a);
              else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");
              else if (t === "float16" && a instanceof Uint16Array && h !== Uint16Array) l = new globalThis.Float16Array(a.buffer, a.byteOffset, a.length);
              else throw new TypeError(`A ${o} tensor's data must be type of ${h}`);
            }
            else if (m = a, Array.isArray(t)) {
              if (t.length === 0) throw new TypeError("Tensor type cannot be inferred from an empty array.");
              let h = typeof t[0];
              if (h === "string") o = "string", l = t;
              else if (h === "boolean") o = "bool", l = Uint8Array.from(t);
              else throw new TypeError(`Invalid element type of data array: ${h}.`);
            } else if (t instanceof Uint8ClampedArray) o = "uint8", l = Uint8Array.from(t);
            else {
              let h = Xe.get(t.constructor);
              if (h === void 0) throw new TypeError(`Unsupported type for tensor data: ${t.constructor}.`);
              o = h, l = t;
            }
            if (m === void 0) m = [l.length];
            else if (!Array.isArray(m)) throw new TypeError("A tensor's dims must be a number array");
            d = m, this.cpuData = l, this.dataLocation = "cpu";
          }
          let c = Dr(d);
          if (this.cpuData && c !== this.cpuData.length && !((o === "uint4" || o === "int4") && Math.ceil(c / 2) === this.cpuData.length)) throw new Error(`Tensor's size(${c}) does not match data length(${this.cpuData.length}).`);
          this.type = o, this.dims = d, this.size = c;
        }
        static async fromImage(t, a) {
          return Tr(t, a);
        }
        static fromTexture(t, a) {
          return Sr(t, a);
        }
        static fromGpuBuffer(t, a) {
          return vr(t, a);
        }
        static fromMLTensor(t, a) {
          return Or(t, a);
        }
        static fromPinnedBuffer(t, a, u) {
          return Ar(t, a, u);
        }
        toDataURL(t) {
          return yr(this, t);
        }
        toImageData(t) {
          return gr(this, t);
        }
        get data() {
          if (this.ensureValid(), !this.cpuData) throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");
          return this.cpuData;
        }
        get location() {
          return this.dataLocation;
        }
        get texture() {
          if (this.ensureValid(), !this.gpuTextureData) throw new Error("The data is not stored as a WebGL texture.");
          return this.gpuTextureData;
        }
        get gpuBuffer() {
          if (this.ensureValid(), !this.gpuBufferData) throw new Error("The data is not stored as a WebGPU buffer.");
          return this.gpuBufferData;
        }
        get mlTensor() {
          if (this.ensureValid(), !this.mlTensorData) throw new Error("The data is not stored as a WebNN MLTensor.");
          return this.mlTensorData;
        }
        async getData(t) {
          switch (this.ensureValid(), this.dataLocation) {
            case "cpu":
            case "cpu-pinned":
              return this.data;
            case "texture":
            case "gpu-buffer":
            case "ml-tensor": {
              if (!this.downloader) throw new Error("The current tensor is not created with a specified data downloader.");
              if (this.isDownloading) throw new Error("The current tensor is being downloaded.");
              try {
                this.isDownloading = true;
                let a = await this.downloader();
                return this.downloader = void 0, this.dataLocation = "cpu", this.cpuData = a, t && this.disposer && (this.disposer(), this.disposer = void 0), a;
              } finally {
                this.isDownloading = false;
              }
            }
            default:
              throw new Error(`cannot get data from location: ${this.dataLocation}`);
          }
        }
        dispose() {
          if (this.isDownloading) throw new Error("The current tensor is being downloaded.");
          this.disposer && (this.disposer(), this.disposer = void 0), this.cpuData = void 0, this.gpuTextureData = void 0, this.gpuBufferData = void 0, this.mlTensorData = void 0, this.downloader = void 0, this.isDownloading = void 0, this.dataLocation = "none";
        }
        ensureValid() {
          if (this.dataLocation === "none") throw new Error("The tensor is disposed.");
        }
        reshape(t) {
          if (this.ensureValid(), this.downloader || this.disposer) throw new Error("Cannot reshape a tensor that owns GPU resource.");
          return Pr(this, t);
        }
      };
    });
    en = F(() => {
      "use strict";
      ct();
      de = Q;
    });
    tn = F(() => {
      "use strict";
      Zt();
      xr = (n, t) => {
        (typeof J.trace > "u" ? !J.wasm.trace : !J.trace) || console.timeStamp(`${n}::ORT::${t}`);
      }, Cr = (n, t) => {
        let a = new Error().stack?.split(/\r\n|\r|\n/g) || [], u = false;
        for (let o = 0; o < a.length; o++) {
          if (u && !a[o].includes("TRACE_FUNC")) {
            let d = `FUNC_${n}::${a[o].trim().split(" ")[1]}`;
            t && (d += `::${t}`), xr("CPU", d);
            return;
          }
          a[o].includes("TRACE_FUNC") && (u = true);
        }
      }, _e = (n) => {
        (typeof J.trace > "u" ? !J.wasm.trace : !J.trace) || Cr("BEGIN", n);
      }, De = (n) => {
        (typeof J.trace > "u" ? !J.wasm.trace : !J.trace) || Cr("END", n);
      }, Pe = (n) => {
        (typeof J.trace > "u" ? !J.wasm.trace : !J.trace) || console.time(`ORT::${n}`);
      }, Ue = (n) => {
        (typeof J.trace > "u" ? !J.wasm.trace : !J.trace) || console.timeEnd(`ORT::${n}`);
      };
    });
    Mr = F(() => {
      "use strict";
      Qt();
      en();
      tn();
      lt = class n {
        constructor(t) {
          this.handler = t;
        }
        async run(t, a, u) {
          _e(), Pe("InferenceSession.run");
          let o = {}, d = {};
          if (typeof t != "object" || t === null || t instanceof de || Array.isArray(t)) throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");
          let c = true;
          if (typeof a == "object") {
            if (a === null) throw new TypeError("Unexpected argument[1]: cannot be null.");
            if (a instanceof de) throw new TypeError("'fetches' cannot be a Tensor");
            if (Array.isArray(a)) {
              if (a.length === 0) throw new TypeError("'fetches' cannot be an empty array.");
              c = false;
              for (let h of a) {
                if (typeof h != "string") throw new TypeError("'fetches' must be a string array or an object.");
                if (this.outputNames.indexOf(h) === -1) throw new RangeError(`'fetches' contains invalid output name: ${h}.`);
                o[h] = null;
              }
              if (typeof u == "object" && u !== null) d = u;
              else if (typeof u < "u") throw new TypeError("'options' must be an object.");
            } else {
              let h = false, g = Object.getOwnPropertyNames(a);
              for (let b of this.outputNames) if (g.indexOf(b) !== -1) {
                let y = a[b];
                (y === null || y instanceof de) && (h = true, c = false, o[b] = y);
              }
              if (h) {
                if (typeof u == "object" && u !== null) d = u;
                else if (typeof u < "u") throw new TypeError("'options' must be an object.");
              } else d = a;
            }
          } else if (typeof a < "u") throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");
          for (let h of this.inputNames) if (typeof t[h] > "u") throw new Error(`input '${h}' is missing in 'feeds'.`);
          if (c) for (let h of this.outputNames) o[h] = null;
          let l = await this.handler.run(t, o, d), m = {};
          for (let h in l) if (Object.hasOwnProperty.call(l, h)) {
            let g = l[h];
            g instanceof de ? m[h] = g : m[h] = new de(g.type, g.data, g.dims);
          }
          return Ue("InferenceSession.run"), De(), m;
        }
        async release() {
          return this.handler.dispose();
        }
        static async create(t, a, u, o) {
          _e(), Pe("InferenceSession.create");
          let d, c = {};
          if (typeof t == "string") {
            if (d = t, typeof a == "object" && a !== null) c = a;
            else if (typeof a < "u") throw new TypeError("'options' must be an object.");
          } else if (t instanceof Uint8Array) {
            if (d = t, typeof a == "object" && a !== null) c = a;
            else if (typeof a < "u") throw new TypeError("'options' must be an object.");
          } else if (t instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && t instanceof SharedArrayBuffer) {
            let g = t, b = 0, y = t.byteLength;
            if (typeof a == "object" && a !== null) c = a;
            else if (typeof a == "number") {
              if (b = a, !Number.isSafeInteger(b)) throw new RangeError("'byteOffset' must be an integer.");
              if (b < 0 || b >= g.byteLength) throw new RangeError(`'byteOffset' is out of range [0, ${g.byteLength}).`);
              if (y = t.byteLength - b, typeof u == "number") {
                if (y = u, !Number.isSafeInteger(y)) throw new RangeError("'byteLength' must be an integer.");
                if (y <= 0 || b + y > g.byteLength) throw new RangeError(`'byteLength' is out of range (0, ${g.byteLength - b}].`);
                if (typeof o == "object" && o !== null) c = o;
                else if (typeof o < "u") throw new TypeError("'options' must be an object.");
              } else if (typeof u < "u") throw new TypeError("'byteLength' must be a number.");
            } else if (typeof a < "u") throw new TypeError("'options' must be an object.");
            d = new Uint8Array(g, b, y);
          } else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");
          let [l, m] = await dr(c), h = await l.createInferenceSessionHandler(d, m);
          return Ue("InferenceSession.create"), De(), new n(h);
        }
        startProfiling() {
          this.handler.startProfiling();
        }
        endProfiling() {
          this.handler.endProfiling();
        }
        get inputNames() {
          return this.handler.inputNames;
        }
        get outputNames() {
          return this.handler.outputNames;
        }
        get inputMetadata() {
          return this.handler.inputMetadata;
        }
        get outputMetadata() {
          return this.handler.outputMetadata;
        }
      };
    });
    Rr = F(() => {
      "use strict";
      Mr();
      ts = lt;
    });
    Nr = F(() => {
      "use strict";
    });
    Fr = F(() => {
      "use strict";
    });
    kr = F(() => {
      "use strict";
    });
    Wr = F(() => {
      "use strict";
    });
    nn = {};
    ut(nn, { InferenceSession: () => ts, TRACE: () => xr, TRACE_EVENT_BEGIN: () => Pe, TRACE_EVENT_END: () => Ue, TRACE_FUNC_BEGIN: () => _e, TRACE_FUNC_END: () => De, Tensor: () => de, env: () => Y, registerBackend: () => qe });
    Te = F(() => {
      "use strict";
      pr();
      br();
      Rr();
      en();
      Nr();
      Fr();
      tn();
      kr();
      Wr();
    });
    dt = F(() => {
      "use strict";
    });
    Hr = {};
    ut(Hr, { default: () => ns });
    jr = F(() => {
      "use strict";
      rn();
      xe();
      pt();
      $r = "ort-wasm-proxy-worker", zr = globalThis.self?.name === $r;
      zr && (self.onmessage = (n) => {
        let { type: t, in: a } = n.data;
        try {
          switch (t) {
            case "init-wasm":
              mt(a.wasm).then(() => {
                ht(a).then(() => {
                  postMessage({ type: t });
                }, (u) => {
                  postMessage({ type: t, err: u });
                });
              }, (u) => {
                postMessage({ type: t, err: u });
              });
              break;
            case "init-ep": {
              let { epName: u, env: o } = a;
              wt(o, u).then(() => {
                postMessage({ type: t });
              }, (d) => {
                postMessage({ type: t, err: d });
              });
              break;
            }
            case "copy-from": {
              let { buffer: u } = a, o = Qe(u);
              postMessage({ type: t, out: o });
              break;
            }
            case "create": {
              let { model: u, options: o } = a;
              bt(u, o).then((d) => {
                postMessage({ type: t, out: d });
              }, (d) => {
                postMessage({ type: t, err: d });
              });
              break;
            }
            case "release":
              yt(a), postMessage({ type: t });
              break;
            case "run": {
              let { sessionId: u, inputIndices: o, inputs: d, outputIndices: c, options: l } = a;
              gt(u, o, d, c, new Array(c.length).fill(null), l).then((m) => {
                m.some((h) => h[3] !== "cpu") ? postMessage({ type: t, err: "Proxy does not support non-cpu tensor location." }) : postMessage({ type: t, out: m }, Tt([...d, ...m]));
              }, (m) => {
                postMessage({ type: t, err: m });
              });
              break;
            }
            case "end-profiling":
              Et(a), postMessage({ type: t });
              break;
            default:
          }
        } catch (u) {
          postMessage({ type: t, err: u });
        }
      });
      ns = zr ? null : (n) => new Worker(n ?? oe, { type: "module", name: $r });
    });
    Yr = {};
    ut(Yr, { default: () => rs });
    Jr = F(() => {
      "use strict";
      rs = Vr, os = globalThis.self?.name?.startsWith("em-pthread");
      os && Vr();
    });
    pt = F(() => {
      "use strict";
      dt();
      Qr = typeof location > "u" ? void 0 : location.origin, an = import.meta.url > "file:" && import.meta.url < "file;", as = () => {
        if (true) {
          if (an) {
            let n = URL;
            return new URL(new n("ort.wasm.bundle.min.mjs", import.meta.url).href, Qr).href;
          }
          return import.meta.url;
        }
      }, oe = as(), Zr = () => {
        if (oe && !oe.startsWith("blob:")) return oe.substring(0, oe.lastIndexOf("/") + 1);
      }, on = (n, t) => {
        try {
          let a = t ?? oe;
          return (a ? new URL(n, a) : new URL(n)).origin === Qr;
        } catch {
          return false;
        }
      }, ss = (n, t) => {
        let a = t ?? oe;
        try {
          return (a ? new URL(n, a) : new URL(n)).href;
        } catch {
          return;
        }
      }, is = (n, t) => `${t ?? "./"}${n}`, Kr = async (n) => {
        let a = await (await fetch(n, { credentials: "same-origin" })).blob();
        return URL.createObjectURL(a);
      }, us = async (n) => (await import(
        /*webpackIgnore:true*/
        /*@vite-ignore*/
        n
      )).default, qr = (jr(), Xt(Hr)).default, eo = async () => {
        if (!oe) throw new Error("Failed to load proxy worker: cannot determine the script source URL.");
        if (on(oe)) return [void 0, qr()];
        let n = await Kr(oe);
        return [n, qr(n)];
      }, Xr = (Jr(), Xt(Yr)).default, to = async (n, t, a, u) => {
        let o = Xr && !(n || t);
        if (o) if (oe) o = on(oe) || u && !a;
        else if (u && !a) o = true;
        else throw new Error("cannot determine the script source URL.");
        if (o) return [void 0, Xr];
        {
          let d = "ort-wasm-simd-threaded.mjs", c = n ?? ss(d, t), l = a && c && !on(c, t), m = l ? await Kr(c) : c ?? is(d, t);
          return [l ? m : void 0, await us(m)];
        }
      };
    });
    xe = F(() => {
      "use strict";
      pt();
      un = false, St = false, no = false, fs = () => {
        if (typeof SharedArrayBuffer > "u") return false;
        try {
          return typeof MessageChannel < "u" && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]));
        } catch {
          return false;
        }
      }, cs = () => {
        try {
          return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11]));
        } catch {
          return false;
        }
      }, ls = () => {
        try {
          return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 19, 1, 17, 0, 65, 1, 253, 15, 65, 2, 253, 15, 65, 3, 253, 15, 253, 147, 2, 11]));
        } catch {
          return false;
        }
      }, mt = async (n) => {
        if (un) return Promise.resolve();
        if (St) throw new Error("multiple calls to 'initializeWebAssembly()' detected.");
        if (no) throw new Error("previous call to 'initializeWebAssembly()' failed.");
        St = true;
        let t = n.initTimeout, a = n.numThreads;
        if (n.simd !== false) {
          if (n.simd === "relaxed") {
            if (!ls()) throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.");
          } else if (!cs()) throw new Error("WebAssembly SIMD is not supported in the current environment.");
        }
        let u = fs();
        a > 1 && !u && (typeof self < "u" && !self.crossOriginIsolated && console.warn("env.wasm.numThreads is set to " + a + ", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."), console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."), n.numThreads = a = 1);
        let o = n.wasmPaths, d = typeof o == "string" ? o : void 0, c = o?.mjs, l = c?.href ?? c, m = o?.wasm, h = m?.href ?? m, g = n.wasmBinary, [b, y] = await to(l, d, a > 1, !!g || !!h), T = false, I = [];
        if (t > 0 && I.push(new Promise((_) => {
          setTimeout(() => {
            T = true, _();
          }, t);
        })), I.push(new Promise((_, $) => {
          let v = { numThreads: a };
          if (g) v.wasmBinary = g, v.locateFile = (O) => O;
          else if (h || d) v.locateFile = (O) => h ?? d + O;
          else if (l && l.indexOf("blob:") !== 0) v.locateFile = (O) => new URL(O, l).href;
          else if (b) {
            let O = Zr();
            O && (v.locateFile = (N) => O + N);
          }
          y(v).then((O) => {
            St = false, un = true, sn = O, _(), b && URL.revokeObjectURL(b);
          }, (O) => {
            St = false, no = true, $(O);
          });
        })), await Promise.race(I), T) throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`);
      }, z = () => {
        if (un && sn) return sn;
        throw new Error("WebAssembly is not initialized yet.");
      };
    });
    vt = F(() => {
      "use strict";
      xe();
      ae = (n, t) => {
        let a = z(), u = a.lengthBytesUTF8(n) + 1, o = a._malloc(u);
        return a.stringToUTF8(n, o, u), t.push(o), o;
      }, Ze = (n, t, a, u) => {
        if (typeof n == "object" && n !== null) {
          if (a.has(n)) throw new Error("Circular reference in options");
          a.add(n);
        }
        Object.entries(n).forEach(([o, d]) => {
          let c = t ? t + o : o;
          if (typeof d == "object") Ze(d, c + ".", a, u);
          else if (typeof d == "string" || typeof d == "number") u(c, d.toString());
          else if (typeof d == "boolean") u(c, d ? "1" : "0");
          else throw new Error(`Can't handle extra config type: ${typeof d}`);
        });
      }, G = (n) => {
        let t = z(), a = t.stackSave();
        try {
          let u = t.PTR_SIZE, o = t.stackAlloc(2 * u);
          t._OrtGetLastError(o, o + u);
          let d = Number(t.getValue(o, u === 4 ? "i32" : "i64")), c = t.getValue(o + u, "*"), l = c ? t.UTF8ToString(c) : "";
          throw new Error(`${n} ERROR_CODE: ${d}, ERROR_MESSAGE: ${l}`);
        } finally {
          t.stackRestore(a);
        }
      };
    });
    oo = F(() => {
      "use strict";
      xe();
      vt();
      ro = (n) => {
        let t = z(), a = 0, u = [], o = n || {};
        try {
          if (n?.logSeverityLevel === void 0) o.logSeverityLevel = 2;
          else if (typeof n.logSeverityLevel != "number" || !Number.isInteger(n.logSeverityLevel) || n.logSeverityLevel < 0 || n.logSeverityLevel > 4) throw new Error(`log severity level is not valid: ${n.logSeverityLevel}`);
          if (n?.logVerbosityLevel === void 0) o.logVerbosityLevel = 0;
          else if (typeof n.logVerbosityLevel != "number" || !Number.isInteger(n.logVerbosityLevel)) throw new Error(`log verbosity level is not valid: ${n.logVerbosityLevel}`);
          n?.terminate === void 0 && (o.terminate = false);
          let d = 0;
          return n?.tag !== void 0 && (d = ae(n.tag, u)), a = t._OrtCreateRunOptions(o.logSeverityLevel, o.logVerbosityLevel, !!o.terminate, d), a === 0 && G("Can't create run options."), n?.extra !== void 0 && Ze(n.extra, "", /* @__PURE__ */ new WeakSet(), (c, l) => {
            let m = ae(c, u), h = ae(l, u);
            t._OrtAddRunConfigEntry(a, m, h) !== 0 && G(`Can't set a run config entry: ${c} - ${l}.`);
          }), [a, u];
        } catch (d) {
          throw a !== 0 && t._OrtReleaseRunOptions(a), u.forEach((c) => t._free(c)), d;
        }
      };
    });
    so = F(() => {
      "use strict";
      xe();
      vt();
      ds = (n) => {
        switch (n) {
          case "disabled":
            return 0;
          case "basic":
            return 1;
          case "extended":
            return 2;
          case "layout":
            return 3;
          case "all":
            return 99;
          default:
            throw new Error(`unsupported graph optimization level: ${n}`);
        }
      }, ps = (n) => {
        switch (n) {
          case "sequential":
            return 0;
          case "parallel":
            return 1;
          default:
            throw new Error(`unsupported execution mode: ${n}`);
        }
      }, ms = (n) => {
        n.extra || (n.extra = {}), n.extra.session || (n.extra.session = {});
        let t = n.extra.session;
        t.use_ort_model_bytes_directly || (t.use_ort_model_bytes_directly = "1"), n.executionProviders && n.executionProviders.some((a) => (typeof a == "string" ? a : a.name) === "webgpu") && (n.enableMemPattern = false);
      }, ke = (n, t, a, u) => {
        let o = ae(t, u), d = ae(a, u);
        z()._OrtAddSessionConfigEntry(n, o, d) !== 0 && G(`Can't set a session config entry: ${t} - ${a}.`);
      }, hs = async (n, t, a) => {
        let u = t.executionProviders;
        for (let o of u) {
          let d = typeof o == "string" ? o : o.name, c = [];
          switch (d) {
            case "webnn":
              if (d = "WEBNN", ke(n, "session.disable_quant_qdq", "1", a), ke(n, "session.disable_qdq_constant_folding", "1", a), typeof o != "string") {
                let y = o?.deviceType;
                y && ke(n, "deviceType", y, a);
              }
              break;
            case "webgpu":
              if (d = "JS", typeof o != "string") {
                let b = o;
                if (b?.preferredLayout) {
                  if (b.preferredLayout !== "NCHW" && b.preferredLayout !== "NHWC") throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${b.preferredLayout}`);
                  ke(n, "preferredLayout", b.preferredLayout, a);
                }
              }
              break;
            case "wasm":
            case "cpu":
              continue;
            default:
              throw new Error(`not supported execution provider: ${d}`);
          }
          let l = ae(d, a), m = c.length, h = 0, g = 0;
          if (m > 0) {
            h = z()._malloc(m * z().PTR_SIZE), a.push(h), g = z()._malloc(m * z().PTR_SIZE), a.push(g);
            for (let b = 0; b < m; b++) z().setValue(h + b * z().PTR_SIZE, c[b][0], "*"), z().setValue(g + b * z().PTR_SIZE, c[b][1], "*");
          }
          await z()._OrtAppendExecutionProvider(n, l, h, g, m) !== 0 && G(`Can't append execution provider: ${d}.`);
        }
      }, ao = async (n) => {
        let t = z(), a = 0, u = [], o = n || {};
        ms(o);
        try {
          let d = ds(o.graphOptimizationLevel ?? "all"), c = ps(o.executionMode ?? "sequential"), l = typeof o.logId == "string" ? ae(o.logId, u) : 0, m = o.logSeverityLevel ?? 2;
          if (!Number.isInteger(m) || m < 0 || m > 4) throw new Error(`log severity level is not valid: ${m}`);
          let h = o.logVerbosityLevel ?? 0;
          if (!Number.isInteger(h) || h < 0 || h > 4) throw new Error(`log verbosity level is not valid: ${h}`);
          let g = typeof o.optimizedModelFilePath == "string" ? ae(o.optimizedModelFilePath, u) : 0;
          if (a = t._OrtCreateSessionOptions(d, !!o.enableCpuMemArena, !!o.enableMemPattern, c, !!o.enableProfiling, 0, l, m, h, g), a === 0 && G("Can't create session options."), o.executionProviders && await hs(a, o, u), o.enableGraphCapture !== void 0) {
            if (typeof o.enableGraphCapture != "boolean") throw new Error(`enableGraphCapture must be a boolean value: ${o.enableGraphCapture}`);
            ke(a, "enableGraphCapture", o.enableGraphCapture.toString(), u);
          }
          if (o.freeDimensionOverrides) for (let [b, y] of Object.entries(o.freeDimensionOverrides)) {
            if (typeof b != "string") throw new Error(`free dimension override name must be a string: ${b}`);
            if (typeof y != "number" || !Number.isInteger(y) || y < 0) throw new Error(`free dimension override value must be a non-negative integer: ${y}`);
            let T = ae(b, u);
            t._OrtAddFreeDimensionOverride(a, T, y) !== 0 && G(`Can't set a free dimension override: ${b} - ${y}.`);
          }
          return o.extra !== void 0 && Ze(o.extra, "", /* @__PURE__ */ new WeakSet(), (b, y) => {
            ke(a, b, y, u);
          }), [a, u];
        } catch (d) {
          throw a !== 0 && t._OrtReleaseSessionOptions(a) !== 0 && G("Can't release session options."), u.forEach((c) => t._free(c)), d;
        }
      };
    });
    fn = F(() => {
      "use strict";
      We = (n) => {
        switch (n) {
          case "int8":
            return 3;
          case "uint8":
            return 2;
          case "bool":
            return 9;
          case "int16":
            return 5;
          case "uint16":
            return 4;
          case "int32":
            return 6;
          case "uint32":
            return 12;
          case "float16":
            return 10;
          case "float32":
            return 1;
          case "float64":
            return 11;
          case "string":
            return 8;
          case "int64":
            return 7;
          case "uint64":
            return 13;
          case "int4":
            return 22;
          case "uint4":
            return 21;
          default:
            throw new Error(`unsupported data type: ${n}`);
        }
      }, Ot = (n) => {
        switch (n) {
          case 3:
            return "int8";
          case 2:
            return "uint8";
          case 9:
            return "bool";
          case 5:
            return "int16";
          case 4:
            return "uint16";
          case 6:
            return "int32";
          case 12:
            return "uint32";
          case 10:
            return "float16";
          case 1:
            return "float32";
          case 11:
            return "float64";
          case 8:
            return "string";
          case 7:
            return "int64";
          case 13:
            return "uint64";
          case 22:
            return "int4";
          case 21:
            return "uint4";
          default:
            throw new Error(`unsupported data type: ${n}`);
        }
      }, Ge = (n, t) => {
        let a = [-1, 4, 1, 1, 2, 2, 4, 8, -1, 1, 2, 8, 4, 8, -1, -1, -1, -1, -1, -1, -1, 0.5, 0.5][n], u = typeof t == "number" ? t : t.reduce((o, d) => o * d, 1);
        return a > 0 ? Math.ceil(u * a) : void 0;
      }, io = (n) => {
        switch (n) {
          case "float16":
            return typeof Float16Array < "u" ? Float16Array : Uint16Array;
          case "float32":
            return Float32Array;
          case "uint8":
            return Uint8Array;
          case "int8":
            return Int8Array;
          case "uint16":
            return Uint16Array;
          case "int16":
            return Int16Array;
          case "int32":
            return Int32Array;
          case "bool":
            return Uint8Array;
          case "float64":
            return Float64Array;
          case "uint32":
            return Uint32Array;
          case "int64":
            return BigInt64Array;
          case "uint64":
            return BigUint64Array;
          default:
            throw new Error(`unsupported type: ${n}`);
        }
      }, uo = (n) => {
        switch (n) {
          case "verbose":
            return 0;
          case "info":
            return 1;
          case "warning":
            return 2;
          case "error":
            return 3;
          case "fatal":
            return 4;
          default:
            throw new Error(`unsupported logging level: ${n}`);
        }
      }, At = (n) => n === "float32" || n === "float16" || n === "int32" || n === "int64" || n === "uint32" || n === "uint8" || n === "bool" || n === "uint4" || n === "int4", It = (n) => n === "float32" || n === "float16" || n === "int32" || n === "int64" || n === "uint32" || n === "uint64" || n === "int8" || n === "uint8" || n === "bool" || n === "uint4" || n === "int4", fo = (n) => {
        switch (n) {
          case "none":
            return 0;
          case "cpu":
            return 1;
          case "cpu-pinned":
            return 2;
          case "texture":
            return 3;
          case "gpu-buffer":
            return 4;
          case "ml-tensor":
            return 5;
          default:
            throw new Error(`unsupported data location: ${n}`);
        }
      };
    });
    cn = F(() => {
      "use strict";
      dt();
      Ke = async (n) => {
        if (typeof n == "string") if (false) try {
          let { readFile: t } = qt("node:fs/promises");
          return new Uint8Array(await t(n));
        } catch (t) {
          if (t.code === "ERR_FS_FILE_TOO_LARGE") {
            let { createReadStream: a } = qt("node:fs"), u = a(n), o = [];
            for await (let d of u) o.push(d);
            return new Uint8Array(Buffer.concat(o));
          }
          throw t;
        }
        else {
          let t = await fetch(n);
          if (!t.ok) throw new Error(`failed to load external data file: ${n}`);
          let a = t.headers.get("Content-Length"), u = a ? parseInt(a, 10) : 0;
          if (u < 1073741824) return new Uint8Array(await t.arrayBuffer());
          {
            if (!t.body) throw new Error(`failed to load external data file: ${n}, no response body.`);
            let o = t.body.getReader(), d;
            try {
              d = new ArrayBuffer(u);
            } catch (l) {
              if (l instanceof RangeError) {
                let m = Math.ceil(u / 65536);
                d = new WebAssembly.Memory({ initial: m, maximum: m }).buffer;
              } else throw l;
            }
            let c = 0;
            for (; ; ) {
              let { done: l, value: m } = await o.read();
              if (l) break;
              let h = m.byteLength;
              new Uint8Array(d, c, h).set(m), c += h;
            }
            return new Uint8Array(d, 0, u);
          }
        }
        else return n instanceof Blob ? new Uint8Array(await n.arrayBuffer()) : n instanceof Uint8Array ? n : new Uint8Array(n);
      };
    });
    rn = F(() => {
      "use strict";
      Te();
      oo();
      so();
      fn();
      xe();
      vt();
      cn();
      ws = (n, t) => {
        z()._OrtInit(n, t) !== 0 && G("Can't initialize onnxruntime.");
      }, ht = async (n) => {
        ws(n.wasm.numThreads, uo(n.logLevel));
      }, wt = async (n, t) => {
        z().asyncInit?.();
        let a = n.webgpu.adapter;
        if (t === "webgpu") {
          if (typeof navigator > "u" || !navigator.gpu) throw new Error("WebGPU is not supported in current environment");
          if (a) {
            if (typeof a.limits != "object" || typeof a.features != "object" || typeof a.requestDevice != "function") throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.");
          } else {
            let u = n.webgpu.powerPreference;
            if (u !== void 0 && u !== "low-power" && u !== "high-performance") throw new Error(`Invalid powerPreference setting: "${u}"`);
            let o = n.webgpu.forceFallbackAdapter;
            if (o !== void 0 && typeof o != "boolean") throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);
            if (a = await navigator.gpu.requestAdapter({ powerPreference: u, forceFallbackAdapter: o }), !a) throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.');
          }
        }
        if (t === "webnn" && (typeof navigator > "u" || !navigator.ml)) throw new Error("WebNN is not supported in current environment");
      }, $e = /* @__PURE__ */ new Map(), bs = (n) => {
        let t = z(), a = t.stackSave();
        try {
          let u = t.PTR_SIZE, o = t.stackAlloc(2 * u);
          t._OrtGetInputOutputCount(n, o, o + u) !== 0 && G("Can't get session input/output count.");
          let c = u === 4 ? "i32" : "i64";
          return [Number(t.getValue(o, c)), Number(t.getValue(o + u, c))];
        } finally {
          t.stackRestore(a);
        }
      }, co = (n, t) => {
        let a = z(), u = a.stackSave(), o = 0;
        try {
          let d = a.PTR_SIZE, c = a.stackAlloc(2 * d);
          a._OrtGetInputOutputMetadata(n, t, c, c + d) !== 0 && G("Can't get session input/output metadata.");
          let m = Number(a.getValue(c, "*"));
          o = Number(a.getValue(c + d, "*"));
          let h = a.HEAP32[o / 4];
          if (h === 0) return [m, 0];
          let g = a.HEAPU32[o / 4 + 1], b = [];
          for (let y = 0; y < g; y++) {
            let T = Number(a.getValue(o + 8 + y * d, "*"));
            b.push(T !== 0 ? a.UTF8ToString(T) : Number(a.getValue(o + 8 + (y + g) * d, "*")));
          }
          return [m, h, b];
        } finally {
          a.stackRestore(u), o !== 0 && a._OrtFree(o);
        }
      }, Qe = (n) => {
        let t = z(), a = t._malloc(n.byteLength);
        if (a === 0) throw new Error(`Can't create a session. failed to allocate a buffer of size ${n.byteLength}.`);
        return t.HEAPU8.set(n, a), [a, n.byteLength];
      }, bt = async (n, t) => {
        let a, u, o = z();
        Array.isArray(n) ? [a, u] = n : n.buffer === o.HEAPU8.buffer ? [a, u] = [n.byteOffset, n.byteLength] : [a, u] = Qe(n);
        let d = 0, c = 0, l = 0, m = [], h = [], g = [];
        try {
          if ([c, m] = await ao(t), t?.externalData && o.mountExternalData) {
            let D = [];
            for (let k of t.externalData) {
              let w = typeof k == "string" ? k : k.path, Z = typeof k == "string" ? k : k.data;
              D.push(Ke(Z).then((H) => {
                o.mountExternalData(w, H);
              }));
            }
            await Promise.all(D);
          }
          for (let D of t?.executionProviders ?? []) if ((typeof D == "string" ? D : D.name) === "webnn") {
            if (o.shouldTransferToMLTensor = false, typeof D != "string") {
              let w = D, Z = w?.context, H = w?.gpuDevice, ne = w?.deviceType, pe = w?.powerPreference;
              Z ? o.currentContext = Z : H ? o.currentContext = await o.webnnCreateMLContext(H) : o.currentContext = await o.webnnCreateMLContext({ deviceType: ne, powerPreference: pe });
            } else o.currentContext = await o.webnnCreateMLContext();
            break;
          }
          d = await o._OrtCreateSession(a, u, c), o.webgpuOnCreateSession?.(d), d === 0 && G("Can't create a session."), o.jsepOnCreateSession?.(), o.currentContext && (o.webnnRegisterMLContext(d, o.currentContext), o.currentContext = void 0, o.shouldTransferToMLTensor = true);
          let [b, y] = bs(d), T = !!t?.enableGraphCapture, I = [], _ = [], $ = [], v = [], O = [];
          for (let D = 0; D < b; D++) {
            let [k, w, Z] = co(d, D);
            k === 0 && G("Can't get an input name."), h.push(k);
            let H = o.UTF8ToString(k);
            I.push(H), $.push(w === 0 ? { name: H, isTensor: false } : { name: H, isTensor: true, type: Ot(w), shape: Z });
          }
          for (let D = 0; D < y; D++) {
            let [k, w, Z] = co(d, D + b);
            k === 0 && G("Can't get an output name."), g.push(k);
            let H = o.UTF8ToString(k);
            _.push(H), v.push(w === 0 ? { name: H, isTensor: false } : { name: H, isTensor: true, type: Ot(w), shape: Z });
          }
          return $e.set(d, [d, h, g, null, T, false]), [d, I, _, $, v];
        } catch (b) {
          throw h.forEach((y) => o._OrtFree(y)), g.forEach((y) => o._OrtFree(y)), l !== 0 && o._OrtReleaseBinding(l) !== 0 && G("Can't release IO binding."), d !== 0 && o._OrtReleaseSession(d) !== 0 && G("Can't release session."), b;
        } finally {
          o._free(a), c !== 0 && o._OrtReleaseSessionOptions(c) !== 0 && G("Can't release session options."), m.forEach((b) => o._free(b)), o.unmountExternalData?.();
        }
      }, yt = (n) => {
        let t = z(), a = $e.get(n);
        if (!a) throw new Error(`cannot release session. invalid session id: ${n}`);
        let [u, o, d, c, l] = a;
        c && (l && t._OrtClearBoundOutputs(c.handle) !== 0 && G("Can't clear bound outputs."), t._OrtReleaseBinding(c.handle) !== 0 && G("Can't release IO binding.")), t.jsepOnReleaseSession?.(n), t.webnnOnReleaseSession?.(n), t.webgpuOnReleaseSession?.(n), o.forEach((m) => t._OrtFree(m)), d.forEach((m) => t._OrtFree(m)), t._OrtReleaseSession(u) !== 0 && G("Can't release session."), $e.delete(n);
      }, lo = async (n, t, a, u, o, d, c = false) => {
        if (!n) {
          t.push(0);
          return;
        }
        let l = z(), m = l.PTR_SIZE, h = n[0], g = n[1], b = n[3], y = b, T, I;
        if (h === "string" && (b === "gpu-buffer" || b === "ml-tensor")) throw new Error("String tensor is not supported on GPU.");
        if (c && b !== "gpu-buffer") throw new Error(`External buffer must be provided for input/output index ${d} when enableGraphCapture is true.`);
        if (b === "gpu-buffer") {
          let v = n[2].gpuBuffer;
          I = Ge(We(h), g);
          {
            let O = l.jsepRegisterBuffer;
            if (!O) throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');
            T = O(u, d, v, I);
          }
        } else if (b === "ml-tensor") {
          let v = n[2].mlTensor;
          I = Ge(We(h), g);
          let O = l.webnnRegisterMLTensor;
          if (!O) throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
          T = O(u, v, We(h), g);
        } else {
          let v = n[2];
          if (Array.isArray(v)) {
            I = m * v.length, T = l._malloc(I), a.push(T);
            for (let O = 0; O < v.length; O++) {
              if (typeof v[O] != "string") throw new TypeError(`tensor data at index ${O} is not a string`);
              l.setValue(T + O * m, ae(v[O], a), "*");
            }
          } else {
            let O = l.webnnIsGraphInput, N = l.webnnIsGraphOutput;
            if (h !== "string" && O && N) {
              let D = l.UTF8ToString(o);
              if (O(u, D) || N(u, D)) {
                let k = We(h);
                I = Ge(k, g), y = "ml-tensor";
                let w = l.webnnCreateTemporaryTensor, Z = l.webnnUploadTensor;
                if (!w || !Z) throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
                let H = await w(u, k, g);
                Z(H, new Uint8Array(v.buffer, v.byteOffset, v.byteLength)), T = H;
              } else I = v.byteLength, T = l._malloc(I), a.push(T), l.HEAPU8.set(new Uint8Array(v.buffer, v.byteOffset, I), T);
            } else I = v.byteLength, T = l._malloc(I), a.push(T), l.HEAPU8.set(new Uint8Array(v.buffer, v.byteOffset, I), T);
          }
        }
        let _ = l.stackSave(), $ = l.stackAlloc(4 * g.length);
        try {
          g.forEach((O, N) => l.setValue($ + N * m, O, m === 4 ? "i32" : "i64"));
          let v = l._OrtCreateTensor(We(h), T, I, $, g.length, fo(y));
          v === 0 && G(`Can't create tensor for input/output. session=${u}, index=${d}.`), t.push(v);
        } finally {
          l.stackRestore(_);
        }
      }, gt = async (n, t, a, u, o, d) => {
        let c = z(), l = c.PTR_SIZE, m = $e.get(n);
        if (!m) throw new Error(`cannot run inference. invalid session id: ${n}`);
        let h = m[0], g = m[1], b = m[2], y = m[3], T = m[4], I = m[5], _ = t.length, $ = u.length, v = 0, O = [], N = [], D = [], k = [], w = [], Z = c.stackSave(), H = c.stackAlloc(_ * l), ne = c.stackAlloc(_ * l), pe = c.stackAlloc($ * l), B = c.stackAlloc($ * l);
        try {
          [v, O] = ro(d), Pe("wasm prepareInputOutputTensor");
          for (let A = 0; A < _; A++) await lo(a[A], N, k, n, g[t[A]], t[A], T);
          for (let A = 0; A < $; A++) await lo(o[A], D, k, n, b[u[A]], _ + u[A], T);
          Ue("wasm prepareInputOutputTensor");
          for (let A = 0; A < _; A++) c.setValue(H + A * l, N[A], "*"), c.setValue(ne + A * l, g[t[A]], "*");
          for (let A = 0; A < $; A++) c.setValue(pe + A * l, D[A], "*"), c.setValue(B + A * l, b[u[A]], "*");
          c.jsepOnRunStart?.(h), c.webnnOnRunStart?.(h);
          let W;
          W = await c._OrtRun(h, ne, H, _, B, $, pe, v), W !== 0 && G("failed to call OrtRun().");
          let re = [], me = [];
          Pe("wasm ProcessOutputTensor");
          for (let A = 0; A < $; A++) {
            let K2 = Number(c.getValue(pe + A * l, "*"));
            if (K2 === D[A] || w.includes(D[A])) {
              re.push(o[A]), K2 !== D[A] && c._OrtReleaseTensor(K2) !== 0 && G("Can't release tensor.");
              continue;
            }
            let je = c.stackSave(), ee = c.stackAlloc(4 * l), he = false, j, q = 0;
            try {
              c._OrtGetTensorData(K2, ee, ee + l, ee + 2 * l, ee + 3 * l) !== 0 && G(`Can't access output tensor data on index ${A}.`);
              let Se = l === 4 ? "i32" : "i64", ve = Number(c.getValue(ee, Se));
              q = c.getValue(ee + l, "*");
              let Ve = c.getValue(ee + l * 2, "*"), Re = Number(c.getValue(ee + l * 3, Se)), te = [];
              for (let L = 0; L < Re; L++) te.push(Number(c.getValue(Ve + L * l, Se)));
              c._OrtFree(Ve) !== 0 && G("Can't free memory for tensor dims.");
              let ue = te.reduce((L, V) => L * V, 1);
              j = Ot(ve);
              let se = y?.outputPreferredLocations[u[A]];
              if (j === "string") {
                if (se === "gpu-buffer" || se === "ml-tensor") throw new Error("String tensor is not supported on GPU.");
                let L = [];
                for (let V = 0; V < ue; V++) {
                  let fe = c.getValue(q + V * l, "*"), ye = c.getValue(q + (V + 1) * l, "*"), ce = V === ue - 1 ? void 0 : ye - fe;
                  L.push(c.UTF8ToString(fe, ce));
                }
                re.push([j, te, L, "cpu"]);
              } else if (se === "gpu-buffer" && ue > 0) {
                let L = c.jsepGetBuffer;
                if (!L) throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');
                let V = L(q), fe = Ge(ve, ue);
                if (fe === void 0 || !At(j)) throw new Error(`Unsupported data type: ${j}`);
                he = true, re.push([j, te, { gpuBuffer: V, download: c.jsepCreateDownloader(V, fe, j), dispose: () => {
                  c._OrtReleaseTensor(K2) !== 0 && G("Can't release tensor.");
                } }, "gpu-buffer"]);
              } else if (se === "ml-tensor" && ue > 0) {
                let L = c.webnnEnsureTensor, V = c.webnnIsGraphInputOutputTypeSupported;
                if (!L || !V) throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');
                if (Ge(ve, ue) === void 0 || !It(j)) throw new Error(`Unsupported data type: ${j}`);
                if (!V(n, j, false)) throw new Error(`preferredLocation "ml-tensor" for ${j} output is not supported by current WebNN Context.`);
                let ye = await L(n, q, ve, te, false);
                he = true, re.push([j, te, { mlTensor: ye, download: c.webnnCreateMLTensorDownloader(q, j), dispose: () => {
                  c.webnnReleaseTensorId(q), c._OrtReleaseTensor(K2);
                } }, "ml-tensor"]);
              } else if (se === "ml-tensor-cpu-output" && ue > 0) {
                let L = c.webnnCreateMLTensorDownloader(q, j)(), V = re.length;
                he = true, me.push((async () => {
                  let fe = [V, await L];
                  return c.webnnReleaseTensorId(q), c._OrtReleaseTensor(K2), fe;
                })()), re.push([j, te, [], "cpu"]);
              } else {
                let L = io(j), V = new L(ue);
                new Uint8Array(V.buffer, V.byteOffset, V.byteLength).set(c.HEAPU8.subarray(q, q + V.byteLength)), re.push([j, te, V, "cpu"]);
              }
            } finally {
              c.stackRestore(je), j === "string" && q && c._free(q), he || c._OrtReleaseTensor(K2);
            }
          }
          y && !T && (c._OrtClearBoundOutputs(y.handle) !== 0 && G("Can't clear bound outputs."), $e.set(n, [h, g, b, y, T, false]));
          for (let [A, K2] of await Promise.all(me)) re[A][2] = K2;
          return Ue("wasm ProcessOutputTensor"), re;
        } finally {
          c.webnnOnRunEnd?.(h), c.stackRestore(Z), N.forEach((W) => c._OrtReleaseTensor(W)), D.forEach((W) => c._OrtReleaseTensor(W)), k.forEach((W) => c._free(W)), v !== 0 && c._OrtReleaseRunOptions(v), O.forEach((W) => c._free(W));
        }
      }, Et = (n) => {
        let t = z(), a = $e.get(n);
        if (!a) throw new Error("invalid session id");
        let u = a[0], o = t._OrtEndProfiling(u);
        o === 0 && G("Can't get an profile file name."), t._OrtFree(o);
      }, Tt = (n) => {
        let t = [];
        for (let a of n) {
          let u = a[2];
          !Array.isArray(u) && "buffer" in u && t.push(u.buffer);
        }
        return t;
      };
    });
    pn = F(() => {
      "use strict";
      Te();
      rn();
      xe();
      pt();
      Me = () => !!Y.wasm.proxy && typeof document < "u", et = false, Lt = false, _t = false, dn = /* @__PURE__ */ new Map(), ze = (n, t) => {
        let a = dn.get(n);
        a ? a.push(t) : dn.set(n, [t]);
      }, He = () => {
        if (et || !Lt || _t || !ie) throw new Error("worker not ready");
      }, gs = (n) => {
        switch (n.data.type) {
          case "init-wasm":
            et = false, n.data.err ? (_t = true, ln[1](n.data.err)) : (Lt = true, ln[0]()), Bt && (URL.revokeObjectURL(Bt), Bt = void 0);
            break;
          case "init-ep":
          case "copy-from":
          case "create":
          case "release":
          case "run":
          case "end-profiling": {
            let t = dn.get(n.data.type);
            n.data.err ? t.shift()[1](n.data.err) : t.shift()[0](n.data.out);
            break;
          }
          default:
        }
      }, po = async () => {
        if (!Lt) {
          if (et) throw new Error("multiple calls to 'initWasm()' detected.");
          if (_t) throw new Error("previous call to 'initWasm()' failed.");
          if (et = true, Me()) return new Promise((n, t) => {
            ie?.terminate(), eo().then(([a, u]) => {
              try {
                ie = u, ie.onerror = (d) => t(d), ie.onmessage = gs, ln = [n, t];
                let o = { type: "init-wasm", in: Y };
                !o.in.wasm.wasmPaths && (a || an) && (o.in.wasm.wasmPaths = { wasm: new URL("ort-wasm-simd-threaded.wasm", import.meta.url).href }), ie.postMessage(o), Bt = a;
              } catch (o) {
                t(o);
              }
            }, t);
          });
          try {
            await mt(Y.wasm), await ht(Y), Lt = true;
          } catch (n) {
            throw _t = true, n;
          } finally {
            et = false;
          }
        }
      }, mo = async (n) => {
        if (Me()) return He(), new Promise((t, a) => {
          ze("init-ep", [t, a]);
          let u = { type: "init-ep", in: { epName: n, env: Y } };
          ie.postMessage(u);
        });
        await wt(Y, n);
      }, ho = async (n) => Me() ? (He(), new Promise((t, a) => {
        ze("copy-from", [t, a]);
        let u = { type: "copy-from", in: { buffer: n } };
        ie.postMessage(u, [n.buffer]);
      })) : Qe(n), wo = async (n, t) => {
        if (Me()) {
          if (t?.preferredOutputLocation) throw new Error('session option "preferredOutputLocation" is not supported for proxy.');
          return He(), new Promise((a, u) => {
            ze("create", [a, u]);
            let o = { type: "create", in: { model: n, options: { ...t } } }, d = [];
            n instanceof Uint8Array && d.push(n.buffer), ie.postMessage(o, d);
          });
        } else return bt(n, t);
      }, bo = async (n) => {
        if (Me()) return He(), new Promise((t, a) => {
          ze("release", [t, a]);
          let u = { type: "release", in: n };
          ie.postMessage(u);
        });
        yt(n);
      }, yo = async (n, t, a, u, o, d) => {
        if (Me()) {
          if (a.some((c) => c[3] !== "cpu")) throw new Error("input tensor on GPU is not supported for proxy.");
          if (o.some((c) => c)) throw new Error("pre-allocated output tensor is not supported for proxy.");
          return He(), new Promise((c, l) => {
            ze("run", [c, l]);
            let m = a, h = { type: "run", in: { sessionId: n, inputIndices: t, inputs: m, outputIndices: u, options: d } };
            ie.postMessage(h, Tt(m));
          });
        } else return gt(n, t, a, u, o, d);
      }, go = async (n) => {
        if (Me()) return He(), new Promise((t, a) => {
          ze("end-profiling", [t, a]);
          let u = { type: "end-profiling", in: n };
          ie.postMessage(u);
        });
        Et(n);
      };
    });
    To = F(() => {
      "use strict";
      Te();
      pn();
      fn();
      dt();
      cn();
      Eo = (n, t) => {
        switch (n.location) {
          case "cpu":
            return [n.type, n.dims, n.data, "cpu"];
          case "gpu-buffer":
            return [n.type, n.dims, { gpuBuffer: n.gpuBuffer }, "gpu-buffer"];
          case "ml-tensor":
            return [n.type, n.dims, { mlTensor: n.mlTensor }, "ml-tensor"];
          default:
            throw new Error(`invalid data location: ${n.location} for ${t()}`);
        }
      }, Es = (n) => {
        switch (n[3]) {
          case "cpu":
            return new de(n[0], n[2], n[1]);
          case "gpu-buffer": {
            let t = n[0];
            if (!At(t)) throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);
            let { gpuBuffer: a, download: u, dispose: o } = n[2];
            return de.fromGpuBuffer(a, { dataType: t, dims: n[1], download: u, dispose: o });
          }
          case "ml-tensor": {
            let t = n[0];
            if (!It(t)) throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);
            let { mlTensor: a, download: u, dispose: o } = n[2];
            return de.fromMLTensor(a, { dataType: t, dims: n[1], download: u, dispose: o });
          }
          default:
            throw new Error(`invalid data location: ${n[3]}`);
        }
      }, Dt = class {
        async fetchModelAndCopyToWasmMemory(t) {
          return ho(await Ke(t));
        }
        async loadModel(t, a) {
          _e();
          let u;
          typeof t == "string" ? u = await this.fetchModelAndCopyToWasmMemory(t) : u = t, [this.sessionId, this.inputNames, this.outputNames, this.inputMetadata, this.outputMetadata] = await wo(u, a), De();
        }
        async dispose() {
          return bo(this.sessionId);
        }
        async run(t, a, u) {
          _e();
          let o = [], d = [];
          Object.entries(t).forEach((y) => {
            let T = y[0], I = y[1], _ = this.inputNames.indexOf(T);
            if (_ === -1) throw new Error(`invalid input '${T}'`);
            o.push(I), d.push(_);
          });
          let c = [], l = [];
          Object.entries(a).forEach((y) => {
            let T = y[0], I = y[1], _ = this.outputNames.indexOf(T);
            if (_ === -1) throw new Error(`invalid output '${T}'`);
            c.push(I), l.push(_);
          });
          let m = o.map((y, T) => Eo(y, () => `input "${this.inputNames[d[T]]}"`)), h = c.map((y, T) => y ? Eo(y, () => `output "${this.outputNames[l[T]]}"`) : null), g = await yo(this.sessionId, d, m, l, h, u), b = {};
          for (let y = 0; y < g.length; y++) b[this.outputNames[l[y]]] = c[y] ?? Es(g[y]);
          return De(), b;
        }
        startProfiling() {
        }
        endProfiling() {
          go(this.sessionId);
        }
      };
    });
    vo = {};
    ut(vo, { OnnxruntimeWebAssemblyBackend: () => Pt, initializeFlags: () => So, wasmBackend: () => Ts });
    Oo = F(() => {
      "use strict";
      Te();
      pn();
      To();
      So = () => {
        (typeof Y.wasm.initTimeout != "number" || Y.wasm.initTimeout < 0) && (Y.wasm.initTimeout = 0);
        let n = Y.wasm.simd;
        if (typeof n != "boolean" && n !== void 0 && n !== "fixed" && n !== "relaxed" && (console.warn(`Property "env.wasm.simd" is set to unknown value "${n}". Reset it to \`false\` and ignore SIMD feature checking.`), Y.wasm.simd = false), typeof Y.wasm.proxy != "boolean" && (Y.wasm.proxy = false), typeof Y.wasm.trace != "boolean" && (Y.wasm.trace = false), typeof Y.wasm.numThreads != "number" || !Number.isInteger(Y.wasm.numThreads) || Y.wasm.numThreads <= 0) if (typeof self < "u" && !self.crossOriginIsolated) Y.wasm.numThreads = 1;
        else {
          let t = typeof navigator > "u" ? qt("node:os").cpus().length : navigator.hardwareConcurrency;
          Y.wasm.numThreads = Math.min(4, Math.ceil((t || 1) / 2));
        }
      }, Pt = class {
        async init(t) {
          So(), await po(), await mo(t);
        }
        async createInferenceSessionHandler(t, a) {
          let u = new Dt();
          return await u.loadModel(t, a), u;
        }
      }, Ts = new Pt();
    });
    Te();
    Te();
    Te();
    Gr = "1.29.0";
    au = nn;
    {
      let n = (Oo(), Xt(vo)).wasmBackend;
      qe("cpu", n, 10), qe("wasm", n, 10);
    }
    Object.defineProperty(Y.versions, "web", { value: Gr, enumerable: true });
  }
});

// packages/cycle5-browser/src/constants.ts
var CYCLE5_BROWSER_RUNTIME_VERSION = "cycle5-browser:2026.09.1";
var CYCLE5_MODEL_BASE = "https://opace.agency/models/local-signals-v1/";
var CYCLE5_CACHE_NAME = "opace-content-integrity-cycle5-browser-2026-09-1";
var CYCLE5_SUPERSEDED_CACHES = [
  "opace-local-signals-v1",
  "opace-local-signals-cycle2",
  "opace-local-signals-cycle5"
];
var CYCLE5_MODEL_FILE = "tier3-cycle5-full-e5small-int8-perchannel.onnx";
var CYCLE5_VOCAB_FILE = "vocab.txt";
var CYCLE5_WASM_FILE = "ort/ort-wasm-simd-threaded.wasm";
var CYCLE5_MANIFEST_FILE = "manifest.json";
var CYCLE5_MODEL_BYTES = 34301767;
var CYCLE5_MODEL_SHA256 = "9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b";
var CYCLE5_VOCAB_BYTES = 231508;
var CYCLE5_VOCAB_SHA256 = "07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3";
var CYCLE5_WASM_BYTES = 13961845;
var CYCLE5_WASM_SHA256 = "ec8580a9d7b9476ceee52e10a7f94124e4dc71a019d666ed6d4726697c109a4d";
var CYCLE5_DOWNLOAD_BYTES = CYCLE5_MODEL_BYTES + CYCLE5_VOCAB_BYTES;
var CYCLE5_MODEL_DOWNLOAD_LABEL = "34.5 MB";
var CYCLE5_RUNTIME_DOWNLOAD_LABEL = "14\u201326 MB";
var CYCLE5_DEFAULT_MAX_CHARACTERS = 5e4;
var CYCLE5_MAX_CHARACTERS = 1e5;
var CYCLE5_MAX_LEN = 512;
var CYCLE5_MIN_SCORED_TOKENS = 50;
var CYCLE5_TEMPERATURE = 1.0479;
var CYCLE5_PRIMARY_MARGIN = 3.570935;
var CYCLE5_SECONDARY_GAP = 0.34;
var CYCLE5_PRIMARY_DISPLAY_THRESHOLD = 0.9679444972866822;
var CYCLE5_SECONDARY_DISPLAY_THRESHOLD = 0.9561964051006938;
var CYCLE5_BANDS = [
  { id: "very_likely_ai", min: CYCLE5_PRIMARY_DISPLAY_THRESHOLD },
  { id: "uncertain", min: 0.95 },
  { id: "likely_human", min: 0.5 },
  { id: "very_likely_human", min: 0 }
];
var CYCLE5_ASSETS = Object.freeze({
  [CYCLE5_MODEL_FILE]: { bytes: CYCLE5_MODEL_BYTES, sha256: CYCLE5_MODEL_SHA256, mediaType: "application/octet-stream" },
  [CYCLE5_VOCAB_FILE]: { bytes: CYCLE5_VOCAB_BYTES, sha256: CYCLE5_VOCAB_SHA256, mediaType: "text/plain" },
  [CYCLE5_WASM_FILE]: { bytes: CYCLE5_WASM_BYTES, sha256: CYCLE5_WASM_SHA256, mediaType: "application/wasm" }
});

// packages/cycle5-browser/src/errors.ts
var Cycle5BrowserError = class extends Error {
  code;
  constructor(code, message, options) {
    super(message, options);
    this.name = "Cycle5BrowserError";
    this.code = code;
  }
};

// packages/cycle5-browser/src/model-store.ts
function normaliseAllowedModelBase(candidate, allowed) {
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (cause) {
    throw new Cycle5BrowserError("invalid_model_base", "The model base is not a valid URL.", { cause });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Cycle5BrowserError("invalid_model_base", "The model base must be an exact credential-free HTTPS directory URL.");
  }
  if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
  const normalised = parsed.href;
  const allowlist = allowed.map((entry) => {
    const url = new URL(entry);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.href;
  });
  if (!allowlist.includes(normalised)) throw new Cycle5BrowserError("invalid_model_base", "The model base is not in this host's fixed allowlist.");
  return normalised;
}
function throwIfAborted(signal, message = "The on-device model preparation was cancelled.") {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", message);
}
async function sha256(bytes, signal) {
  throwIfAborted(signal);
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  throwIfAborted(signal);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function abortReason(signal) {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model preparation was cancelled.");
  throw new Cycle5BrowserError("engine_error", "The model asset stream ended unexpectedly.");
}
async function boundedFetch(fetcher, url, maxBytes, signal, onProgress) {
  let response;
  try {
    response = await fetcher(url, { method: "GET", credentials: "omit", redirect: "error", cache: "no-store", signal });
  } catch (cause) {
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model download was cancelled.", { cause });
    throw new Cycle5BrowserError("offline", `The on-device asset could not be fetched: ${url}`, { cause });
  }
  if (!response.ok) throw new Cycle5BrowserError("offline", `The on-device asset returned HTTP ${response.status}: ${url}`);
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes2 = new Uint8Array(await response.arrayBuffer());
    throwIfAborted(signal, "The on-device model download was cancelled.");
    if (bytes2.byteLength > maxBytes) throw new Cycle5BrowserError("integrity_error", `The on-device asset exceeded its byte bound: ${url}`);
    onProgress?.(bytes2.byteLength);
    return bytes2;
  }
  const chunks = [];
  let total = 0;
  for (; ; ) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => void 0);
      abortReason(signal);
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => void 0);
      throw new Cycle5BrowserError("integrity_error", `The on-device asset exceeded its byte bound: ${url}`);
    }
    chunks.push(value);
    onProgress?.(total);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
function validateManifest(manifest) {
  if (manifest.version !== "tier3-cycle5-v1" || !manifest.files || typeof manifest.files !== "object") {
    throw new Cycle5BrowserError("integrity_error", "The model manifest does not identify tier3-cycle5-v1.");
  }
  for (const [file, expected] of Object.entries(CYCLE5_ASSETS)) {
    const entry = manifest.files[file];
    if (!entry || entry.bytes !== expected.bytes || entry.sha256 !== expected.sha256) {
      throw new Cycle5BrowserError("integrity_error", `The model manifest does not match the pinned ${file} identity.`);
    }
  }
}
async function validateAsset(file, bytes, signal) {
  const expected = CYCLE5_ASSETS[file];
  throwIfAborted(signal);
  if (bytes.byteLength !== expected.bytes || await sha256(bytes, signal) !== expected.sha256) {
    throw new Cycle5BrowserError("integrity_error", `Integrity check failed for ${file}.`);
  }
  throwIfAborted(signal);
}
var availableCaches = (provided) => provided ?? (typeof caches === "undefined" ? void 0 : caches);
async function pruneSuperseded(storage, signal) {
  const cacheStorage = availableCaches(storage);
  if (!cacheStorage) return;
  throwIfAborted(signal);
  const names = await cacheStorage.keys().catch(() => []);
  throwIfAborted(signal);
  await Promise.all(names.filter((name) => CYCLE5_SUPERSEDED_CACHES.includes(name)).map((name) => cacheStorage.delete(name)));
  throwIfAborted(signal);
}
function assetUrl(baseUrl, wasmUrl, file) {
  if (file === CYCLE5_WASM_FILE && wasmUrl) return new URL(wasmUrl, globalThis.location?.href ?? baseUrl).href;
  return new URL(file, baseUrl).href;
}
function cacheAssetUrl(baseUrl, wasmUrl, file) {
  const transportUrl = assetUrl(baseUrl, wasmUrl, file);
  return /^https?:$/u.test(new URL(transportUrl).protocol) ? transportUrl : new URL(file, baseUrl).href;
}
async function loadVerifiedCachedAssets(baseUrl, wasmUrl, storage, signal) {
  const cacheStorage = availableCaches(storage);
  if (!cacheStorage) return void 0;
  throwIfAborted(signal);
  await pruneSuperseded(cacheStorage, signal);
  let cache;
  try {
    cache = await cacheStorage.open(CYCLE5_CACHE_NAME);
    throwIfAborted(signal);
  } catch (cause) {
    if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") throw cause;
    return void 0;
  }
  const loaded = {};
  try {
    for (const file of Object.keys(CYCLE5_ASSETS)) {
      throwIfAborted(signal);
      const response = await cache.match(cacheAssetUrl(baseUrl, wasmUrl, file));
      throwIfAborted(signal);
      if (!response) return void 0;
      const bytes = new Uint8Array(await response.arrayBuffer());
      throwIfAborted(signal);
      await validateAsset(file, bytes, signal);
      loaded[file] = bytes;
    }
  } catch (cause) {
    if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") throw cause;
    await cacheStorage.delete(CYCLE5_CACHE_NAME).catch(() => false);
    return void 0;
  }
  throwIfAborted(signal);
  return { model: loaded[CYCLE5_MODEL_FILE], vocab: loaded[CYCLE5_VOCAB_FILE], wasm: loaded[CYCLE5_WASM_FILE] };
}
async function downloadVerifiedAssets(options) {
  const { baseUrl, wasmUrl, fetcher, cacheStorage, signal, onProgress } = options;
  await pruneSuperseded(cacheStorage, signal);
  const manifestBytes = await boundedFetch(fetcher, new URL(CYCLE5_MANIFEST_FILE, baseUrl).href, 65536, signal);
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch (cause) {
    throw new Cycle5BrowserError("integrity_error", "The model manifest is not valid JSON.", { cause });
  }
  validateManifest(manifest);
  const files = Object.keys(CYCLE5_ASSETS);
  const loaded = {};
  for (const [index, file] of files.entries()) {
    const expected = CYCLE5_ASSETS[file];
    const url = assetUrl(baseUrl, wasmUrl, file);
    const bytes = await boundedFetch(fetcher, url, expected.bytes, signal, (receivedBytes) => onProgress?.({
      file,
      fileIndex: index + 1,
      fileCount: files.length,
      receivedBytes,
      totalBytes: expected.bytes
    }));
    await validateAsset(file, bytes, signal);
    loaded[file] = bytes;
  }
  const storage = availableCaches(cacheStorage);
  if (storage) {
    try {
      const cache = await storage.open(CYCLE5_CACHE_NAME);
      throwIfAborted(signal);
      for (const file of files) {
        throwIfAborted(signal);
        const expected = CYCLE5_ASSETS[file];
        await cache.put(cacheAssetUrl(baseUrl, wasmUrl, file), new Response(loaded[file].slice().buffer, { headers: { "content-type": expected.mediaType, "content-length": String(expected.bytes) } }));
        throwIfAborted(signal);
      }
    } catch (cause) {
      if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model preparation was cancelled.", { cause });
    }
  }
  return { model: loaded[CYCLE5_MODEL_FILE], vocab: loaded[CYCLE5_VOCAB_FILE], wasm: loaded[CYCLE5_WASM_FILE] };
}
async function clearCycle5Cache(storage) {
  const cacheStorage = availableCaches(storage);
  return cacheStorage ? cacheStorage.delete(CYCLE5_CACHE_NAME) : false;
}

// packages/cycle5-browser/src/reference/cadence.ts
var IMPERATIVE_VERBS = /* @__PURE__ */ new Set([
  "write",
  "separate",
  "check",
  "decide",
  "ask",
  "compare",
  "choose",
  "use",
  "avoid",
  "consider",
  "start",
  "keep",
  "make",
  "ensure",
  "focus",
  "set",
  "review",
  "plan",
  "list",
  "add",
  "remove",
  "treat",
  "look",
  "note",
  "take",
  "put",
  "get",
  "define",
  "identify",
  "measure",
  "test",
  "build",
  "map",
  "record",
  "confirm",
  "agree",
  "include",
  "prioritise",
  "prioritize",
  "read",
  "think",
  "remember",
  "imagine",
  "consult",
  "contact",
  "call",
  "visit",
  "try",
  "begin",
  "stop",
  "watch",
  "find",
  "give",
  "send",
  "bring",
  "leave",
  "let",
  "pick",
  "select",
  "apply",
  "assess",
  "evaluate",
  "explain",
  "describe",
  "state",
  "name",
  "show",
  "tell",
  "expect",
  "allow",
  "aim",
  "work",
  "run",
  "draft",
  "publish",
  "share",
  "track",
  "monitor",
  "verify",
  "document",
  "budget",
  "quote",
  "price",
  "specify",
  "request",
  "require",
  "reduce",
  "improve",
  "increase",
  "protect",
  "secure",
  "update",
  "replace",
  "revisit",
  "weigh",
  "balance",
  "match",
  "align",
  "clarify",
  "capture"
]);
var UTILITY_VERBS = /* @__PURE__ */ new Set([
  "affects",
  "affect",
  "changes",
  "change",
  "reduces",
  "reduce",
  "improves",
  "improve",
  "helps",
  "help",
  "ensures",
  "ensure",
  "determines",
  "determine",
  "drives",
  "drive",
  "covers",
  "cover",
  "includes",
  "include",
  "requires",
  "require",
  "depends",
  "depend",
  "means",
  "mean",
  "matters",
  "matter",
  "supports",
  "support",
  "enables",
  "enable",
  "prevents",
  "prevent",
  "increases",
  "increase",
  "lowers",
  "lower",
  "shapes",
  "shape",
  "delivers",
  "deliver",
  "provides",
  "provide",
  "creates",
  "create",
  "allows",
  "allow",
  "offers",
  "offer",
  "adds",
  "add",
  "brings",
  "bring",
  "makes",
  "make",
  "gives",
  "give",
  "saves",
  "save",
  "costs",
  "cost",
  "takes",
  "take",
  "needs",
  "need",
  "sets",
  "set",
  "builds",
  "build",
  "leads",
  "lead",
  "informs",
  "inform",
  "guides",
  "guide",
  "reflects",
  "reflect",
  "signals",
  "signal",
  "indicates",
  "indicate",
  "boosts",
  "boost",
  "strengthens",
  "strengthen",
  "limits",
  "limit",
  "avoids",
  "avoid",
  "protects",
  "protect",
  "streamlines",
  "streamline",
  "influences",
  "influence",
  "reveals",
  "reveal",
  "explains",
  "explain",
  "shows",
  "show",
  "raises",
  "raise",
  "cuts",
  "cut",
  "speeds",
  "speed",
  "clarifies",
  "clarify",
  "removes",
  "remove"
]);
var AUX_VERBS = /* @__PURE__ */ new Set([
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must"
]);
var CONSEQUENCE_OPENERS = [
  "otherwise",
  "so ",
  "as a result",
  "that means",
  "this means",
  "the result is",
  "therefore",
  "then ",
  "consequently",
  "in short",
  "the effect is",
  "which is why",
  "that is why"
];
var EXAMPLE_MARKERS = [
  "for example",
  "for instance",
  "such as",
  "e.g.",
  "including ",
  "say, ",
  "like a ",
  "take the ",
  "consider the "
];
var CONTRAST_MARKERS = [
  " but ",
  " however",
  " though",
  " although",
  " yet ",
  " whereas ",
  " while ",
  " rather than ",
  " not always",
  " does not always",
  " is not a ",
  " is not the ",
  " instead of ",
  " unlike ",
  " despite ",
  " even so",
  " on the other hand"
];
var HEDGES = [
  "perhaps",
  "maybe",
  "sort of",
  "kind of",
  "arguably",
  "obviously",
  "of course",
  "i think",
  "we think",
  "in my experience",
  "honestly",
  "frankly",
  "actually",
  "pretty much",
  "more or less",
  "admittedly",
  "oddly",
  "curiously",
  "strangely",
  "funnily",
  "i suspect",
  "i'd say",
  "to be fair",
  "if anything",
  "not entirely",
  "i suppose",
  "somewhat",
  "roughly",
  "broadly",
  "loosely",
  "in a sense"
];
var FIRST_SECOND_PERSON = /* @__PURE__ */ new Set([
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "i'm",
  "i've",
  "i'd",
  "i'll",
  "we're",
  "we've",
  "you're",
  "you've"
]);
var ABSTRACT_SUFFIXES = [
  "tion",
  "sion",
  "ment",
  "ity",
  "ance",
  "ence",
  "ness",
  "ship",
  "ology",
  "ism",
  "age",
  "ure",
  "cy",
  "ing"
];
var ABSTRACT_NOUNS = /* @__PURE__ */ new Set([
  "cost",
  "costs",
  "count",
  "effort",
  "work",
  "price",
  "prices",
  "quality",
  "scope",
  "budget",
  "process",
  "model",
  "platform",
  "approach",
  "strategy",
  "structure",
  "content",
  "design",
  "page",
  "pages",
  "site",
  "sites",
  "data",
  "research",
  "evidence",
  "team",
  "business",
  "value",
  "risk",
  "time",
  "result",
  "results",
  "outcome",
  "outcomes",
  "choice",
  "decision",
  "factor",
  "feature",
  "features",
  "detail",
  "details",
  "brief",
  "spec",
  "policy",
  "practice",
  "method",
  "system",
  "tool",
  "tools",
  "rate",
  "rates",
  "level",
  "levels",
  "scale",
  "range",
  "share",
  "growth",
  "demand",
  "supply",
  "market",
  "sector",
  "product",
  "service",
  "services",
  "support",
  "success",
  "failure",
  "impact",
  "effect",
  "change",
  "role",
  "aim",
  "goal",
  "target"
]);
var CLAUSE_MARKERS = [
  " because ",
  " which ",
  " that ",
  " when ",
  " if ",
  " where ",
  " after ",
  " before ",
  " since ",
  " unless ",
  " until ",
  " so that ",
  " whether ",
  " while ",
  " although ",
  " though ",
  " whereas ",
  " as "
];
var SENT_SPLIT = /(?<=[.!?])["')\]]*\s+/;
var ABBREV = /\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof|Fig|No|St|Jr|Sr|approx|cf|al)\.$/i;
var WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;
var cadenceWords = (s) => s.match(WORD_RE) ?? [];
var splitCadenceSentences = (text) => {
  const out = [];
  for (const raw of text.trim().split(SENT_SPLIT)) {
    const piece = raw.trim();
    if (!piece) continue;
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += ` ${piece}`;
    else out.push(piece);
  }
  return out.filter((s) => cadenceWords(s).length > 0);
};
var isHeading = (block) => {
  const ws2 = cadenceWords(block);
  const last = block.replace(/\s+$/, "").slice(-1);
  return ws2.length > 0 && ws2.length <= 12 && !`.!?:;"')]`.includes(last);
};
var splitCadenceParagraphs = (text) => {
  let blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length <= 1) blocks = text.split("\n").map((b) => b.trim()).filter(Boolean);
  const kept = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean).filter((line) => !isHeading(line));
    if (lines.length) kept.push(lines.join(" "));
  }
  return kept.length ? kept : blocks;
};
var startsImperative = (ws2) => {
  if (!ws2.length) return false;
  const first = ws2[0].toLowerCase();
  if (["do", "don't", "never", "always"].includes(first) && ws2.length > 1) {
    const second = ws2[1].toLowerCase().replace(/^['t]+|['t]+$/g, "");
    return IMPERATIVE_VERBS.has(second) || first === "never" || first === "always";
  }
  if (IMPERATIVE_VERBS.has(first)) {
    if (ws2.length > 1 && AUX_VERBS.has(ws2[1].toLowerCase())) return false;
    return true;
  }
  return false;
};
var firstFiniteIndex = (ws2) => {
  for (let i = 0; i < ws2.length; i++) {
    const lw = ws2[i].toLowerCase();
    if (AUX_VERBS.has(lw) || UTILITY_VERBS.has(lw)) return i;
  }
  return -1;
};
var isAbstractSubject = (sub) => {
  if (!sub.length || sub.length > 5) return false;
  if (sub.some((w) => FIRST_SECOND_PERSON.has(w.toLowerCase()))) return false;
  if (sub.slice(1).some((w) => /[A-Z]/.test(w[0]))) return false;
  const head = sub[sub.length - 1].toLowerCase();
  return ABSTRACT_NOUNS.has(head) || ABSTRACT_SUFFIXES.some((suffix) => head.endsWith(suffix));
};
var countEnumeration = (s) => /\w+\s*,\s*[^,;.]{2,40},\s*[^,;.]{2,40}\s+(?:and|or)\s+/.test(s);
var isBalancedImpl = (s) => {
  const parts = s.split(/;|\s+while\s+|\s+whereas\s+/);
  if (parts.length < 2) return false;
  const heads = [];
  for (const part of parts) {
    const ws2 = cadenceWords(part);
    if (ws2.length < 4) return false;
    const idx = firstFiniteIndex(ws2);
    heads.push(idx >= 0 ? ws2[idx].toLowerCase() : null);
  }
  const real = heads.filter((h) => h !== null);
  return real.length >= 2 && new Set(real).size === 1;
};
var countOccurrences = (haystack, needle) => {
  let count = 0, index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + 1);
  }
  return count;
};
var analyseCadenceSentence = (s) => {
  const ws2 = cadenceWords(s);
  const low = ` ${s.toLowerCase()} `;
  const sent = {
    text: s,
    role: "C",
    nWords: ws2.length,
    imperative: false,
    utility: false,
    messy: false,
    enumeration: countEnumeration(s),
    balanced: isBalancedImpl(s)
  };
  sent.messy = s.includes("(") || s.includes("\u2014") || s.includes("\u2013") || s.includes(" - ") || s.includes("...") || s.includes("\u2026") || s.includes("!") || ws2.some((w) => FIRST_SECOND_PERSON.has(w.toLowerCase())) || HEDGES.some((h) => low.includes(h)) || ws2.length > 0 && ["and", "but", "so", "or", "still", "anyway"].includes(ws2[0].toLowerCase());
  const idx = firstFiniteIndex(ws2);
  if (idx > 0) {
    sent.utility = UTILITY_VERBS.has(ws2[idx].toLowerCase()) && isAbstractSubject(ws2.slice(0, idx));
  }
  sent.imperative = startsImperative(ws2);
  if (s.replace(/\s+$/, "").endsWith("?")) sent.role = "Q";
  else if (sent.imperative) sent.role = "I";
  else if (CONSEQUENCE_OPENERS.some((o) => low.startsWith(` ${o}`))) sent.role = "S";
  else if ([" should ", " must ", " need to ", " ought to "].some((m) => low.includes(m))) sent.role = "R";
  else if (EXAMPLE_MARKERS.some((m) => low.includes(m))) sent.role = "E";
  else if (CONTRAST_MARKERS.some((m) => low.includes(m))) sent.role = "X";
  else if (sent.messy) sent.role = "A";
  else sent.role = "C";
  void countOccurrences;
  void CLAUSE_MARKERS;
  return sent;
};
var CADENCE_GATE = 4;
var cadenceFrom = (ss2) => {
  if (!ss2.length) return 0;
  const total = ss2.reduce((sum, s) => sum + s.nWords, 0);
  const roles = ss2.map((s) => s.role);
  let score = 0;
  if (ss2.length >= 3 && total <= 55) score += 3;
  if (["I", "R", "S"].includes(roles[roles.length - 1])) score += 2;
  if (ss2.length >= 3 && ["C", "X"].includes(roles[0]) && ["I", "R", "S"].includes(roles[roles.length - 1])) score += 2;
  if (ss2.some((s) => s.balanced)) score += 2;
  score += Math.min(2, ss2.filter((s) => s.utility).length);
  if (ss2.some((s) => s.enumeration)) score += 1;
  score -= 2 * ss2.filter((s) => s.messy).length;
  return Math.max(0, score);
};
var hasParagraphMarkup = (text) => splitCadenceParagraphs(text).length >= 3;
var paragraphCadenceRate = (text) => {
  const paragraphs = splitCadenceParagraphs(text).map((p) => splitCadenceSentences(p).map(analyseCadenceSentence)).filter((ss2) => ss2.length > 0);
  const sentences = paragraphs.flat();
  const nWords = sentences.reduce((sum, s) => sum + s.nWords, 0);
  const nSents = sentences.length;
  if (nWords < 50 || nSents < 4) return void 0;
  if (!hasParagraphMarkup(text)) return void 0;
  const perK = 1e3 / nWords;
  const multi = paragraphs.filter((ss2) => ss2.length >= 2);
  const scores = multi.map((ss2) => cadenceFrom(ss2));
  if (!scores.length) return void 0;
  return scores.filter((v) => v >= CADENCE_GATE).length * perK;
};

// packages/cycle5-browser/src/reference/document-tells.ts
var phrase = (text, aiPer1000, humanPer1000, aiDocs, humanDocs, ratio, confirmingRatio) => ({
  phrase: text,
  aiPer1000,
  humanPer1000,
  aiDocs,
  humanDocs,
  ratio,
  confirmingRatio,
  smallSample: aiDocs < 10 || humanDocs < 10
});
var CURATED_PHRASE_TELLS = [
  phrase("robust", 60.26, 16.17, 242, 67, 3.7, 3.7),
  phrase("whether you're", 43.82, 8.69, 176, 36, 5, 3.1),
  phrase("seamless", 22.41, 5.79, 90, 24, 3.8, 3.6),
  phrase("seamlessly", 11.21, 5.07, 45, 21, 2.2, 2.2),
  phrase("streamline", 10.21, 4.34, 41, 18, 2.3, 4.4),
  phrase("underscores", 5.48, 2.41, 22, 10, 2.2, 3.5),
  phrase("in an era", 4.48, 1.21, 18, 5, 3.5, 3.3),
  phrase("at its core", 3.24, 1.45, 13, 6, 2.1, 2.8),
  phrase("game-changer", 4.23, 1.69, 17, 7, 2.4, 3.4),
  phrase("streamlining", 4.23, 1.93, 17, 8, 2.1, 4),
  phrase("is not just about", 3.49, 1.21, 14, 5, 2.7, 2.5),
  phrase("a testament to", 3.24, 1.21, 13, 5, 2.5, 13.9),
  phrase("elevate your", 2.99, 0.72, 12, 3, 3.7, 2.8),
  phrase("here's the thing", 2.24, 0.24, 9, 1, 6.5, 5.8),
  phrase("key takeaways", 1.99, 0.72, 8, 3, 2.5, 2.2),
  phrase("paving the way", 1.74, 0.24, 7, 1, 5.2, 5.8),
  phrase("plays a crucial role", 1.25, 0.48, 5, 2, 2.3, 2.6),
  phrase("tapestry", 0.75, 0, 3, 0, 7.2, 13.4),
  phrase("in today's digital", 0.75, 0, 3, 0, 7.2, 2.5),
  phrase("final thoughts", 0.75, 0.24, 3, 1, 2.4, 2.3),
  phrase("a beacon of", 0.25, 0, 1, 0, 3.1, 6.2)
];
var BULLET_RE = /^\s*([-*+•]|\d+[.)])\s+/;
var headingLike = (line) => {
  const s = line.trim();
  if (!s || s.length > 90) return false;
  if (BULLET_RE.test(s)) return false;
  if (/[.!?,;]$/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length > 12) return false;
  return /[A-Za-z]/.test(s);
};
var sentenceCount = (paragraph) => paragraph.split(/(?<=[.!?])\s+/).filter((part) => part.trim().split(/\s+/).length >= 2).length;
var populationCv = (values) => {
  if (values.length < 2) return void 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return void 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};
var COHESION_STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be because been
before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't
down during each few for from further had hadn't has hasn't have haven't having he her here hers herself
him himself his how i if in into is isn't it its itself let's me more most mustn't my myself no nor not
of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was wasn't we were weren't what when where which while who whom why with won't would
wouldn't you your yours yourself yourselves`.split(/\s+/));
var COHESION_WORD_RE = /[A-Za-zÀ-ɏ']+/g;
var COHESION_SENT_SPLIT = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)(?<=[.!?])["'”’)\]]*\s+(?=["'“‘(\[]*[A-Z0-9])/;
var cohesionSentences = (draft) => {
  const out = [];
  for (const line of draft.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    for (const sentence of trimmedLine.split(COHESION_SENT_SPLIT)) {
      const trimmed = sentence.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
};
var adjacentCohesionRaw = (draft) => {
  const sentenceSets = cohesionSentences(draft).map((sentence) => {
    const words = sentence.match(COHESION_WORD_RE) ?? [];
    return new Set(words.map((word) => word.toLowerCase()).filter((word) => !COHESION_STOPWORDS.has(word)));
  });
  let total = 0, pairs = 0;
  for (let i = 0; i < sentenceSets.length - 1; i++) {
    const a = sentenceSets[i], b = sentenceSets[i + 1];
    if (!a.size || !b.size) continue;
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    total += shared / (a.size + b.size - shared);
    pairs += 1;
  }
  if (!pairs) return void 0;
  return { value: total / pairs, pairs };
};
var BOLD_ONLY_RE = /^\*\*(.+)\*\*:?\s*$/;
var stripMdInline = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\([^)]*\)/g, "$1").trim();
var classifyBlocks = (text) => {
  const out = [];
  for (const raw of text.split(/\n\s*\n/)) {
    let lines = raw.split("\n").filter((line) => line.trim());
    if (!lines.length) continue;
    for (; ; ) {
      const first = lines[0]?.trim() ?? "";
      const md = first.match(/^#{1,6}\s+(.*)$/);
      const bold = first.match(BOLD_ONLY_RE);
      if (md) {
        out.push({ kind: "heading", content: stripMdInline(md[1]) });
        lines = lines.slice(1);
        continue;
      }
      if (bold && headingLike(stripMdInline(bold[1]))) {
        out.push({ kind: "heading", content: stripMdInline(bold[1]) });
        lines = lines.slice(1);
        continue;
      }
      break;
    }
    if (!lines.length) continue;
    const bulletLines = lines.filter((line) => BULLET_RE.test(line)).length;
    const body = lines.join("\n");
    if (bulletLines >= 2 && bulletLines >= 0.5 * lines.length) {
      out.push({ kind: "bullets", content: body });
    } else if (lines.length === 1 && headingLike(stripMdInline(lines[0])) && !BULLET_RE.test(lines[0])) {
      out.push({ kind: "heading", content: stripMdInline(lines[0]) });
    } else {
      out.push({ kind: "para", content: lines.length === 1 ? stripMdInline(body) : body });
    }
  }
  return out;
};
var scaffoldFeaturesRaw = (text) => {
  const blocks = classifyBlocks(text);
  const sections = [];
  let current = [];
  for (const block of blocks) {
    if (block.kind === "heading") {
      sections.push(current);
      current = [];
    } else current.push(block);
  }
  sections.push(current);
  const nonEmpty = sections.length > 1 ? sections.slice(1).filter((section) => section.length) : [];
  const out = {};
  if (nonEmpty.length >= 3) {
    const body = nonEmpty.length >= 5 ? nonEmpty.slice(1, -1) : nonEmpty;
    const signatures = body.map((section) => ({
      paragraphs: section.filter((block) => block.kind === "para").length,
      bullets: section.filter((block) => block.kind === "bullets").length
    }));
    const counts = /* @__PURE__ */ new Map();
    for (const signature of signatures) {
      const key = `${signature.paragraphs}|${signature.bullets}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const modeCount = [...counts.values()].sort((a, b) => b - a)[0];
    out.bodyModeShare = modeCount / signatures.length;
  }
  const paras = blocks.filter((block) => block.kind === "para");
  const spp = paras.map((block) => sentenceCount(block.content)).filter((count) => count > 0);
  if (spp.length >= 5) out.sppCv = populationCv(spp);
  return out;
};
var wordCountWhitespace = (s) => {
  const trimmed = s.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};
var median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
var populationVariance = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
};
var wordMetrics = (text) => {
  const blocks = classifyBlocks(text);
  const sections = [];
  let current = [];
  for (const block of blocks) {
    if (block.kind === "heading") {
      sections.push(current);
      current = [];
    } else current.push(block);
  }
  sections.push(current);
  const nonempty = sections.length > 1 ? sections.slice(1).filter((section) => section.length) : [];
  const out = {};
  if (nonempty.length >= 4) out.ppsVar = populationVariance(nonempty.map((section) => section.length));
  const wps = nonempty.map((section) => section.reduce((sum, block) => sum + wordCountWhitespace(block.content), 0));
  if (wps.length >= 3) {
    out.wpsCv = populationCv(wps);
    const body = wps.length >= 5 ? wps.slice(1, -1) : wps;
    if (body.length >= 4 || wps.length >= 4 && body.length >= 2) {
      const med = median(body);
      if (med > 0 && wps.length >= 4) {
        out.secWithin15 = body.filter((w) => Math.abs(w - med) <= 0.15 * med).length / body.length;
      }
    }
  }
  const paras = blocks.filter((block) => block.kind === "para");
  const wpp = paras.map((block) => wordCountWhitespace(block.content)).filter((n) => n > 0);
  if (wpp.length >= 5) out.wppCv = populationCv(wpp);
  return out;
};
var hasStructure = (text) => {
  const blocks = classifyBlocks(text);
  const nHead = blocks.filter((block) => block.kind === "heading").length;
  const nPara = blocks.filter((block) => block.kind === "para").length;
  return nHead >= 1 || nPara >= 3 ? 1 : 0;
};

// packages/cycle5-browser/src/reference/features-v1.ts
var FEATURES_V1_CONTRACT = "features-v1";
var FEATURE_NAMES = [
  "wpp_cv",
  "sec_within15",
  "pps_var",
  "body_mode_share",
  "spp_cv",
  "adj_overlap",
  "cadence_rate",
  "has_structure"
];
var FEATURE_NORM = {
  mean: [
    0.4083594134418581,
    0.3858695169470864,
    3.972885878050851,
    0.47256837589441686,
    0.3761888885414563,
    0.04671324010389126,
    0.43453264073828046,
    0.4892945080826464
  ],
  sd: [
    0.21248020231631692,
    0.26923918696432436,
    41.53045781679202,
    0.20330337201399315,
    0.16477298430411097,
    0.04122616971543623,
    1.3061158641315476,
    0.49988537930490373
  ],
  clip: 4
};
var rawFeatures = (text) => {
  const wm = wordMetrics(text);
  const scaffold = scaffoldFeaturesRaw(text);
  const cohesion = adjacentCohesionRaw(text);
  const cadenceRate = paragraphCadenceRate(text);
  return [
    wm.wppCv,
    wm.secWithin15,
    wm.ppsVar,
    scaffold.bodyModeShare,
    scaffold.sppCv,
    cohesion?.value,
    cadenceRate,
    hasStructure(text)
  ];
};
var normaliseFeatures = (raw) => raw.map((value, i) => {
  if (value === void 0 || !Number.isFinite(value)) return 0;
  const z2 = (value - FEATURE_NORM.mean[i]) / FEATURE_NORM.sd[i];
  const clipped = Math.min(FEATURE_NORM.clip, Math.max(-FEATURE_NORM.clip, z2));
  return Number.isFinite(clipped) ? clipped : 0;
});
var featuresV1 = (text) => normaliseFeatures(rawFeatures(text));

// packages/cycle5-browser/src/reference/segments.ts
var SEGMENTATION_CONTRACT = "segments-v3";
var MODEL_MAX_TOKENS = 512;
var SPECIAL_TOKENS = 2;
var SEGMENT_TOKEN_BUDGET = MODEL_MAX_TOKENS - SPECIAL_TOKENS;
var WORD = /\S+/gu;
var atomsOf = (text, countTokens) => {
  const words = [];
  WORD.lastIndex = 0;
  for (let match = WORD.exec(text); match; match = WORD.exec(text)) words.push({ start: match.index, end: match.index + match[0].length });
  const counts = countTokens(words.map((word) => text.slice(word.start, word.end)));
  const spans = [];
  const tokens = [];
  const isWordStart = [];
  const forced = [];
  const oversized = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (counts[index] <= SEGMENT_TOKEN_BUDGET) {
      spans.push(word);
      tokens.push(counts[index]);
      isWordStart.push(true);
      forced.push(false);
      continue;
    }
    let at = word.start, first = true;
    while (at < word.end) {
      const stop = Math.min(at + SEGMENT_TOKEN_BUDGET, word.end);
      spans.push({ start: at, end: stop });
      oversized.push(spans.length - 1);
      tokens.push(0);
      isWordStart.push(first);
      forced.push(true);
      first = false;
      at = stop;
    }
  }
  if (oversized.length) {
    const measured = countTokens(oversized.map((index) => text.slice(spans[index].start, spans[index].end)));
    oversized.forEach((index, position) => {
      tokens[index] = measured[position];
    });
  }
  return { spans, tokens, isWordStart, forced };
};
var cutsFor = (cum, total, parts, forcedCuts, atomCount) => {
  const cuts = [];
  let previous = 0;
  for (let j = 1; j < parts; j++) {
    const target = j * total;
    let at = previous + 1;
    while (at < atomCount && cum[at] * parts < target) at++;
    const ceiling = atomCount - (parts - j);
    if (at > ceiling) at = ceiling;
    cuts.push(at);
    previous = at;
  }
  const merged = [.../* @__PURE__ */ new Set([...cuts, ...forcedCuts])].sort((a, b) => a - b);
  return merged.filter((cut) => cut > 0 && cut < atomCount);
};
var segmentText = (text, countTokens) => {
  const { spans, tokens, isWordStart, forced } = atomsOf(text, countTokens);
  const atomCount = spans.length;
  const cum = [0];
  for (const count of tokens) cum.push(cum[cum.length - 1] + count);
  const total = cum[atomCount];
  const anyForced = forced.some(Boolean);
  if (total + SPECIAL_TOKENS <= MODEL_MAX_TOKENS && !anyForced) {
    const words = isWordStart.filter(Boolean).length;
    return [{ index: 0, start: 0, end: text.length, words, text, tokens: total + SPECIAL_TOKENS }];
  }
  const forcedCuts = [];
  for (let index = 0; index < atomCount; index++) if (forced[index]) {
    forcedCuts.push(index);
    forcedCuts.push(index + 1);
  }
  let parts = Math.max(1, Math.ceil(total / SEGMENT_TOKEN_BUDGET));
  let cuts = [], starts = [], ends = [], pieces = [], measured = [];
  for (; ; ) {
    cuts = cutsFor(cum, total, parts, forcedCuts, atomCount);
    starts = [0, ...cuts.map((cut) => spans[cut - 1].end)];
    ends = [...cuts.map((cut) => spans[cut - 1].end), text.length];
    pieces = starts.map((start, index) => text.slice(start, ends[index]));
    measured = countTokens(pieces).map((count) => count + SPECIAL_TOKENS);
    if (measured.every((count) => count <= MODEL_MAX_TOKENS) || parts >= atomCount) break;
    parts++;
  }
  const edges = [...cuts, atomCount];
  const segments = [];
  let firstAtom = 0;
  for (let index = 0; index < edges.length; index++) {
    let words = 0;
    for (let atom = firstAtom; atom < edges[index]; atom++) if (isWordStart[atom]) words++;
    segments.push({ index, start: starts[index], end: ends[index], words, text: pieces[index], tokens: measured[index] });
    firstAtom = edges[index];
  }
  return segments;
};
var scoringOrder = (count) => {
  if (count <= 1) return count === 1 ? [0] : [];
  const first = [Math.floor((count - 1) / 2), count - 1, 0];
  const order = [];
  const seen = /* @__PURE__ */ new Set();
  for (const index of first) if (index >= 0 && index < count && !seen.has(index)) {
    seen.add(index);
    order.push(index);
  }
  for (let index = 0; index < count; index++) if (!seen.has(index)) {
    seen.add(index);
    order.push(index);
  }
  return order;
};

// packages/cycle5-browser/src/reference/tokenizer.ts
var MAX_WORD_CHARS = 100;
var PUNCT_ASCII = (code) => code >= 33 && code <= 47 || code >= 58 && code <= 64 || code >= 91 && code <= 96 || code >= 123 && code <= 126;
var PUNCT_UNICODE = /\p{P}/u;
var CONTROL = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/u;
var WHITESPACE = /\p{White_Space}/u;
var isPunctuation = (ch) => PUNCT_ASCII(ch.codePointAt(0)) || PUNCT_UNICODE.test(ch);
var isControl = (ch) => !WHITESPACE.test(ch) && CONTROL.test(ch);
var isCjk = (code) => code >= 19968 && code <= 40959 || code >= 13312 && code <= 19903 || code >= 131072 && code <= 173791 || code >= 173824 && code <= 177983 || code >= 177984 && code <= 178207 || code >= 178208 && code <= 183983 || code >= 63744 && code <= 64255 || code >= 194560 && code <= 195103;
var WordPieceTokenizer = class {
  vocab;
  clsId;
  sepId;
  unkId;
  constructor(vocabText) {
    this.vocab = /* @__PURE__ */ new Map();
    const lines = vocabText.split("\n");
    let index = 0;
    for (const line of lines) {
      const token = line.replace(/\r$/, "");
      if (token === "" && index === lines.length - 1) break;
      this.vocab.set(token, index);
      index++;
    }
    this.clsId = this.vocab.get("[CLS]");
    this.sepId = this.vocab.get("[SEP]");
    this.unkId = this.vocab.get("[UNK]");
  }
  cleanText(text) {
    let out = "";
    for (const ch of text) {
      const code = ch.codePointAt(0);
      if (code === 0 || code === 65533 || isControl(ch)) continue;
      out += WHITESPACE.test(ch) ? " " : ch;
    }
    return out;
  }
  spaceCjk(text) {
    let out = "";
    for (const ch of text) out += isCjk(ch.codePointAt(0)) ? ` ${ch} ` : ch;
    return out;
  }
  basicTokenize(text) {
    const words = this.spaceCjk(this.cleanText(text)).split(/ +/u).filter(Boolean);
    const tokens = [];
    for (let word of words) {
      word = [...word].map((character) => character.toLowerCase()).join("").normalize("NFD").replace(/\p{Mn}/gu, "");
      let current = "";
      for (const ch of word) {
        if (isPunctuation(ch)) {
          if (current) {
            tokens.push(current);
            current = "";
          }
          tokens.push(ch);
        } else current += ch;
      }
      if (current) tokens.push(current);
    }
    return tokens;
  }
  wordPiece(word) {
    if ([...word].length > MAX_WORD_CHARS) return [this.unkId];
    const ids = [];
    let start = 0;
    while (start < word.length) {
      let end = word.length, id;
      while (start < end) {
        const piece = (start > 0 ? "##" : "") + word.slice(start, end);
        const found = this.vocab.get(piece);
        if (found !== void 0) {
          id = found;
          break;
        }
        end--;
      }
      if (id === void 0) return [this.unkId];
      ids.push(id);
      start = end;
    }
    return ids;
  }
  /**
   * WordPiece token counts for each string, with no [CLS]/[SEP] and no
   * truncation. This is what segments.ts bounds a segment by: the word-count
   * proxy it used before was measured to leave 5.78% of segments over the
   * 512-token window on the fresh long-form corpus, silently dropping their
   * ends. Counting is the same code path encode() uses, so the two can never
   * disagree about how long a passage is.
   */
  countTokens(strings) {
    return strings.map((text) => {
      let total = 0;
      for (const token of this.basicTokenize(text)) total += this.wordPiece(token).length;
      return total;
    });
  }
  /** [CLS] + pieces + [SEP], right-truncated so the total length is at most maxLen. */
  encode(text, maxLen) {
    const ids = [];
    for (const token of this.basicTokenize(text)) {
      for (const id of this.wordPiece(token)) {
        ids.push(id);
        if (ids.length >= maxLen - 2) break;
      }
      if (ids.length >= maxLen - 2) break;
    }
    const truncated = ids.length >= maxLen - 2;
    return { inputIds: [this.clsId, ...ids, this.sepId], truncated };
  }
};

// packages/cycle5-browser/src/runtime.ts
var probabilityFromMargin = (margin) => 1 / (1 + Math.exp(-margin / CYCLE5_TEMPERATURE));
var bandFor = (score) => CYCLE5_BANDS.find((band) => score >= band.min).id;
async function defaultSessionFactory(assets, signal) {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
  const ort = await Promise.resolve().then(() => (init_ort_wasm_bundle_min(), ort_wasm_bundle_min_exports));
  const wasmUrl = URL.createObjectURL(new Blob([assets.wasm.slice().buffer], { type: "application/wasm" }));
  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = { wasm: wasmUrl };
    const session = await ort.InferenceSession.create(assets.model.slice(), { executionProviders: ["wasm"], graphOptimizationLevel: "basic" });
    if (signal?.aborted) {
      await session.release();
      throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    }
    return {
      async run(feeds, shape) {
        const output = await session.run({
          input_ids: new ort.Tensor("int64", feeds.input_ids, shape),
          attention_mask: new ort.Tensor("int64", feeds.attention_mask, shape),
          feats: new ort.Tensor("float32", feeds.feats, [1, 8])
        });
        const logits = await output.logits?.getData();
        if (!logits || logits.length !== 2) throw new Cycle5BrowserError("engine_error", "The Cycle-5 model returned an invalid logits tensor.");
        return { logits: Float32Array.from(logits) };
      },
      release: () => session.release()
    };
  } finally {
    URL.revokeObjectURL(wasmUrl);
  }
}
var Cycle5BrowserRuntime = class {
  modelBaseUrl;
  maxCharacters;
  wasmUrl;
  fetcher;
  cacheStorage;
  sessionFactory;
  session;
  tokenizer;
  preparation;
  snapshot = { state: "not_ready", message: "The on-device model has not been prepared.", cacheVersion: CYCLE5_CACHE_NAME };
  constructor(config) {
    this.modelBaseUrl = normaliseAllowedModelBase(config.modelBaseUrl, config.allowedModelBaseUrls);
    this.wasmUrl = config.wasmUrl;
    this.maxCharacters = config.maxCharacters ?? CYCLE5_DEFAULT_MAX_CHARACTERS;
    if (!Number.isInteger(this.maxCharacters) || this.maxCharacters < 1 || this.maxCharacters > CYCLE5_MAX_CHARACTERS) {
      throw new RangeError(`maxCharacters must be an integer from 1 to ${CYCLE5_MAX_CHARACTERS}.`);
    }
    this.fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.cacheStorage = config.cacheStorage;
    this.sessionFactory = config.createSession ?? defaultSessionFactory;
  }
  state() {
    return Object.freeze({ ...this.snapshot });
  }
  setState(state, message) {
    this.snapshot = { state, message, cacheVersion: CYCLE5_CACHE_NAME };
  }
  async prepareFromCache(signal) {
    if (this.session) return true;
    if (this.preparation) {
      await this.preparation;
      return Boolean(this.session);
    }
    this.setState("checking_cache", "Checking for a previously consented Cycle-5 model.");
    let assets;
    try {
      assets = await loadVerifiedCachedAssets(this.modelBaseUrl, this.wasmUrl, this.cacheStorage, signal);
    } catch (cause) {
      if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") this.setState("not_ready", cause.message);
      throw cause;
    }
    if (!assets) {
      this.setState("not_ready", "The Cycle-5 model is not cached. An explicit download choice is required.");
      return false;
    }
    this.preparation = this.loadAssets(assets, signal);
    try {
      await this.preparation;
      return true;
    } finally {
      this.preparation = void 0;
    }
  }
  async prepareWithConsent(options) {
    if (!options.consent) throw new Cycle5BrowserError("consent_required", "Explicit consent is required before the model download starts.");
    if (this.session) return;
    if (this.preparation) return this.preparation;
    this.setState("downloading", this.wasmUrl ? "Downloading the pinned model and vocabulary after explicit consent, then verifying the packaged browser runtime." : "Downloading the pinned model, vocabulary and browser runtime after explicit consent.");
    this.preparation = (async () => {
      try {
        const cached = await loadVerifiedCachedAssets(this.modelBaseUrl, this.wasmUrl, this.cacheStorage, options.signal);
        const assets = cached ?? await downloadVerifiedAssets({
          baseUrl: this.modelBaseUrl,
          wasmUrl: this.wasmUrl,
          fetcher: this.fetcher,
          cacheStorage: this.cacheStorage,
          signal: options.signal,
          onProgress: options.onProgress
        });
        await this.loadAssets(assets, options.signal);
      } catch (cause) {
        const error = cause instanceof Cycle5BrowserError ? cause : new Cycle5BrowserError("engine_error", "The on-device model could not be prepared.", { cause });
        const state = error.code === "offline" ? "offline" : error.code === "integrity_error" ? "integrity_error" : error.code === "cancelled" ? "not_ready" : "error";
        this.setState(state, error.message);
        throw error;
      }
    })();
    try {
      await this.preparation;
    } finally {
      this.preparation = void 0;
    }
  }
  async loadAssets(assets, signal) {
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    this.setState("loading", "Loading the verified Cycle-5 model on this device.");
    const tokenizer = new WordPieceTokenizer(new TextDecoder().decode(assets.vocab));
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    const session = await this.sessionFactory({ model: assets.model, wasm: assets.wasm }, signal);
    if (signal?.aborted) {
      await session.release?.();
      throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    }
    this.tokenizer = tokenizer;
    this.session = session;
    this.setState("ready", "The verified Cycle-5 model is ready on this device.");
  }
  async score(text, options = {}) {
    if (!this.session || !this.tokenizer) return { status: "not_scored", code: "not_ready", reason: this.snapshot.message };
    if (text.length > this.maxCharacters) return { status: "not_scored", code: "too_long", reason: `The draft is ${text.length} characters; this route refuses more than ${this.maxCharacters} rather than truncating it.` };
    if (options.signal?.aborted) return { status: "not_scored", code: "cancelled", reason: "The on-device model run was cancelled." };
    const pieces = segmentText(text, (values) => this.tokenizer.countTokens(values));
    const sections = [];
    let done = 0;
    for (const position of scoringOrder(pieces.length)) {
      if (options.signal?.aborted) return { status: "not_scored", code: "cancelled", reason: "The on-device model run was cancelled." };
      const piece = pieces[position];
      const encoded = this.tokenizer.encode(piece.text, CYCLE5_MAX_LEN);
      const scoredTokens = encoded.inputIds.length - 2;
      if (scoredTokens < CYCLE5_MIN_SCORED_TOKENS) continue;
      if (encoded.truncated || piece.tokens > CYCLE5_MAX_LEN) throw new Cycle5BrowserError("integrity_error", "segments-v3 failed to fit a complete section in the model window.");
      const inputIds = new BigInt64Array(encoded.inputIds.map((id) => BigInt(id)));
      const output = await this.session.run({
        input_ids: inputIds,
        attention_mask: new BigInt64Array(inputIds.length).fill(1n),
        feats: Float32Array.from(featuresV1(piece.text))
      }, [1, inputIds.length]);
      const rawMargin = output.logits[1] - output.logits[0];
      const rawScore = probabilityFromMargin(rawMargin);
      sections.push({
        index: piece.index,
        startUtf16: piece.start,
        endUtf16: piece.end,
        wordCount: piece.words,
        tokenCount: scoredTokens,
        rawScore,
        rawMargin,
        bandId: bandFor(rawScore),
        passage: piece.text
      });
      done += 1;
      options.onSection?.(done, pieces.length);
    }
    if (!sections.length) return { status: "not_scored", code: "too_short", reason: `At least ${CYCLE5_MIN_SCORED_TOKENS} scored tokens are required for an AI-pattern reading.` };
    sections.sort((a, b) => a.index - b.index);
    sections.forEach((section, index) => {
      section.index = index;
    });
    const strongest = sections.reduce((best, section) => section.rawScore > best.rawScore ? section : best, sections[0]);
    const margins = sections.map((section) => section.rawMargin).sort((a, b) => b - a);
    const primary = margins[0] >= CYCLE5_PRIMARY_MARGIN;
    const secondary = margins.length > 1 && margins[1] + CYCLE5_SECONDARY_GAP >= CYCLE5_PRIMARY_MARGIN;
    return {
      status: "scored",
      provider: "onnxruntime-web-wasm",
      modelVersion: "tier3-cycle5-v1",
      rawScore: strongest.rawScore,
      rawMargin: strongest.rawMargin,
      flagged: primary || secondary,
      flagReason: primary ? "primary" : secondary ? "secondary" : null,
      sections
    };
  }
  async clearCache() {
    return clearCycle5Cache(this.cacheStorage);
  }
  async dispose() {
    await this.session?.release?.();
    this.session = void 0;
    this.tokenizer = void 0;
    this.setState("not_ready", "The on-device session was released. Cached verified assets were not deleted.");
  }
};
function createCycle5BrowserRuntime(config) {
  return new Cycle5BrowserRuntime(config);
}

// packages/core/dist/bundle.js
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var rotr = (x, n) => x >>> n | x << 32 - n;
function utf8Bytes(value) {
  return new TextEncoder().encode(value);
}
function sha256Hex(value) {
  const source = utf8Bytes(value);
  const bitLength = source.length * 8;
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 128;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296), false);
  const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const a2 = w[i - 15], b2 = w[i - 2];
      w[i] = (rotr(a2, 7) ^ rotr(a2, 18) ^ a2 >>> 3) + w[i - 16] + (rotr(b2, 17) ^ rotr(b2, 19) ^ b2 >>> 10) + w[i - 7] >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = hh + s1 + ch + K[i] + w[i] >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = s0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  return Array.from(h, (n) => n.toString(16).padStart(8, "0")).join("");
}
var prefixedSha256 = (value) => `sha256:${sha256Hex(value)}`;
var MSG_INVISIBLE = (what) => `An invisible ${what} is present.`;
var MSG_BIDI = "A bidirectional formatting control is present.";
var BIDI_LIMIT = "Bidirectional controls are required for correct display of mixed right-to-left and left-to-right text.";
var CARRIER_RULES = [
  // Soft hyphen and combining grapheme joiner
  { from: 173, name: "SOFT HYPHEN", severity: "low", fix: "remove", message: "A discretionary soft hyphen is present." },
  { from: 847, name: "COMBINING GRAPHEME JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("combining grapheme joiner"), limitation: "The combining grapheme joiner has rare legitimate uses in collation and diacritic ordering." },
  // Script-specific format characters
  { from: 1564, name: "ARABIC LETTER MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 1807, name: "SYRIAC ABBREVIATION MARK", severity: "medium", fix: "review", message: "A Syriac abbreviation mark format character is present.", limitation: "This character is legitimate inside Syriac-script text." },
  { from: 2192, to: 2193, name: (cp) => cp === 2192 ? "ARABIC POUND MARK ABOVE" : "ARABIC PIASTRE MARK ABOVE", severity: "medium", fix: "review", message: "An Arabic prepended format mark is present.", limitation: "This character is legitimate inside Arabic-script text." },
  { from: 2274, name: "ARABIC DISPUTED END OF AYAH", severity: "medium", fix: "review", message: "An Arabic prepended format mark is present.", limitation: "This character is legitimate inside Arabic-script text." },
  { from: 6155, to: 6157, name: (cp) => `MONGOLIAN FREE VARIATION SELECTOR-${cp - 6154}`, severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian free variation selector"), context: "variation", limitation: "Free variation selectors are legitimate inside Mongolian-script text." },
  { from: 6158, name: "MONGOLIAN VOWEL SEPARATOR", severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian vowel separator"), limitation: "This character is legitimate inside Mongolian-script text." },
  { from: 6159, name: "MONGOLIAN FREE VARIATION SELECTOR-4", severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian free variation selector"), context: "variation", limitation: "Free variation selectors are legitimate inside Mongolian-script text." },
  // Zero-width and joining controls
  { from: 8203, name: "ZERO WIDTH SPACE", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width space") },
  { from: 8204, name: "ZERO WIDTH NON-JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width non-joiner"), context: "joiner", limitation: "The zero-width non-joiner is standard orthography in Persian and several Indic languages." },
  { from: 8205, name: "ZERO WIDTH JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width joiner"), context: "joiner", limitation: "The zero-width joiner is standard in emoji sequences and several complex scripts." },
  // Bidirectional controls
  { from: 8206, name: "LEFT-TO-RIGHT MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8207, name: "RIGHT-TO-LEFT MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8234, to: 8238, name: (cp) => ["LEFT-TO-RIGHT EMBEDDING", "RIGHT-TO-LEFT EMBEDDING", "POP DIRECTIONAL FORMATTING", "LEFT-TO-RIGHT OVERRIDE", "RIGHT-TO-LEFT OVERRIDE"][cp - 8234], severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8294, to: 8297, name: (cp) => ["LEFT-TO-RIGHT ISOLATE", "RIGHT-TO-LEFT ISOLATE", "FIRST STRONG ISOLATE", "POP DIRECTIONAL ISOLATE"][cp - 8294], severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  // Word joiner, invisible operators and deprecated format characters
  { from: 8288, name: "WORD JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("word joiner") },
  { from: 8289, to: 8292, name: (cp) => ["FUNCTION APPLICATION", "INVISIBLE TIMES", "INVISIBLE SEPARATOR", "INVISIBLE PLUS"][cp - 8289], severity: "medium", fix: "remove", message: MSG_INVISIBLE("mathematical operator character"), limitation: "Invisible operators are legitimate inside machine-generated mathematical notation." },
  { from: 8298, to: 8303, name: (cp) => ["INHIBIT SYMMETRIC SWAPPING", "ACTIVATE SYMMETRIC SWAPPING", "INHIBIT ARABIC FORM SHAPING", "ACTIVATE ARABIC FORM SHAPING", "NATIONAL DIGIT SHAPES", "NOMINAL DIGIT SHAPES"][cp - 8298], severity: "medium", fix: "remove", message: "A deprecated invisible format character is present.", limitation: "These characters are deprecated by Unicode and have no place in modern interchange text." },
  // BOM, interlinear annotation, replacement
  { from: 65279, name: "BYTE ORDER MARK", severity: "low", fix: "remove", message: "A byte-order mark is present." },
  { from: 65529, to: 65531, name: (cp) => ["INTERLINEAR ANNOTATION ANCHOR", "INTERLINEAR ANNOTATION SEPARATOR", "INTERLINEAR ANNOTATION TERMINATOR"][cp - 65529], severity: "medium", fix: "review", message: "An interlinear annotation control is present.", limitation: "Interlinear annotation controls are legitimate in Japanese ruby markup pipelines." },
  { from: 65533, name: "REPLACEMENT CHARACTER", severity: "high", fix: "review", message: "A replacement character may indicate damaged text." },
  // Supplementary-plane format characters
  { from: 69821, name: "KAITHI NUMBER SIGN", severity: "medium", fix: "review", message: "A Kaithi number-sign format character is present.", limitation: "This character is legitimate inside Kaithi-script text." },
  { from: 69837, name: "KAITHI NUMBER SIGN ABOVE", severity: "medium", fix: "review", message: "A Kaithi number-sign format character is present.", limitation: "This character is legitimate inside Kaithi-script text." },
  // Tag characters: the classic covert payload carrier
  { from: 917505, name: "LANGUAGE TAG", severity: "high", fix: "remove", message: "A deprecated invisible language tag is present." },
  { from: 917536, to: 917631, name: (cp) => cp === 917631 ? "CANCEL TAG" : `TAG ${String.fromCodePoint(cp - 917504) === " " ? "SPACE" : `CHARACTER '${String.fromCodePoint(cp - 917504)}'`}`, severity: "high", fix: "remove", message: "An invisible tag character is present; tag runs are a known covert payload carrier.", limitation: "Tag characters have no legitimate use in ordinary interchange text outside emoji flag sequences." },
  // Variation selectors
  { from: 65024, to: 65039, name: (cp) => `VARIATION SELECTOR-${cp - 65024 + 1}`, severity: "medium", fix: "remove", message: MSG_INVISIBLE("variation selector"), context: "variation", limitation: "Variation selectors are legitimate after emoji-capable and CJK base characters." },
  { from: 917760, to: 917999, name: (cp) => `VARIATION SELECTOR-${cp - 917760 + 17}`, severity: "medium", fix: "review", message: MSG_INVISIBLE("supplementary variation selector"), context: "variation_sup", limitation: "Supplementary variation selectors are legitimate after CJK ideographs to select registered glyph variants." },
  // Space separators beyond U+0020
  { from: 160, name: "NO-BREAK SPACE", severity: "note", fix: "space", message: "A non-breaking space is present.", limitation: "Non-breaking spaces are standard French and general typographic practice." },
  { from: 5760, name: "OGHAM SPACE MARK", severity: "low", fix: "space", message: "An unusual space character is present.", limitation: "This character is legitimate inside Ogham-script text." },
  { from: 8192, to: 8200, name: (cp) => ["EN QUAD", "EM QUAD", "EN SPACE", "EM SPACE", "THREE-PER-EM SPACE", "FOUR-PER-EM SPACE", "SIX-PER-EM SPACE", "FIGURE SPACE", "PUNCTUATION SPACE"][cp - 8192], severity: "low", fix: "space", message: "A typographic space that substitutes for an ordinary space is present.", limitation: "Fixed-width spaces are legitimate in carefully typeset material." },
  { from: 8201, name: "THIN SPACE", severity: "note", fix: "space", message: "A thin space is present.", limitation: "Thin spaces are standard French and general typographic practice." },
  { from: 8202, name: "HAIR SPACE", severity: "low", fix: "space", message: "A hair space that substitutes for an ordinary space is present.", limitation: "Hair spaces are legitimate in carefully typeset material." },
  { from: 8239, name: "NARROW NO-BREAK SPACE", severity: "note", fix: "space", message: "A narrow no-break space is present.", limitation: "Narrow no-break spaces are standard French punctuation spacing and appear in Mongolian text." },
  { from: 8287, name: "MEDIUM MATHEMATICAL SPACE", severity: "note", fix: "space", message: "A medium mathematical space is present.", limitation: "This space is legitimate inside typeset mathematical notation." },
  { from: 12288, name: "IDEOGRAPHIC SPACE", severity: "note", fix: "space", message: "An ideographic space is present.", limitation: "Ideographic spaces are standard in Chinese and Japanese text." },
  // Line and paragraph separators
  { from: 8232, name: "LINE SEPARATOR", severity: "low", fix: "review", message: "A Unicode line separator is present instead of a conventional line break." },
  { from: 8233, name: "PARAGRAPH SEPARATOR", severity: "low", fix: "review", message: "A Unicode paragraph separator is present instead of a conventional line break." }
];
var TABLE = /* @__PURE__ */ new Map();
for (const rule of CARRIER_RULES) {
  for (let cp = rule.from; cp <= (rule.to ?? rule.from); cp++) {
    TABLE.set(cp, { name: typeof rule.name === "function" ? rule.name(cp) : rule.name, severity: rule.severity, fix: rule.fix, message: rule.message, context: rule.context, limitation: rule.limitation });
  }
}
var NAME_STOPLIST = new Set("The A An This That These Those It He She They We You I In On At For To From With By Of And But Or Nor If As Is Are Was Were Be Been Not No Yes See Run New Our Your Their His Her Its My Do Does Did Will Would Can Could Should May Might Must Have Has Had So Then There Here What Which Who Whose When Where Why How All Any Each Per Both More Most Some Such Other Also Just Only Now Today Yesterday Tomorrow Please Note".split(" "));
var TIER1 = {
  "delve": "explore, dig into, look at",
  "tapestry": "describe the actual complexity",
  "paradigm": "model, approach, framework",
  "beacon": "rewrite entirely",
  "robust": "strong, reliable, solid",
  "comprehensive": "thorough, complete, full",
  "cutting-edge": "latest, newest, advanced",
  "pivotal": "important, key, critical",
  "meticulous": "careful, detailed, precise",
  "meticulously": "carefully, precisely",
  "seamless": "smooth, easy, without friction",
  "seamlessly": "smoothly, easily",
  "game-changer": "describe what changed",
  "game-changing": "describe what changed",
  "nestled": "is located, sits",
  "vibrant": "describe what makes it active",
  "thriving": "growing, active",
  "bustling": "busy, active",
  "intricate": "complex, detailed",
  "intricacies": "complexities, details",
  "ever-evolving": "changing, growing",
  "enduring": "lasting, long-running",
  "daunting": "hard, difficult",
  "holistic": "complete, full, whole",
  "holistically": "completely, fully",
  "actionable": "practical, useful, concrete",
  "impactful": "effective, significant",
  "learnings": "lessons, findings, takeaways",
  "synergy": "describe the combined effect",
  "synergies": "describe the combined effect",
  "interplay": "relationship, connection",
  "symphony": "describe the coordination",
  "embrace": "adopt, accept, use",
  // 2026.08.3 owner-docs tier A additions (OWNER-DOCS-TELLS.md §8).
  "enigma": "mystery, puzzle",
  "labyrinth": "maze, tangle",
  "top-notch": "excellent, first-rate"
};
var TIER2 = {
  "harness": "use, take advantage of",
  "navigate": "work through, handle",
  "navigating": "working through, handling",
  "foster": "encourage, support, build",
  "elevate": "improve, raise, strengthen",
  "unleash": "release, enable, unlock",
  "streamline": "simplify, speed up",
  "empower": "enable, let, allow",
  "bolster": "support, strengthen",
  "spearhead": "lead, drive, run",
  "resonate": "connect with, appeal to",
  "resonates": "connects with, appeals to",
  "revolutionize": "change, transform",
  "facilitate": "enable, help, allow",
  "facilitates": "enables, helps, allows",
  "underpin": "support, form the basis of",
  "nuanced": "specific, subtle, detailed",
  "crucial": "important, key, necessary",
  "multifaceted": "describe the actual facets",
  "ecosystem": "system, community, network",
  "myriad": "many, numerous",
  "plethora": "many, a lot of",
  "encompass": "include, cover, span",
  "catalyze": "start, trigger, accelerate",
  "reimagine": "rethink, redesign, rebuild",
  "galvanize": "motivate, rally, push",
  "augment": "add to, expand, supplement",
  "cultivate": "build, develop, grow",
  "illuminate": "clarify, explain, show",
  "elucidate": "explain, clarify",
  "juxtapose": "compare, contrast",
  "transformative": "describe what changed",
  "transformation": "describe what changed",
  "cornerstone": "foundation, basis, key part",
  "paramount": "most important, top priority",
  "poised": "ready, set, about to",
  "burgeoning": "growing, emerging",
  "nascent": "new, early-stage",
  "quintessential": "typical, classic, defining",
  "overarching": "main, central, broad",
  "quietly": "cut, or name the concrete contrast",
  "underpinning": "basis, foundation",
  "underpinnings": "basis, foundations",
  "paradigm-shifting": "describe what shifted",
  // 2026.08.3 owner-docs additions (medium FP → cluster-scored tier 2).
  "revolutionary": "describe what changed",
  "ai-powered": "say what the AI part actually does"
};
var TIER3 = [
  "significant",
  "significantly",
  "innovative",
  "innovation",
  "effective",
  "effectively",
  "dynamic",
  "dynamics",
  "scalable",
  "scalability",
  "compelling",
  "unprecedented",
  "exceptional",
  "exceptionally",
  "remarkable",
  "remarkably",
  "sophisticated",
  "instrumental",
  "world-class",
  "state-of-the-art",
  "best-in-class",
  "verbatim"
];
var ISSUE_WEIGHTS = {
  "tier1": 5,
  "tier1-clarity": 3,
  "tier2": 3,
  "tier3": 2,
  "transition": 2,
  "chatbot": 8,
  "sycophantic": 8,
  "filler": 2,
  "generic-conclusion": 3,
  "lets-construction": 2,
  "reasoning-artifact": 6,
  "acknowledgment-loop": 3,
  "significance-inflation": 4,
  "vague-attribution": 5,
  "hollow-intensifier": 2,
  "emotional-flatline": 2,
  "lingering-attention": 3,
  "novelty-inflation": 3,
  "cutoff-disclaimer": 10,
  "template-phrase": 3,
  "false-concession": 2,
  "rhetorical-question": 2,
  "confidence-calibration": 2,
  "em-dash-density": 4,
  "not-just-contrast": 6,
  "uniform-sections": 5,
  "uniform-list-items": 4,
  "sentence-flatline": 5,
  "uniformity": 5,
  "formatting": 3,
  "tier3-phrase": 3,
  "tier3-phrase-cluster": 12,
  "hashtag-stuff": 12,
  "bullet-np-list": 10,
  "hedge-stack": 6,
  "future-narrative": 12,
  "real-actual-inflation": 5,
  "social-cta-closer": 8,
  "formulaic-opener": 8,
  "speculative-opener": 8,
  "title-case-header": 4,
  "parenthetical-hedge": 3,
  "smart-punct-signature": 6,
  "punct-distribution": 6,
  "fnword-trigram-entropy": 5,
  "cross-para-burstiness": 5,
  "normalization-flag": 9,
  "low-ttr": 3,
  "ai-placeholder": 10,
  "ai-citation-markup": 15,
  "ai-utm-source": 12
};
var CATEGORY_META = {
  "tier1": { severity: "high", message: 'A word that turns up a lot in generic machine-written copy, like "delve", "robust" or "seamless".', suggestion: "Swap it for a plainer word." },
  "tier1-clarity": { severity: "medium", message: 'This is a long way of saying something short, like "in order to" for "to", or "due to the fact that" for "because".', suggestion: "Use the shorter form." },
  "tier2": { severity: "medium", message: 'Several buzzwords sit in one paragraph, words like "foster", "facilitate" and "ecosystem". One is fine. A pile of them reads as filler.', suggestion: "Keep one at most, and say the plain thing instead." },
  "tier3": { severity: "low", message: 'A vague filler word such as "significant", "effective" or "dynamic" is used a lot for a piece this long.', suggestion: "Cut some of them, or say what you actually mean." },
  "transition": { severity: "medium", message: 'A joining phrase that could link any two sentences, like "Moreover", "Furthermore" or "In conclusion".', suggestion: "Cut it, or say how the two sentences really connect." },
  "chatbot": { severity: "high", message: 'A line from a chat window is still in the text, like "I hope this helps" or "Certainly!".', suggestion: "Delete it." },
  "sycophantic": { severity: "high", message: `A compliment aimed at the reader's question, the way a chatbot opens a reply: "Great question!".`, suggestion: "Delete it and go straight to the point." },
  "filler": { severity: "medium", message: "A phrase that adds words but no meaning.", suggestion: "Cut it. The sentence almost always still works." },
  "generic-conclusion": { severity: "medium", message: 'A closing line that could end any article, like "only time will tell" or "the future looks bright".', suggestion: "End on something specific instead." },
  "lets-construction": { severity: "medium", message: `A "let's take a look at\u2026" line, the way a tutorial talks to you.`, suggestion: "Just say the thing. Do not announce it first." },
  "reasoning-artifact": { severity: "high", message: 'Step-by-step working is still showing, like "First, let me\u2026" or "Step 1:".', suggestion: "Delete the working and keep the answer." },
  "acknowledgment-loop": { severity: "medium", message: 'The text repeats the question back before answering it: "You asked about X. X is\u2026".', suggestion: "Answer straight away." },
  "significance-inflation": { severity: "high", message: 'A stock line telling the reader how big something was, instead of saying what happened: "marking a pivotal moment".', suggestion: "Say what happened and let the reader judge." },
  "vague-attribution": { severity: "high", message: 'A claim is credited to nobody in particular: "experts say", "studies show".', suggestion: "Name the study or the person, or drop the claim." },
  "hollow-intensifier": { severity: "medium", message: 'An emphasis word that adds no information, like "truly", "incredibly" or "absolutely".', suggestion: "Cut it." },
  "emotional-flatline": { severity: "low", message: 'A ready-made feeling word stands in for a real reaction, like "fascinating" or "surprising".', suggestion: "Say what was actually surprising, or cut it." },
  "lingering-attention": { severity: "medium", message: 'A share-post line about how long an idea stayed with you, which tells the reader nothing about the idea: "this stuck with me for days".', suggestion: "Say why it matters instead." },
  "novelty-inflation": { severity: "medium", message: 'The text announces that it is about to say something rare: "few people realise".', suggestion: "Show the point. Do not advertise it." },
  "cutoff-disclaimer": { severity: "high", message: 'A line where a chatbot describes itself or its training cut-off, like "as of my last update" or "as an AI language model".', suggestion: "Delete it, and check the facts around it yourself." },
  "template-phrase": { severity: "high", message: "A ready-made phrase that turns up in a lot of generated copy.", suggestion: "Replace it with something specific to your subject." },
  "false-concession": { severity: "medium", message: `A formula that pretends to give ground before making the point: "while it's true that\u2026".`, suggestion: "Name the real trade-off, or drop it." },
  "rhetorical-question": { severity: "medium", message: 'A question the writer asks and then answers: "So what does this mean?".', suggestion: "Give the answer without asking first." },
  "confidence-calibration": { severity: "low", message: 'Words like "clearly", "certainly" and "undoubtedly" pile up across the text.', suggestion: "Keep the one or two you have earned and cut the rest." },
  "em-dash-density": { severity: "medium", message: "Em dashes (\u2014), or spaced hyphens used as dashes, turn up a lot for a piece this long. Worth knowing: since OpenAI cut back on em dashes in late 2025, heavy dash use is more common in Claude's writing than in machine writing generally, and plenty of professional human writers use more dashes than this.", suggestion: "Swap some for commas, colons or full stops." },
  "not-just-contrast": { severity: "high", message: `The "it isn't just X, it's Y" shape.`, suggestion: "Say what it is, without the set-up." },
  "uniform-sections": { severity: "medium", message: "Every section is close to the same length. Real writing runs long in places and short in others.", suggestion: "Let each section be as long as its content needs." },
  "uniform-list-items": { severity: "medium", message: "The list items are all close to the same length. Real lists are lumpy.", suggestion: "Let some items run shorter or longer, or merge ones that repeat." },
  "sentence-flatline": { severity: "medium", message: "Sentence lengths barely change across the whole piece. Real writing swings between short and long.", suggestion: "Mix a few short, punchy sentences in with the longer ones." },
  "uniformity": { severity: "medium", message: "The paragraphs are all close to the same size.", suggestion: "Make some paragraphs shorter or longer on purpose." },
  "formatting": { severity: "medium", message: "A lot of bold is used.", suggestion: "Take the bold off most phrases, and put the important thing first." },
  "tier3-phrase": { severity: "medium", message: "The same stock phrase keeps coming back through the text.", suggestion: "Replace at least one of them with something concrete." },
  "tier3-phrase-cluster": { severity: "high", message: "Several different stock phrases are stacked up in one piece.", suggestion: "Rewrite it around one real point." },
  "hashtag-stuff": { severity: "medium", message: "A long block of hashtags.", suggestion: "Cut to two or three that fit, or none." },
  "bullet-np-list": { severity: "high", message: "A long bullet list where every item is a bare noun phrase with no verb.", suggestion: "Turn it into a paragraph, or join the items up." },
  "hedge-stack": { severity: "high", message: 'Two hedges on the same claim, like "may potentially" or "could possibly".', suggestion: "Pick one hedge, or make a claim someone could check." },
  "future-narrative": { severity: "high", message: 'A vague line about the future that nobody could ever check: "is set to reshape the industry".', suggestion: "Say something concrete a reader could test." },
  "real-actual-inflation": { severity: "medium", message: '"Real" or "actual" is doing no work here, as in "real value" or "actual impact".', suggestion: "Cut the word, or say what makes it real." },
  "social-cta-closer": { severity: "high", message: 'A closing line begging for engagement: "What do you think? Let me know below."', suggestion: "Give the reader a reason to care instead of an instruction." },
  "formulaic-opener": { severity: "high", message: `A stock opening line that would fit any article: "In today's fast-paced world\u2026".`, suggestion: "Open on a fact or a specific detail." },
  "speculative-opener": { severity: "high", message: 'The piece opens by asking you to picture a scene: "Imagine a world where\u2026".', suggestion: "Make the point directly." },
  "title-case-header": { severity: "medium", message: "The heading puts a capital on nearly every word, the way a lot of marketing copy does.", suggestion: "Capitalise the first word only, as you would in a sentence." },
  "parenthetical-hedge": { severity: "medium", message: 'An aside in brackets that sounds thoughtful and adds nothing: "(at least in most cases)".', suggestion: "Cut it, or make it a proper sentence." },
  "smart-punct-signature": { severity: "high", message: "Curly quotes, an em dash, an Oxford comma and no typos, all in one piece. That combination is rare in text somebody typed straight out by hand.", suggestion: "Nothing to fix. This is just something we noticed." },
  "punct-distribution": { severity: "medium", message: "Every paragraph uses about the same amount of punctuation.", suggestion: "Let some paragraphs run busier than others." },
  "fnword-trigram-entropy": { severity: "medium", message: "Sentences are built to the same grammar pattern again and again.", suggestion: "Change the way you build some of the sentences." },
  "cross-para-burstiness": { severity: "medium", message: "Every paragraph has the same inner rhythm of long and short sentences.", suggestion: "Let some paragraphs be clipped and others rambling." },
  "normalization-flag": { severity: "high", message: "The text held invisible characters or lookalike letters, the kind used to hide copied text from checkers. We swapped them back before reading it.", suggestion: "Take the hidden characters out and check the text again." },
  "low-ttr": { severity: "low", message: "The same words come round a lot for a piece this long.", suggestion: "Vary the nouns and verbs, unless the subject really does need the repeating." },
  "ai-placeholder": { severity: "high", message: 'A blank somebody forgot to fill in is still here, like "[INSERT NAME]".', suggestion: "Fill it in or delete it before this goes out." },
  "ai-citation-markup": { severity: "high", message: "Chatbot citation code was pasted in along with the text.", suggestion: "Delete it and put a real reference in its place." },
  "ai-utm-source": { severity: "high", message: 'A link carries a tracking tag that AI tools add to the links they hand out, like "utm_source=chatgpt.com".', suggestion: "Strip the tracking part off the link." }
};
var V3_ISSUE_WEIGHTS = {
  // artefact forensics
  "ai-citation-token": 15,
  "reasoning-leak": 12,
  "placeholder-token": 10,
  "pua-character": 14,
  "math-alphanumeric": 12,
  "arrow-decoration": 4,
  "escaped-markup-literal": 3,
  // tier A phrase/structural
  "neg-parallelism": 5,
  "tripled-negation": 5,
  "despite-challenges-arc": 5,
  "metaphor-cluster": 4,
  "participial-tail": 5,
  "focal-density": 5,
  "owner-phrase": 5,
  "power-verb-compound": 6,
  "outcome-tail": 4,
  "conclusion-cta": 6,
  // tier B (low weights; corroboration)
  "liang-cluster": 2,
  "kobak-density": 2,
  "promo-travel": 2,
  "pivotal-role": 2,
  "legacy-framing": 3,
  "notability-canned": 2,
  "buzzword-phrase": 2,
  "faux-insight": 2,
  "rhetorical-qa": 2,
  "didactic-note": 2,
  "narrative-cliche": 3,
  "valuable-insights": 2,
  "copula-avoidance": 3,
  "bold-label-bullets": 3,
  "emoji-decoration": 2,
  "heading-inflation": 3,
  "staccato-fragments": 3,
  "tricolon-density": 2,
  "transition-stacking": 3,
  "quote-inconsistency": 2,
  "token-cutoff": 2,
  "setup-expansion-cadence": 3,
  "passive-ratio": 3,
  "low-specificity": 2,
  "adjacent-lemma-repeat": 3,
  "fiction-claudeism": 3,
  "fiction-promptonym": 3,
  "fiction-slop-phrase": 2,
  "owner-phrase-b": 2,
  "owner-vocab-b": 2,
  "directive-colon-bullets": 3,
  "teach-preach-headings": 2,
  "by-ving-template": 3,
  "invalid-isbn": 3,
  "proximity-cluster": 2,
  // 2026.08.6 furniture rules (low weights; the escalation floors carry the
  // detection, and the weights stay small so furniture cannot fake breadth).
  "markdown-bold": 3,
  "markdown-heading": 3,
  "markdown-furniture": 4
};
var PASTE = "This only shows up when chat formatting survives the paste. If an editor stripped the formatting, the check finds nothing, which says nothing either way.";
var FORMAL = "Formal writing, and writing by people whose first language is not English, can read this way too.";
var V3_CATEGORY_META = {
  "ai-citation-token": { severity: "high", message: "A chatbot's own citation code is sitting in the text. The code itself says which chatbot it came from.", suggestion: "Delete the code and put a real reference in its place." },
  "reasoning-leak": { severity: "high", message: 'Parts of this text talk about the writing job itself, the kind of notes an AI leaves in its answer, like "as requested" or "let me revise".', suggestion: "Delete those notes and keep the finished writing." },
  "placeholder-token": { severity: "high", message: 'A machine placeholder is still in the text, something like "{{name}}" or "<insert>".', suggestion: "Fill it in or delete it before this goes out." },
  "pua-character": { severity: "high", message: "The text holds characters from a private corner of Unicode that has no agreed meaning. ChatGPT wraps its citation codes in these. Icon fonts are the only other common reason for them.", suggestion: "Delete them, and look for chatbot citation codes next to them." },
  "math-alphanumeric": { severity: "high", message: "Fake bold or italic letters built from maths symbols (\u{1D5F9}\u{1D5F6}\u{1D5F8}\u{1D5F2} \u{1D601}\u{1D5F5}\u{1D5F6}\u{1D600}). They come from chatbot copy-paste and social-media text formatters.", suggestion: "Retype them as ordinary letters and use real bold or italic." },
  "arrow-decoration": { severity: "medium", message: 'Arrows stand in for words again and again: "input \u2192 output \u2192 result".', suggestion: "Write the connection out in words." },
  "escaped-markup-literal": { severity: "low", message: 'A stray scrap of code is showing through the text, like "&nbsp;" or "\\n". It usually comes from pasting out of a chat window.', suggestion: "Delete it." },
  "neg-parallelism": { severity: "medium", message: 'The "not only X but Y" shape comes back more than once.', suggestion: "Keep one. Say the rest plainly." },
  "tripled-negation": { severity: "medium", message: 'The "Not X. Not Y. Just Z." shape.', suggestion: "Say what it is, without the three-part build-up." },
  "despite-challenges-arc": { severity: "medium", message: 'The stock "despite challenges, it continues to thrive" story shape.', suggestion: "Name the real problem and what was really done about it." },
  "metaphor-cluster": { severity: "medium", message: 'Several worn-out picture words are stacked together: "tapestry", "interplay", "evolving landscape", "testament to".', suggestion: "Say the plain facts they are standing in for." },
  "participial-tail": { severity: "medium", message: 'Sentences keep ending with a tacked-on "-ing" clause that tells you why it mattered: ", highlighting the need for\u2026", ", underscoring the importance of\u2026". That ending turns up several times more often in machine writing than in human writing.', suggestion: "Stop the sentence at the fact. Cut the tail, or turn it into a claim you can source." },
  "focal-density": { severity: "medium", message: 'A lot of words from the AI-favourite list turn up here: "delve", "showcase", "pivotal", "meticulous". Any one of them is normal English. It is how many there are that stands out.', suggestion: "Swap most of them for plainer verbs and adjectives." },
  "owner-phrase": { severity: "medium", message: "A ready-made phrase from the generic-writing phrasebook.", suggestion: "Replace it with something specific to your subject." },
  "power-verb-compound": { severity: "high", message: 'A big verb glued to a vague adjective: "leverage a robust solution", "ensure seamless delivery". It sounds like value and says nothing.', suggestion: "Name the real action and the thing you can measure." },
  "outcome-tail": { severity: "medium", message: 'The sentence trails off into a vague result: ", leading to increased engagement".', suggestion: "Say the exact result, or cut the tail." },
  "conclusion-cta": { severity: "high", message: 'The stock marketing sign-off: "by following these steps you can boost\u2026".', suggestion: "Close on something specific, not a general promise." },
  "liang-cluster": { severity: "low", message: 'Several judgement words from the AI-overuse lists sit close together, like "crucial", "notable" and "significant".', suggestion: "Keep the judgements you can back up with detail." },
  "kobak-density": { severity: "low", message: "Several words sit here that turned up far more often in machine writing when a large body of text was counted.", suggestion: "Vary the words, or back the claims with detail." },
  "promo-travel": { severity: "low", message: 'Brochure words are bunched together: "nestled", "breathtaking", "hidden gem". They stand out most when the piece is not a travel brochure.', suggestion: "Describe the place or the product with real detail." },
  "pivotal-role": { severity: "low", message: 'The "plays a crucial role in shaping" formula.', suggestion: "Say what it actually does." },
  "legacy-framing": { severity: "low", message: 'Several grand phrases about legacy and importance are stacked up: "enduring legacy", "pivotal moment".', suggestion: "Let the events speak for themselves." },
  "notability-canned": { severity: "low", message: 'A canned line about how well known something is: "profiled in multiple outlets".', suggestion: "Name the outlets, or drop the claim." },
  "buzzword-phrase": { severity: "low", message: 'A stock office phrase: "harness the power of", "at the forefront of".', suggestion: "Say what it can actually do." },
  "faux-insight": { severity: "low", message: `A line promising a secret: "here's what nobody tells you".`, suggestion: "Show the point. Do not announce it." },
  "rhetorical-qa": { severity: "low", message: 'The "The result? X." trick keeps coming back.', suggestion: "Use it once at most." },
  "didactic-note": { severity: "low", message: `A teacherly disclaimer: "it's important to understand", "results may vary".`, suggestion: "Cut it, or make it specific." },
  "narrative-cliche": { severity: "low", message: 'A worn-out story phrase: "faced numerous challenges", "a poignant reminder".', suggestion: "Say what actually happened." },
  "valuable-insights": { severity: "low", message: 'A stock academic filler phrase: "provides valuable insights into".', suggestion: "State the insight itself." },
  "copula-avoidance": { severity: "low", message: 'The text keeps dodging plain "is" and "has" in favour of "serves as", "stands as" and "functions as". ' + FORMAL, suggestion: 'Use "is" and "has" where they fit.' },
  "bold-label-bullets": { severity: "low", message: 'A run of bullets all shaped "**Label:** description". Technical documents use this shape too.', suggestion: "Turn it into sentences, or vary the shape of the items." },
  "emoji-decoration": { severity: "low", message: "Emoji are used on headings or bullets. That is a chat-window habit in a piece of business writing.", suggestion: "Take the decorative emoji out of this kind of writing." },
  "heading-inflation": { severity: "low", message: "There are a lot of headings for the amount of writing under them. SEO advice produces the same shape.", suggestion: "Merge sections whose body is only a sentence or two." },
  "staccato-fragments": { severity: "low", message: "A run of very short, punchy fragments. Ad copy does this on purpose too.", suggestion: "Join some of them into full sentences." },
  "tricolon-density": { severity: "low", message: 'Three-part lists such as "faster, cheaper, simpler" turn up a lot for a piece this long.', suggestion: "Break the pattern: use two items, or four." },
  "transition-stacking": { severity: "low", message: 'Most paragraphs open on a formal joining word: "Furthermore", "Moreover", "Additionally". ' + FORMAL, suggestion: "Let the content do the joining in most paragraphs." },
  "quote-inconsistency": { severity: "low", message: "Curly and straight quotation marks are mixed together. That usually comes from pasting out of a chat window, though word processors do it too.", suggestion: "Make the quotation marks match, either way round." },
  "token-cutoff": { severity: "low", message: "The text stops in the middle of a sentence, the shape of an answer that ran out of room, or a paste that went wrong.", suggestion: "Finish the last sentence, or delete it." },
  "setup-expansion-cadence": { severity: "low", message: "Short sentence, then long one, over and over, or the other way round. " + FORMAL, suggestion: "Keep the pattern only where the short sentence works on its own." },
  "passive-ratio": { severity: "low", message: 'A lot of the sentences hide who did the thing: "mistakes were made". That is high for a blog or a marketing piece. Academic writing does it constantly. ' + FORMAL, suggestion: "Rewrite most sentences so the person or thing doing it comes first." },
  "low-specificity": { severity: "low", message: "Almost no numbers, dates or names for a piece this long. Corporate writers produce empty writing too.", suggestion: "Add facts a reader could go and check." },
  "adjacent-lemma-repeat": { severity: "low", message: "Neighbouring sentences keep reusing the same word. " + FORMAL, suggestion: "Merge the repetitive sentences, or change the wording where it reads naturally." },
  "fiction-claudeism": { severity: "low", message: "Phrases that turn up a lot in Claude's fiction writing. Romance authors use several of them quite normally.", suggestion: "Put the stock phrases into your own words." },
  "fiction-promptonym": { severity: "low", message: 'A character name that AI writing produces far more often than people do. "Elara Voss" is the best-known one.', suggestion: "Pick a less loaded name if you want one." },
  "fiction-slop-phrase": { severity: "low", message: "Several well-worn fiction lines land in the same piece. All of them were human clich\xE9s long before AI.", suggestion: "Cut or rework the stock moments." },
  "owner-phrase-b": { severity: "low", message: "A phrase from the second generic-writing phrasebook.", suggestion: "Replace it with something specific." },
  "owner-vocab-b": { severity: "low", message: 'Several second-string filler words sit close together: "essence", "facet", "pesky", "folks".', suggestion: "Swap them for plainer words where they add nothing." },
  "directive-colon-bullets": { severity: "low", message: 'Several list items open on an order and a colon: "Ensure X:", "Optimise Y:". Real technical checklists look like this too.', suggestion: "Vary the way the items are built." },
  "teach-preach-headings": { severity: "low", message: 'Stock tutorial headings hold the piece together: "Why it matters", "Final thoughts", "Key takeaways".', suggestion: "Name each section after what is actually in it." },
  "by-ving-template": { severity: "low", message: 'The "By doing X, you can Y" shape keeps coming back.', suggestion: "Say the benefit straight out most of the time." },
  "invalid-isbn": { severity: "low", message: "An ISBN in the text does not add up. Made-up references often fail this check, and so do typos.", suggestion: "Check the reference against the real book." },
  "proximity-cluster": { severity: "low", message: "The same flagged buzzword comes back within a sentence or two.", suggestion: "Keep one use at most in each passage." },
  // 2026.08.6 chat-formatting rules. Each one states the paste caveat: the
  // check can only see formatting that survived the paste, so its ABSENCE says
  // nothing about who wrote the text.
  "markdown-bold": { severity: "low", message: "Raw **bold** markdown is showing in the text. None of the 169 human-written documents we checked had it. " + PASTE, suggestion: "Delete the stars, or apply real bold." },
  "markdown-heading": { severity: "low", message: "A raw markdown heading line, the kind that starts with # signs, is showing in the text. None of the 169 human-written documents we checked had one. " + PASTE, suggestion: "Turn it into a real heading, or delete it." },
  "markdown-furniture": { severity: "low", message: "Chat-window formatting shapes this text: runs of bold, heading lines, or a wall of bullets. None of the 169 human-written documents we checked had that combination. " + PASTE, suggestion: "Rebuild the formatting properly for wherever this is going." }
};
var V4_ISSUE_WEIGHTS = {
  "sentence-length-spectral-flatness": 2,
  "conditional-compression": 2,
  "lexical-register-distance": 2,
  "punchline-fragment-density": 2,
  "mic-drop-paragraph": 2,
  "contrast-density": 2,
  "rhetorical-procedural-ratio": 2
};
var V4_CATEGORY_META = {
  "sentence-length-spectral-flatness": {
    severity: "low",
    message: "Sentence lengths follow a pattern that is more regular than most writing this long. We only measure it on fixed-size chunks, so short pieces are skipped. Careful human editing produces the same shape.",
    suggestion: "Nothing to change unless the other checks agree. Varying sentence length is a choice, not a rule."
  },
  "conditional-compression": {
    severity: "low",
    message: "Held up against a sample of varied human writing, this text has less in common with it than most. Copy written to a tight template scores the same way.",
    suggestion: "Nothing to change on its own. If the other checks agree, vary phrasing you have repeated."
  },
  "lexical-register-distance": {
    severity: "low",
    message: "The mix of small joining words, and the length of the words, sits a long way from our sample of everyday human writing. Worth knowing: that sample is general writing, so academic, legal and technical pieces land far away quite fairly.",
    suggestion: "Nothing to change on its own. Plainer wording moves it closer if the other checks agree."
  },
  "punchline-fragment-density": {
    severity: "low",
    message: `Very short, abstract closing lines keep turning up, especially at the end of paragraphs: "That's the point." Good copywriters use punchlines on purpose, which is why we only count how many there are.`,
    suggestion: "Keep the punchlines that earn their place. Turn the rest into full sentences."
  },
  "mic-drop-paragraph": {
    severity: "low",
    message: "Several paragraphs are built the same way: a few medium sentences, then a much shorter line to land on. One paragraph like that is ordinary. It is the repeat that stands out.",
    suggestion: "Let some paragraphs finish on their facts instead of a quotable line."
  },
  "contrast-density": {
    severity: "low",
    message: `Two-sided contrasts keep coming back: "not X, but Y"; "It wasn't A. It was B." One is ordinary writing. It is the rate that stands out.`,
    suggestion: "Keep the strongest contrast and say the rest plainly."
  },
  "rhetorical-procedural-ratio": {
    severity: "low",
    message: "Sentences making broad claims heavily outnumber sentences naming a real action, object or number. We count a sentence as concrete when it holds a number, a name, or a specific action verb. Opinion and vision pieces are broad on purpose.",
    suggestion: "Back more claims with a specific action, name or figure if the other checks agree."
  }
};
var MERGED_WEIGHTS = { ...ISSUE_WEIGHTS, ...V3_ISSUE_WEIGHTS, ...V4_ISSUE_WEIGHTS };
var MERGED_META = { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };
var byLengthDesc = (a, b) => b.length - a.length || a.localeCompare(b);
var TIER1_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER1).sort(byLengthDesc).join("|") + ")\\b", "gi");
var TIER2_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER2).sort(byLengthDesc).join("|") + ")\\b", "gi");
var TIER3_LOOKUP = /* @__PURE__ */ new Map();
for (const word of TIER3) {
  TIER3_LOOKUP.set(word, word);
  const dashless = word.replace(/-/g, "");
  if (dashless !== word) TIER3_LOOKUP.set(dashless, word);
}
var METHODS = Object.freeze([
  Object.freeze({ id: "unicode.invisible", category: "unicode", version: "unicode:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Controls can be legitimate in multilingual text."] }),
  Object.freeze({ id: "unicode.homoglyph", category: "unicode", version: "unicode:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Mixed scripts require contextual human review."] }),
  Object.freeze({ id: "style.patterns", category: "pattern", version: "en-gb:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Editorial pattern findings are not authorship evidence."] }),
  Object.freeze({ id: "watermark.anthropic", category: "watermark", version: "adapter-placeholder/1", state: "unsupported", privacy_routes: ["browser"], limitations: ["No official detector interface is available."] })
]);
var CYCLE5_MODEL_IDENTITY = {
  identity: "tier3-cycle5-v1",
  serverRegistryIdentity: "tier3-cycle5-full",
  segmentationContract: "segments-v3",
  inputContract: "raw-v1",
  featuresContract: "features-v1",
  scoringContract: "margin-v1",
  flagRule: {
    expression: "max(m1, m2 + 0.34) >= 3.570935",
    primaryMargin: 3.570935,
    secondaryGap: 0.34
  }
};
var CHECKER_SCORE_SCALE = "zero_to_one_pattern_similarity";
var CHECKER_HONESTY_LINE = "No AI checker can prove who wrote a text \u2014 this is a pattern reading.";
var CHECKER_LEVELS = {
  "signal-strongly-ai": {
    name: "Strongly AI",
    support: "The model found a very strong match to AI writing patterns. This does not prove authorship; review the scored sections and separate writing observations."
  },
  "signal-likely-ai": {
    name: "Likely AI",
    support: "The model found a strong match to AI writing patterns. This does not prove authorship; review the scored sections and separate writing observations."
  },
  "signal-potentially-ai": {
    name: "Potentially AI",
    support: "The model found some similarity to AI writing patterns. This does not prove authorship; review the scored sections and separate writing observations."
  },
  "signal-unclear": {
    name: "Unclear",
    support: "The model did not find a clear enough match to favour human or AI writing. The passage scores and any examples below show what was measured, without settling who wrote it."
  },
  "signal-likely-human": {
    name: "Likely human",
    support: "The model found a closer match to human writing than to AI writing. This is not proof of authorship. Any writing-pattern examples below are separate observations."
  }
};
var BAND_TO_LEVEL = {
  very_likely_ai: "signal-strongly-ai",
  uncertain: "signal-potentially-ai",
  likely_human: "signal-unclear",
  very_likely_human: "signal-likely-human"
};
var METHOD_STATUSES = /* @__PURE__ */ new Set(["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"]);
var CONTENT_KEYS = /* @__PURE__ */ new Set(["content", "text", "passage", "excerpt", "source_uri", "candidate", "route_path", "evidence"]);
function probability(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be a finite zero-to-one score.`);
  return value;
}
function levelForCycle5Score(rawScore, bandId, secondaryThreshold) {
  probability(rawScore, "rawScore");
  const level = BAND_TO_LEVEL[bandId];
  if (!level) throw new Error(`Unknown Cycle-5 band: ${String(bandId)}`);
  if (bandId === "uncertain" && secondaryThreshold !== void 0) {
    probability(secondaryThreshold, "secondaryThreshold");
    if (rawScore >= secondaryThreshold) return "signal-likely-ai";
  }
  return level;
}
function formatCheckerScoreTexts(entries, startDecimals = 2, maxDecimals = 6) {
  if (!Number.isInteger(startDecimals) || !Number.isInteger(maxDecimals) || startDecimals < 0 || maxDecimals < startDecimals) {
    throw new RangeError("Score precision bounds are invalid.");
  }
  entries.forEach((entry, index) => probability(entry.rawScore, `entries[${index}].rawScore`));
  const decimals = entries.map(() => startDecimals);
  for (let pass = startDecimals; pass < maxDecimals; pass += 1) {
    const groups = /* @__PURE__ */ new Map();
    entries.forEach((entry, index) => {
      const text = entry.rawScore.toFixed(decimals[index]);
      const group = groups.get(text);
      if (group) group.push(index);
      else groups.set(text, [index]);
    });
    let changed = false;
    for (const group of groups.values()) {
      if (new Set(group.map((index) => entries[index].level)).size > 1) {
        for (const index of group) decimals[index] = decimals[index] + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return entries.map((entry, index) => entry.rawScore.toFixed(decimals[index]));
}
var DEFAULT_AI_LIMITATIONS = [
  "The score is a zero-to-one pattern-similarity reading, not a percentage of the text written by AI.",
  "This result does not prove authorship, and edited or out-of-register writing may be missed."
];
function presentCycle5Result(input) {
  probability(input.rawScore, "rawScore");
  probability(input.primaryDisplayThreshold, "primaryDisplayThreshold");
  probability(input.secondaryDisplayThreshold, "secondaryDisplayThreshold");
  if (!input.sections.length) throw new Error("An assessed Cycle-5 result requires at least one scored section.");
  const sections = input.sections.map((section, position) => {
    if (!Number.isInteger(section.index) || section.index !== position) throw new Error("Scored sections must be zero-based and in source order.");
    if (!Number.isInteger(section.startUtf16) || !Number.isInteger(section.endUtf16) || section.startUtf16 < 0 || section.endUtf16 <= section.startUtf16) {
      throw new Error(`Section ${section.index} has an invalid UTF-16 range.`);
    }
    if (position > 0 && section.startUtf16 < input.sections[position - 1].endUtf16) throw new Error("Scored section ranges must not overlap or move backwards.");
    if (!Number.isInteger(section.wordCount) || section.wordCount < 0) throw new Error(`Section ${section.index} has an invalid word count.`);
    if (section.passage === void 0 && section.locator === void 0) throw new Error(`Section ${section.index} needs a passage or a content-free locator.`);
    return {
      index: section.index,
      start_utf16: section.startUtf16,
      end_utf16: section.endUtf16,
      word_count: section.wordCount,
      raw_score: probability(section.rawScore, `sections[${section.index}].rawScore`),
      raw_margin: finiteNumber(section.rawMargin, `sections[${section.index}].rawMargin`),
      display_score: "",
      level: levelForCycle5Score(section.rawScore, section.bandId, input.secondaryDisplayThreshold),
      band_id: section.bandId,
      ...section.passage === void 0 ? {} : { passage: section.passage },
      ...section.locator === void 0 ? {} : { locator: { ...section.locator } },
      evidence: section.evidence.map((item2) => ({ ...item2 }))
    };
  });
  const strongest = sections.reduce((best, section) => section.raw_score > best.raw_score ? section : best, sections[0]);
  if (Math.abs(strongest.raw_score - input.rawScore) > Number.EPSILON) throw new Error("The run-wide score must equal the strongest section's raw score.");
  if (Math.abs(strongest.raw_margin - input.rawMargin) > Number.EPSILON) throw new Error("The run-wide margin must equal the strongest section's raw margin.");
  const margins = sections.map((section) => section.raw_margin).sort((a, b) => b - a);
  const primaryFired = margins[0] >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
  const secondaryFired = margins.length > 1 && margins[1] + CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
  const expectedFlagged = primaryFired || secondaryFired;
  const expectedReason = primaryFired ? "primary" : secondaryFired ? "secondary" : null;
  if (input.flagged !== expectedFlagged || input.flagReason !== expectedReason) throw new Error("The supplied flag state contradicts the Cycle-5 margin rule.");
  const level = levelForCycle5Score(input.rawScore, input.bandId, input.secondaryDisplayThreshold);
  const display = formatCheckerScoreTexts([
    { rawScore: input.rawScore, level },
    ...sections.map((section) => ({ rawScore: section.raw_score, level: section.level }))
  ]);
  sections.forEach((section, index) => {
    section.display_score = display[index + 1];
  });
  const limits2 = [.../* @__PURE__ */ new Set([...input.limitations ?? [], ...DEFAULT_AI_LIMITATIONS])];
  const result = {
    ai_pattern: {
      assessment_status: "assessed",
      method_status: input.flagged ? "attention" : "pass",
      source: input.source,
      raw_score: input.rawScore,
      raw_margin: input.rawMargin,
      display_score: display[0],
      score_scale: CHECKER_SCORE_SCALE,
      level,
      primary_display_threshold: input.primaryDisplayThreshold,
      secondary_display_threshold: input.secondaryDisplayThreshold,
      flagged: input.flagged,
      flag_reason: input.flagReason,
      strongest_section_index: strongest.index,
      reason: input.reason ?? CHECKER_LEVELS[level].support,
      limitations: limits2
    },
    sections
  };
  return deepFreeze4(result);
}
function buildContentFreeSharePayload(input) {
  if (!Number.isInteger(input.wordCount) || input.wordCount < 0) throw new Error("Share word count must be a non-negative integer.");
  const date = new Date(input.generatedAt);
  if (!Number.isFinite(date.valueOf())) throw new Error("Share generation time must be a valid date-time.");
  const payload = {
    version: 1,
    result_id: input.resultId,
    level: input.presented.ai_pattern.level,
    display_score: input.presented.ai_pattern.display_score,
    sections: input.presented.sections.map((section) => ({
      index: section.index,
      raw_score: section.raw_score,
      display_score: section.display_score,
      level: section.level
    })),
    word_count: input.wordCount,
    date: date.toISOString().slice(0, 10),
    model_version: input.modelVersion,
    honesty_line: CHECKER_HONESTY_LINE,
    contains_content: false
  };
  assertContentFree(payload);
  return deepFreeze4(payload);
}
function assertContentFree(value, path = "share") {
  if (Array.isArray(value)) {
    value.forEach((item2, index) => assertContentFree(item2, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, item2] of Object.entries(value)) {
    if (CONTENT_KEYS.has(key.toLowerCase())) throw new Error(`${path}.${key} is content-bearing and cannot appear in a share payload.`);
    assertContentFree(item2, `${path}.${key}`);
  }
}
function assertCheckerResultInvariants(result) {
  if (result.schema_version !== "1.0" || !/^1\./u.test(result.contract_version)) throw new Error("Unsupported checker result contract.");
  for (const method2 of result.methods) if (!METHOD_STATUSES.has(method2.status)) throw new Error(`Unknown method status: ${String(method2.status)}`);
  if (result.exports.receipt.contains_content !== false) throw new Error("The default receipt must be content-free.");
  if (result.exports.share.contains_content !== false) throw new Error("The share export must be content-free.");
  if (result.exports.share.payload) assertContentFree(result.exports.share.payload);
  if (result.provenance.safe_fixes.preview_first !== true || result.provenance.safe_fixes.explicit_approval_required !== true || result.provenance.safe_fixes.automatic_homoglyph_replacement !== false || result.provenance.safe_fixes.c2pa_wrapper_protected !== true) {
    throw new Error("Safe-fix and C2PA wrapper invariants were weakened.");
  }
  for (const watermark of result.provenance.watermarks) {
    if (watermark.method_id === "watermark.anthropic" && (watermark.method_status !== "unsupported" || !["not_available", "not_supported"].includes(watermark.outcome))) {
      throw new Error("watermark.anthropic must remain unsupported until an official interface exists.");
    }
  }
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status === "assessed") {
    if (!result.route.model) throw new Error("Only a trained model may set the AI-pattern reading.");
    assertCycle5Identity(result.route.model);
    if (!result.sections.length) throw new Error("An assessed result needs scored sections.");
    const ordered = [...result.sections].sort((a, b) => a.index - b.index);
    ordered.forEach((section, index) => {
      if (section.index !== index || section !== result.sections[index]) throw new Error("Scored sections must remain in source order.");
      if (!section.band_id) throw new Error(`Section ${section.index} has no measured band identity.`);
      const bandId = section.band_id;
      const expectedLevel = ai.secondary_display_threshold === null && bandId === "uncertain" ? section.level : levelForCycle5Score(section.raw_score, bandId, ai.secondary_display_threshold ?? void 0);
      if (section.level !== expectedLevel || bandId === "uncertain" && ai.secondary_display_threshold === null && !["signal-potentially-ai", "signal-likely-ai"].includes(section.level)) {
        throw new Error(`Section ${section.index} level does not match its raw score and measured band.`);
      }
    });
    const strongest = result.sections.reduce((best, section) => section.raw_score > best.raw_score ? section : best, result.sections[0]);
    if (ai.strongest_section_index !== strongest.index || ai.raw_score !== strongest.raw_score || ai.raw_margin !== strongest.raw_margin) throw new Error("The run-wide result does not identify the strongest section.");
    if (ai.level !== strongest.level) throw new Error("The run-wide level does not match the strongest section.");
    if (ai.source !== result.route.model.identity) throw new Error("The AI-pattern source does not match the executed model.");
    if (result.source.section_count !== result.sections.length) throw new Error("The source section count does not match the scored section set.");
    if (ai.method_status !== (ai.flagged ? "attention" : "pass")) throw new Error("The AI method status contradicts its flag state.");
    result.sections.forEach((section, index) => {
      if (index > 0 && section.start_utf16 < result.sections[index - 1].end_utf16) throw new Error("Scored section ranges overlap or move backwards.");
      if (section.locator && (section.locator.content_hash !== result.source.content_hash || section.locator.start_utf16 !== section.start_utf16 || section.locator.end_utf16 !== section.end_utf16)) {
        throw new Error(`Section ${section.index} locator does not match its source or range.`);
      }
    });
    const margins = result.sections.map((section) => section.raw_margin).sort((a, b) => b - a);
    const primaryFired = margins[0] >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
    const secondaryFired = margins.length > 1 && margins[1] + CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
    const expectedFlagged = primaryFired || secondaryFired;
    const expectedReason = primaryFired ? "primary" : secondaryFired ? "secondary" : null;
    if (ai.flagged !== expectedFlagged || ai.flag_reason !== expectedReason) throw new Error("The AI flag state contradicts the recorded Cycle-5 margins.");
    const expected = formatCheckerScoreTexts([
      { rawScore: ai.raw_score, level: ai.level },
      ...result.sections.map((section) => ({ rawScore: section.raw_score, level: section.level }))
    ]);
    if (ai.display_score !== expected[0] || result.sections.some((section, index) => section.display_score !== expected[index + 1])) {
      throw new Error("Visible/exported scores were not produced by the run-wide formatter.");
    }
    if (result.profile === "full_checker" && (!result.exports.report.available || !result.exports.report.complete_evidence)) {
      throw new Error("An assessed full-checker result requires a complete report export.");
    }
  } else {
    if (ai.raw_score !== null || ai.raw_margin !== null || ai.display_score !== null || ai.level !== null || ai.flagged !== null || ai.strongest_section_index !== null) {
      throw new Error("An unassessed, withheld or errored AI axis cannot publish a score or level.");
    }
    if (result.sections.length) throw new Error("An unassessed result cannot publish model-scored sections.");
  }
  if (result.route.model === null && ai.assessment_status === "assessed") throw new Error("Deterministic evidence cannot set the AI-pattern reading.");
  assertRouteConsistency(result);
  if (result.abuse_controls.request_body_logging !== "excluded" && result.abuse_controls.request_body_logging !== "not_applicable") {
    throw new Error("A checker route may not claim readiness while request-body logging is unconfigured.");
  }
}
function assertRouteConsistency(result) {
  const { route, abuse_controls: controls } = result;
  if (route.kind === "browser_model") {
    if (route.content_transfer !== "none" || route.privacy_route !== "browser" || route.model?.precision !== "int8") throw new Error("Browser-model route metadata is inconsistent.");
  } else if (route.kind === "eu_server") {
    if (route.content_transfer !== "eu_server" || route.consent !== "explicit" || route.model?.precision !== "fp32") throw new Error("EU-server route metadata is inconsistent.");
    if (!["browser_pow_token", "chrome_extension_challenge_token", "wordpress_challenge_token"].includes(controls.channel_authentication)) throw new Error("EU-server results require their real channel authentication class.");
  } else if (route.kind === "wordpress_same_site") {
    if (route.content_transfer !== "same_site" || route.privacy_route !== "wordpress_local" || controls.channel_authentication !== "same_site_nonce") throw new Error("WordPress same-site route metadata is inconsistent.");
  } else if (route.kind === "loopback_engine") {
    if (route.content_transfer !== "loopback" || route.privacy_route !== "local_service" || controls.channel_authentication !== "loopback_bearer") throw new Error("Loopback route metadata is inconsistent.");
  } else if (route.kind === "deterministic_only") {
    if (route.content_transfer !== "none" || route.model !== null || result.axes.ai_pattern.assessment_status === "assessed") throw new Error("A deterministic-only route cannot publish a model result.");
  }
}
function assertCycle5Identity(model) {
  if (model.identity !== CYCLE5_MODEL_IDENTITY.identity || model.segmentation_contract !== CYCLE5_MODEL_IDENTITY.segmentationContract || model.input_contract !== CYCLE5_MODEL_IDENTITY.inputContract || model.features_contract !== CYCLE5_MODEL_IDENTITY.featuresContract || model.scoring_contract !== CYCLE5_MODEL_IDENTITY.scoringContract || model.flag_rule.expression !== CYCLE5_MODEL_IDENTITY.flagRule.expression || model.flag_rule.primary_margin !== CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin || model.flag_rule.secondary_gap !== CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap) throw new Error("The assessed result does not identify the current Cycle-5 contracts and margin rule.");
  if (model.precision === "fp32" && model.registry_identity !== CYCLE5_MODEL_IDENTITY.serverRegistryIdentity) {
    throw new Error("The fp32 server route must identify the Cycle-5 server registry entry.");
  }
}
function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
  return value;
}
function deepFreeze4(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze4(child);
  return Object.freeze(value);
}

// packages/cycle5-browser/src/checker-result.ts
var DEFAULT_SUPPORT = "https://opace.agency/tools/ai/content-verification-integrity/";
var LEGACY_NO_MODEL_LIMITATIONS = /* @__PURE__ */ new Set([
  "No trained model ran on this text, so the AI-pattern reading is not assessed.",
  "This reduced deterministic result is not full-checker parity."
]);
var withoutLegacyNoModelLimitations = (values) => values.filter((value) => !LEGACY_NO_MODEL_LIMITATIONS.has(value));
function composeCycle5BrowserCheckerResult(primitive, score, sourceText, options) {
  if (primitive.axes.ai_pattern.assessment_status !== "not_assessed" || primitive.route.model !== null) {
    throw new Error("The on-device composer requires a deterministic primitive result with an unassessed AI axis.");
  }
  if (prefixedSha256(sourceText) !== primitive.source.content_hash) {
    throw new Error("The deterministic and on-device model results do not describe the same source bytes.");
  }
  const presented = presentCycle5Result({
    source: CYCLE5_MODEL_IDENTITY.identity,
    rawScore: score.rawScore,
    rawMargin: score.rawMargin,
    bandId: score.sections.find((section) => section.rawScore === score.rawScore).bandId,
    primaryDisplayThreshold: CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
    secondaryDisplayThreshold: CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
    flagged: score.flagged,
    flagReason: score.flagReason,
    sections: score.sections.map((section) => ({
      index: section.index,
      startUtf16: section.startUtf16,
      endUtf16: section.endUtf16,
      wordCount: section.wordCount,
      rawScore: section.rawScore,
      rawMargin: section.rawMargin,
      bandId: section.bandId,
      passage: section.passage,
      evidence: [{
        id: `cycle5-section-${section.index}`,
        kind: "trained_model",
        summary: section.rawScore === score.rawScore ? "The strongest passage shaped the result." : "This passage was scored by the same trained model.",
        detail: "The score and level beside this exact section come from the Cycle-5 model; deterministic checks did not set them.",
        basis: "tier3-cycle5-v1, int8, onnxruntime-web WASM"
      }]
    }))
  });
  const generatedAt = options.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  const supportDestination = options.supportDestination ?? DEFAULT_SUPPORT;
  const share = buildContentFreeSharePayload({
    resultId: options.resultId,
    generatedAt,
    wordCount: primitive.source.word_count,
    modelVersion: CYCLE5_MODEL_IDENTITY.identity,
    presented
  });
  const detector = {
    id: "detector.cycle5",
    category: "detector",
    provider_or_method: "Opace Cycle-5 AI-pattern model",
    version: CYCLE5_MODEL_IDENTITY.identity,
    status: presented.ai_pattern.method_status,
    availability: "available",
    native_outcome: presented.ai_pattern.level,
    score: score.rawScore,
    score_scale: { id: "zero_to_one_pattern_similarity" },
    threshold: {
      scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
      primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
      secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap
    },
    segments: presented.sections.map((section) => ({ index: section.index, raw_margin: section.raw_margin })),
    evidence: [{ type: "strongest_section", index: presented.ai_pattern.strongest_section_index }],
    limitations: [...presented.ai_pattern.limitations],
    started_at: generatedAt,
    completed_at: generatedAt,
    privacy_route: "browser"
  };
  const result = {
    ...primitive,
    result_id: options.resultId,
    profile: "full_checker",
    generated_at: generatedAt,
    contains_content: true,
    source: {
      ...primitive.source,
      normalised_hash: primitive.source.normalised_hash ?? primitive.source.content_hash,
      character_count: sourceText.length,
      section_count: presented.sections.length
    },
    route: {
      kind: "browser_model",
      location: `${options.surface}, this browser`,
      content_transfer: "none",
      privacy_route: "browser",
      retention: { source: "session", result: "session", statement: "The draft and result stay in this browser view and are not sent for scoring." },
      consent: "explicit",
      model: {
        identity: CYCLE5_MODEL_IDENTITY.identity,
        registry_identity: null,
        precision: "int8",
        artefact_hash: `sha256:${CYCLE5_MODEL_SHA256}`,
        segmentation_contract: CYCLE5_MODEL_IDENTITY.segmentationContract,
        input_contract: CYCLE5_MODEL_IDENTITY.inputContract,
        features_contract: CYCLE5_MODEL_IDENTITY.featuresContract,
        scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
        flag_rule: {
          expression: CYCLE5_MODEL_IDENTITY.flagRule.expression,
          primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
          secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap
        }
      },
      transport: { endpoint_class: "verified_static_asset_download", region: null, requests: 0, words_sent: 0, processed: "in browser", retained: "not retained" }
    },
    axes: {
      ...primitive.axes,
      ai_pattern: presented.ai_pattern,
      text_integrity: { ...primitive.axes.text_integrity, limitations: withoutLegacyNoModelLimitations(primitive.axes.text_integrity.limitations) },
      editorial: { ...primitive.axes.editorial, limitations: withoutLegacyNoModelLimitations(primitive.axes.editorial.limitations) }
    },
    sections: presented.sections,
    methods: [detector, ...primitive.methods.filter((method) => method.id !== "detector.cycle5" && method.id !== "detector.local")],
    exports: {
      ...primitive.exports,
      receipt: { ...primitive.exports.receipt, available: true, contains_content: false },
      share: { available: true, contains_content: false, payload: share },
      report: {
        available: true,
        format: options.reportFormat,
        contains_content: true,
        explicit_user_action: true,
        complete_evidence: true,
        product_identity: "Opace AI Content Checker & Detector",
        support_destination: supportDestination
      }
    },
    abuse_controls: {
      max_words: null,
      max_characters: options.maxCharacters,
      max_request_bytes: null,
      explicit_capture: "enforced",
      consent_before_transfer: "enforced",
      refuse_not_truncate: "enforced",
      cancellation: "enforced",
      channel_authentication: "not_applicable",
      proof_of_work: "not_applicable",
      origin_validation: "enforced",
      per_ip_limit: "not_applicable",
      per_site_limit: "not_applicable",
      per_connection_limit: "not_applicable",
      global_inference_limit: "not_applicable",
      request_body_logging: "not_applicable",
      unexpected_network_requests: "blocked",
      fallback: "not_configured",
      kill_switch: "not_applicable"
    },
    limitations: [.../* @__PURE__ */ new Set([
      ...withoutLegacyNoModelLimitations(primitive.limitations),
      ...presented.ai_pattern.limitations,
      "The on-device model and vocabulary are fetched only after explicit consent; draft text is never transferred for this route."
    ])]
  };
  assertCheckerResultInvariants(result);
  return Object.freeze(result);
}
function composeCycle5ServerCheckerResult(primitive, score, sourceText, options) {
  const browserShape = { ...score, provider: "onnxruntime-web-wasm" };
  const composed = structuredClone(composeCycle5BrowserCheckerResult(primitive, browserShape, sourceText, {
    surface: options.surface,
    resultId: options.resultId,
    reportFormat: options.reportFormat,
    maxCharacters: options.maxCharacters,
    generatedAt: options.generatedAt,
    supportDestination: options.supportDestination
  }));
  composed.route = {
    kind: "eu_server",
    location: "Opace EU server, europe-west1",
    content_transfer: "eu_server",
    privacy_route: "hub_provider",
    retention: { source: "request_only", result: "none", statement: "The text was processed once in EU server memory and was not retained." },
    consent: "explicit",
    model: {
      identity: CYCLE5_MODEL_IDENTITY.identity,
      registry_identity: "tier3-cycle5-full",
      precision: "fp32",
      artefact_hash: "sha256:45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057",
      segmentation_contract: CYCLE5_MODEL_IDENTITY.segmentationContract,
      input_contract: CYCLE5_MODEL_IDENTITY.inputContract,
      features_contract: CYCLE5_MODEL_IDENTITY.featuresContract,
      scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
      flag_rule: {
        expression: CYCLE5_MODEL_IDENTITY.flagRule.expression,
        primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
        secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap
      }
    },
    transport: { endpoint_class: "first_party_browser", region: "europe-west1", requests: options.requestCount ?? 3, words_sent: score.wordCount, processed: "once", retained: "not retained" }
  };
  const detector = composed.methods.find((method) => method.id === "detector.cycle5");
  if (detector) {
    detector.privacy_route = "hub_provider";
    detector.evidence = [{ type: "strongest_section", index: composed.axes.ai_pattern.strongest_section_index, route: "Opace EU server", precision: "fp32" }];
  }
  composed.abuse_controls = {
    max_words: options.maxWords,
    max_characters: options.maxCharacters,
    max_request_bytes: null,
    explicit_capture: "enforced",
    consent_before_transfer: "enforced",
    refuse_not_truncate: "enforced",
    cancellation: "enforced",
    channel_authentication: "chrome_extension_challenge_token",
    proof_of_work: "enforced",
    origin_validation: "enforced",
    per_ip_limit: "enforced",
    per_site_limit: "not_applicable",
    per_connection_limit: "enforced",
    global_inference_limit: "enforced",
    request_body_logging: "excluded",
    unexpected_network_requests: "blocked",
    fallback: "enforced",
    kill_switch: "enforced"
  };
  composed.limitations = [.../* @__PURE__ */ new Set([
    ...withoutLegacyNoModelLimitations(composed.limitations),
    "This route transfers the draft only after explicit choice and optional host permission; the service processes it once in EU memory and does not retain it.",
    "If this service route is unavailable or refused, the same screen offers the on-device Cycle-5 route."
  ])];
  assertCheckerResultInvariants(composed);
  return Object.freeze(composed);
}

// packages/cycle5-browser/src/server-response.ts
var MODEL_BUILD = "45e00978b10d1df6";
var ROUNDING_TOLERANCE = 50001e-9;
var countWords = (value) => value.match(/\S+/gu)?.length ?? 0;
var probabilityFromMargin2 = (margin) => 1 / (1 + Math.exp(-margin / CYCLE5_TEMPERATURE));
var bandFor2 = (score) => CYCLE5_BANDS.find((band) => score >= band.min).id;
var record = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("cycle5_server_response_invalid");
  return value;
};
var number = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`cycle5_server_${field}_invalid`);
  return value;
};
var integer = (value, field) => {
  const parsed = number(value, field);
  if (!Number.isInteger(parsed)) throw new Error(`cycle5_server_${field}_invalid`);
  return parsed;
};
var exact = (actual, expected, field) => {
  if (actual !== expected) throw new Error(`cycle5_server_${field}_mismatch`);
};
var sameRoundedProbability = (reported, margin, field) => {
  const reconstructed = probabilityFromMargin2(margin);
  if (Math.abs(reported - reconstructed) > ROUNDING_TOLERANCE) throw new Error(`cycle5_server_${field}_probability_mismatch`);
  return reconstructed;
};
function parseCycle5ChromeServerResponse(value, sourceText) {
  const body = record(value);
  exact(body.channel, "chrome-extension-v1", "channel");
  exact(body.model, "tier3-cycle5-v1", "model");
  exact(body.model_build, MODEL_BUILD, "model_build");
  exact(body.precision, "fp32", "precision");
  exact(body.segmentation_contract, "segments-v3", "segmentation_contract");
  exact(body.input_normalisation, "raw-v1", "input_contract");
  exact(body.features_contract, "features-v1", "features_contract");
  exact(body.scoring, "margin-v1", "scoring_contract");
  exact(body.aggregation, "max", "aggregation");
  exact(body.threshold, null, "probability_threshold");
  exact(number(body.threshold_margin, "threshold_margin"), CYCLE5_PRIMARY_MARGIN, "threshold_margin");
  exact(number(body.secondary_gap, "secondary_gap"), CYCLE5_SECONDARY_GAP, "secondary_gap");
  exact(body.processed, "server", "processed");
  exact(body.retained, "nothing", "retained");
  exact(body.truncated, false, "truncated");
  const wordCount = countWords(sourceText);
  exact(integer(body.word_count, "word_count"), wordCount, "word_count");
  exact(integer(body.words_sent, "words_sent"), wordCount, "words_sent");
  if (!Array.isArray(body.segments) || body.segments.length === 0) throw new Error("cycle5_server_segments_invalid");
  exact(integer(body.segment_count, "segment_count"), body.segments.length, "segment_count");
  const sections = body.segments.map((candidate, position) => {
    const segment = record(candidate);
    exact(integer(segment.index, `segment_${position}_index`), position, `segment_${position}_index`);
    const startUtf16 = integer(segment.char_start, `segment_${position}_start`);
    const endUtf16 = integer(segment.char_end, `segment_${position}_end`);
    if (startUtf16 < 0 || endUtf16 <= startUtf16 || endUtf16 > sourceText.length) throw new Error(`cycle5_server_segment_${position}_offset_invalid`);
    const passage = sourceText.slice(startUtf16, endUtf16);
    const segmentWordCount = integer(segment.words, `segment_${position}_words`);
    exact(segmentWordCount, countWords(passage), `segment_${position}_words`);
    const rawMargin = number(segment.margin, `segment_${position}_margin`);
    const reportedProbability = number(segment.probability_ai, `segment_${position}_probability`);
    const rawScore = sameRoundedProbability(reportedProbability, rawMargin, `segment_${position}`);
    exact(segment.flagged, rawMargin >= CYCLE5_PRIMARY_MARGIN, `segment_${position}_flagged`);
    exact(segment.truncated, false, `segment_${position}_truncated`);
    return {
      index: position,
      startUtf16,
      endUtf16,
      wordCount: segmentWordCount,
      tokenCount: integer(segment.tokens_scored, `segment_${position}_tokens`),
      rawScore,
      rawMargin,
      bandId: bandFor2(rawScore),
      passage
    };
  });
  const ranked = [...sections].sort((left, right) => right.rawMargin - left.rawMargin);
  const strongest = ranked[0];
  const runnerUp = ranked[1];
  const primary = strongest.rawMargin >= CYCLE5_PRIMARY_MARGIN;
  const secondary = Boolean(runnerUp && runnerUp.rawMargin + CYCLE5_SECONDARY_GAP >= CYCLE5_PRIMARY_MARGIN);
  const flagged = primary || secondary;
  const flagReason = primary ? "primary" : secondary ? "secondary" : null;
  exact(body.flagged, flagged, "flagged");
  exact(body.flag_reason, flagReason, "flag_reason");
  exact(integer(body.strongest_segment, "strongest_segment"), strongest.index, "strongest_segment");
  exact(number(body.margin, "margin"), strongest.rawMargin, "margin");
  sameRoundedProbability(number(body.probability_ai, "probability"), strongest.rawMargin, "document");
  if (runnerUp) {
    exact(integer(body.second_segment, "second_segment"), runnerUp.index, "second_segment");
    exact(number(body.second_margin, "second_margin"), runnerUp.rawMargin, "second_margin");
    sameRoundedProbability(number(body.second_probability_ai, "second_probability"), runnerUp.rawMargin, "second");
  } else {
    exact(body.second_segment, null, "second_segment");
    exact(body.second_margin, null, "second_margin");
    exact(body.second_probability_ai, null, "second_probability");
  }
  return {
    status: "scored",
    provider: "opace-eu-server-fp32",
    modelVersion: "tier3-cycle5-v1",
    modelBuild: MODEL_BUILD,
    rawScore: strongest.rawScore,
    rawMargin: strongest.rawMargin,
    flagged,
    flagReason,
    wordCount,
    sections
  };
}

// packages/cycle5-browser/src/report.ts
var escape = (value) => String(value).replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
var LEVELS = {
  "signal-likely-human": "Likely human",
  "signal-unclear": "Unclear",
  "signal-potentially-ai": "Potentially AI",
  "signal-likely-ai": "Likely AI",
  "signal-strongly-ai": "Strongly AI"
};
var LEVEL_POSITIONS = {
  "signal-likely-human": 10,
  "signal-unclear": 30,
  "signal-potentially-ai": 50,
  "signal-likely-ai": 70,
  "signal-strongly-ai": 90
};
var human = (value) => String(value ?? "Not assessed").replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
var json = (value) => escape(JSON.stringify(value, null, 2));
function renderCompleteCheckerHtml(result) {
  assertCheckerResultInvariants(result);
  const ai = result.axes.ai_pattern;
  const assessed = ai.assessment_status === "assessed";
  const level = assessed ? LEVELS[ai.level] : "Not assessed";
  const needle = assessed ? LEVEL_POSITIONS[ai.level] : void 0;
  const strongest = assessed ? result.sections.find((section) => section.index === ai.strongest_section_index) : void 0;
  const sections = result.sections.map((section) => `<article class="section" id="section-${section.index + 1}">
    <div class="section-heading"><div><p class="eyebrow">Section ${section.index + 1} \xB7 ${escape(section.word_count)} words</p><h3>${escape(LEVELS[section.level] ?? human(section.level))}</h3></div><strong>${escape(section.display_score)}</strong></div>
    ${section.passage ? `<blockquote>${escape(section.passage)}</blockquote>` : `<p>Content-free locator: UTF-16 ${escape(section.start_utf16)}\u2013${escape(section.end_utf16)}.</p>`}
    <dl><div><dt>Raw margin</dt><dd>${escape(section.raw_margin)}</dd></div><div><dt>UTF-16 range</dt><dd>${escape(section.start_utf16)}\u2013${escape(section.end_utf16)}</dd></div></dl>
    <h4>Why it reads this way</h4>${section.evidence.map((item) => `<div class="evidence"><strong>${escape(item.summary)}</strong>${item.detail ? `<p>${escape(item.detail)}</p>` : ""}${item.basis ? `<small>${escape(item.basis)}</small>` : ""}</div>`).join("") || "<p>No section evidence was supplied.</p>"}
    ${section.index === ai.strongest_section_index ? '<p class="strongest">The strongest passage shaped the result.</p>' : ""}
  </article>`).join("");
  const sectionMap = result.sections.map((section) => `<a href="#section-${section.index + 1}" title="${escape(LEVELS[section.level] ?? human(section.level))}"><span>Section ${section.index + 1}</span><strong>${escape(section.display_score)}</strong><small>${escape(LEVELS[section.level] ?? human(section.level))}</small></a>`).join("");
  const methods = result.methods.map((method) => `<li><div class="method-head"><div><strong>${escape(method.provider_or_method)}</strong><small>${escape(method.id)} \xB7 ${escape(method.version)} \xB7 ${escape(human(method.privacy_route))}</small></div><b>${escape(human(method.status))}</b></div><p>${escape(method.limitations.join(" "))}</p>${method.evidence.length ? `<details><summary>Method evidence</summary><pre>${json(method.evidence)}</pre></details>` : ""}</li>`).join("");
  const limitations = result.limitations.map((item) => `<li>${escape(item)}</li>`).join("");
  const provenance = result.provenance;
  const transport = result.route.transport;
  const generated = new Date(result.generated_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
  const support = result.exports.report.support_destination;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Opace AI Content Checker &amp; Detector evidence report</title><style>
@page{size:A4;margin:16mm 15mm 20mm}*{box-sizing:border-box}html{background:#ece8e1}body{margin:0;color:#17191a;background:#fff;font:11pt/1.48 Inter,Arial,sans-serif}main{max-width:210mm;margin:auto;padding:14mm;background:#fff}.mast{display:grid;grid-template-columns:1fr auto;gap:12mm;padding:8mm;border-bottom:3px solid #fb700a;background:#111415;color:#fff}.brand{margin:0;color:#ffad7b;font-size:9pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.mast h1{margin:1mm 0;font:700 23pt/1.05 Georgia,serif}.mast .summary{text-align:right}.mast .summary strong{display:block;color:#ffad7b;font:700 24pt/1 Georgia,serif}.mast .summary span{font-size:9pt;text-transform:uppercase}.eyebrow{margin:0 0 2mm;color:#a6410b;font-size:8pt;font-weight:800;letter-spacing:.11em;text-transform:uppercase}h2,h3,h4{font-family:Georgia,serif}h2{margin:0 0 4mm;font-size:17pt}h3{margin:0;font-size:14pt}h4{margin:5mm 0 2mm;font-size:11pt}.card,.section,.run{margin:5mm 0;padding:5mm;border:1px solid #cfc8bd;break-inside:avoid}.axes{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.axes article{padding:4mm;border-top:3px solid #1b65a6;background:#f7f3ed}.axes article:nth-child(2){border-color:#fb700a}.axes article:nth-child(3){border-color:#24714a}.axes p{margin:2mm 0 0}.gauge{position:relative;display:grid;grid-template-columns:repeat(5,1fr);padding-top:6mm}.gauge span{padding:2mm 1mm;border-top:4mm solid;text-align:center;font-size:7pt;font-weight:700}.gauge span:nth-child(1){border-color:#24714a}.gauge span:nth-child(2){border-color:#1b65a6}.gauge span:nth-child(3){border-color:#c49b22}.gauge span:nth-child(4){border-color:#d66a20}.gauge span:nth-child(5){border-color:#a63c23}.needle{position:absolute;top:0;left:var(--position);width:1px;height:12mm;background:#111415}.map{display:grid;grid-template-columns:repeat(auto-fit,minmax(30mm,1fr));gap:2mm;margin:4mm 0}.map a{display:grid;padding:3mm;border:1px solid #cfc8bd;border-top:2mm solid #fb700a;color:#17191a;text-decoration:none}.map strong{font:700 15pt Georgia,serif}.map small{font-size:7pt}.section-heading{display:flex;justify-content:space-between;gap:6mm}.section-heading>strong{font:700 21pt Georgia,serif}blockquote{margin:4mm 0;padding:4mm;border-left:2px solid #fb700a;background:#f4efe8;font:italic 10.5pt/1.52 Georgia,serif;white-space:pre-wrap}.section dl,.run dl{display:flex;gap:6mm}.section dl div,.run dl div{min-width:32mm}.section dt,.run dt{color:#5d5d59;font-size:7pt;text-transform:uppercase}.section dd,.run dd{margin:0;font-weight:700}.evidence{margin:2mm 0;padding:3mm;border-left:2px solid #1b65a6;background:#f7f3ed}.evidence p{margin:1mm 0}.strongest{font-weight:800;color:#8a3006;text-transform:uppercase}.methods{margin:0;padding:0;list-style:none}.methods>li{padding:4mm 0;border-top:1px solid #ddd6cc;break-inside:avoid}.method-head{display:flex;justify-content:space-between;gap:5mm}.method-head small{display:block;color:#5d5d59}.method-head b{font-size:8pt;text-transform:uppercase}pre{max-width:100%;padding:3mm;background:#f4efe8;font:7.5pt/1.4 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm}.facts>div{padding:3mm;background:#f7f3ed}.correct-use{padding:4mm;border-left:3px solid #fb700a;background:#f4efe8}.footer{position:fixed;right:0;bottom:-13mm;left:0;color:#555;text-align:center;font-size:8pt}.footer .page:after{content:counter(page)}a{color:#124f7d}details summary{font-weight:700}.machine{break-before:page}.machine pre{font-size:6.5pt}@media(max-width:700px){main{padding:4mm}.mast,.axes,.facts{grid-template-columns:1fr}.mast .summary{text-align:left}.section dl,.run dl{display:grid;grid-template-columns:1fr 1fr}}@media print{html{background:#fff}main{max-width:none;padding:0}.card,.section,.run{box-shadow:none}a{color:inherit;text-decoration:none}.machine{break-before:page}}
</style></head><body><main>
<header class="mast"><div><p class="brand">Opace AI Content Checker &amp; Detector</p><h1>Evidence report</h1><p>Generated ${escape(generated)} UTC \xB7 Evidence, not guarantees.</p></div><div class="summary"><span>${assessed ? "Model score" : "Model status"}</span><strong>${escape(assessed ? ai.display_score : "\u2014")}</strong><span>${escape(level)}</span></div></header>
<section class="card"><p class="eyebrow">AI-pattern scale</p><h2>Five-band model reading</h2><p><strong>${escape(level)}${assessed ? ` \xB7 ${escape(ai.display_score)}` : ""}</strong>. ${escape(ai.reason)}</p><div class="gauge" role="img" aria-label="${escape(assessed ? `${ai.display_score}, ${level}` : "Not assessed")}"><span>Likely human</span><span>Unclear</span><span>Potentially AI</span><span>Likely AI</span><span>Strongly AI</span>${needle === void 0 ? "" : `<i class="needle" aria-hidden="true" style="--position:${needle}%"></i>`}</div>${strongest ? `<p class="strongest">The strongest passage shaped the result: section ${strongest.index + 1}, ${escape(strongest.display_score)} ${escape(LEVELS[strongest.level])}.</p>` : ""}</section>
<section class="card"><p class="eyebrow">Separate evidence layers</p><h2>Three independent readings</h2><div class="axes"><article><h3>${escape(level)}</h3><p><strong>AI-pattern reading.</strong> ${escape(ai.reason)}</p></article><article><h3>${escape(human(result.axes.text_integrity.reading))}</h3><p><strong>Text integrity.</strong> ${escape(result.axes.text_integrity.reason)}</p></article><article><h3>${escape(human(result.axes.editorial.reading))}</h3><p><strong>Editorial signals.</strong> ${escape(result.axes.editorial.reason)}</p></article></div></section>
<section class="card"><p class="eyebrow">Route, privacy and source</p><h2>What ran</h2><p><strong>${escape(result.route.location)}</strong> \xB7 ${escape(result.route.retention.statement ?? "")}</p><div class="facts"><div><strong>${escape(result.source.word_count)} words \xB7 ${escape(result.source.character_count)} characters \xB7 ${escape(result.source.section_count)} sections</strong><p>Source hash ${escape(result.source.content_hash)}<br>Normalised hash ${escape(result.source.normalised_hash)}</p></div><div><strong>${escape(result.route.model?.identity ?? "No trained model")} \xB7 ${escape(result.route.model?.precision ?? "Not assessed")}</strong><p>${escape(result.route.model ? `${result.route.model.segmentation_contract} \xB7 ${result.route.model.input_contract} \xB7 ${result.route.model.features_contract} \xB7 ${result.route.model.scoring_contract}` : "No model contract ran.")}</p></div></div><p>Transport: ${escape(transport?.endpoint_class ?? "not recorded")} \xB7 ${escape(transport?.region ?? "local")} \xB7 ${escape(transport?.words_sent ?? 0)} words sent \xB7 ${escape(transport?.retained ?? "not recorded")}.</p></section>
<section class="card"><p class="eyebrow">Model evidence</p><h2>Every scored section</h2><nav class="map" aria-label="Model-scored section map">${sectionMap}</nav>${sections || "<p>No trained-model sections were assessed.</p>"}</section>
<section class="card"><p class="eyebrow">Provenance and facts</p><h2>Separate integrity outcomes</h2><div class="facts"><div><strong>Protected facts: ${escape(provenance.protected_facts.count)}</strong><p>${escape(provenance.protected_facts.categories.join(", ") || "No categories recorded")}</p></div><div><strong>C2PA text: ${escape(human(provenance.c2pa_text.status))}</strong><p>${escape(provenance.c2pa_text.limitations.join(" "))}</p></div><div><strong>C2PA files: ${escape(provenance.c2pa_files.length)}</strong><pre>${json(provenance.c2pa_files)}</pre></div><div><strong>Watermark checks: ${escape(provenance.watermarks.length)}</strong><pre>${json(provenance.watermarks)}</pre></div></div></section>
<section class="card"><p class="eyebrow">Named methods</p><h2>Checks, versions, locations and limitations</h2><ul class="methods">${methods}</ul></section>
<section class="card"><p class="eyebrow">Correct use</p><h2>Limitations and guidance</h2><div class="correct-use"><strong>Use flags as review evidence, never as proof of authorship or misconduct.</strong><p>Read the exact scored sections, route and limitations before making a decision. Preserve the original and seek corroborating evidence for consequential use.</p></div><ul>${limitations}</ul><p>Product and support: <a href="${escape(support)}">${escape(support)}</a></p></section>
<section class="run"><p class="eyebrow">Run record</p><h2>${escape(result.result_id)}</h2><dl><div><dt>Generated</dt><dd>${escape(result.generated_at)}</dd></div><div><dt>Profile</dt><dd>${escape(human(result.profile))}</dd></div><div><dt>Contract</dt><dd>${escape(result.contract_version)}</dd></div><div><dt>Content in report</dt><dd>${result.contains_content ? "Yes" : "No"}</dd></div></dl><pre>${json({ route: result.route, abuse_controls: result.abuse_controls, exports: result.exports })}</pre></section>
<details class="card machine" open><summary>Complete machine record</summary><pre>${json(result)}</pre></details><footer class="footer">Opace AI Content Checker &amp; Detector \xB7 Page <span class="page"></span></footer>
</main></body></html>
`;
}
export {
  CYCLE5_ASSETS,
  CYCLE5_BANDS,
  CYCLE5_BROWSER_RUNTIME_VERSION,
  CYCLE5_CACHE_NAME,
  CYCLE5_DEFAULT_MAX_CHARACTERS,
  CYCLE5_DOWNLOAD_BYTES,
  CYCLE5_MANIFEST_FILE,
  CYCLE5_MAX_CHARACTERS,
  CYCLE5_MAX_LEN,
  CYCLE5_MIN_SCORED_TOKENS,
  CYCLE5_MODEL_BASE,
  CYCLE5_MODEL_BYTES,
  CYCLE5_MODEL_DOWNLOAD_LABEL,
  CYCLE5_MODEL_FILE,
  CYCLE5_MODEL_SHA256,
  CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
  CYCLE5_PRIMARY_MARGIN,
  CYCLE5_RUNTIME_DOWNLOAD_LABEL,
  CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
  CYCLE5_SECONDARY_GAP,
  CYCLE5_SUPERSEDED_CACHES,
  CYCLE5_TEMPERATURE,
  CYCLE5_VOCAB_BYTES,
  CYCLE5_VOCAB_FILE,
  CYCLE5_VOCAB_SHA256,
  CYCLE5_WASM_BYTES,
  CYCLE5_WASM_FILE,
  CYCLE5_WASM_SHA256,
  Cycle5BrowserError,
  Cycle5BrowserRuntime,
  FEATURES_V1_CONTRACT,
  FEATURE_NAMES,
  FEATURE_NORM,
  SEGMENTATION_CONTRACT,
  WordPieceTokenizer,
  clearCycle5Cache,
  composeCycle5BrowserCheckerResult,
  composeCycle5ServerCheckerResult,
  createCycle5BrowserRuntime,
  downloadVerifiedAssets,
  featuresV1,
  loadVerifiedCachedAssets,
  normaliseAllowedModelBase,
  normaliseFeatures,
  parseCycle5ChromeServerResponse,
  rawFeatures,
  renderCompleteCheckerHtml,
  scoringOrder,
  segmentText
};
/*! Bundled license information:

onnxruntime-web/dist/ort.wasm.bundle.min.mjs:
  (*!
   * ONNX Runtime Web v1.29.0
   * Copyright (c) Microsoft Corporation. All rights reserved.
   * Licensed under the MIT License.
   *)
*/
