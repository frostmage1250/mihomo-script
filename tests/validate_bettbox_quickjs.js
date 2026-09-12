"use strict";

// This test is intentionally executed by the QuickJS sources bundled in the
// current Bettbox repository, not by Node.js.
std.loadScript("mihomoScript.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ss(name, extra) {
  return Object.assign(
    {
      name: name,
      type: "ss",
      server: "node.example.com",
      port: 443,
      cipher: "aes-128-gcm",
      password: "fixture-password",
    },
    extra || {},
  );
}

const output = main({
  proxies: [
    ss("日本 01"),
    ss("美国 01", { "dialer-proxy": "日本 01" }),
    ss("香港 01"),
    ss("韩国 01"),
    ss("日本 0.5x"),
  ],
  dns: {},
  hosts: {},
});

const names = output.proxies.map(function (proxy) {
  return proxy.name;
});
const groups = output["proxy-groups"];
const subscription = groups.find(function (group) {
  return group.name === "订阅";
});

assert(names.indexOf("香港 01") === -1, "Hong Kong nodes must be removed");
assert(subscription, "subscription group is missing");
assert(subscription.proxies.join(",") === "日本 01,美国 01,韩国 01,日本 0.5x", "subscription group contents changed");
assert(output.rules[output.rules.length - 1] === "MATCH,Final", "Final rule must remain last");

print("Bettbox QuickJS compatibility validation passed.");

