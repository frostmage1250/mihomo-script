// Only explicit customization policy is applied around the complete upstream runtime.

function customizePolicyGroups(config) {
  const policy = customizationPolicy;
  const regionNames = new Set(allRegionDefinitions.map(item => item.name));
  regionNames.add('其他节点');
  const serviceTargets = new Map(policy.servicePlans.map(item => [item.name, item.target]));
  const sourceNames = new Set(serviceConfigs.map(item => item.name));
  const nativeGroups = config['proxy-groups'];
  const nativeGroupNames = new Set(nativeGroups.map(group => group.name));
  const alias = name => {
    if (name === 'DIRECT') return name;
    return serviceTargets.get(name) || policy.aliases[name] || name;
  };
  const regionalNames = nativeGroups.filter(group => regionNames.has(group.name)).map(group => group.name);
  const customGroupNames = nativeGroups.filter(group =>
    !sourceNames.has(group.name) && !regionNames.has(group.name) &&
    !['GLOBAL', '默认代理', '直连', '漏网之鱼'].includes(group.name)).map(group => group.name);
  const manualGroup = nativeGroups.find(group => group.name === '手动选择');
  const directNames = new Set(directProxies.map(proxy => proxy.name));
  const allNodes = manualGroup ? manualGroup.proxies.slice() :
    config.proxies.filter(proxy => !directNames.has(proxy.name)).map(proxy => proxy.name);
  const groups = [];
  const existing = new Set();
  for (const source of nativeGroups) {
    const name = alias(source.name);
    if (existing.has(name)) continue;
    existing.add(name);
    groups.push({...source, name, type: policy.groupType,
      proxies: source.proxies.map(value => nativeGroupNames.has(value) ? alias(value) : value)});
  }
  const groupNames = new Set(groups.map(group => group.name));
  const proxyNames = new Set(config.proxies.map(proxy => proxy.name));
  const builtin = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE']);
  const unique = values => [...new Set(values)];
  const expand = name => {
    if (name === '$regions') return regionalNames;
    if (name === '$custom_groups') return customGroupNames.map(alias);
    if (name === '$nodes') return allNodes;
    if (name === '$direct_proxies') return directProxies.map(proxy => proxy.name);
    return [name];
  };
  const functionalNames = new Set(policy.servicePlans
    .filter(item => ruleOptionsEnable[item.name]).map(item => item.target));
  for (const group of groups) {
    const requested = policy.groupCandidates[group.name];
    if (requested) {
      group.proxies = requested.flatMap(expand);
      if (ruleOptionsEnable.分流组添加所有节点 &&
          functionalNames.has(group.name) && group.name !== 'Proxy') {
        group.proxies.push(...allNodes);
      }
    }
    group.proxies = unique(group.proxies).filter(name =>
      name !== group.name && (groupNames.has(name) || proxyNames.has(name) || builtin.has(name)));
    if (Object.prototype.hasOwnProperty.call(policy.groupIcons, group.name)) {
      if (policy.groupIcons[group.name] === null) delete group.icon;
      else group.icon = policy.groupIcons[group.name];
    }
    Object.assign(group, policy.groupFields);
    for (const field of policy.omittedGroupFields) delete group[field];
  }
  const byName = new Map(groups.map(group => [group.name, group]));
  const ordered = [];
  const emitted = new Set();
  const reserved = new Set(policy.groupOrder.filter(name => name[0] !== '$'));
  const add = name => {
    if (byName.has(name) && !emitted.has(name)) {
      ordered.push(byName.get(name));
      emitted.add(name);
    }
  };
  for (const name of policy.groupOrder) {
    if (name === '$regions') regionalNames.forEach(add);
    else if (name === '$remaining') {
      for (const group of groups) if (!reserved.has(group.name)) add(group.name);
    } else add(name);
  }
  for (const group of groups) add(group.name);
  config['proxy-groups'] = ordered;
}

function customizeRouting(config) {
  const policy = customizationPolicy;
  const minimal = ruleOptionsEnable.极简模式;
  const blocks = Object.fromEntries(Object.entries(policy.blocks).map(([name, rules]) => [name, rules.slice()]));
  if (!minimal) {
    // Service order is captured from the fixed YAML; only the upstream service switches are applied here.
    for (const section of policy.blockOrder) {
      const rules = policy.servicePlans.filter(service =>
        service.section === section && ruleOptionsEnable[service.name]).flatMap(service => service.rules);
      blocks[section] = [...rules, ...blocks[section]];
    }
  }
  const rules = [];
  for (const section of policy.blockOrder) {
    if (section === 'quic') {
      if (ruleOptionsEnable.屏蔽国外QUIC) rules.push(...blockForeignQuic);
    } else if (minimal && section === 'final') {
      const upstreamRules = config.rules;
      const final = upstreamRules[upstreamRules.length - 1];
      rules.push(final.replace(/,默认代理$/, ',Proxy').replace(/,漏网之鱼$/, ',Final'));
    } else rules.push(...blocks[section]);
  }
  config.rules = rules;
}

function main(config) {
  ruleOptionsEnable.自动选择 = false;
  ruleOptionsEnable.负载均衡 = false;
  ruleOptionsEnable.生成地区自动选择组 = false;
  const output = upstreamMain(config);
  for (const [key, value] of Object.entries(customizationPolicy.globalOverrides)) output[key] = value;
  for (const path of customizationPolicy.omittedGlobalFields) {
    const parts = path.split('.');
    const key = parts.pop();
    const parent = parts.reduce((value, name) => value && value[name], output);
    if (parent) delete parent[key];
  }
  customizePolicyGroups(output);
  customizeRouting(output);
  return output;
}
