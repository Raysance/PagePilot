const translations = {
    zh: {
        btn: "智能分组标签页",
        loading: "正在分析中...",
        success: "处理完成！",
        options: "设置",
        error: "出错了，请检查设置"
    },
    en: {
        btn: "Organize Tabs",
        loading: "Analyzing...",
        success: "Done!",
        options: "Options",
        error: "Error, check options"
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 监听存储变化以实时更新语言
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.language) {
            updateContent(changes.language.newValue);
        }
    });

    const settings = await chrome.storage.sync.get({ language: 'zh' });
    updateContent(settings.language);

    function updateContent(lang) {
        const t = translations[lang];
        document.getElementById('organizeBtn').textContent = t.btn;
        document.getElementById('openOptions').textContent = t.options;
        // 如果当前正在显示状态，也翻译状态文字
        const status = document.getElementById('status');
        if (status.className === 'loading') status.textContent = t.loading;
        if (status.className === 'success') status.textContent = t.success;
        if (status.className === 'error') status.textContent = t.error;
    }

    const btn = document.getElementById('organizeBtn');
    const status = document.getElementById('status');
    const optionsLink = document.getElementById('openOptions');

    btn.addEventListener('click', async () => {
        const settings = await chrome.storage.sync.get({ language: 'zh' });
        const lang = settings.language;
        const t = translations[lang];

        btn.disabled = true;
        status.textContent = t.loading;
        status.className = 'loading';

        chrome.runtime.sendMessage({ action: "organizeTabs" }, (response) => {
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
});
