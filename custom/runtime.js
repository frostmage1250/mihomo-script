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
