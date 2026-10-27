/**
 * Mihomo single-subscription override; upstream author: AIsouler.
 * Source: https://github.com/AIsouler/MyClash
 * Upstream commit: 071d4ec5764b4700d0c5de41797f20a8bdf6b6d8
 * Generated from upstream AST and custom sources. MIT license retained.
 */
const Compatible_With_Bettbox = {
  "ruleOptionsEnable": true
};
const ruleOptionsEnable = {
  "过滤低倍率节点": false,
  "过滤非地区节点": true
};
const excludeFilter = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|过滤|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;
const directProxies = [{
  "name": "IPv4优先",
  "type": "direct",
  "ip-version": "ipv4-prefer"
}, {
  "name": "IPv6优先",
  "type": "direct",
  "ip-version": "ipv6-prefer"
}];
const iconBaseUrl = 'https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/';
const regionDefinitions = [{
  name: '香港',
  flag: '🇭🇰',
  regex: /🇭🇰|香港|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong/i,
  icon: `${iconBaseUrl}HongKong.svg`
}, {
  name: '日本',
  flag: '🇯🇵',
  regex: /🇯🇵|日本|东京|大阪|京都|(?<![A-Za-z])JPN?(?![A-Za-z])|japan/i,
  icon: `${iconBaseUrl}Japan.svg`
}, {
  name: '美国',
  flag: '🇺🇸',
  regex: /🇺🇸|美国|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states/i,
  icon: `${iconBaseUrl}America.svg`
}, {
  name: '新加坡',
  flag: '🇸🇬',
  regex: /🇸🇬|新加坡|狮城|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore/i,
  icon: `${iconBaseUrl}Singapore.svg`
}, {
  name: '台湾',
  flag: '🇹🇼',
  regex: /🇹🇼|台湾|台北|高雄|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan/i,
  icon: `${iconBaseUrl}Taiwan.svg`
}];
const lowRateRegionName = '低倍率节点';
const rateRegionDefinitions = [{
  name: lowRateRegionName,
  regex: /^(?!.*(?:剩|期)).*(?:(?<![\d.])0(\.[0-5]|[*×✕✖⨯⨉x倍]))|(?:[*×✕✖⨯⨉x]0)|^(?!.*(?:客户端|软件)).*下载|低倍|免费|(?<![A-Za-z])free(?![A-Za-z])/i,
  icon: `${iconBaseUrl}Available.svg`
}];
const allRegionDefinitions = [...regionDefinitions, ...rateRegionDefinitions];
const invisibleCharsRegex = /[\u00AD\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u115F\u1160\u3164\uFFA0]/g;
function toMatchableName(name) {
  return typeof name === 'string' ? name.replace(invisibleCharsRegex, '') : name;
}
const regionMatchCache = new Map();
function getMatchedRegions(proxyName) {
  if (regionMatchCache.has(proxyName)) {
    return regionMatchCache.get(proxyName);
  }
  const matchableName = toMatchableName(proxyName);
  const regions = allRegionDefinitions.filter(region => region.regex.test(matchableName));
  regionMatchCache.set(proxyName, regions);
  return regions;
}
const commonDnsList = ['223.5.5.5', '223.6.6.6', '2400:3200::1', '2400:3200:baba::1', 'alidns', '119.29.29.29', '182.254.116.116', '1.12.12.12', '120.53.53.53', '2402:4e00::', 'doh.pub', 'dot.pub', 'dns.pub', 'dnspod', '114.114.114.114', '114.114.115.115', '180.76.76.76', '2400:da00::6666', 'dns.baidu', '1.2.4.8', '210.2.4.8', '2001:dc7:1000::1', 'cnnic', '101.226.4.6', '218.30.118.6', '123.125.81.6', '2400:8800:1::6', '2400:8800:2::6', 'doh.360', 'dot.360', '180.184.1.1', '180.184.2.2', '1.1.1.1', '1.0.0.1', '1.1.1.2', '1.0.0.2', '1.1.1.3', '1.0.0.3', '2606:4700:4700::1111', '2606:4700:4700::1001', '2606:4700:4700::1112', '2606:4700:4700::1002', '2606:4700:4700::1113', '2606:4700:4700::1003', 'dns.cloudflare', 'cloudflare-dns', 'one.one.one.one', '8.8.8.8', '8.8.4.4', '2001:4860:4860::8888', '2001:4860:4860::8844', 'dns.google', '9.9.9.9', '9.9.9.10', '9.9.9.11', '149.112.112.112', '149.112.112.10', '149.112.112.11', '2620:fe::fe', '2620:fe::9', 'quad9', '208.67.222.222', '208.67.220.220', '208.67.222.123', '208.67.220.123', '2620:119:35::35', '2620:119:53::53', '2620:119:35::123', '2620:119:53::123', 'opendns', '94.140.14.14', '94.140.15.15', '94.140.14.15', '94.140.15.16', '2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff', '2a10:50c0::bad1:ff', '2a10:50c0::bad2:ff', 'adguard', '76.76.2.0', '76.76.10.0', '76.76.19.19', '76.223.122.150', '2a0d:2a00:1::2', '2a0d:2a00:2::2', '185.228.168.9', '185.228.169.9', '185.228.168.10', '185.228.169.11', '185.228.168.168', '185.228.169.168', '77.88.8.8', '77.88.8.1', '2a02:6b8::feed:0ff', '2a02:6b8:0:1::feed:0ff', '156.154.70.1', '156.154.71.1', '156.154.70.2', '156.154.71.2', '2610:a1:1018::1', '2610:a1:1019::1', '194.242.2.2', '2a07:e340::2', '74.82.42.42', '2001:470:20::2', 'nextdns', 'dns.apple'];
const commonDnsRegex = new RegExp(commonDnsList.map(dns => dns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
const foreignDNS = ["https://cloudflare-dns.com/dns-query#Proxy", "https://dns.google/dns-query#Proxy"];
const defaultDNS = ['114.114.114.114#DIRECT', 'tls://223.5.5.5#DIRECT', 'https://1.12.12.12/dns-query#DIRECT'];
const proxyServerDNS = ['114.114.114.114#DIRECT', 'tls://223.5.5.5#DIRECT', 'https://doh.pub/dns-query#DIRECT'];
function hostSpecificity(pattern) {
  if (pattern.startsWith('+.')) return 2;
  if (pattern.startsWith('.')) return 1;
  if (pattern.includes('*')) return 0;
  return 3;
}
function matchDomainPattern(pattern, domains) {
  pattern = pattern.toLowerCase();
  if (!pattern.includes('*') && !pattern.startsWith('+.') && !pattern.startsWith('.')) {
    return typeof domains === 'string' ? domains.toLowerCase() === pattern : [...domains].some(d => d.toLowerCase() === pattern);
  }
  const domainList = typeof domains === 'string' ? [domains.toLowerCase()] : [...domains].map(d => d.toLowerCase());
  if (pattern.startsWith('+.')) {
    const suffix = pattern.slice(2);
    return domainList.some(domain => domain === suffix || domain.endsWith(`.${suffix}`));
  }
  if (pattern.startsWith('.')) {
    const suffix = pattern.slice(1);
    return domainList.some(domain => domain !== suffix && domain.endsWith(`.${suffix}`));
  }
  const patternParts = pattern.split('.');
  return domainList.some(domain => {
    const domainParts = domain.split('.');
    return patternParts.length === domainParts.length && patternParts.every((part, index) => part === '*' || part === domainParts[index]);
  });
}
function applyHostsToProxies(proxies, hosts) {
  if (!hosts || typeof hosts !== 'object') return proxies;
  const hostEntries = Object.entries(hosts).filter(([, value]) => typeof value === 'string' && value.length > 0 || Array.isArray(value) && value.length > 0).sort((a, b) => hostSpecificity(b[0]) - hostSpecificity(a[0]));
  if (hostEntries.length === 0) return proxies;
  const targetOf = value => {
    if (Array.isArray(value)) value = value.find(v => typeof v === 'string' && v.length > 0);
    return typeof value === 'string' && value.length > 0 ? value : null;
  };
  const resolveCache = new Map();
  const resolve = server => {
    const cached = resolveCache.get(server);
    if (cached !== undefined) return cached;
    const seen = new Set();
    let current = server.toLowerCase();
    let result = server;
    while (!seen.has(current)) {
      seen.add(current);
      const entry = hostEntries.find(([pattern]) => matchDomainPattern(pattern, current));
      const target = entry && targetOf(entry[1]);
      if (!target) break;
      result = target;
      current = target.toLowerCase();
    }
    resolveCache.set(server, result);
    return result;
  };
  return proxies.map(proxy => {
    if (typeof proxy.server !== 'string') return proxy;
    const server = resolve(proxy.server);
    return server === proxy.server ? proxy : {
      ...proxy,
      server
    };
  });
}
function stripDnsSuffix(dns) {
  const str = String(dns);
  const hashIndex = str.indexOf('#');
  if (hashIndex === -1) return str;
  const prefix = str.slice(0, hashIndex).trim();
  const suffix = str.slice(hashIndex + 1).toLowerCase().trim();
  if (suffix.includes('direct') || suffix.includes('直连')) return prefix + '#DIRECT';
  return prefix;
}
function isIpAddress(server) {
  return (/^\d{1,3}(\.\d{1,3}){3}$/).test(server) || server.includes(':');
}
function simplifyDomainPolicy(policy) {
  const groups = new Map();
  for (const [domain, dns] of Object.entries(policy)) {
    const dnsKey = JSON.stringify(Array.isArray(dns) ? [...dns].sort() : dns);
    if (domain.startsWith('+.') || domain.startsWith('.') || domain.includes('*')) {
      groups.set(`keep:${domain}`, [{
        domain,
        dns,
        dnsKey
      }]);
      continue;
    }
    const parts = domain.split('.');
    if (parts.length < 3) {
      groups.set(`keep:${domain}`, [{
        domain,
        dns,
        dnsKey
      }]);
      continue;
    }
    const suffix = parts.slice(-2).join('.');
    if (!groups.has(suffix)) {
      groups.set(suffix, []);
    }
    groups.get(suffix).push({
      domain,
      dns,
      dnsKey
    });
  }
  const result = {};
  for (const [suffix, domains] of groups) {
    const firstDnsKey = domains[0].dnsKey;
    const sameDns = domains.every(({dnsKey}) => dnsKey === firstDnsKey);
    if (domains.length >= 2 && sameDns) {
      result[`+.${suffix}`] = domains[0].dns;
    } else {
      for (const {domain, dns} of domains) {
        result[domain] = dns;
      }
    }
  }
  return result;
}
function buildDnsAndHostsConfig(config, filteredProxies) {
  const originalDnsConfig = config.dns || ({});
  const proxyServerNameservers = originalDnsConfig['proxy-server-nameserver'] || [];
  const listenValue = originalDnsConfig['listen'];
  const shouldRewriteByHosts = proxyServerNameservers.length === 1 && typeof listenValue === 'string' && listenValue.length > 0 && (proxyServerNameservers.some(dns => String(dns).toLowerCase().includes(listenValue.toLowerCase())) || listenValue.includes('0.0.0.0') && proxyServerNameservers.some(dns => String(dns).toLowerCase().includes('127.0.0.1')));
  const mappedProxies = shouldRewriteByHosts ? applyHostsToProxies(filteredProxies, config.hosts) : filteredProxies;
  const proxyDomains = new Set(mappedProxies.filter(proxy => typeof proxy.server === 'string').map(proxy => proxy.server.toLowerCase()).filter(server => !isIpAddress(server)));
  const privateProxyServerNameservers = shouldRewriteByHosts ? [] : proxyServerNameservers;
  const isCommonDns = dns => {
    const value = String(dns).trim().toLowerCase();
    if (value === 'system' || value === 'system://') return true;
    return commonDnsRegex.test(value);
  };
  const privateDNS = [...new Set([...originalDnsConfig['nameserver'] || [], ...privateProxyServerNameservers].map(stripDnsSuffix).filter(dns => dns.length > 0 && !isCommonDns(dns)))];
  const matchedProxyPolicy = {};
  for (const [domain, dns] of Object.entries({
    ...originalDnsConfig['nameserver-policy'],
    ...originalDnsConfig['proxy-server-nameserver-policy']
  })) {
    if (!matchDomainPattern(domain, proxyDomains)) continue;
    const stripedDns = Array.isArray(dns) ? dns.map(stripDnsSuffix).filter(d => d.length > 0) : stripDnsSuffix(dns);
    if (Array.isArray(stripedDns) && stripedDns.length === 0) continue;
    matchedProxyPolicy[domain] = stripedDns;
  }
  if (privateDNS.length > 0 && Object.keys(matchedProxyPolicy).length === 0) {
    for (const domain of proxyDomains) {
      matchedProxyPolicy[domain] = privateDNS;
    }
  }
  const matchedPolicyDomains = Object.keys(matchedProxyPolicy);
  const proxyServerPolicy = proxyDomains.size === matchedPolicyDomains.length && matchedPolicyDomains.every(domain => proxyDomains.has(domain.toLowerCase())) ? simplifyDomainPolicy(matchedProxyPolicy) : matchedProxyPolicy;
  const originalFakeIpFilter = originalDnsConfig['fake-ip-filter'] || [];
  const proxyFakeIpFilter = originalFakeIpFilter.filter(pattern => {
    const p = String(pattern);
    return matchDomainPattern(p, proxyDomains);
  });
  const dns = {
    enable: true,
    ipv6: true,
    'use-hosts': true,
    'cache-algorithm': 'arc',
    'use-system-hosts': true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/15',
    'fake-ip-range6': '2001:2::1/48',
    'fake-ip-filter': [...repczRealIpDomains, 'rule-set:private', 'rule-set:fakeip_filter', 'rule-set:geolocation-cn', ...proxyFakeIpFilter],
    'default-nameserver': defaultDNS,
    'proxy-server-nameserver': proxyServerDNS,
    ...Object.keys(proxyServerPolicy).length > 0 && ({
      'proxy-server-nameserver-policy': proxyServerPolicy
    }),
    nameserver: foreignDNS,
    'nameserver-policy': {
      "rule-set:apple_podcasts": foreignDNS,
      'rule-set:private': 'system',
      'rule-set:douyin': ['system', '180.184.1.1', '180.184.2.2'],
      'rule-set:cn': ["system"]
    },
    'direct-nameserver': ["system"],
    'direct-nameserver-follow-policy': true
  };
  const hosts = {
    'doh.pub': ['1.12.12.12', '120.53.53.53'],
    'cloudflare-dns.com': ['1.1.1.1', '1.0.0.1'],
    'dns.google': ['8.8.8.8', '8.8.4.4'],
    'services.googleapis.cn': "services.googleapis.com"
  };
  return {
    dns,
    hosts,
    proxies: mappedProxies
  };
}
function buildGlobalConfig(config, filteredProxies) {
  return {
    "mixed-port": 7890,
    "allow-lan": false,
    "ipv6": true,
    "mode": 'rule',
    "log-level": "warning",
    "unified-delay": true,
    "tcp-concurrent": true,
    "keep-alive-interval": 60,
    "find-process-mode": 'strict',
    "external-controller": '127.0.0.1:9090',
    "external-ui": 'ui',
    "external-ui-url": 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip',
    "profile": {
      'store-selected': true,
      'store-fake-ip': true
    },
    "tun": {
      enable: true,
      stack: 'mips',
      'auto-route': true,
      'strict-route': true,
      'auto-detect-interface': true,
      'dns-hijack': ['any:53', 'tcp://any:53']
    }
  };
}
const repczRealIpDomains = ["lancache.steamcontent.com", "*.msftconnecttest.com", "*.msftncsi.com", "*.srv.nintendo.net", "*.stun.playstation.net", "xbox.*.microsoft.com", "*.xboxlive.com", "*.logon.battlenet.com.cn", "*.logon.battle.net", "stun.l.google.com", "easy-login.10099.com.cn", "*.prod.cloud.netflix.com", "appboot.netflix.com"];
const finalRuleProviders = {
  "private": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/private.mrs",
    "path": "./ruleset/private.mrs",
    "path-in-bundle": "geo/geosite/private.mrs"
  },
  "private_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/private.mrs",
    "path": "./ruleset/private_ip.mrs",
    "path-in-bundle": "geo/geoip/private.mrs"
  },
  "steam_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/steam@cn.mrs",
    "path": "./ruleset/steam@cn.mrs",
    "path-in-bundle": "geo/geosite/steam@cn.mrs"
  },
  "nvidia_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/nvidia@cn.mrs",
    "path": "./ruleset/nvidia@cn.mrs",
    "path-in-bundle": "geo/geosite/nvidia@cn.mrs"
  },
  "apple_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/apple@cn.mrs",
    "path": "./ruleset/apple@cn.mrs",
    "path-in-bundle": "geo/geosite/apple@cn.mrs"
  },
  "microsoft_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft@cn.mrs",
    "path": "./ruleset/microsoft@cn.mrs",
    "path-in-bundle": "geo/geosite/microsoft@cn.mrs"
  },
  "geolocation-cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/geolocation-cn.mrs",
    "path": "./ruleset/geolocation-cn.mrs"
  },
  "cn_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/cn.mrs",
    "path": "./ruleset/cn_ip.mrs",
    "path-in-bundle": "geo/geoip/cn.mrs"
  },
  "geolocation-!cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/geolocation-!cn.mrs",
    "path": "./ruleset/geolocation-!cn.mrs",
    "path-in-bundle": "geo/geosite/geolocation-!cn.mrs"
  },
  "fakeip_filter": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/fakeip-filter.mrs",
    "path": "./ruleset/fakeip-filter.mrs",
    "path-in-bundle": "geo/geosite/fakeip-filter.mrs"
  },
  "cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/cn.mrs",
    "path": "./ruleset/cn.mrs",
    "path-in-bundle": "geo/geosite/cn.mrs"
  },
  "douyin": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/douyin.mrs",
    "path": "./ruleset/douyin.mrs",
    "path-in-bundle": "geo/geosite/douyin.mrs"
  },
  "youtube": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/youtube.mrs",
    "path": "./ruleset/youtube.mrs",
    "path-in-bundle": "geo/geosite/youtube.mrs"
  },
  "google": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/google.mrs",
    "path": "./ruleset/google.mrs",
    "path-in-bundle": "geo/geosite/google.mrs"
  },
  "google_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/google.mrs",
    "path": "./ruleset/google_ip.mrs",
    "path-in-bundle": "geo/geoip/google.mrs"
  },
  "ai": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/ai.mrs",
    "path": "./ruleset/ai.mrs"
  },
  "github": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/github.mrs",
    "path": "./ruleset/github.mrs",
    "path-in-bundle": "geo/geosite/github.mrs"
  },
  "microsoft": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft.mrs",
    "path": "./ruleset/microsoft.mrs",
    "path-in-bundle": "geo/geosite/microsoft.mrs"
  },
  "microsoft_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/microsoft.mrs",
    "path": "./ruleset/microsoft_ip.mrs",
    "path-in-bundle": "geo/geoip/microsoft.mrs"
  },
  "apple": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/apple.mrs",
    "path": "./ruleset/apple.mrs",
    "path-in-bundle": "geo/geosite/apple.mrs"
  },
  "apple_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/apple.mrs",
    "path": "./ruleset/apple_ip.mrs",
    "path-in-bundle": "geo/geoip/apple.mrs"
  },
  "telegram": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/telegram.mrs",
    "path": "./ruleset/telegram.mrs",
    "path-in-bundle": "geo/geosite/telegram.mrs"
  },
  "telegram_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/telegram.mrs",
    "path": "./ruleset/telegram_ip.mrs",
    "path-in-bundle": "geo/geoip/telegram.mrs"
  },
  "steam": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/steam.mrs",
    "path": "./ruleset/steam.mrs",
    "path-in-bundle": "geo/geosite/steam.mrs"
  },
  "steam_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/steam.mrs",
    "path": "./ruleset/steam_ip.mrs",
    "path-in-bundle": "geo/geoip/steam.mrs"
  },
  "tiktok": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/tiktok.mrs",
    "path": "./ruleset/tiktok.mrs",
    "path-in-bundle": "geo/geosite/tiktok.mrs"
  },
  "tiktok_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/tiktok.mrs",
    "path": "./ruleset/tiktok_ip.mrs",
    "path-in-bundle": "geo/geoip/tiktok.mrs"
  },
  "twitter": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/twitter.mrs",
    "path": "./ruleset/twitter.mrs",
    "path-in-bundle": "geo/geosite/twitter.mrs"
  },
  "twitter_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/twitter.mrs",
    "path": "./ruleset/twitter_ip.mrs",
    "path-in-bundle": "geo/geoip/twitter.mrs"
  },
  "meta": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/meta.mrs",
    "path": "./ruleset/meta.mrs",
    "path-in-bundle": "geo/geosite/meta.mrs"
  },
  "facebook_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geoip/facebook.mrs",
    "path": "./ruleset/facebook_ip.mrs",
    "path-in-bundle": "geo/geoip/facebook.mrs"
  },
  "pikpak": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/pikpak.mrs",
    "path": "./ruleset/pikpak.mrs",
    "path-in-bundle": "geo/geosite/pikpak.mrs"
  },
  "ehentai": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/ehentai.mrs",
    "path": "./ruleset/ehentai.mrs",
    "path-in-bundle": "geo/geosite/ehentai.mrs"
  },
  "appletv": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/apple-tvplus.mrs",
    "path": "./ruleset/appletv.mrs",
    "path-in-bundle": "geo/geosite/apple-tvplus.mrs"
  },
  "porn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/porn.mrs",
    "path": "./ruleset/porn.mrs"
  },
  "claude": {
    "type": "http",
    "format": "yaml",
    "interval": 86400,
    "behavior": "classical",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/claude.yaml",
    "path": "./ruleset/claude.yaml"
  },
  "twitch": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/twitch.mrs",
    "path": "./ruleset/twitch.mrs",
    "path-in-bundle": "geo/geosite/twitch.mrs"
  },
  "apple_podcasts": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "path": "./ruleset/apple-podcasts.mrs",
    "path-in-bundle": "geo/geosite/apple-podcasts.mrs",
    "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/apple-podcasts.mrs"
  },
  "mcdn屏蔽": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/mcdn-block.mrs",
    "path": "./ruleset/mcdn-block.mrs"
  }
};
const finalRules = ["RULE-SET,claude,Claude", "RULE-SET,ai,AI", "RULE-SET,github,GitHub", "RULE-SET,telegram,Telegram", "RULE-SET,telegram_ip,Telegram,no-resolve", "RULE-SET,appletv,媒体", "RULE-SET,apple_podcasts,Apple Podcasts", "RULE-SET,twitch,媒体", "RULE-SET,twitter,媒体", "RULE-SET,twitter_ip,媒体,no-resolve", "RULE-SET,tiktok,媒体", "RULE-SET,tiktok_ip,媒体,no-resolve", "RULE-SET,youtube,YouTube", "RULE-SET,meta,媒体", "RULE-SET,facebook_ip,媒体,no-resolve", "DOMAIN,cdn.jsdmirror.com,Direct", "RULE-SET,private,Direct", "RULE-SET,private_ip,Direct,no-resolve", "RULE-SET,mcdn屏蔽,REJECT", "RULE-SET,steam_cn,Direct", "RULE-SET,nvidia_cn,Direct", "RULE-SET,apple_cn,Direct", "RULE-SET,microsoft_cn,Direct", "DOMAIN,international-gfe.download.nvidia.com,Direct", "DOMAIN-SUFFIX,ctaiot.com,Direct", "RULE-SET,steam,Proxy", "RULE-SET,steam_ip,Proxy,no-resolve", "RULE-SET,pikpak,PikPak", "RULE-SET,ehentai,EHentai", "RULE-SET,porn,pron", "RULE-SET,google,Google", "RULE-SET,google_ip,Google,no-resolve", "RULE-SET,apple,Proxy", "RULE-SET,apple_ip,Proxy,no-resolve", "RULE-SET,microsoft,Proxy", "RULE-SET,microsoft_ip,Proxy,no-resolve", "RULE-SET,geolocation-!cn,Proxy", "RULE-SET,geolocation-cn,Direct", "RULE-SET,cn_ip,Direct", "MATCH,Final"];
const groupTestUrl = "https://www.apple.com/library/test/success.html";
const groupIcons = {
  "香港": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/HongKong.svg",
  "日本": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Japan.svg",
  "美国": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/America.svg",
  "新加坡": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Singapore.svg",
  "台湾": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Taiwan.svg",
  "Proxy": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Proxy.svg",
  "订阅": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Static.svg",
  "Direct": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/China.svg",
  "GitHub": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/GitHub.svg",
  "AI": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/OpenAI.svg",
  "Google": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Google.svg",
  "YouTube": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/YouTube.svg",
  "Telegram": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Telegram.svg",
  "PikPak": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/PikPak.svg",
  "EHentai": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/EHentai.svg",
  "其他节点": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/WorldMap.svg",
  "低倍率节点": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Available.svg",
  "Final": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Stack.svg"
};
function filterProxies(config) {
  regionMatchCache.clear();
  const filterLowRateProxiesEnabled = ruleOptionsEnable.过滤低倍率节点;
  const filterNonRegionProxiesEnabled = ruleOptionsEnable.过滤非地区节点;
  const lowRateRegex = filterLowRateProxiesEnabled ? rateRegionDefinitions.find(r => r.name === lowRateRegionName)?.regex : null;
  const originalProxies = config.proxies || [];
  const filteredRawProxies = originalProxies.filter(proxy => {
    const type = String(proxy.type ?? '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') return false;
    const matchableName = toMatchableName(proxy.name);
    const matchedRegions = getMatchedRegions(proxy.name);
    if (lowRateRegex?.test(matchableName)) return false;
    if (!filterNonRegionProxiesEnabled) return true;
    const isRegionProxy = matchedRegions.some(region => regionDefinitions.includes(region));
    return isRegionProxy || !excludeFilter.test(matchableName);
  });
  const filteredProxies = [];
  const uniqueNames = new Set();
  for (const rawProxy of filteredRawProxies) {
    if (!uniqueNames.has(rawProxy.name)) {
      uniqueNames.add(rawProxy.name);
      const {['dialer-proxy']: _dialerProxy, ...proxyWithoutDialer} = rawProxy;
      filteredProxies.push(proxyWithoutDialer);
    }
  }
  if (!filteredProxies.length) {
    throw new Error('配置文件中未找到任何代理节点，请使用机场提供的配置文件进行覆写');
  }
  return filteredProxies;
}
function buildRegionProxyMap(filteredProxies) {
  const displayedDefinitions = [...regionDefinitions, rateRegionDefinitions.find(region => region.name === lowRateRegionName)].filter(Boolean);
  const regionProxyMap = new Map(displayedDefinitions.map(({name}) => [name, []]));
  const otherProxies = [];
  for (const proxy of filteredProxies) {
    const matchedRegions = getMatchedRegions(proxy.name);
    const isRegionProxy = matchedRegions.some(region => regionDefinitions.includes(region));
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
  const regionOrder = [...regionDefinitions.map(({name}) => name), '其他节点', lowRateRegionName];
  const availableRegions = regionOrder.filter(name => regionProxyMap.has(name));
  const simpleSelect = (name, proxies) => ({
    name,
    type: 'select',
    proxies,
    ...groupTestUrl ? {
      url: groupTestUrl
    } : {},
    interval: 0,
    ...groupIcons[name] ? {
      icon: groupIcons[name]
    } : {},
    'empty-fallback': 'REJECT'
  });
  const optional = (...names) => names.filter(name => regionProxyMap.has(name));
  return [simpleSelect('Proxy', ['订阅', ...availableRegions, ...subscriptionProxies.map(proxy => proxy.name)]), simpleSelect('订阅', subscriptionProxies.map(proxy => proxy.name)), simpleSelect('Direct', ['DIRECT', ...directProxies.map(proxy => proxy.name)]), simpleSelect('GitHub', ['Proxy', '订阅', 'AI']), simpleSelect('Claude', ['Proxy', '订阅', ...optional('日本', '台湾', '其他节点')]), simpleSelect('AI', ['Proxy', ...optional('日本', '台湾', '其他节点')]), simpleSelect('pron', ['Proxy', ...optional('香港', '新加坡')]), simpleSelect('Google', ['Proxy', '订阅']), simpleSelect('媒体', ['Proxy', ...optional('低倍率节点', '香港')]), simpleSelect('Apple Podcasts', ['Proxy', '订阅', ...optional('美国', '香港', '日本', '新加坡'), 'Direct']), simpleSelect('YouTube', ['Proxy', ...optional('香港', '低倍率节点')]), simpleSelect('Telegram', ['Proxy', ...optional('低倍率节点', '香港')]), simpleSelect('PikPak', ['Proxy', 'Direct', ...optional('低倍率节点', '香港')]), simpleSelect('EHentai', ['Proxy']), ...availableRegions.map(name => simpleSelect(name, regionProxyMap.get(name))), simpleSelect('Final', ['Proxy', 'Direct'])];
}
function main(config) {
  if (config['proxy-providers'] && Object.keys(config['proxy-providers']).length > 0) {
    throw new Error('配置文件中包含 proxy-providers，请使用机场提供的配置文件进行覆写');
  }
  const filteredProxies = filterProxies(config);
  const regionProxyMap = buildRegionProxyMap(filteredProxies);
  const {dns, hosts, proxies: mappedProxies} = buildDnsAndHostsConfig(config, filteredProxies);
  return {
    ...buildGlobalConfig(config, filteredProxies),
    dns,
    hosts,
    proxies: [...mappedProxies, ...directProxies],
    'proxy-groups': buildProxyGroups(regionProxyMap, mappedProxies),
    'rule-providers': {
      ...finalRuleProviders
    },
    rules: finalRules.slice()
  };
}
