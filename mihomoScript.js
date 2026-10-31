/**
 * Mihomo single-subscription override; upstream author: AIsouler.
 * Source: https://github.com/AIsouler/MyClash
 * Upstream commit: 9ae100c4c23fb492a2b05934f1983a452eabe85e
 * Full upstream runtime with explicit customizations. MIT license retained.
 */
const Compatible_With_Bettbox = {
  ruleOptionsEnable: true
};
const ruleOptionsEnable = {
  "手动选择": true,
  "自动选择": false,
  "负载均衡": false,
  "FCM": false,
  "YouTube": true,
  "Google": true,
  "AI": true,
  "GitHub": true,
  "Microsoft": true,
  "Apple": true,
  "Telegram": true,
  "Steam": true,
  "TikTok": true,
  "Twitter": true,
  "Meta": true,
  "Line": false,
  "Netflix": false,
  "Emby": false,
  "PikPak": true,
  "Spotify": false,
  "Crypto": false,
  "PayPal": false,
  "Patreon": false,
  "EHentai": true,
  "AdBlock": false,
  "极简模式": false,
  "生成地区自动选择组": false,
  "隐藏地区手动选择组": false,
  "生成倍率组": true,
  "生成家宽节点组": true,
  "分流组添加所有节点": false,
  "过滤低倍率节点": false,
  "过滤高倍率节点": false,
  "过滤非地区节点": true,
  "屏蔽国外QUIC": true,
  "代理IPV4优先": false,
  "代理IPV6优先": false,
  "AppleTV": true,
  "porn": true,
  "Claude": true,
  "Twitch": true,
  "Apple Podcasts": true
};
const prefixRules = ['DOMAIN,cdn.jsdmirror.com,直连', 'RULE-SET,private,直连', 'RULE-SET,geolocation-cn,直连', 'RULE-SET,games_cn,直连', 'RULE-SET,nvidia_cn,直连', 'RULE-SET,apple_cn,直连', 'RULE-SET,microsoft_cn,直连', 'DOMAIN,fsend.cn,直连', 'DOMAIN,international-gfe.download.nvidia.com,直连', 'DOMAIN-SUFFIX,ctaiot.com,直连'];
const customizeProxies = [];
const excludeFilter = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|过滤|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;
const blockForeignQuic = ['AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((RULE-SET,cn_additional),(RULE-SET,cn_ip,no-resolve)))))),REJECT'];
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
const ruleSetBaseUrl = 'https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/';
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
const highRateRegionName = '高倍率节点';
const rateRegionDefinitions = [{
  name: lowRateRegionName,
  regex: /^(?!.*(?:剩|期)).*(?:(?<![\d.])0(\.[0-5]|[*×✕✖⨯⨉x倍]))|(?:[*×✕✖⨯⨉x]0)|^(?!.*(?:客户端|软件)).*下载|低倍|免费|(?<![A-Za-z])free(?![A-Za-z])/i,
  icon: `${iconBaseUrl}Available.svg`
}, {
  name: highRateRegionName,
  regex: /(?:[*×✕✖⨯⨉x](?:[2-9]\d*|[1-9]\d+)(?:\.\d+)?)|(?:(?<![\d.])(?:[2-9]\d*|[1-9]\d+)(?:\.\d+)?(?:倍|[*×✕✖⨯⨉x]))/i,
  icon: `${iconBaseUrl}Airport.svg`
}];
const homeRegionName = '家宽节点';
const homeRegionDefinitions = [{
  name: homeRegionName,
  regex: /家宽|住宅|原生\s*IP|家庭宽带|\bISP\b|\bRES\b|residential/i,
  icon: `${iconBaseUrl}Home.svg`
}];
const allRegionDefinitions = [...regionDefinitions, ...rateRegionDefinitions, ...homeRegionDefinitions];
const ruleProviderCommonDomain = {
  type: 'http',
  format: 'mrs',
  interval: 86400,
  behavior: 'domain'
};
const ruleProviderCommonIpcidr = {
  type: 'http',
  format: 'mrs',
  interval: 86400,
  behavior: 'ipcidr'
};
const baseRuleProviders = {
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
  "cn_additional": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://static-file-global.353355.xyz/rules/cn-additional-list.mrs",
    "path": "./ruleset/cn-additional-list.mrs",
    "path-in-bundle": "geo/geosite/cn.mrs"
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
  "mcdn屏蔽": {
    "type": "http",
    "format": "mrs",
    "interval": 86400,
    "behavior": "domain",
    "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/mcdn-block.mrs",
    "path": "./ruleset/mcdn-block.mrs"
  }
};
const groupBaseOption = {
  interval: 600,
  timeout: 3000,
  url: 'https://www.apple.com/library/test/success.html',
  lazy: true,
  'max-failed-times': 3,
  'empty-fallback': 'REJECT'
};
const selectBaseOption = {
  ...groupBaseOption,
  type: 'select'
};
const urlTestBaseOption = {
  ...groupBaseOption,
  type: 'url-test',
  tolerance: 50,
  'exclude-type': 'DIRECT',
  icon: `${iconBaseUrl}Auto.svg`,
  hidden: true
};
const loadBalanceBaseOption = {
  ...groupBaseOption,
  type: 'load-balance',
  strategy: 'sticky-sessions',
  'exclude-type': 'DIRECT',
  icon: `${iconBaseUrl}RoundRobin.svg`,
  hidden: true
};
const baseGroups = [{
  name: '手动选择',
  baseOption: selectBaseOption,
  includeAll: true,
  icon: `${iconBaseUrl}Static.svg`
}, {
  name: '自动选择',
  baseOption: urlTestBaseOption,
  includeAll: true,
  icon: `${iconBaseUrl}Auto.svg`
}, {
  name: '负载均衡',
  baseOption: loadBalanceBaseOption,
  includeAll: true,
  icon: `${iconBaseUrl}RoundRobin.svg`
}];
const serviceConfigs = [{
  "name": "手动选择",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "includeAll": true,
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Static.svg"
}, {
  "name": "YouTube",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
    "youtube": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/youtube.mrs",
      "path": "./ruleset/youtube.mrs",
      "path-in-bundle": "geo/geosite/youtube.mrs"
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/YouTube.svg",
  "rules": ["RULE-SET,youtube,YouTube"]
}, {
  "name": "Google",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Google.svg",
  "rules": ["RULE-SET,google,Google", "RULE-SET,google_ip,Google,no-resolve"]
}, {
  "name": "AI",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "defaultSelected": "美国",
  "providers": {
    "ai": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/ai.mrs",
      "path": "./ruleset/ai.mrs"
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/OpenAI.svg",
  "rules": ["RULE-SET,ai,AI"]
}, {
  "name": "GitHub",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
    "github": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/github.mrs",
      "path": "./ruleset/github.mrs",
      "path-in-bundle": "geo/geosite/github.mrs"
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/GitHub.svg",
  "rules": ["RULE-SET,github,GitHub"]
}, {
  "name": "Microsoft",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "direct": true,
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Microsoft.svg",
  "rules": ["RULE-SET,microsoft,Microsoft", "RULE-SET,microsoft_ip,Microsoft,no-resolve"]
}, {
  "name": "Apple",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "direct": true,
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Apple.svg",
  "rules": ["RULE-SET,apple,Apple", "RULE-SET,apple_ip,Apple,no-resolve"]
}, {
  "name": "Telegram",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Telegram.svg",
  "rules": ["RULE-SET,telegram,Telegram", "RULE-SET,telegram_ip,Telegram,no-resolve"]
}, {
  "name": "Steam",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "direct": true,
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Steam.svg",
  "rules": ["RULE-SET,steam,Steam", "RULE-SET,steam_ip,Steam,no-resolve"]
}, {
  "name": "TikTok",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "defaultSelected": "日本",
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/TikTok.svg",
  "rules": ["RULE-SET,tiktok,TikTok", "RULE-SET,tiktok_ip,TikTok,no-resolve"]
}, {
  "name": "Twitter",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Twitter.svg",
  "rules": ["RULE-SET,twitter,Twitter", "RULE-SET,twitter_ip,Twitter,no-resolve"]
}, {
  "name": "Meta",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "providers": {
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
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Meta.svg",
  "rules": ["RULE-SET,meta,Meta", "RULE-SET,facebook_ip,Meta,no-resolve"]
}, {
  "name": "PikPak",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "direct": true,
  "providers": {
    "pikpak": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/pikpak.mrs",
      "path": "./ruleset/pikpak.mrs",
      "path-in-bundle": "geo/geosite/pikpak.mrs"
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/PikPak.svg",
  "rules": ["RULE-SET,pikpak,PikPak"]
}, {
  "name": "EHentai",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  },
  "direct": true,
  "defaultSelected": "美国",
  "providers": {
    "ehentai": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/ehentai.mrs",
      "path": "./ruleset/ehentai.mrs",
      "path-in-bundle": "geo/geosite/ehentai.mrs"
    }
  },
  "icon": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/EHentai.svg",
  "rules": ["RULE-SET,ehentai,EHentai"]
}, {
  "providers": {
    "appletv": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/apple-tvplus.mrs",
      "path": "./ruleset/appletv.mrs",
      "path-in-bundle": "geo/geosite/apple-tvplus.mrs"
    }
  },
  "rules": ["RULE-SET,appletv,AppleTV"],
  "name": "AppleTV",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  }
}, {
  "providers": {
    "porn": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/porn.mrs",
      "path": "./ruleset/porn.mrs"
    }
  },
  "rules": ["RULE-SET,porn,porn"],
  "name": "porn",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  }
}, {
  "providers": {
    "claude": {
      "type": "http",
      "format": "yaml",
      "interval": 86400,
      "behavior": "classical",
      "url": "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/claude.yaml",
      "path": "./ruleset/claude.yaml"
    }
  },
  "rules": ["RULE-SET,claude,Claude"],
  "name": "Claude",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  }
}, {
  "providers": {
    "twitch": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/twitch.mrs",
      "path": "./ruleset/twitch.mrs",
      "path-in-bundle": "geo/geosite/twitch.mrs"
    }
  },
  "rules": ["RULE-SET,twitch,Twitch"],
  "name": "Twitch",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  }
}, {
  "providers": {
    "apple_podcasts": {
      "type": "http",
      "format": "mrs",
      "interval": 86400,
      "behavior": "domain",
      "path": "./ruleset/apple-podcasts.mrs",
      "path-in-bundle": "geo/geosite/apple-podcasts.mrs",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/apple-podcasts.mrs"
    }
  },
  "rules": ["RULE-SET,apple_podcasts,Apple Podcasts"],
  "name": "Apple Podcasts",
  "baseOption": {
    "interval": 600,
    "timeout": 3000,
    "url": "https://www.apple.com/library/test/success.html",
    "lazy": true,
    "max-failed-times": 3,
    "empty-fallback": "REJECT",
    "type": "select"
  }
}];
Compatible_With_Bettbox.policyGroupOptions = serviceConfigs.map(svc => svc.name);
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
const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
function normalizeProxyName(proxy) {
  return proxy;
}
function fixDialerProxy(proxy, renameMap, normalizedProxyNames) {
  const target = proxy['dialer-proxy'];
  if (!target) return proxy;
  if (renameMap.has(target)) {
    return {
      ...proxy,
      'dialer-proxy': renameMap.get(target)
    };
  }
  if (normalizedProxyNames.has(target)) {
    return proxy;
  }
  const copy = {
    ...proxy
  };
  delete copy['dialer-proxy'];
  return copy;
}
function getIpVersionPreference() {
  const ipv4PreferEnabled = ruleOptionsEnable.代理IPV4优先;
  const ipv6PreferEnabled = ruleOptionsEnable.代理IPV6优先;
  if (ipv4PreferEnabled && !ipv6PreferEnabled) return 'ipv4-prefer';
  if (ipv6PreferEnabled && !ipv4PreferEnabled) return 'ipv6-prefer';
  return null;
}
function filterAndNormalizeProxies(config) {
  regionMatchCache.clear();
  const filterLowRateProxiesEnabled = ruleOptionsEnable.过滤低倍率节点;
  const filterHighRateProxiesEnabled = ruleOptionsEnable.过滤高倍率节点;
  const filterNonRegionProxiesEnabled = ruleOptionsEnable.过滤非地区节点;
  const lowRateRegex = filterLowRateProxiesEnabled ? rateRegionDefinitions.find(r => r.name === lowRateRegionName)?.regex : null;
  const highRateRegex = filterHighRateProxiesEnabled ? rateRegionDefinitions.find(r => r.name === highRateRegionName)?.regex : null;
  const originalProxies = config.proxies || [];
  const filteredRawProxies = originalProxies.filter(proxy => {
    const type = String(proxy.type ?? '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') return false;
    const matchableName = toMatchableName(proxy.name);
    if (lowRateRegex?.test(matchableName) || highRateRegex?.test(matchableName)) return false;
    if (!filterNonRegionProxiesEnabled) return true;
    const isRegionProxy = getMatchedRegions(proxy.name).some(region => regionDefinitions.includes(region));
    return isRegionProxy || !excludeFilter.test(matchableName);
  });
  const renameMap = new Map();
  const normalizedProxies = [];
  const uniqueNames = new Set();
  for (const rawProxy of filteredRawProxies) {
    const normalized = normalizeProxyName(rawProxy);
    if (normalized.name !== rawProxy.name) {
      renameMap.set(rawProxy.name, normalized.name);
    }
    if (!uniqueNames.has(normalized.name)) {
      uniqueNames.add(normalized.name);
      normalizedProxies.push(normalized);
    }
  }
  const normalizedProxyNames = new Set(normalizedProxies.map(p => p.name));
  const filteredProxies = normalizedProxies.map(proxy => fixDialerProxy(proxy, renameMap, normalizedProxyNames));
  if (!filteredProxies.length) {
    throw new Error('配置文件中未找到任何代理节点，请使用机场提供的配置文件进行覆写');
  }
  const ipVersionPreference = getIpVersionPreference();
  if (ipVersionPreference) {
    return filteredProxies.map(proxy => proxy['ip-version'] === ipVersionPreference ? proxy : {
      ...proxy,
      'ip-version': ipVersionPreference
    });
  }
  return filteredProxies;
}
function createRegionGroup(name, icon, proxies) {
  const generateRegionAutoSelectEnabled = ruleOptionsEnable.生成地区自动选择组;
  const hideManualSelectGroupEnabled = ruleOptionsEnable.隐藏地区手动选择组;
  if (generateRegionAutoSelectEnabled) {
    const urlTestName = `${name}-自动选择`;
    return [{
      ...urlTestBaseOption,
      name: urlTestName,
      proxies
    }, {
      ...selectBaseOption,
      name,
      icon,
      proxies: [...proxies, urlTestName],
      hidden: hideManualSelectGroupEnabled
    }];
  }
  return [{
    ...selectBaseOption,
    name,
    icon,
    proxies,
    hidden: hideManualSelectGroupEnabled
  }];
}
function buildRegionGroups(filteredProxies, customProxies) {
  const generateRateGroupEnabled = ruleOptionsEnable.生成倍率组;
  const generateHomeGroupEnabled = ruleOptionsEnable.生成家宽节点组;
  const regionGroups = Object.fromEntries(allRegionDefinitions.map(({name}) => [name, []]));
  const otherProxies = [];
  for (const proxy of [...filteredProxies, ...customProxies]) {
    const matchedRegions = getMatchedRegions(proxy.name);
    const isRegionProxy = matchedRegions.some(region => regionDefinitions.includes(region));
    for (const region of matchedRegions) {
      regionGroups[region.name].push(proxy.name);
    }
    if (!isRegionProxy) {
      otherProxies.push(proxy.name);
    }
  }
  const generatedRegionGroups = allRegionDefinitions.filter(r => regionGroups[r.name].length > 0 && (generateRateGroupEnabled || !rateRegionDefinitions.includes(r)) && (generateHomeGroupEnabled || !homeRegionDefinitions.includes(r))).flatMap(r => createRegionGroup(r.name, r.icon, regionGroups[r.name]));
  if (otherProxies.length > 0) {
    generatedRegionGroups.push(...createRegionGroup('其他节点', `${iconBaseUrl}WorldMap.svg`, otherProxies));
  }
  return generatedRegionGroups;
}
function buildCustomizeGroups(filteredProxies, customizeList = customizeProxies) {
  if (!customizeList.length) {
    return {
      customProxies: [],
      customProxyNames: [],
      customGroup: null
    };
  }
  const usedNames = new Set(filteredProxies.map(p => p.name));
  const customPrefix = '自建-';
  const customProxies = [];
  for (const proxy of customizeList) {
    const normalized = normalizeProxyName(proxy);
    let name = normalized.name;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    customProxies.push(name === normalized.name ? normalized : {
      ...normalized,
      name
    });
  }
  const customProxyNames = customProxies.map(p => p.name);
  const customGroup = {
    ...selectBaseOption,
    name: '自建节点',
    proxies: customProxyNames,
    icon: `${iconBaseUrl}Server.svg`
  };
  return {
    customProxies,
    customProxyNames,
    customGroup
  };
}
function buildFunctionalGroups(filteredProxies, generatedRegionGroups, customizeInfo) {
  const minimalModeEnabled = ruleOptionsEnable.极简模式;
  const blockForeignQuicEnabled = ruleOptionsEnable.屏蔽国外QUIC;
  const addAllNodesToServiceGroupsEnabled = ruleOptionsEnable.分流组添加所有节点;
  const hideManualSelectGroupEnabled = ruleOptionsEnable.隐藏地区手动选择组;
  const functionalGroups = [];
  const functionalRules = [];
  const finalRuleProviders = {
    ...baseRuleProviders
  };
  if (!blockForeignQuicEnabled) {
    delete finalRuleProviders.cn_additional;
  }
  const {customProxyNames = [], customGroup = null} = customizeInfo || ({});
  const filteredProxyNames = filteredProxies.map(p => p.name);
  const allProxiesNames = [...filteredProxyNames, ...customProxyNames];
  const groupNamesOfSelect = generatedRegionGroups.filter(g => g.type === 'select').map(g => g.name);
  const baseGroupNames = baseGroups.filter(g => ruleOptionsEnable[g.name]).map(g => g.name);
  const customGroupNames = customGroup ? [customGroup.name] : [];
  if (minimalModeEnabled) {
    const autoSelectGroupEnabled = ruleOptionsEnable.自动选择;
    const finalRuleProviders = {
      ...baseRuleProviders
    };
    if (!blockForeignQuicEnabled) delete finalRuleProviders.cn_additional;
    const defaultGroup = {
      ...selectBaseOption,
      name: '默认代理',
      proxies: [...allProxiesNames, ...autoSelectGroupEnabled ? ['自动选择'] : []],
      icon: `${iconBaseUrl}Proxy.svg`
    };
    const autoSelectGroup = {
      ...urlTestBaseOption,
      name: '自动选择',
      proxies: allProxiesNames,
      hidden: true
    };
    const directGroup = {
      ...selectBaseOption,
      name: '直连',
      proxies: [...directProxies.map(p => p.name)],
      icon: `${iconBaseUrl}China.svg`,
      hidden: true
    };
    const globalGroup = {
      ...selectBaseOption,
      name: 'GLOBAL',
      proxies: ['默认代理', ...customGroupNames, ...autoSelectGroupEnabled ? [autoSelectGroup.name] : [], '直连'],
      icon: `${iconBaseUrl}Global.svg`
    };
    return {
      globalGroup,
      functionalGroups: [defaultGroup, ...autoSelectGroupEnabled ? [autoSelectGroup] : []],
      functionalRules: [],
      finalRuleProviders,
      directGroup
    };
  }
  functionalGroups.push({
    ...selectBaseOption,
    name: '默认代理',
    proxies: [...groupNamesOfSelect, ...baseGroupNames, ...customGroupNames],
    icon: `${iconBaseUrl}Proxy.svg`
  });
  const orderedServiceConfigs = [...serviceConfigs.filter(svc => svc.name === 'AdBlock'), ...serviceConfigs.filter(svc => svc.name !== 'AdBlock')];
  for (const svc of orderedServiceConfigs) {
    if (!ruleOptionsEnable[svc.name]) continue;
    functionalRules.push(...svc.rules || []);
    Object.assign(finalRuleProviders, svc.providers || ({}));
  }
  for (const svc of serviceConfigs) {
    if (!ruleOptionsEnable[svc.name]) continue;
    let groupProxies = [];
    if (svc.includeAll) {
      groupProxies = [...allProxiesNames];
    } else if (svc.reject) {
      groupProxies = ['REJECT', 'REJECT-DROP', 'PASS'];
    } else {
      groupProxies = !addAllNodesToServiceGroupsEnabled ? ['默认代理', ...customGroupNames, ...baseGroupNames, ...groupNamesOfSelect, ...svc.direct ? ['直连'] : []] : ['默认代理', ...customGroupNames, ...baseGroupNames, ...groupNamesOfSelect, ...allProxiesNames, ...svc.direct ? ['直连'] : []];
    }
    functionalGroups.push({
      ...svc.baseOption,
      name: svc.name,
      icon: svc.icon,
      proxies: groupProxies,
      ...svc.defaultSelected !== undefined && ({
        'default-selected': svc.defaultSelected
      })
    });
  }
  functionalGroups.push({
    ...selectBaseOption,
    name: '漏网之鱼',
    proxies: ['默认代理', '直连', ...groupNamesOfSelect],
    icon: `${iconBaseUrl}Stack.svg`
  });
  const directGroup = {
    ...selectBaseOption,
    name: '直连',
    proxies: [...directProxies.map(p => p.name)],
    icon: `${iconBaseUrl}China.svg`,
    hidden: hideManualSelectGroupEnabled
  };
  const globalGroup = {
    ...selectBaseOption,
    name: 'GLOBAL',
    proxies: [...functionalGroups.map(g => g.name), ...customGroupNames, directGroup.name, ...generatedRegionGroups.map(g => g.name)],
    icon: `${iconBaseUrl}Global.svg`
  };
  return {
    globalGroup,
    functionalGroups,
    functionalRules,
    finalRuleProviders,
    directGroup
  };
}
const commonDnsList = ['223.5.5.5', '223.6.6.6', '2400:3200::1', '2400:3200:baba::1', 'alidns', '119.29.29.29', '119.28.28.28', '182.254.116.116', '182.254.118.118', '1.12.12.12', '120.53.53.53', '2402:4e00::', 'doh.pub', 'dot.pub', 'dns.pub', 'dnspod', '114.114.114.114', '114.114.115.115', '114.114.114.119', '114.114.115.119', '114.114.114.110', '114.114.115.110', '180.76.76.76', '2400:da00::6666', 'dns.baidu', '1.2.4.8', '210.2.4.8', '2001:dc7:1000::1', 'cnnic', '101.226.4.6', '218.30.118.6', '123.125.81.6', '140.207.198.6', '2400:8800:1::6', '2400:8800:2::6', 'doh.360', 'dot.360', 'dns.360', '180.184.1.1', '180.184.2.2', '117.50.11.11', '117.50.22.22', '52.80.66.66', '117.50.10.10', '52.80.52.52', '117.50.60.30', '52.80.60.30', 'onedns.net', '101.6.6.6', '2001:da8::666', '240c::6666', '240c::6644', '202.141.162.123', '202.141.178.13', '1.1.1.1', '1.0.0.1', '1.1.1.2', '1.0.0.2', '1.1.1.3', '1.0.0.3', '2606:4700:4700::1111', '2606:4700:4700::1001', '2606:4700:4700::1112', '2606:4700:4700::1002', '2606:4700:4700::1113', '2606:4700:4700::1003', 'dns.cloudflare', 'cloudflare-dns', 'one.one.one.one', '8.8.8.8', '8.8.4.4', '2001:4860:4860::8888', '2001:4860:4860::8844', 'dns.google', '9.9.9.9', '9.9.9.10', '9.9.9.11', '149.112.112.112', '149.112.112.10', '149.112.112.11', '2620:fe::fe', '2620:fe::9', 'quad9', '208.67.222.222', '208.67.220.220', '208.67.222.123', '208.67.220.123', '2620:119:35::35', '2620:119:53::53', '2620:119:35::123', '2620:119:53::123', 'opendns', '94.140.14.14', '94.140.15.15', '94.140.14.15', '94.140.15.16', '2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff', '2a10:50c0::bad1:ff', '2a10:50c0::bad2:ff', 'adguard', '76.76.2.0', '76.76.10.0', '76.76.19.19', '76.223.122.150', '185.228.168.9', '185.228.169.9', '185.228.168.10', '185.228.169.11', '185.228.168.168', '185.228.169.168', '2a0d:2a00:1::2', '2a0d:2a00:2::2', '77.88.8.8', '77.88.8.1', '2a02:6b8::feed:0ff', '2a02:6b8:0:1::feed:0ff', '156.154.70.1', '156.154.71.1', '156.154.70.2', '156.154.71.2', '2610:a1:1018::1', '2610:a1:1019::1', '194.242.2.2', '2a07:e340::2', '74.82.42.42', '2001:470:20::2', 'nextdns', 'dns.apple'];
const commonDnsRegex = new RegExp(commonDnsList.map(dns => dns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
const chinaDNS = ['223.5.5.5#DIRECT', '119.29.29.29#DIRECT'];
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
  const minimalModeEnabled = ruleOptionsEnable.极简模式;
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
    'fake-ip-filter': ['rule-set:private', 'rule-set:fakeip_filter', 'rule-set:geolocation-cn', ...minimalModeEnabled ? [] : ruleOptionsEnable['FCM'] ? ['rule-set:googlefcm'] : [], ...proxyFakeIpFilter],
    'default-nameserver': defaultDNS,
    'proxy-server-nameserver': proxyServerDNS,
    ...Object.keys(proxyServerPolicy).length > 0 && ({
      'proxy-server-nameserver-policy': proxyServerPolicy
    }),
    nameserver: foreignDNS,
    'nameserver-policy': {
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
function upstreamMain(config) {
  if (config['proxy-providers'] && Object.keys(config['proxy-providers']).length > 0) {
    throw new Error('配置文件中包含 proxy-providers，请使用机场提供的配置文件进行覆写');
  }
  const newConfig = {};
  const filteredProxies = filterAndNormalizeProxies(config);
  const {customProxies, customProxyNames, customGroup} = buildCustomizeGroups(filteredProxies);
  const generatedRegionGroups = ruleOptionsEnable.极简模式 ? [] : buildRegionGroups(filteredProxies, customProxies);
  const {globalGroup, functionalGroups, functionalRules, finalRuleProviders, directGroup} = buildFunctionalGroups(filteredProxies, generatedRegionGroups, {
    customProxyNames,
    customGroup
  });
  const {dns, hosts, proxies: mappedProxies} = buildDnsAndHostsConfig(config, filteredProxies);
  newConfig['dns'] = dns;
  newConfig['hosts'] = hosts;
  newConfig['mixed-port'] = 7890;
  newConfig['allow-lan'] = true;
  newConfig['ipv6'] = true;
  newConfig['mode'] = 'rule';
  newConfig['log-level'] = 'info';
  newConfig['bind-address'] = '*';
  newConfig['unified-delay'] = true;
  newConfig['tcp-concurrent'] = true;
  newConfig['keep-alive-interval'] = 60;
  newConfig['find-process-mode'] = 'strict';
  newConfig['external-controller'] = '127.0.0.1:9090';
  newConfig['external-ui'] = 'ui';
  newConfig['external-ui-url'] = 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip';
  newConfig['profile'] = {
    'store-selected': true,
    'store-fake-ip': true
  };
  newConfig['ntp'] = {
    enable: true,
    'write-to-system': false,
    server: 'ntp.aliyun.com',
    port: 123,
    interval: 60
  };
  newConfig['tun'] = {
    enable: true,
    stack: 'mips',
    'auto-route': true,
    'strict-route': true,
    'auto-redirect': true,
    'auto-detect-interface': true,
    'dns-hijack': ['any:53', 'tcp://any:53']
  };
  newConfig['proxies'] = [...mappedProxies, ...customProxies, ...directProxies];
  newConfig['proxy-groups'] = [globalGroup, ...functionalGroups, ...customGroup ? [customGroup] : [], directGroup, ...generatedRegionGroups];
  newConfig['rule-providers'] = finalRuleProviders;
  newConfig['rules'] = [...prefixRules, ...ruleOptionsEnable.屏蔽国外QUIC ? blockForeignQuic : [], ...functionalRules, 'RULE-SET,geolocation-!cn,默认代理', 'RULE-SET,cn_ip,直连', 'RULE-SET,private_ip,直连', `MATCH,${ruleOptionsEnable.极简模式 ? '默认代理' : '漏网之鱼'}`];
  return newConfig;
}
const customizationPolicy = {
  "groupType": "select",
  "groupFields": {
    "interval": 0
  },
  "omittedGroupFields": ["timeout", "lazy", "max-failed-times", "default-selected"],
  "groupCandidates": {
    "Proxy": ["订阅", "$regions", "$custom_groups", "$nodes"],
    "订阅": ["$nodes"],
    "Direct": ["DIRECT", "$direct_proxies"],
    "GitHub": ["Proxy", "订阅", "AI"],
    "Claude": ["Proxy", "订阅", "日本", "台湾", "其他节点"],
    "AI": ["Proxy", "日本", "台湾", "其他节点"],
    "porn": ["Proxy", "新加坡", "低倍率节点", "美国"],
    "Google": ["Proxy", "订阅"],
    "媒体": ["Proxy", "低倍率节点", "香港", "美国"],
    "YouTube": ["Proxy", "香港", "低倍率节点"],
    "Telegram": ["Proxy", "低倍率节点", "香港"],
    "PikPak": ["Proxy", "Direct", "低倍率节点", "香港"],
    "EHentai": ["Proxy", "美国", "新加坡", "香港"],
    "Final": ["Proxy", "Direct"]
  },
  "groupOrder": ["GLOBAL", "Proxy", "订阅", "Direct", "GitHub", "Claude", "AI", "porn", "Google", "媒体", "YouTube", "Telegram", "PikPak", "EHentai", "$regions", "$remaining", "Final"],
  "groupIcons": {
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
    "香港": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/HongKong.svg",
    "台湾": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Taiwan.svg",
    "新加坡": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Singapore.svg",
    "日本": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Japan.svg",
    "美国": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/America.svg",
    "其他节点": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/WorldMap.svg",
    "低倍率节点": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Available.svg",
    "Final": "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Stack.svg",
    "Claude": null,
    "媒体": null,
    "porn": null
  },
  "aliases": {
    "直连": "Direct",
    "DIRECT": "Direct",
    "默认代理": "Proxy",
    "漏网之鱼": "Final",
    "手动选择": "订阅"
  },
  "servicePlans": [{
    "name": "YouTube",
    "target": "YouTube",
    "section": "services",
    "rules": ["RULE-SET,youtube,YouTube"]
  }, {
    "name": "Twitch",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,twitch,媒体"]
  }, {
    "name": "Google",
    "target": "Google",
    "section": "services",
    "rules": ["RULE-SET,google,Google", "RULE-SET,google_ip,Google,no-resolve"]
  }, {
    "name": "Claude",
    "target": "Claude",
    "section": "services",
    "rules": ["RULE-SET,claude,Claude"]
  }, {
    "name": "AI",
    "target": "AI",
    "section": "services",
    "rules": ["RULE-SET,ai,AI"]
  }, {
    "name": "GitHub",
    "target": "GitHub",
    "section": "services",
    "rules": ["RULE-SET,github,GitHub"]
  }, {
    "name": "Microsoft",
    "target": "Proxy",
    "section": "services",
    "rules": ["RULE-SET,microsoft,Proxy", "RULE-SET,microsoft_ip,Proxy,no-resolve"]
  }, {
    "name": "AppleTV",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,appletv,媒体"]
  }, {
    "name": "Apple Podcasts",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,apple_podcasts,媒体"]
  }, {
    "name": "Apple",
    "target": "Proxy",
    "section": "services",
    "rules": ["RULE-SET,apple,Proxy", "RULE-SET,apple_ip,Proxy,no-resolve"]
  }, {
    "name": "Telegram",
    "target": "Telegram",
    "section": "services",
    "rules": ["RULE-SET,telegram,Telegram", "RULE-SET,telegram_ip,Telegram,no-resolve"]
  }, {
    "name": "Steam",
    "target": "Proxy",
    "section": "services",
    "rules": ["RULE-SET,steam,Proxy", "RULE-SET,steam_ip,Proxy,no-resolve"]
  }, {
    "name": "TikTok",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,tiktok,媒体", "RULE-SET,tiktok_ip,媒体,no-resolve"]
  }, {
    "name": "Twitter",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,twitter,媒体", "RULE-SET,twitter_ip,媒体,no-resolve"]
  }, {
    "name": "Meta",
    "target": "媒体",
    "section": "services",
    "rules": ["RULE-SET,meta,媒体", "RULE-SET,facebook_ip,媒体,no-resolve"]
  }, {
    "name": "PikPak",
    "target": "PikPak",
    "section": "services",
    "rules": ["RULE-SET,pikpak,PikPak"]
  }, {
    "name": "EHentai",
    "target": "EHentai",
    "section": "services",
    "rules": ["RULE-SET,ehentai,EHentai"]
  }, {
    "name": "porn",
    "target": "porn",
    "section": "services",
    "rules": ["RULE-SET,porn,porn"]
  }],
  "blocks": {
    "upstream_prefix": ["DOMAIN,cdn.jsdmirror.com,Direct", "RULE-SET,private,Direct", "RULE-SET,geolocation-cn,Direct", "RULE-SET,steam_cn,Direct", "RULE-SET,nvidia_cn,Direct", "RULE-SET,apple_cn,Direct", "RULE-SET,microsoft_cn,Direct", "DOMAIN,international-gfe.download.nvidia.com,Direct", "DOMAIN-SUFFIX,ctaiot.com,Direct"],
    "quic": ["AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((RULE-SET,cn_additional),(RULE-SET,cn_ip,no-resolve)))))),REJECT"],
    "custom_reject": ["RULE-SET,mcdn屏蔽,REJECT"],
    "services": [],
    "fallback": ["RULE-SET,geolocation-!cn,Proxy", "RULE-SET,cn_ip,Direct", "RULE-SET,private_ip,Direct"],
    "final": ["MATCH,Final"]
  },
  "blockOrder": ["upstream_prefix", "quic", "custom_reject", "services", "fallback", "final"],
  "globalOverrides": {
    "allow-lan": false,
    "log-level": "warning"
  },
  "omittedGlobalFields": ["bind-address", "ntp", "tun.auto-redirect"]
};
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
  const customGroupNames = nativeGroups.filter(group => !sourceNames.has(group.name) && !regionNames.has(group.name) && !['GLOBAL', '默认代理', '直连', '漏网之鱼'].includes(group.name)).map(group => group.name);
  const manualGroup = nativeGroups.find(group => group.name === '手动选择');
  const directNames = new Set(directProxies.map(proxy => proxy.name));
  const allNodes = manualGroup ? manualGroup.proxies.slice() : config.proxies.filter(proxy => !directNames.has(proxy.name)).map(proxy => proxy.name);
  const groups = [];
  const existing = new Set();
  for (const source of nativeGroups) {
    const name = alias(source.name);
    if (existing.has(name)) continue;
    existing.add(name);
    groups.push({
      ...source,
      name,
      type: policy.groupType,
      proxies: source.proxies.map(value => nativeGroupNames.has(value) ? alias(value) : value)
    });
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
  const functionalNames = new Set(policy.servicePlans.filter(item => ruleOptionsEnable[item.name]).map(item => item.target));
  for (const group of groups) {
    const requested = policy.groupCandidates[group.name];
    if (requested) {
      group.proxies = requested.flatMap(expand);
      if (ruleOptionsEnable.分流组添加所有节点 && functionalNames.has(group.name) && group.name !== 'Proxy') {
        group.proxies.push(...allNodes);
      }
    }
    group.proxies = unique(group.proxies).filter(name => name !== group.name && (groupNames.has(name) || proxyNames.has(name) || builtin.has(name)));
    if (Object.prototype.hasOwnProperty.call(policy.groupIcons, group.name)) {
      if (policy.groupIcons[group.name] === null) delete group.icon; else group.icon = policy.groupIcons[group.name];
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
    if (name === '$regions') regionalNames.forEach(add); else if (name === '$remaining') {
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
    for (const section of policy.blockOrder) {
      const rules = policy.servicePlans.filter(service => service.section === section && ruleOptionsEnable[service.name]).flatMap(service => service.rules);
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
