const defaultPromptDomain = `你是一个浏览器标签页管理助手。请分析以下提供的标签页列表（包含标题和URL），并根据标签页所属的【域名/网站名】将它们划分为合适的小组。
输出必须是纯 JSON 格式，结构如下：
[
  {"groupName": "域名或网站名", "tabIds": [1, 2, 3]}
]
注意：
1. 组名应为网站的名称或域名（例如：GitHub, Google, 百度, Stack Overflow）。
2. 必须包含所有提供的 tabId。
3. 仅返回 JSON，不要有任何解释文字。`;

const defaultPromptDomainEn = `You are a browser tab management assistant. Analyze the following list of tabs (titles and URLs) and group them based on their 【Domain/Website Name】.
Output MUST be in pure JSON:
[
  {"groupName": "Website Name", "tabIds": [1, 2, 3]}
]
Notes:
1. Group names should be the website or domain name (e.g., GitHub, Google, Wikipedia).
2. Include all provided tabIds.
3. Return ONLY JSON.`;

const defaultPromptTopic = `你是一个浏览器标签页管理助手。请分析以下提供的标签页列表（包含标题和URL），并根据标签页的【核心主题或内容分类】将它们划分为合适的小组。
输出必须是纯 JSON 格式，结构如下：
[
  {"groupName": "主题概括", "tabIds": [1, 2, 3]}
]
注意：
1. 组名应简短有力，反映该组标签的共同主题（例如：开发文档, 购物, 新闻, 工作项目）。
2. 必须包含所有提供的 tabId。
3. 仅返回 JSON，不要有任何解释文字。`;

const defaultPromptTopicEn = `You are a browser tab management assistant. Analyze the following list of tabs (titles and URLs) and group them based on their 【Core Topic or Content Category】.
Output MUST be in pure JSON:
[
  {"groupName": "Topic Name", "tabIds": [1, 2, 3]}
]
Notes:
1. Group names should be concise and reflect the shared topic (e.g., Dev Docs, Shopping, News, Work Project).
2. Include all provided tabIds.
3. Return ONLY JSON.`;

const defaultPromptAcademic = `你是一个学术科研的浏览器分类助手。请分析以下标签页列表，并按照以下逻辑进行分组：
1. 【学术相关】：将所有与学术研究、论文阅读（如 Arxiv, IEEE, Google Scholar）、科研工具、学术讨论相关的标签页，根据具体的【研究主题】（如：大语言模型， 计算机系统，计算机视觉等）分组。
2. 【学术之外】：将所有与学术无关的标签页（如：娱乐, 社交, 新闻）统一归入一个名为“常规/日常”的分组中。

输出必须是纯 JSON 格式：
[
  {"groupName": "具体学术主题 或 常规/日常", "tabIds": [1, 2, 3]}
]
注意：
1. 学术小组的名称应体现具体研究方向。
2. 必须包含所有提供的 tabId。
3. 仅返回 JSON。`;

const defaultPromptAcademicEn = `You are an academic research assistant. Analyze the following list of tabs and group them using this logic:
1. 【Academic Related】: Group tabs related to research, papers (e.g., Arxiv, IEEE), research tools, or academic discussions into specific groups based on their 【Research Topic】 (e.g., Deep Learning, Physics, Data Analysis).
2. 【Non-Academic】: Group all other unrelated tabs (e.g., Entertainment, Social Media) into a single group named "General/Routine".

Output MUST be in pure JSON:
[
  {"groupName": "Specific Topic or General/Routine", "tabIds": [1, 2, 3]}
]
Notes:
1. Academic group names should reflect the specific research field.
2. Include all provided tabIds.
3. Return ONLY JSON.`;

const translations = {
    zh: {
        title: "PagePilot 设置",
        labelLang: "界面与分组语言 (Language)",
        labelStrategy: "分组策略 (Grouping Strategy)",
        strategyDomain: "按域名/网站分组",
        strategyTopic: "按主题/内容分组",
        strategyAcademic: "学术优先（非学术归一类）",
        labelApiKey: "DeepSeek API Key",
        labelPrompt: "当前 Prompt 预览 (可自定义)",
        save: "保存设置",
        reset: "恢复当前策略默认 Prompt",
        status: "设置已保存！",
        testBtn: "测试连接",
        testing: "正在测试...",
        testSuccess: "连接成功！",
        testError: "连接失败: ",
        labelDebug: "开启调试模式 (在控制台输出日志)",
        labelCrossWindow: "支持跨窗口整理 (Experimental)"
    },
    en: {
        title: "PagePilot Options",
        labelLang: "Interface & Grouping Language",
        labelStrategy: "Grouping Strategy",
        strategyDomain: "By Domain/Website",
        strategyTopic: "By Topic/Content",
        strategyAcademic: "Academic Priority",
        labelApiKey: "DeepSeek API Key",
        labelPrompt: "Current Prompt Preview (Customizable)",
        save: "Save Settings",
        reset: "Reset to Default Prompt",
        status: "Settings saved!",
        testBtn: "Test Connection",
        testing: "Testing...",
        testSuccess: "Connection successful!",
        testError: "Connection failed: ",
        labelDebug: "Enable Debug Mode (Log to console)",
        labelCrossWindow: "Support Cross-Window (Experimental)"
    }
};

function updateUI(lang, strategy = 'domain') {
    const t = translations[lang] || translations.en;
    document.getElementById('title').textContent = t.title;
    document.getElementById('label-lang').textContent = t.labelLang;
    document.getElementById('label-strategy').textContent = t.labelStrategy;
    document.querySelector('#strategy option[value="domain"]').textContent = t.strategyDomain;
    document.querySelector('#strategy option[value="topic"]').textContent = t.strategyTopic;
    document.querySelector('#strategy option[value="academic"]').textContent = t.strategyAcademic;
    document.getElementById('label-apiKey').textContent = t.labelApiKey;
    document.getElementById('label-prompt').textContent = t.labelPrompt;
    document.getElementById('save').textContent = t.save;
    document.getElementById('reset').textContent = t.reset;
    document.getElementById('testApiKey').title = t.testBtn;
    document.getElementById('label-debug').textContent = t.labelDebug;
    document.getElementById('label-crossWindow').textContent = t.labelCrossWindow;
}

function getPrompt(lang, strategy) {
    if (strategy === 'topic') {
        return lang === 'zh' ? defaultPromptTopic : defaultPromptTopicEn;
    }
    if (strategy === 'academic') {
        return lang === 'zh' ? defaultPromptAcademic : defaultPromptAcademicEn;
    }
    return lang === 'zh' ? defaultPromptDomain : defaultPromptDomainEn;
}

// 测试 API Key
document.getElementById('testApiKey').addEventListener('click', async () => {
    const lang = document.getElementById('language').value;
    const t = translations[lang];
    const testStatus = document.getElementById('test-status');
    const apiKeyInput = document.getElementById('apiKey').value;
    
    let keyToTest = apiKeyInput;
    if (!keyToTest) {
        // 如果输入框为空，尝试从存储中获取
        const settings = await chrome.storage.sync.get('apiKey');
        keyToTest = settings.apiKey;
    }

    if (!keyToTest) {
        testStatus.textContent = lang === 'zh' ? "请输入 API Key" : "Please enter API Key";
        testStatus.style.color = '#d13438';
        testStatus.style.display = 'block';
        return;
    }

    testStatus.textContent = t.testing;
    testStatus.style.color = '#0078d4';
    testStatus.style.display = 'block';

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${keyToTest}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 5
            })
        });

        if (response.ok) {
            testStatus.textContent = t.testSuccess;
            testStatus.style.color = '#107c10';
        } else {
            const errData = await response.json();
            testStatus.textContent = t.testError + (errData.error?.message || response.statusText);
            testStatus.style.color = '#d13438';
        }
    } catch (error) {
        testStatus.textContent = t.testError + error.message;
        testStatus.style.color = '#d13438';
    }
});

// 加载设置
function loadOptions() {
    chrome.storage.sync.get({
        language: 'zh',
        strategy: 'domain',
        apiKey: '',
        prompt: '',
        debugMode: false,
        crossWindow: false
    }, (items) => {
        document.getElementById('language').value = items.language;
        document.getElementById('strategy').value = items.strategy;
        // 如果已有 API Key，显示掩码占位符
        if (items.apiKey) {
            document.getElementById('apiKey').placeholder = "••••••••••••••••";
        }
        
        // 如果 prompt 为空，根据语言和策略设置默认值
        const currentPrompt = items.prompt || getPrompt(items.language, items.strategy);
        document.getElementById('prompt').value = currentPrompt;
        
        document.getElementById('debugMode').checked = items.debugMode;
        document.getElementById('crossWindow').checked = items.crossWindow;
        updateUI(items.language, items.strategy);
    });
}

// 保存设置
document.getElementById('save').addEventListener('click', () => {
    const language = document.getElementById('language').value;
    const strategy = document.getElementById('strategy').value;
    const apiKeyInput = document.getElementById('apiKey').value;
    const prompt = document.getElementById('prompt').value;
    const debugMode = document.getElementById('debugMode').checked;
    const crossWindow = document.getElementById('crossWindow').checked;

    const dataToSave = {
        language,
        strategy,
        prompt,
        debugMode,
        crossWindow
    };

    // 只有当用户输入了新内容时才更新 apiKey
    if (apiKeyInput) {
        dataToSave.apiKey = apiKeyInput;
    }

    chrome.storage.sync.set(dataToSave, () => {
        updateUI(language, strategy);
        if (apiKeyInput) {
            document.getElementById('apiKey').value = '';
            document.getElementById('apiKey').placeholder = "••••••••••••••••";
        }
        const status = document.getElementById('status');
        status.textContent = translations[language].status;
        status.style.display = 'block';
        setTimeout(() => { status.style.display = 'none'; }, 2000);
    });
});

// 重置 Prompt
document.getElementById('reset').addEventListener('click', () => {
    const lang = document.getElementById('language').value;
    const strategy = document.getElementById('strategy').value;
    const newPrompt = getPrompt(lang, strategy);
    document.getElementById('prompt').value = newPrompt;
});

// 切换语言时预览
document.getElementById('language').addEventListener('change', (e) => {
    const lang = e.target.value;
    const strategy = document.getElementById('strategy').value;
    updateUI(lang, strategy);
    
    // 如果当前 Prompt 是某个默认值，则随之切换
    const promptField = document.getElementById('prompt');
    const currentPrompt = promptField.value;
    const allDefaults = [
        defaultPromptDomain, defaultPromptDomainEn,
        defaultPromptTopic, defaultPromptTopicEn,
        defaultPromptAcademic, defaultPromptAcademicEn
    ];
    
    if (allDefaults.includes(currentPrompt) || !currentPrompt) {
        promptField.value = getPrompt(lang, strategy);
    }
});

// 切换策略时预览
document.getElementById('strategy').addEventListener('change', (e) => {
    const strategy = e.target.value;
    const lang = document.getElementById('language').value;
    updateUI(lang, strategy);
    
    const promptField = document.getElementById('prompt');
    const currentPrompt = promptField.value;
    const allDefaults = [
        defaultPromptDomain, defaultPromptDomainEn,
        defaultPromptTopic, defaultPromptTopicEn,
        defaultPromptAcademic, defaultPromptAcademicEn
    ];
    
    if (allDefaults.includes(currentPrompt) || !currentPrompt) {
        promptField.value = getPrompt(lang, strategy);
    }
});

document.addEventListener('DOMContentLoaded', loadOptions);
// 界面语言加载
updateUI();
