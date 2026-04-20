const defaultPrompt = `你是一个浏览器标签页管理助手。请分析以下提供的标签页列表（包含标题和URL），并根据内容相关性将它们划分为合适的小组。
输出必须是纯 JSON 格式，结构如下：
[
  {"groupName": "组名", "tabIds": [1, 2, 3]}
]
注意：
1. 组名应简短有力。
2. 语言应遵循用户的设置（中文或英文）。
3. 必须包含所有提供的 tabId。
4. 仅返回 JSON，不要有任何解释文字。`;

const defaultPromptEn = `You are a browser tab management assistant. Analyze the following list of tabs (including titles and URLs) and group them based on content relevance.
The output MUST be in pure JSON format with the following structure:
[
  {"groupName": "Group Name", "tabIds": [1, 2, 3]}
]
Notes:
1. Group names should be concise.
2. Language should follow the user's setting (Chinese or English).
3. Include all provided tabIds.
4. Return ONLY JSON, no explanatory text.`;

const translations = {
    zh: {
        title: "PagePilot 设置",
        labelLang: "界面与分组语言 (Language)",
        labelApiKey: "DeepSeek API Key",
        labelPrompt: "自定义分析 Prompt (Custom Prompt)",
        save: "保存设置",
        reset: "恢复默认 Prompt",
        status: "设置已保存！",
        testBtn: "测试连接",
        testing: "正在测试...",
        testSuccess: "连接成功！",
        testError: "连接失败: "
    },
    en: {
        title: "PagePilot Options",
        labelLang: "Interface & Grouping Language",
        labelApiKey: "DeepSeek API Key",
        labelPrompt: "Custom Analysis Prompt",
        save: "Save Settings",
        reset: "Reset Default Prompt",
        status: "Settings saved!",
        testBtn: "Test Connection",
        testing: "Testing...",
        testSuccess: "Connection successful!",
        testError: "Connection failed: "
    }
};

function updateUI(lang) {
    const t = translations[lang] || translations.en;
    document.getElementById('title').textContent = t.title;
    document.getElementById('label-lang').textContent = t.labelLang;
    document.getElementById('label-apiKey').textContent = t.labelApiKey;
    document.getElementById('label-prompt').textContent = t.labelPrompt;
    document.getElementById('save').textContent = t.save;
    document.getElementById('reset').textContent = t.reset;
    document.getElementById('testApiKey').title = t.testBtn;
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
        apiKey: '',
        prompt: defaultPrompt
    }, (items) => {
        document.getElementById('language').value = items.language;
        // 如果已有 API Key，显示掩码占位符
        if (items.apiKey) {
            document.getElementById('apiKey').placeholder = "••••••••••••••••";
        }
        document.getElementById('prompt').value = items.prompt;
        updateUI(items.language);
    });
}

// 保存设置
document.getElementById('save').addEventListener('click', () => {
    const language = document.getElementById('language').value;
    const apiKeyInput = document.getElementById('apiKey').value;
    const prompt = document.getElementById('prompt').value;

    const dataToSave = {
        language,
        prompt
    };

    // 只有当用户输入了新内容时才更新 apiKey
    if (apiKeyInput) {
        dataToSave.apiKey = apiKeyInput;
    }

    chrome.storage.sync.set(dataToSave, () => {
        updateUI(language);
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
    document.getElementById('prompt').value = (lang === 'zh' ? defaultPrompt : defaultPromptEn);
});

// 切换语言时预览
document.getElementById('language').addEventListener('change', (e) => {
    updateUI(e.target.value);
});

document.addEventListener('DOMContentLoaded', loadOptions);
