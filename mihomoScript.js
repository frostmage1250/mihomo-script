/**
 * mihomo配置覆写脚本（单订阅版）
 * 作者：AIsouler
 * 源仓库：https://github.com/AIsouler/MyClash
 * 上游脚本：https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/mihomoScript.js
 * 上游提交：9b9f2cc5b3a87d2e9d05d04f55beea7a2b924c92
 * 基于上游 mihomoScript.js 定制：两个机场配置分开使用同一脚本。
 * 友情推荐，非常好用、省电且内存占用低的代理软件：https://github.com/appshubcc/Bettbox
 */

// --- 静态配置区域 ---

// 适配 Bettbox 自定义配置参数
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

/**
 * 自定义配置选项
 * true = 启用
 * false = 禁用
 */
const ruleOptionsEnable = {
  过滤低倍率节点: false, // 是否过滤低倍率节点
  过滤非地区节点: true, // 保持上游对机场节点的原始过滤边界
};

// 定义全局排除节点的正则表达式，用于排除非地区节点
const excludeFilter =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|过滤|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 直连节点
const directProxies = [
  {
    name: 'IPv4优先',
    type: 'direct',
    'ip-version': 'ipv4-prefer',
  },
  {
    name: 'IPv6优先',
    type: 'direct',
    'ip-version': 'ipv6-prefer',
  },
];

// 定义地区策略组
const regionDefinitions = [
  {
    name: '香港',
    regex: /🇭🇰|香港|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong/i,
  },
  {
    name: '日本',
    regex: /🇯🇵|日本|东京|大阪|京都|(?<![A-Za-z])JPN?(?![A-Za-z])|japan/i,
  },
  {
    name: '美国',
    regex:
      /🇺🇸|美国|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|圣地亚哥|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states/i,
  },
  {
    name: '新加坡',
    regex: /🇸🇬|新加坡|狮城|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore/i,
  },
  {
    name: '台湾省',
    regex: /🇹🇼|台湾|台北|高雄|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan/i,
  },
];

// 定义倍率策略组
const lowRateRegionName = '低倍率节点';

const rateRegionDefinitions = [
  {
    name: lowRateRegionName,
    regex:
      /^(?!.*(?:剩|期)).*(?:(?<!\d)0\.[0-5]|(?<=[ \[\(|｜丨∣┃\-‐–—−－﹣])0[*×✕✖⨯⨉x倍])|(?:(?<=[ \[\(|｜丨∣┃\-‐–—−－﹣])[*×✕✖⨯⨉x]0(?=[ \)\]]|倍|$))|^(?!.*(?:客户端|软件)).*下载|低倍|免费|(?<![A-Za-z])free(?![A-Za-z])/i,
  },
];

// 全部策略组定义（地区 + 倍率），统一用于节点匹配与归类
const allRegionDefinitions = [...regionDefinitions, ...rateRegionDefinitions];

// Rule Providers 通用配置
const ruleProviderCommonDomain = {
  type: 'http',
  format: 'mrs',
  interval: 86400,
  behavior: 'domain',
};
const ruleProviderCommonIpcidr = {
  type: 'http',
  format: 'mrs',
  interval: 86400,
  behavior: 'ipcidr',
};

// BEGIN GENERATED: BASE_RULE_PROVIDERS
// 定义基础 Rule Providers
const baseRuleProviders = {
  "private": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/private.mrs",
    "path": "./ruleset/private.mrs",
    "path-in-bundle": "geo/geosite/private.mrs"
  },
  "private_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/private.mrs",
    "path": "./ruleset/private_ip.mrs",
    "path-in-bundle": "geo/geoip/private.mrs"
  },
  "games_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-games@cn.mrs",
    "path": "./ruleset/category-games@cn.mrs",
    "path-in-bundle": "geo/geosite/category-games@cn.mrs"
  },
  "apple_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/apple@cn.mrs",
    "path": "./ruleset/apple@cn.mrs",
    "path-in-bundle": "geo/geosite/apple@cn.mrs"
  },
  "microsoft_cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft@cn.mrs",
    "path": "./ruleset/microsoft@cn.mrs",
    "path-in-bundle": "geo/geosite/microsoft@cn.mrs"
  },
  "geolocation-cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/geolocation-cn.mrs",
    "path": "./ruleset/geolocation-cn.mrs",
    "path-in-bundle": "geo/geosite/geolocation-cn.mrs"
  },
  "cn_ip": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "ipcidr",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/cn.mrs",
    "path": "./ruleset/cn_ip.mrs",
    "path-in-bundle": "geo/geoip/cn.mrs"
  },
  "geolocation-!cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/geolocation-!cn.mrs",
    "path": "./ruleset/geolocation-!cn.mrs",
    "path-in-bundle": "geo/geosite/geolocation-!cn.mrs"
  },
  "fakeip_filter": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/fakeip-filter.mrs",
    "path": "./ruleset/fakeip-filter.mrs",
    "path-in-bundle": "geo/geosite/fakeip-filter.mrs"
  },
  "cn": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/cn.mrs",
    "path": "./ruleset/cn.mrs",
    "path-in-bundle": "geo/geosite/cn.mrs"
  }
};
// END GENERATED: BASE_RULE_PROVIDERS

// 从当前上游完整提取的保留服务定义；仓库构建器按服务名重新生成此对象
// BEGIN GENERATED: RETAINED_SERVICES
// 从锁定上游提取；仓库构建器按服务名重新生成此对象
const retainedServiceDefinitions = {
  "YouTube": {
    "providers": {
      "youtube": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/youtube.mrs",
        "path": "./ruleset/youtube.mrs",
        "path-in-bundle": "geo/geosite/youtube.mrs"
      }
    },
    "rules": [
      "RULE-SET,youtube,YouTube"
    ]
  },
  "Google": {
    "providers": {
      "google": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/google.mrs",
        "path": "./ruleset/google.mrs",
        "path-in-bundle": "geo/geosite/google.mrs"
      },
      "google_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/google.mrs",
        "path": "./ruleset/google_ip.mrs",
        "path-in-bundle": "geo/geoip/google.mrs"
      }
    },
    "rules": [
      "RULE-SET,google,Google",
      "RULE-SET,google_ip,Google,no-resolve"
    ]
  },
  "AI": {
    "providers": {
      "ai": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-ai-!cn.mrs",
        "path": "./ruleset/ai.mrs",
        "path-in-bundle": "geo/geosite/category-ai-!cn.mrs"
      }
    },
    "rules": [
      "RULE-SET,ai,AI"
    ]
  },
  "Microsoft": {
    "providers": {
      "github": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/github.mrs",
        "path": "./ruleset/github.mrs",
        "path-in-bundle": "geo/geosite/github.mrs"
      },
      "microsoft": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft.mrs",
        "path": "./ruleset/microsoft.mrs",
        "path-in-bundle": "geo/geosite/microsoft.mrs"
      },
      "microsoft_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/microsoft.mrs",
        "path": "./ruleset/microsoft_ip.mrs",
        "path-in-bundle": "geo/geoip/microsoft.mrs"
      }
    },
    "rules": [
      "RULE-SET,github,默认代理",
      "RULE-SET,microsoft,Microsoft",
      "RULE-SET,microsoft_ip,Microsoft,no-resolve"
    ]
  },
  "Apple": {
    "providers": {
      "apple": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/apple.mrs",
        "path": "./ruleset/apple.mrs",
        "path-in-bundle": "geo/geosite/apple.mrs"
      },
      "apple_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/apple.mrs",
        "path": "./ruleset/apple_ip.mrs",
        "path-in-bundle": "geo/geoip/apple.mrs"
      }
    },
    "rules": [
      "RULE-SET,apple,Apple",
      "RULE-SET,apple_ip,Apple,no-resolve"
    ]
  },
  "Telegram": {
    "providers": {
      "telegram": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/telegram.mrs",
        "path": "./ruleset/telegram.mrs",
        "path-in-bundle": "geo/geosite/telegram.mrs"
      },
      "telegram_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/telegram.mrs",
        "path": "./ruleset/telegram_ip.mrs",
        "path-in-bundle": "geo/geoip/telegram.mrs"
      }
    },
    "rules": [
      "RULE-SET,telegram,Telegram",
      "RULE-SET,telegram_ip,Telegram,no-resolve"
    ]
  },
  "Steam": {
    "providers": {
      "steam": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/steam.mrs",
        "path": "./ruleset/steam.mrs",
        "path-in-bundle": "geo/geosite/steam.mrs"
      },
      "steam_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/steam.mrs",
        "path": "./ruleset/steam_ip.mrs",
        "path-in-bundle": "geo/geoip/steam.mrs"
      }
    },
    "rules": [
      "RULE-SET,steam,Steam",
      "RULE-SET,steam_ip,Steam,no-resolve"
    ]
  },
  "TikTok": {
    "providers": {
      "tiktok": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/tiktok.mrs",
        "path": "./ruleset/tiktok.mrs",
        "path-in-bundle": "geo/geosite/tiktok.mrs"
      },
      "tiktok_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/tiktok.mrs",
        "path": "./ruleset/tiktok_ip.mrs",
        "path-in-bundle": "geo/geoip/tiktok.mrs"
      }
    },
    "rules": [
      "RULE-SET,tiktok,TikTok",
      "RULE-SET,tiktok_ip,TikTok,no-resolve"
    ]
  },
  "Twitter": {
    "providers": {
      "twitter": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/twitter.mrs",
        "path": "./ruleset/twitter.mrs",
        "path-in-bundle": "geo/geosite/twitter.mrs"
      },
      "twitter_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/twitter.mrs",
        "path": "./ruleset/twitter_ip.mrs",
        "path-in-bundle": "geo/geoip/twitter.mrs"
      }
    },
    "rules": [
      "RULE-SET,twitter,Twitter",
      "RULE-SET,twitter_ip,Twitter,no-resolve"
    ]
  },
  "Meta": {
    "providers": {
      "meta": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/meta.mrs",
        "path": "./ruleset/meta.mrs",
        "path-in-bundle": "geo/geosite/meta.mrs"
      },
      "facebook_ip": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "ipcidr",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/facebook.mrs",
        "path": "./ruleset/facebook_ip.mrs",
        "path-in-bundle": "geo/geoip/facebook.mrs"
      }
    },
    "rules": [
      "RULE-SET,meta,Meta",
      "RULE-SET,facebook_ip,Meta,no-resolve"
    ]
  },
  "PikPak": {
    "providers": {
      "pikpak": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/pikpak.mrs",
        "path": "./ruleset/pikpak.mrs",
        "path-in-bundle": "geo/geosite/pikpak.mrs"
      }
    },
    "rules": [
      "RULE-SET,pikpak,PikPak"
    ]
  },
  "EHentai": {
    "providers": {
      "ehentai": {
        "type": "http",
        "format": "mrs",
        "interval": 86400,
        "behavior": "domain",
        "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/ehentai.mrs",
        "path": "./ruleset/ehentai.mrs",
        "path-in-bundle": "geo/geosite/ehentai.mrs"
      }
    },
    "rules": [
      "RULE-SET,ehentai,EHentai"
    ]
  }
};
// END GENERATED: RETAINED_SERVICES

// ---节点过滤及验证---

/**
 * 节点匹配缓存，避免重复执行正则
 */
const regionMatchCache = new Map();
function getMatchedRegions(proxyName) {
  if (regionMatchCache.has(proxyName)) {
    return regionMatchCache.get(proxyName);
  }

  const regions = allRegionDefinitions.filter((region) => region.regex.test(proxyName));
  regionMatchCache.set(proxyName, regions);

  return regions;
}

/**
 * 过滤节点：保留机场原始节点名称，删除香港、链式拨号和内置/信息节点，
 * 再按完全相同名称去重。
 */
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

    const matchedRegions = getMatchedRegions(proxy.name);
    if (matchedRegions.some((region) => region.name === '香港')) return false;
    if (lowRateRegex?.test(proxy.name)) return false;

    if (!filterNonRegionProxiesEnabled) return true;

    const isRegionProxy = matchedRegions.some((region) => regionDefinitions.includes(region));

    return isRegionProxy || !excludeFilter.test(proxy.name);
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
  ];
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

// ---dns和hosts相关处理---
// 常见的公共 DNS，用于过滤订阅中的公共 DNS
const commonDnsList = [
  // IPv4（国内）
  '223.5.5.5',
  '223.6.6.6',
  '119.29.29.29',
  '1.12.12.12',
  '120.53.53.53',
  '114.114.114.114',
  '180.76.76.76',
  '1.2.4.8',
  '116.116.116.116',
  '101.226.4.6',
  '123.125.81.6',
  '180.184.1.1',
  '180.184.2.2',

  // IPv6（国内）
  '2400:3200::1',
  '2400:3200:baba::1',
  '2402:4e00::',
  '2400:da00::6666',

  // IPv4（国外）
  '1.1.1.1',
  '1.0.0.1',
  '8.8.8.8',
  '8.8.4.4',
  '9.9.9.9',
  '149.112.112.112',
  '208.67.222.222',
  '208.67.220.220',
  '94.140.14.14',
  '94.140.15.15',
  '76.76.2.0',
  '76.76.10.0',
  '185.228.168.9',
  '185.228.169.9',
  '77.88.8.8',
  '77.88.8.1',
  '156.154.70.1',
  '156.154.71.1',

  // IPv6（国外）
  '2606:4700:4700::1111',
  '2606:4700:4700::1001',
  '2001:4860:4860::8888',
  '2001:4860:4860::8844',
  '2620:fe::fe',
  '2620:fe::9',
  '2620:119:35::35',
  '2620:119:53::53',
  '2a10:50c0::bad1:ff',
  '2a10:50c0::bad2:ff',
  '2a10:50c0::ad1:ff',
  '2a10:50c0::ad2:ff',
  '2a0d:2a00:1::2',
  '2a0d:2a00:2::2',
  '2a02:6b8::feed:0ff',
  '2a02:6b8:0:1::feed:0ff',
  '2610:a1:1018::1',
  '2610:a1:1019::1',

  // 关键词（国内）
  'alidns',
  'doh.pub',
  'dot.pub',
  'dns.pub',
  'dnspod',
  'dns.baidu',

  // 关键词（国外）
  'dns.google',
  'dns.cloudflare',
  'dns.apple',
  'cloudflare-dns',
  'quad9',
  'opendns',
  'nextdns',
  'adguard',
  'one.one.one.one',
];

// 预编译公共 DNS 正则
const commonDnsRegex = new RegExp(
  commonDnsList.map((dns) => dns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

// 国内外 DNS 定义
const chinaDNS = ['223.5.5.5#DIRECT', '119.29.29.29#DIRECT'];
const foreignDNS = ['https://cloudflare-dns.com/dns-query#Proxy', 'https://dns.google/dns-query#Proxy'];
const defaultDNS = ['114.114.114.114#DIRECT', 'tls://223.5.5.5#DIRECT', 'https://1.12.12.12/dns-query#DIRECT'];
const proxyServerDNS = ['114.114.114.114#DIRECT', 'tls://223.5.5.5#DIRECT', 'https://doh.pub/dns-query#DIRECT'];

/**
 * hosts 匹配优先级：精确 > +. > . > *（同级按出现顺序）
 */
function hostSpecificity(pattern) {
  if (pattern.startsWith('+.')) return 2;
  if (pattern.startsWith('.')) return 1;
  if (pattern.includes('*')) return 0;
  return 3;
}

/**
 * 判断域名规则（精确/通配）是否匹配节点域名集合，忽略大小写
 */
function matchDomainPattern(pattern, domains) {
  pattern = pattern.toLowerCase();

  // 精确匹配
  if (!pattern.includes('*') && !pattern.startsWith('+.') && !pattern.startsWith('.')) {
    return typeof domains === 'string'
      ? domains.toLowerCase() === pattern
      : [...domains].some((d) => d.toLowerCase() === pattern);
  }

  const domainList = typeof domains === 'string' ? [domains.toLowerCase()] : [...domains].map((d) => d.toLowerCase());

  // +.example.com
  if (pattern.startsWith('+.')) {
    const suffix = pattern.slice(2);
    return domainList.some((domain) => domain === suffix || domain.endsWith(`.${suffix}`));
  }

  // .example.com
  if (pattern.startsWith('.')) {
    const suffix = pattern.slice(1);
    return domainList.some((domain) => domain !== suffix && domain.endsWith(`.${suffix}`));
  }

  // *.example.com、example.*.com 等
  const patternParts = pattern.split('.');
  return domainList.some((domain) => {
    const domainParts = domain.split('.');
    return (
      patternParts.length === domainParts.length &&
      patternParts.every((part, index) => part === '*' || part === domainParts[index])
    );
  });
}

/**
 * 根据订阅 hosts 映射改写节点 server，改写后无需再复制 hosts 进新配置。
 * 支持链式映射（如 a: b、b: c 时节点 a 改写为 c）；
 * 回环映射（a: b、b: a）由内核校验拒绝，此处仅以已访问集合防御性终止
 */
function applyHostsToProxies(proxies, hosts) {
  if (!hosts || typeof hosts !== 'object') return proxies;

  const hostEntries = Object.entries(hosts)
    .filter(
      ([, value]) => (typeof value === 'string' && value.length > 0) || (Array.isArray(value) && value.length > 0),
    )
    .sort((a, b) => hostSpecificity(b[0]) - hostSpecificity(a[0]));

  if (hostEntries.length === 0) return proxies;

  const targetOf = (value) => {
    if (Array.isArray(value)) value = value.find((v) => typeof v === 'string' && v.length > 0);
    return typeof value === 'string' && value.length > 0 ? value : null;
  };

  const resolveCache = new Map();
  const resolve = (server) => {
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

  return proxies.map((proxy) => {
    if (typeof proxy.server !== 'string') return proxy;
    const server = resolve(proxy.server);
    return server === proxy.server ? proxy : { ...proxy, server };
  });
}

/**
 * 剥离 DNS 地址的 # 策略组后缀；
 * 参数包含 direct 或 直连 时，强制改为 #DIRECT
 */
function stripDnsSuffix(dns) {
  const str = String(dns);
  const hashIndex = str.indexOf('#');
  if (hashIndex === -1) return str;

  const prefix = str.slice(0, hashIndex).trim();

  const suffix = str
    .slice(hashIndex + 1)
    .toLowerCase()
    .trim();

  if (suffix.includes('direct') || suffix.includes('直连')) return prefix + '#DIRECT';

  return prefix;
}

/**
 * 判断节点 server 是否为 IP 地址（IPv4 / IPv6），用于从节点域名集合中排除 IP 类型的 server
 */
function isIpAddress(server) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(server) || server.includes(':');
}

/**
 * 简化节点域名策略：将相同 DNS 的节点域名按后缀归类，至少三段的域名可合并为 +. 后缀形式
 */
function simplifyDomainPolicy(policy) {
  const groups = new Map();

  for (const [domain, dns] of Object.entries(policy)) {
    const dnsKey = JSON.stringify(Array.isArray(dns) ? [...dns].sort() : dns);

    if (domain.startsWith('+.') || domain.startsWith('.') || domain.includes('*')) {
      groups.set(`keep:${domain}`, [{ domain, dns, dnsKey }]);
      continue;
    }

    const parts = domain.split('.');

    if (parts.length < 3) {
      groups.set(`keep:${domain}`, [{ domain, dns, dnsKey }]);
      continue;
    }

    const suffix = parts.slice(-2).join('.');

    if (!groups.has(suffix)) {
      groups.set(suffix, []);
    }

    groups.get(suffix).push({ domain, dns, dnsKey });
  }

  const result = {};

  for (const [suffix, domains] of groups) {
    const firstDnsKey = domains[0].dnsKey;
    const sameDns = domains.every(({ dnsKey }) => dnsKey === firstDnsKey);

    if (domains.length >= 2 && sameDns) {
      result[`+.${suffix}`] = domains[0].dns;
    } else {
      for (const { domain, dns } of domains) {
        result[domain] = dns;
      }
    }
  }

  return result;
}

/**
 * 构建 DNS 与 hosts：保留私有 DNS、节点域名 policy/fake-ip-filter，并按 hosts 改写节点 server
 * hosts改写条件（满足任意一个条件即可）：
 * 1. proxy-server-nameserver 有且仅有一个 DNS 并且该 DNS 包含非空的 listen 值
 * 2. proxy-server-nameserver 有且仅有一个 DNS 并且该 DNS 包含 127.0.0.1 并且 listen 包含 0.0.0.0
 */
function buildDnsAndHostsConfig(config, filteredProxies) {
  const originalDnsConfig = config.dns || {};

  const proxyServerNameservers = originalDnsConfig['proxy-server-nameserver'] || [];
  const listenValue = originalDnsConfig['listen'];

  const shouldRewriteByHosts =
    proxyServerNameservers.length === 1 &&
    typeof listenValue === 'string' &&
    listenValue.length > 0 &&
    (proxyServerNameservers.some((dns) => String(dns).toLowerCase().includes(listenValue.toLowerCase())) ||
      (listenValue.includes('0.0.0.0') &&
        proxyServerNameservers.some((dns) => String(dns).toLowerCase().includes('127.0.0.1'))));

  const mappedProxies = shouldRewriteByHosts ? applyHostsToProxies(filteredProxies, config.hosts) : filteredProxies;

  const proxyDomains = new Set(
    mappedProxies
      .filter((proxy) => typeof proxy.server === 'string')
      .map((proxy) => proxy.server.toLowerCase())
      .filter((server) => !isIpAddress(server)),
  );

  const privateProxyServerNameservers = shouldRewriteByHosts ? [] : proxyServerNameservers;

  const isCommonDns = (dns) => {
    const value = String(dns).trim().toLowerCase();
    if (value === 'system' || value === 'system://') return true;

    return commonDnsRegex.test(value);
  };

  const privateDNS = [
    ...new Set(
      [...(originalDnsConfig['nameserver'] || []), ...privateProxyServerNameservers]
        .map(stripDnsSuffix)
        .filter((dns) => dns.length > 0 && !isCommonDns(dns)),
    ),
  ];

  const matchedProxyPolicy = {};
  for (const [domain, dns] of Object.entries({
    ...originalDnsConfig['nameserver-policy'],
    ...originalDnsConfig['proxy-server-nameserver-policy'],
  })) {
    if (!matchDomainPattern(domain, proxyDomains)) continue;

    const stripedDns = Array.isArray(dns) ? dns.map(stripDnsSuffix).filter((d) => d.length > 0) : stripDnsSuffix(dns);
    if (Array.isArray(stripedDns) && stripedDns.length === 0) continue;

    matchedProxyPolicy[domain] = stripedDns;
  }

  if (privateDNS.length > 0 && Object.keys(matchedProxyPolicy).length === 0) {
    for (const domain of proxyDomains) {
      matchedProxyPolicy[domain] = privateDNS;
    }
  }

  const matchedPolicyDomains = Object.keys(matchedProxyPolicy);
  const proxyServerPolicy =
    proxyDomains.size === matchedPolicyDomains.length &&
    matchedPolicyDomains.every((domain) => proxyDomains.has(domain.toLowerCase()))
      ? simplifyDomainPolicy(matchedProxyPolicy)
      : matchedProxyPolicy;

  const originalFakeIpFilter = originalDnsConfig['fake-ip-filter'] || [];
  const proxyFakeIpFilter = originalFakeIpFilter.filter((pattern) => {
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
    'fake-ip-filter': [
      'rule-set:private',
      'rule-set:fakeip_filter',
      'rule-set:geolocation-cn',
      ...proxyFakeIpFilter,
    ],
    'default-nameserver': defaultDNS,
    'proxy-server-nameserver': proxyServerDNS,
    ...(Object.keys(proxyServerPolicy).length > 0 && {
      'proxy-server-nameserver-policy': proxyServerPolicy,
    }),
    nameserver: foreignDNS,
    'nameserver-policy': {
      'rule-set:cn': ['system'],
    },
    'direct-nameserver': ['system'],
  };

  const hosts = {
    'doh.pub': ['1.12.12.12', '120.53.53.53'],
    'cloudflare-dns.com': ['1.1.1.1', '1.0.0.1'],
    'dns.google': ['8.8.8.8', '8.8.4.4'],


  };

  return { dns, hosts, proxies: mappedProxies };
}
// --- 单订阅输出层 ---

const additionalServiceDefinitions = {
  Threads: {
    providers: {
      threads: {
        ...ruleProviderCommonDomain,
        url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/threads.mrs',
        path: './ruleset/threads.mrs',
        'path-in-bundle': 'geo/geosite/threads.mrs',
      },
    },
    rules: ['RULE-SET,threads,Threads'],
  },
  Facebook: {
    providers: {
      facebook: {
        ...ruleProviderCommonDomain,
        url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/facebook.mrs',
        path: './ruleset/facebook.mrs',
        'path-in-bundle': 'geo/geosite/facebook.mrs',
      },
      facebook_ip: {
        ...ruleProviderCommonIpcidr,
        url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/facebook.mrs',
        path: './ruleset/facebook_ip.mrs',
        'path-in-bundle': 'geo/geoip/facebook.mrs',
      },
    },
    rules: ['RULE-SET,facebook,Facebook', 'RULE-SET,facebook_ip,Facebook,no-resolve'],
  },
  Twitch: {
    providers: {
      twitch: {
        ...ruleProviderCommonDomain,
        url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/twitch.mrs',
        path: './ruleset/twitch.mrs',
        'path-in-bundle': 'geo/geosite/twitch.mrs',
      },
    },
    rules: ['RULE-SET,twitch,Twitch'],
  },
};

const selectedBaseRuleProviderNames = [
  'private',
  'private_ip',
  'games_cn',
  'apple_cn',
  'microsoft_cn',
  'geolocation-cn',
  'cn_ip',
  'geolocation-!cn',
  'fakeip_filter',
  'cn',
];

const servicePolicyTargets = {
  YouTube: '媒体',
  Google: 'Google',
  AI: 'AI',
  Microsoft: 'Proxy',
  Apple: 'Proxy',
  Telegram: 'Telegram',
  Steam: 'Proxy',
  TikTok: '媒体',
  Twitter: '媒体',
  "Meta": '媒体',
  PikPak: 'PikPak',
  EHentai: 'EHentai',
  Threads: '媒体',
  Facebook: '媒体',
  Twitch: '媒体',
};

function allRetainedServiceDefinitions() {
  return { ...retainedServiceDefinitions, ...additionalServiceDefinitions };
}

function buildRuleProviders() {
  const providers = Object.fromEntries(
    selectedBaseRuleProviderNames.map((name) => {
      const provider = baseRuleProviders[name];
      if (!provider) throw new Error('缺少上游基础规则集：' + name);
      return [name, provider];
    }),
  );

  for (const service of Object.values(allRetainedServiceDefinitions())) {
    for (const [name, provider] of Object.entries(service.providers || {})) {
      if (providers[name] && JSON.stringify(providers[name]) !== JSON.stringify(provider)) {
        throw new Error('规则集名称冲突且定义不同：' + name);
      }
      providers[name] = provider;
    }
  }

  providers['geolocation-cn'] = {
    ...providers['geolocation-cn'],
    url: 'https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/geolocation-cn.mrs',
  };

  return providers;
}

function retargetServiceRule(rule, target) {
  const parts = rule.split(',');
  // Bettbox 当前内置的 QuickJS 未提供 Array.prototype.at。
  const noResolve = parts[parts.length - 1] === 'no-resolve';
  const policyIndex = noResolve ? parts.length - 2 : parts.length - 1;
  if (policyIndex < 2 || parts[0] !== 'RULE-SET') {
    throw new Error('无法安全转换上游服务规则：' + rule);
  }
  parts[policyIndex] = target;
  return parts.join(',');
}

function serviceRules(name) {
  const definition = allRetainedServiceDefinitions()[name];
  const target = servicePolicyTargets[name];
  if (!definition || !target) throw new Error('缺少保留服务定义或目标策略组：' + name);
  return (definition.rules || []).map((rule) => retargetServiceRule(rule, target));
}

function buildRules() {
  return [
    'RULE-SET,private,Direct',
    'RULE-SET,games_cn,Direct',
    ...serviceRules('Steam'),
    'RULE-SET,apple_cn,Direct',
    ...serviceRules('Apple'),
    'RULE-SET,microsoft_cn,Direct',
    ...serviceRules('Microsoft'),
    ...serviceRules('Telegram'),
    ...serviceRules('YouTube'),
    ...serviceRules('Threads'),
    ...serviceRules("Meta"),
    ...serviceRules('Facebook'),
    ...serviceRules('Twitter'),
    ...serviceRules('Twitch'),
    ...serviceRules('TikTok'),
    ...serviceRules('Google'),
    ...serviceRules('AI'),
    ...serviceRules('PikPak'),
    ...serviceRules('EHentai'),
    'RULE-SET,geolocation-!cn,Proxy',
    'RULE-SET,geolocation-cn,Direct',
    'RULE-SET,cn_ip,Direct',
    'RULE-SET,private_ip,Direct',
    'MATCH,Final',
  ];
}

function buildProxyGroups(regionProxyMap, subscriptionProxies) {
  const regionOrder = ['台湾', '新加坡', '日本', '美国', '其他节点', '低倍率节点'];
  const sourceRegionName = (name) => (name === '台湾' ? '台湾省' : name);
  const availableRegions = regionOrder.filter((name) => regionProxyMap.has(sourceRegionName(name)));
  const simpleSelect = (name, proxies) => ({
    name,
    type: 'select',
    proxies,
    'empty-fallback': 'REJECT',
  });
  const optional = (...names) => names.filter((name) => regionProxyMap.has(sourceRegionName(name)));

  return [
    simpleSelect('Proxy', ['订阅', ...availableRegions]),
    simpleSelect('订阅', subscriptionProxies.map((proxy) => proxy.name)),
    simpleSelect('Direct', ['DIRECT', ...directProxies.map((proxy) => proxy.name)]),
    simpleSelect('AI', ['Proxy', ...optional('日本', '台湾', '其他节点')]),
    simpleSelect('Google', ['Proxy']),
    simpleSelect('媒体', ['Proxy', ...optional('低倍率节点')]),
    simpleSelect('Telegram', ['Proxy', ...optional('低倍率节点')]),
    simpleSelect('PikPak', ['Proxy', 'Direct', ...optional('低倍率节点')]),
    simpleSelect('EHentai', ['Proxy']),
    ...availableRegions.map((name) => simpleSelect(name, regionProxyMap.get(sourceRegionName(name)))),
    simpleSelect('Final', ['Proxy', 'Direct']),
  ];
}

// --- 主入口 ---

/**
 * 主入口：沿用上游机场配置处理边界，直接生成最终输出。
 */
function main(config) {
  if (config['proxy-providers'] && Object.keys(config['proxy-providers']).length > 0) {
    throw new Error('配置文件中包含 proxy-providers，请使用机场提供的配置文件进行覆写');
  }

  const filteredProxies = filterProxies(config);
  const regionProxyMap = buildRegionProxyMap(filteredProxies);
  const { dns, hosts, proxies: mappedProxies } = buildDnsAndHostsConfig(config, filteredProxies);

  return {
    dns,
    hosts,
    'mixed-port': 7890,
    'allow-lan': false,
    ipv6: true,
    mode: 'rule',
    'log-level': 'warning',
    'unified-delay': true,
    'tcp-concurrent': true,
    'keep-alive-interval': 60,
    'find-process-mode': 'strict',
    'external-controller': '127.0.0.1:9090',
    'external-ui': 'ui',
    'external-ui-url': 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip',
    profile: {
      'store-selected': true,
      'store-fake-ip': true,
    },
    tun: {
      enable: true,
      stack: 'mips',
      'auto-route': true,
      'strict-route': true,
      'auto-detect-interface': true,
      'dns-hijack': ['any:53', 'tcp://any:53'],
    },
    proxies: [...mappedProxies, ...directProxies],
    'proxy-groups': buildProxyGroups(regionProxyMap, mappedProxies),
    'rule-providers': buildRuleProviders(),
    rules: buildRules(),
  };
}
