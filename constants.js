export const API_CONFIG = {
    URL: "https://api.deepseek.com/chat/completions",
    MODEL: "deepseek-chat"
};

export const DEFAULT_SETTINGS = {
    apiKey: '',
    prompt: '',
    language: 'zh',
    strategy: 'domain',
    debugMode: false,
    crossWindow: false
};

export const STRATEGIES = [
    {
        id: 'domain',
        name: {
            zh: '按域名/网站分组',
            en: 'By Domain/Website'
        },
        prompts: {
            zh: `你是一个浏览器标签页管理助手。请分析以下提供的标签页列表（包含标题和URL），并根据标签页所属的【域名/网站名】将它们划分为合适的小组。
输出必须是纯 JSON 格式，结构如下：
[
  {"groupName": "域名或网站名", "tabIds": [1, 2, 3]}
]
注意：
1. 组名应为网站的名称或域名（例如：GitHub, Google, 百度, Stack Overflow）。
2. 必须包含所有提供的 tabId。
3. 仅返回 JSON，不要有任何解释文字。`,
            en: `You are a browser tab management assistant. Analyze the following list of tabs (titles and URLs) and group them based on their 【Domain/Website Name】.
Output MUST be in pure JSON:
[
  {"groupName": "Website Name", "tabIds": [1, 2, 3]}
]
Notes:
1. Group names should be the website or domain name (e.g., GitHub, Google, Wikipedia).
2. Include all provided tabIds.
3. Return ONLY JSON.`
        }
    },
    {
        id: 'topic',
        name: {
            zh: '按主题/内容分组',
            en: 'By Topic/Content'
        },
        prompts: {
            zh: `你是一个浏览器标签页管理助手。请深入分析以下提供的标签页列表（包含标题和解码后的URL），并根据标签页的【核心主题或内容分组】将它们划分为合适的小组。

分组逻辑指南：
1. 【标题与 URL 协同】：首先阅读标题。如果多个标签页标题相同（如都叫“首页”、“详情页”或“New Tab”），请务必利用 URL 路径的差异进行区分并归类。
2. 【URL 路径解析】：对于标题含糊的情况，请深入解析 URL 路径关键词（如 /docs/, /vortex/, /project/, /blog/）来判断真实主题。
3. 【内容归纳】：将具有相同业务属性或项目背景的标签页归为一类（例如：开发文档, 购物, 社交媒体, 工作项目）。
4. 【跨站关联】：即使是不同网站的页面，只要主题一致，也应归入同一组。

输出要求：
- 必须是纯 JSON 格式：[ {"groupName": "主题名", "tabIds": [1, 2]} ]
- 组名应简短有力。
- 必须包含所有提供的 tabId。
- 仅返回 JSON，不要有任何解释文字。`,
            en: `You are a browser tab management assistant. Deeply analyze the following list of tabs (titles and decoded URLs) and group them based on their 【Core Topic or Content Category】.

Categorization Guide:
1. 【Title & URL Synergy】: Read the title first. If multiple tabs have the same title (e.g., "Home", "Details", "New Tab"), you MUST use differences in the URL path to distinguish and categorize them.
2. 【URL Path Parsing】: If titles are vague, deeply parse keywords from the URL path (e.g., /docs/, /repo/, /blog/) to determine the true topic.
3. 【Content Induction】: Group tabs with the same business attributes or project backgrounds together (e.g., Dev Docs, Shopping, Social Media, Work).
4. 【Cross-Site Relation】: Pages from different sites with the same topic should be grouped together.

Output Requirements:
- Pure JSON ONLY: [ {"groupName": "Topic Name", "tabIds": [1, 2]} ]
- Group names must be concise.
- Include ALL provided tabIds.
- Return ONLY JSON.`
        }
    },
    {
        id: 'academic',
        name: {
            zh: '学术优先（非学术归一类）',
            en: 'Academic Priority'
        },
        prompts: {
            zh: `你是一个学术科研的浏览器标签页分组助手。请分析以下标签页列表，并按照以下逻辑进行分组：
1. 【学术相关】：将所有与学术研究、论文阅读（如 Arxiv, IEEE, Google Scholar）、科研工具、学术讨论相关的标签页，根据具体的【研究主题】（如：大语言模型， 计算机系统，计算机视觉等）分组。
2. 【学术之外】：将所有与学术无关的标签页（如：娱乐, 社交, 新闻）统一归入一个名为“常规/日常”的分组中。

输出必须是纯 JSON 格式：
[
  {"groupName": "具体学术主题 或 常规/日常", "tabIds": [1, 2, 3]}
]
注意：
1. 学术小组的名称应体现具体研究方向。
2. 必须包含所有提供的 tabId。
3. 仅返回 JSON。`,
            en: `You are an academic research assistant. Analyze the following list of tabs and group them using this logic:
1. 【Academic Related】: Group tabs related to research, papers (e.g., Arxiv, IEEE), research tools, or academic discussions into specific groups based on their 【Research Topic】 (e.g., Deep Learning, Physics, Data Analysis).
2. 【Non-Academic】: Group all other unrelated tabs (e.g., Entertainment, Social Media) into a single group named "General/Routine".

Output MUST be in pure JSON:
[
  {"groupName": "Specific Topic or General/Routine", "tabIds": [1, 2, 3]}
]
Notes:
1. Academic group names should reflect the specific research field.
2. Include all provided tabIds.
3. Return ONLY JSON.`
        }
    }
];

export const SEARCH_SYSTEM_PROMPTS = {
    zh: `你是一个标签页筛选助手。请根据用户的需求描述，从提供的标签页列表中筛选出匹配的标签页。
返回格式必须是纯 JSON 数组，仅包含匹配的 tabId。
例如：[1, 2, 3]
如果没有匹配项，返回 []。不要包含任何解释文字。`,
    en: `You are a tab filtering assistant. Filter the provided list of tabs based on the user's requirement.
Return MUST be a pure JSON array of matched tabIds.
Example: [1, 2, 3]
Return [] if no matches. Do not include any explanation.`
};

export const TRANSLATIONS = {
    zh: {
        title: "PagePilot 设置",
        sectionApiLang: "通用设置",
        sectionStrategyPrompt: "分组策略",
        labelLang: "界面与分组语言 (Language)",
        labelStrategy: "分组策略 (Grouping Strategy)",
        labelApiKey: "DeepSeek API Key",
        hintPrompt: "自定义 AI 分组逻辑。(不必更改)",
        labelPrompt: "自定义分组 Prompt (Custom Prompt)",
        save: "保存设置",
        reset: "恢复当前策略默认 Prompt",
        status: "设置已保存！",
        testBtn: "测试连接",
        testing: "正在测试...",
        testSuccess: "连接成功！",
        testError: "连接失败: ",
        labelDebug: "调试模式 (在控制台输出日志)",
        labelCrossWindow: "支持跨窗口整理 (Experimental)"
    },
    en: {
        title: "PagePilot Options",
        sectionApiLang: "General Settings",
        sectionStrategyPrompt: "Grouping Strategy",
        labelLang: "Interface & Grouping Language",
        labelStrategy: "Grouping Strategy",
        labelApiKey: "DeepSeek API Key",
        hintPrompt: "Custom AI grouping logic.(No need to modify)",
        labelPrompt: "Custom Grouping Prompt (Custom Prompt)",
        save: "Save Settings",
        reset: "Reset to Default Prompt",
        status: "Settings saved!",
        testBtn: "Test Connection",
        testing: "Testing...",
        testSuccess: "Connection successful!",
        testError: "Connection failed: ",
        labelDebug: "Enable Debug Mode (Log to console)",
        labelCrossWindow: "Support cross-window organization (Experimental)"
    }
};

export const POPUP_TRANSLATIONS = {
    zh: {
        appName: "PagePilot",
        groupTitle: "自动分组",
        extractTitle: "智能提取",
        btn: "一键智能分组",
        loading: "正在分析中...",
        success: "处理完成！",
        options: "⚙️ 设置",
        error: "出错了，请检查设置",
        extract: "智能提取",
        extractPlaceholder: "输入提取指令...",
        extractSuccess: "提取成功",
        noTabs: "未匹配到标签页",
        crossWindow: "跨窗口",
        extractHint: "例如：“Bilibili页面” 或 “xv6项目有关页面”",
        groupHint: "分析页面内容并自动分组",
        apiKeyError: "请先配置 API Key",
        extractTooltip: "将匹配项移至新窗口",
        optCurrent: "使用当前设置的分组策略"
    },
    en: {
        appName: "PagePilot",
        groupTitle: "AUTO GROUP",
        extractTitle: "SMART EXTRACT",
        btn: "One-Click Organize",
        loading: "Analyzing...",
        success: "Done!",
        options: "⚙️ Settings & Prompts",
        error: "Error, check settings",
        extract: "Smart Extract",
        extractPlaceholder: "Enter instruction...",
        extractSuccess: "Extracted",
        noTabs: "No matches",
        crossWindow: "Cross Window",
        extractHint: "e.g., 'Extract YouTube' or 'Find pages about sys'",
        groupHint: "Analyze content and organizes tabs into groups",
        apiKeyError: "Please configure API Key",
        extractTooltip: "Move matches to new window",
        optCurrent: "Use saved grouping strategy"
    }
};
