import { STRATEGIES, TRANSLATIONS, API_CONFIG, DEFAULT_SETTINGS } from './constants.js';

function updateUI(lang, strategy = 'domain') {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.getElementById('title').textContent = t.title;
    document.getElementById('section-api-lang').textContent = t.sectionApiLang;
    document.getElementById('section-strategy-prompt').textContent = t.sectionStrategyPrompt;
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
    document.getElementById('hint-prompt').textContent = t.hintPrompt;
    document.getElementById('label-prompt').textContent = t.labelPrompt;
    document.getElementById('save').textContent = t.save;
    document.getElementById('reset').title = t.reset;
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
        testStatus.className = 'status-pill status-error';
        testStatus.style.display = 'block';
        return;
    }

    const status = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const statusIcon = document.getElementById('status-icon');
    
    statusText.textContent = t.testing;
    statusIcon.innerHTML = `<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>`;
    status.className = 'status-toast status-loading show';
    testStatus.style.display = 'none';

    try {
        const response = await fetch(API_CONFIG.URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${keyToTest}`
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 5
            })
        });

        if (response.ok) {
            statusText.textContent = t.testSuccess;
            statusIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            status.className = 'status-toast status-success show';
            setTimeout(() => {
                status.classList.remove('show');
            }, 2000);
        } else {
            const errData = await response.json();
            status.classList.remove('show');
            testStatus.textContent = t.testError + (errData.error?.message || response.statusText);
            testStatus.className = 'status-pill status-error';
            testStatus.style.display = 'inline-block';
        }
    } catch (error) {
        testStatus.textContent = t.testError + error.message;
        testStatus.className = 'status-pill status-error';
        testStatus.style.display = 'inline-block';
    }
});

// 加载设置
function loadOptions() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
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
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        const t = TRANSLATIONS[language] || TRANSLATIONS.en;
        
        statusText.textContent = t.status;
        statusIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        status.className = 'status-toast status-success show';
        
        setTimeout(() => {
            status.classList.remove('show');
        }, 2000);
    });
});

// 重置 Prompt
document.getElementById('reset').addEventListener('click', () => {
    const lang = document.getElementById('language').value;
    const strategy = document.getElementById('strategy').value;
    const newPrompt = getPrompt(lang, strategy);
    document.getElementById('prompt').value = newPrompt;

    // 添加 Toast 提示
    const status = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const statusIcon = document.getElementById('status-icon');
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    
    statusText.textContent = lang === 'zh' ? "已恢复默认 Prompt" : "Restored default prompt";
    statusIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    status.className = 'status-toast status-success show';
    
    setTimeout(() => {
        status.classList.remove('show');
    }, 2000);
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

