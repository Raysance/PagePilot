import { POPUP_TRANSLATIONS, STRATEGIES } from './constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 监听存储变化以实时更新语言
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.language) {
            updateContent(changes.language.newValue);
        }
    });

    const settings = await chrome.storage.sync.get({ language: 'zh', crossWindow: false, strategy: 'domain' });
    updateContent(settings.language);

    function updateContent(lang) {
        const t = POPUP_TRANSLATIONS[lang] || POPUP_TRANSLATIONS.en;
        document.getElementById('group-title').textContent = t.groupTitle;
        document.getElementById('extract-title').textContent = t.extractTitle;
        document.getElementById('organizeBtn').textContent = t.btn;
        document.getElementById('openOptions').textContent = t.options;
        document.getElementById('searchInput').placeholder = t.extractPlaceholder;
        document.getElementById('label-cross').textContent = t.crossWindow;
        document.getElementById('extractHintText').textContent = t.extractHint;
        document.getElementById('extractBtn').title = t.extractTooltip;

        // 动态填充策略选择框
        const strategySelect = document.getElementById('strategySelect');
        // 如果已经有选中的值，先存起来
        const previousVal = strategySelect.value;
        strategySelect.innerHTML = '';

        // 添加默认选项
        const optDefault = document.createElement('option');
        optDefault.value = 'current';
        optDefault.textContent = t.optCurrent;
        strategySelect.appendChild(optDefault);

        // 从 STRATEGIES 动态获取
        STRATEGIES.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name[lang] || s.name.en;
            strategySelect.appendChild(opt);
        });
        
        // 恢复之前选中的值，如果没有则默认 current
        if (previousVal) {
            strategySelect.value = previousVal;
        } else {
            strategySelect.value = 'current';
        }

        // 如果当前正在显示状态，也翻译状态文字
        const status = document.getElementById('status');
        if (status.className === 'loading') status.textContent = t.loading;
        if (status.className === 'success') status.textContent = t.success;
        if (status.className === 'error') status.textContent = t.error;
    }

    const btn = document.getElementById('organizeBtn');
    const status = document.getElementById('status');
    const optionsLink = document.getElementById('openOptions');
    const extractBtn = document.getElementById('extractBtn');
    const searchInput = document.getElementById('searchInput');
    const globalCrossWindow = document.getElementById('globalCrossWindow');
    const strategySelect = document.getElementById('strategySelect');

    // 初始化勾选框状态
    globalCrossWindow.checked = settings.crossWindow;

    // 监听勾选框变化并持久化
    globalCrossWindow.addEventListener('change', () => {
        chrome.storage.sync.set({ crossWindow: globalCrossWindow.checked });
    });

    btn.addEventListener('click', async () => {
        const settings = await chrome.storage.sync.get({ 
            language: 'zh',
            crossWindow: false,
            prompt: ''
        });
        const lang = settings.language;
        const t = POPUP_TRANSLATIONS[lang] || POPUP_TRANSLATIONS.en;

        const selectedStrategyId = strategySelect.value;
        let finalPrompt = settings.prompt;

        if (selectedStrategyId !== 'current') {
            const strategy = STRATEGIES.find(s => s.id === selectedStrategyId);
            if (strategy) {
                finalPrompt = strategy.prompts[lang] || strategy.prompts.en;
            }
        }

        btn.disabled = true;
        status.textContent = t.loading;
        status.className = 'loading';

        chrome.runtime.sendMessage({ 
            action: "organizeTabs",
            customPrompt: finalPrompt 
        }, (response) => {
            btn.disabled = false;
            if (response && response.success) {
                status.textContent = t.success;
                status.className = 'success';
                setTimeout(() => { window.close(); }, 1500);
            } else {
                status.textContent = (response && response.error) || t.error;
                status.className = 'error';
            }
        });
    });

    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    extractBtn.addEventListener('click', async () => {
        const keyword = searchInput.value.trim();
        const settings = await chrome.storage.sync.get({ 
            language: 'zh',
            apiKey: '',
            debugMode: false,
            crossWindow: false
        });
        const crossWindow = settings.crossWindow;
        const t = POPUP_TRANSLATIONS[settings.language] || POPUP_TRANSLATIONS.en;

        if (!keyword) return;
        if (!settings.apiKey) {
            status.textContent = t.apiKeyError;
            status.className = 'error';
            return;
        }

        extractBtn.disabled = true;
        status.textContent = t.loading;
        status.className = 'loading';

        const queryInfo = crossWindow ? { windowType: 'normal' } : { currentWindow: true, windowType: 'normal' };
        
        try {
            const tabs = await chrome.tabs.query(queryInfo);
            const tabData = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));

            const systemPrompt = settings.language === 'zh' 
                ? `你是一个标签页筛选助手。请根据用户的需求描述，从提供的标签页列表中筛选出匹配的标签页。
                    返回格式必须是纯 JSON 数组，仅包含匹配的 tabId。
                    例如：[1, 2, 3]
                    如果没有匹配项，返回 []。不要包含任何解释文字。`
                : `You are a tab filtering assistant. Filter the provided list of tabs based on the user's requirement.
                    Return MUST be a pure JSON array of matched tabIds.
                    Example: [1, 2, 3]
                    Return [] if no matches. Do not include any explanation.`;

            const response = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `用户需求：${keyword}\n\n标签页列表：${JSON.stringify(tabData)}` }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const aiContent = data.choices[0].message.content;
            
            if (settings.debugMode) console.log("AI Search Result:", aiContent);

            let matchedIds = [];
            try {
                const parsed = JSON.parse(aiContent);
                matchedIds = Array.isArray(parsed) ? parsed : (parsed.tabIds || []);
            } catch (e) {
                console.error("Parse error", e);
            }

            if (matchedIds.length > 0) {
                // 确保 ID 是有效的（有些模型可能返回字符串 ID）
                const validIds = matchedIds.map(id => parseInt(id)).filter(id => !isNaN(id));
                
                // 创建新窗口并将第一个匹配的标签页移动进去
                const newWindow = await chrome.windows.create({ tabId: validIds[0] });
                
                // 如果有多个匹配，将剩下的也移过去
                if (validIds.length > 1) {
                    await chrome.tabs.move(validIds.slice(1), { windowId: newWindow.id, index: -1 });
                }
                
                status.textContent = `${t.extractSuccess}: ${validIds.length}`;
                status.className = 'success';
            } else {
                status.textContent = t.noTabs;
                status.className = 'error';
            }
        } catch (err) {
            console.error(err);
            status.textContent = t.error;
            status.className = 'error';
        } finally {
            extractBtn.disabled = false;
        }
    });
});
