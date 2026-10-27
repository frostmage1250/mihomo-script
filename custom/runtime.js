// Local subscription and policy behavior; upstream data is supplied by the builder.

function filterProxies(config) {
  regionMatchCache.clear();

  const filterLowRateProxiesEnabled = ruleOptionsEnable.过滤低倍率节点;
  const filterNonRegionProxiesEnabled = ruleOptionsEnable.过滤非地区节点;

  const lowRateRegex = filterLowRateProxiesEnabled
    ? rateRegionDefinitions.find((r) => r.name === lowRateRegionName)?.regex
    : null;

  const originalProxies = config.proxies || [];

  const filteredRawProxies = originalProxies.filter((proxy) => {
    const type = String(proxy.type ?? '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') return false;

    const matchableName = toMatchableName(proxy.name);
    const matchedRegions = getMatchedRegions(proxy.name);
    if (lowRateRegex?.test(matchableName)) return false;

    if (!filterNonRegionProxiesEnabled) return true;

    const isRegionProxy = matchedRegions.some((region) => regionDefinitions.includes(region));

    return isRegionProxy || !excludeFilter.test(matchableName);
  });

  const filteredProxies = [];
  const uniqueNames = new Set();

  for (const rawProxy of filteredRawProxies) {
    if (!uniqueNames.has(rawProxy.name)) {
      uniqueNames.add(rawProxy.name);
      const { ['dialer-proxy']: _dialerProxy, ...proxyWithoutDialer } = rawProxy;
      filteredProxies.push(proxyWithoutDialer);
    }
  }

  if (!filteredProxies.length) {
    throw new Error('配置文件中未找到任何代理节点，请使用机场提供的配置文件进行覆写');
  }

  return filteredProxies;
}

// ---节点地区与倍率归类---

/**
 * 按上游匹配规则归类节点，仅返回最终配置实际使用的组名与原始节点名称。
 */
function buildRegionProxyMap(filteredProxies) {
  const displayedDefinitions = [
    ...regionDefinitions,
    rateRegionDefinitions.find((region) => region.name === lowRateRegionName),
  ].filter(Boolean);
  const regionProxyMap = new Map(displayedDefinitions.map(({ name }) => [name, []]));
  const otherProxies = [];

  for (const proxy of filteredProxies) {
    const matchedRegions = getMatchedRegions(proxy.name);
    const isRegionProxy = matchedRegions.some((region) => regionDefinitions.includes(region));

    for (const region of matchedRegions) {
      if (regionProxyMap.has(region.name)) regionProxyMap.get(region.name).push(proxy.name);
    }

    if (!isRegionProxy) otherProxies.push(proxy.name);
  }

  if (otherProxies.length > 0) regionProxyMap.set('其他节点', otherProxies);
  for (const [name, proxies] of regionProxyMap) {
    if (proxies.length === 0) regionProxyMap.delete(name);
  }

  return regionProxyMap;
}

function buildProxyGroups(regionProxyMap, subscriptionProxies) {
  const regionOrder = [...regionDefinitions.map(({ name }) => name), '其他节点', lowRateRegionName];
  const availableRegions = regionOrder.filter((name) => regionProxyMap.has(name));
  const simpleSelect = (name, proxies) => ({
    name,
    type: 'select',
    proxies,
    ...(groupTestUrl ? { url: groupTestUrl } : {}),
    interval: 0,
    ...(groupIcons[name] ? { icon: groupIcons[name] } : {}),
    'empty-fallback': 'REJECT',
  });
  const optional = (...names) => names.filter((name) => regionProxyMap.has(name));

  return [
    simpleSelect('Proxy', ['订阅', ...availableRegions, ...subscriptionProxies.map((proxy) => proxy.name)]),
    simpleSelect('订阅', subscriptionProxies.map((proxy) => proxy.name)),
    simpleSelect('Direct', ['DIRECT', ...directProxies.map((proxy) => proxy.name)]),
    simpleSelect('GitHub', ['Proxy', '订阅', 'AI']),
    simpleSelect('Claude', ['Proxy', '订阅', ...optional('日本', '台湾', '其他节点')]),
    simpleSelect('AI', ['Proxy', ...optional('日本', '台湾', '其他节点')]),
    simpleSelect('porn', ['Proxy', ...optional('新加坡', '低倍率节点', '美国')]),
    simpleSelect('Google', ['Proxy', '订阅']),
    simpleSelect('媒体', ['Proxy', ...optional('低倍率节点', '香港', '美国')]),
    simpleSelect('Apple Podcasts', ['Proxy', '订阅', ...optional('美国', '香港', '日本', '新加坡'), 'Direct']),
    simpleSelect('YouTube', ['Proxy', ...optional('香港', '低倍率节点')]),
    simpleSelect('Telegram', ['Proxy', ...optional('低倍率节点', '香港')]),
    simpleSelect('PikPak', ['Proxy', 'Direct', ...optional('低倍率节点', '香港')]),
    simpleSelect('EHentai', ['Proxy', ...optional('美国', '新加坡', '香港')]),
    ...availableRegions.map((name) => simpleSelect(name, regionProxyMap.get(name))),
    simpleSelect('Final', ['Proxy', 'Direct']),
  ];
}


function main(config) {
  if (config['proxy-providers'] && Object.keys(config['proxy-providers']).length > 0) {
    throw new Error('配置文件中包含 proxy-providers，请使用机场提供的配置文件进行覆写');
  }
  const filteredProxies = filterProxies(config);
  const regionProxyMap = buildRegionProxyMap(filteredProxies);
  const { dns, hosts, proxies: mappedProxies } = buildDnsAndHostsConfig(config, filteredProxies);
  return {
    ...buildGlobalConfig(config, filteredProxies),
    dns,
    hosts,
    proxies: [...mappedProxies, ...directProxies],
    'proxy-groups': buildProxyGroups(regionProxyMap, mappedProxies),
    'rule-providers': { ...finalRuleProviders },
    rules: finalRules.slice(),
  };
}
