import { STRATEGIES, TRANSLATIONS } from './constants.js';

function updateUI(lang, strategy = 'domain') {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.getElementById('title').textContent = t.title;
    document.getElementById('label-lang').textContent = t.labelLang;
    document.getElementById('label-strategy').textContent = t.labelStrategy;
    
    const strategySelect = document.getElementById('strategy');
    const currentVal = strategySelect.value || strategy;
    strategySelect.innerHTML = '';
    STRATEGIES.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name[lang] || s.name.en;
        strategySelect.appendChild(opt);
    });
    strategySelect.value = currentVal;

    document.getElementById('label-apiKey').textContent = t.labelApiKey;
    document.getElementById('label-prompt').textContent = t.labelPrompt;
    document.getElementById('save').textContent = t.save;
    document.getElementById('reset').textContent = t.reset;
    document.getElementById('testApiKey').title = t.testBtn;
    document.getElementById('label-debug').textContent = t.labelDebug;
}

function getPrompt(lang, strategyId) {
    const strategy = STRATEGIES.find(s => s.id === strategyId) || STRATEGIES[0];
    return strategy.prompts[lang] || strategy.prompts.en;
}

// 测试 API Key
document.getElementById('testApiKey').addEventListener('click', async () => {
    const lang = document.getElementById('language').value;
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
        debugMode: false
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

    const dataToSave = {
        language,
        strategy,
        prompt,
        debugMode
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
        const t = TRANSLATIONS[language] || TRANSLATIONS.en;
        status.textContent = t.status;
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
    
    const isADefault = STRATEGIES.some(s => 
        Object.values(s.prompts).includes(currentPrompt)
    );
    
    if (isADefault || !currentPrompt) {
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
    
    const isADefault = STRATEGIES.some(s => 
        Object.values(s.prompts).includes(currentPrompt)
    );
    
    if (isADefault || !currentPrompt) {
        promptField.value = getPrompt(lang, strategy);
    }
});

document.addEventListener('DOMContentLoaded', loadOptions);

