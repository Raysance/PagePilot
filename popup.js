import { POPUP_TRANSLATIONS, STRATEGIES, API_CONFIG, DEFAULT_SETTINGS, SEARCH_SYSTEM_PROMPTS } from './constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 监听存储变化以实时更新语言
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.language) {
            updateContent(changes.language.newValue);
        }
    });

    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    updateContent(settings.language);

    function updateContent(lang) {
        const t = POPUP_TRANSLATIONS[lang] || POPUP_TRANSLATIONS.en;
        document.getElementById('group-title').textContent = t.groupTitle;
        document.getElementById('extract-title').textContent = t.extractTitle;
        document.getElementById('organizeBtn').textContent = t.btn;
        document.getElementById('openOptions').textContent = t.options;
        document.getElementById('searchInput').placeholder = t.extractPlaceholder;
        document.getElementById('label-cross').textContent = t.crossWindow;
        document.getElementById('groupHintText').textContent = t.groupHint;
        document.getElementById('extractHintText').textContent = t.extractHint;
        document.getElementById('extractBtn').title = t.extractTooltip;

        const strategySelect = document.getElementById('strategySelect');
        const strategyMenu = document.getElementById('strategyMenu');
        const currentStrategyDisplay = document.getElementById('currentStrategyName');
        
        // 如果已经有选中的值，先存起来
        const previousVal = strategySelect.value;
        strategySelect.innerHTML = '';
        strategyMenu.innerHTML = '';

        const createOption = (val, text) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = text;
            strategySelect.appendChild(opt);

            const item = document.createElement('div');
            const isActive = val === (previousVal || 'current');
            item.className = 'strategy-item' + (isActive ? ' active' : '');
            item.textContent = text;
            item.dataset.value = val;
            if (isActive) currentStrategyDisplay.textContent = text;

            item.onclick = () => {
                strategySelect.value = val;
                currentStrategyDisplay.textContent = text;
                document.querySelectorAll('.strategy-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                strategyMenu.classList.remove('show');
            };
            strategyMenu.appendChild(item);
        };

        // 添加默认选项
        createOption('current', t.optCurrent);

        // 从 STRATEGIES 动态获取
        STRATEGIES.forEach(s => {
            createOption(s.id, s.name[lang] || s.name.en);
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
    const strategyToggle = document.getElementById('strategyToggle');
    const strategyMenu = document.getElementById('strategyMenu');

    // 切换菜单显示
    strategyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        strategyMenu.classList.toggle('show');
    });

    // 点击外部关闭菜单
    document.addEventListener('click', () => {
        strategyMenu.classList.remove('show');
    });

    // 初始化勾选框状态
    globalCrossWindow.checked = settings.crossWindow;

    // 监听勾选框变化并持久化
    globalCrossWindow.addEventListener('change', () => {
        chrome.storage.sync.set({ crossWindow: globalCrossWindow.checked });
    });

    btn.addEventListener('click', async () => {
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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

            const systemPrompt = SEARCH_SYSTEM_PROMPTS[settings.language] || SEARCH_SYSTEM_PROMPTS.en;

            const response = await fetch(API_CONFIG.URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: API_CONFIG.MODEL,
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
