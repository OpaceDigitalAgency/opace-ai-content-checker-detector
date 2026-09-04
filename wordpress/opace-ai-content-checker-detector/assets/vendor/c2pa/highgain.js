const l = Symbol("transfer");
function M(e, r) {
  return {
    type: l,
    value: e,
    transfer: r ? Array.isArray(r) ? r : [r] : [e]
  };
}
function p(e) {
  return !!(e && typeof e == "object" && Reflect.get(e, "type") === l);
}
function h(e = "default") {
  return {
    createTx(r) {
      const f = /* @__PURE__ */ new Map(), n = r ?? self;
      return n.addEventListener("message", (u) => {
        const { data: o } = u;
        if (o.channelName !== e)
          return;
        const { id: a, result: s, error: t } = o, c = f.get(a);
        c && (t ? c.reject(t) : c.resolve(s), f.delete(a));
      }), new Proxy(
        {},
        {
          get(u, o) {
            return (...a) => {
              const s = g(), t = [], c = [];
              return a.forEach((i) => {
                p(i) ? (t.push(i.value), c.push(...i.transfer)) : t.push(i);
              }), n.postMessage(
                { method: o, args: t, id: s, channelName: e },
                { transfer: c }
              ), new Promise((i, y) => {
                f.set(s, { resolve: i, reject: y });
              });
            };
          }
        }
      );
    },
    rx(r, f) {
      const n = f ?? self;
      n.addEventListener("message", async (d) => {
        const { data: u } = d;
        if (u.channelName !== e)
          return;
        const { method: o, args: a, id: s } = u;
        try {
          const t = await r[o](...a);
          p(t) ? n.postMessage(
            { result: t.value, id: s, channelName: e },
            { transfer: t.transfer }
          ) : n.postMessage({ result: t, id: s, channelName: e });
        } catch (t) {
          n.postMessage({ error: t, id: s, channelName: e });
        }
      });
    }
  };
}
function g() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
export {
  h as channel,
  M as transfer
};
