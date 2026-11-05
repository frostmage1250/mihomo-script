function applyCustomRuleOrder(config) {
  for (const [name, placement] of Object.entries(customRuleOrder)) {
    if (!ruleOptionsEnable[name]) continue;
    const service = serviceConfigs.find(item => item.name === name);
    const selected = new Set(service?.rules || []);
    const moving = config.rules.filter(rule => selected.has(rule));
    if (!moving.length) continue;
    const remaining = config.rules.filter(rule => !selected.has(rule));
    let index;
    if (placement.before_provider) {
      const prefix = "RULE-SET," + placement.before_provider + ",";
      index = remaining.findIndex(rule => rule.startsWith(prefix));
      if (index < 0) throw new Error("Missing rule placement anchor: " + placement.before_provider);
    } else {
      const anchor = serviceConfigs.find(item => item.name === (placement.before || placement.after));
      if (!anchor || !ruleOptionsEnable[anchor.name]) continue;
      const anchorRules = new Set(anchor.rules || []);
      index = placement.before
        ? remaining.findIndex(rule => anchorRules.has(rule))
        : remaining.reduce((last, rule, i) => anchorRules.has(rule) ? i : last, -1);
      if (index < 0) continue;
      if (placement.after) index++;
    }
    remaining.splice(index, 0, ...moving);
    config.rules = remaining;
  }
}

function applyAutomaticTestingPolicy(config) {
  if (!automaticTestingDisabled) return;
  // Bettbox applies saved switches before main(); remove stale enabled values too.
  for (const name of ["自动选择", "负载均衡", "生成地区自动选择组"]) {
    delete ruleOptionsEnable[name];
  }
  if (!config) return;
  for (const group of config["proxy-groups"] || []) {
    if (["url-test", "fallback", "load-balance", "smart"].includes(group.type)) {
      throw new Error("Automatic-testing group is disabled: " + group.name);
    }
    for (const field of [
      "url", "interval", "timeout", "lazy", "max-failed-times",
      "tolerance", "expected-status", "strategy", "hash-key", "health-check",
    ]) {
      delete group[field];
    }
  }
}
