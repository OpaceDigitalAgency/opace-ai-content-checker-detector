const fail=()=>{throw new Error("network_forbidden")};
require("node:dns").lookup=fail;require("node:net").Socket.prototype.connect=fail;globalThis.fetch=fail;globalThis.WebSocket=class{constructor(){fail()}};
