import { API_PROVIDERS, DEFAULT_SETTINGS, POPUP_TRANSLATIONS } from './constants.js';

chrome.commands.onCommand.addListener((command) => {
    if (command === "organize_tabs") {
        handleShortcutOrganize();
    }
});

async function handleShortcutOrganize() {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const lang = settings.language;
    const t = POPUP_TRANSLATIONS[lang] || POPUP_TRANSLATIONS.en;
    
    // 显示加载中提示
    await injectToast(t.loading, "loading");
    
    // 执行一键智能分组，使用默认配置
    const result = await organizeTabsAction(null);
    
    // 更新结果提示
    if (result.success) {
        await injectToast(t.success, "success");
    } else {
        await injectToast(result.error ? `${t.error} (${result.error})` : t.error, "error");
    }
}

async function injectToast(message, type) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;
        
        const tab = tabs[0];
        const url = tab.url;
        // 无法在浏览器扩展页面或特殊页面注入脚本
        if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
            console.warn("Cannot inject toast into this page:", url);
            return;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (msg, type) => {
                let toast = document.getElementById('pagepilot-toast');
                if (toast && type === 'loading') {
                    toast.remove();
                    toast = null;
                }
                
                if (!toast) {
                    toast = document.createElement('div');
                    toast.id = 'pagepilot-toast';
                    toast.style.position = 'fixed';
                    toast.style.bottom = '20px';
                    toast.style.right = '20px';
                    toast.style.padding = '12px 20px';
                    toast.style.borderRadius = '8px';
                    toast.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    toast.style.zIndex = '2147483647';
                    toast.style.fontSize = '14px';
                    toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                    toast.style.transition = 'opacity 0.3s ease';
                    toast.style.color = 'white';
                    document.body.appendChild(toast);
                }
                
                toast.textContent = msg;
                toast.style.opacity = '1';
                
                if (type === 'error') {
                    toast.style.background = '#ef4444'; // Red
                } else if (type === 'success') {
                    toast.style.background = '#10b981'; // Green
                } else {
                    toast.style.background = '#3b82f6'; // Blue
                }
                
                if (type !== 'loading') {
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => {
                            if (toast.parentNode) toast.parentNode.removeChild(toast);
                        }, 300);
                    }, 3000);
                }
            },
            args: [message, type]
        });
    } catch (e) {
        console.error("Failed to inject toast:", e);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "organizeTabs") {
        organizeTabsAction(request.customPrompt).then(sendResponse);
        return true; // 保持异步
    } else if (request.action === "undo") {
        undoLastAction().then(sendResponse);
        return true;
    } else if (request.action === "saveUndoHistory") {
        saveToHistory(request.historyData).then(sendResponse);
        return true;
    } else if (request.action === "ungroupAll") {
        ungroupAllTabs().then(sendResponse);
        return true;
    } else if (request.action === "injectToast") {
        injectToast(request.message, request.type).then(sendResponse);
        return true;
    }
});

let undoHistory = [];

async function ungroupAllTabs() {
    try {
        // 固定在仅解绑当前活动窗口中的标签页组
        const queryInfo = { currentWindow: true, windowType: 'normal' };
        
        const tabs = await chrome.tabs.query(queryInfo);
        const tabIds = tabs.map(t => t.id);
        if (tabIds.length > 0) {
            await chrome.tabs.ungroup(tabIds).catch(() => {});
        }
        return { success: true };
    } catch (error) {
        console.error("Ungroup All failed:", error);
        return { success: false, error: error.message };
    }
}

async function saveToHistory(historyData) {
    undoHistory = [historyData]; // 仅保留当前最新的一步
    return { success: true };
}

async function undoLastAction() {
    if (undoHistory.length === 0) {
        return { success: false, error: "no_history" };
    }

    const lastAction = undoHistory.pop();
    try {
        if (lastAction.type === 'groups') {
            // 记录哪些 tab 需要被移动回哪些组
            const groupsToRestore = {};

            for (const item of lastAction.data) {
                const tab = await chrome.tabs.get(item.id).catch(() => null);
                if (tab) {
                    // 1. 移出当前可能存在的组（因为我们要恢复到旧的状态）
                    await chrome.tabs.ungroup(item.id).catch(() => {});
                    
                    // 2. 移动回到原来的窗口和索引
                    await chrome.tabs.move(item.id, { windowId: item.windowId, index: item.index });
                    
                    // 3. 收集原有的分组信息
                    if (item.groupId !== -1) {
                        if (!groupsToRestore[item.groupId]) {
                            groupsToRestore[item.groupId] = [];
                        }
                        groupsToRestore[item.groupId].push(item.id);
                    }
                }
            }

            // 4. 恢复原有的分组结构
            for (const oldGroupId in groupsToRestore) {
                const tabIds = groupsToRestore[oldGroupId];
                // 重新创建组并尝试恢复原名和颜色
                const newGroupId = await chrome.tabs.group({ tabIds: tabIds }).catch(() => null);
                if (newGroupId && lastAction.groupsInfo[oldGroupId]) {
                    const info = lastAction.groupsInfo[oldGroupId];
                    await chrome.tabGroups.update(newGroupId, { title: info.title, color: info.color });
                }
            }
        } else if (lastAction.type === 'extract') {
            // 撤销提取：将标签页移回原窗口，并关闭新创建的窗口
            for (const item of lastAction.data) {
                const tab = await chrome.tabs.get(item.id).catch(() => null);
                if (tab) {
                    await chrome.tabs.move(item.id, { windowId: item.windowId, index: item.index });
                }
            }
            // 关闭新窗口
            if (lastAction.newWindowId) {
                await chrome.windows.remove(lastAction.newWindowId).catch(() => {});
            }
        }
        return { success: true };
    } catch (error) {
        console.error("Undo failed:", error);
        return { success: false, error: error.message };
    }
}

async function organizeTabsAction(customPrompt) {
    try {
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

        if (!settings.apiKey) {
            const t = POPUP_TRANSLATIONS[settings.language] || POPUP_TRANSLATIONS.en;
            return { success: false, error: t.apiKeyError };
        }

        // 使用传递过来的自定义提示词，如果没有则使用存储中的
        let finalPrompt = customPrompt || settings.prompt;
        
        if (!finalPrompt) {
            const t = POPUP_TRANSLATIONS[settings.language] || POPUP_TRANSLATIONS.en;
            return { success: false, error: t.error }; // Reusing generic error
        }

        const queryInfo = settings.crossWindow 
            ? { windowType: 'normal' } 
            : { currentWindow: true, windowType: 'normal' };
        const tabs = await chrome.tabs.query(queryInfo);
        
        // 记录操作前的状态用于撤销，包括组名信息
        const groupsInfo = {};
        const tabList = await Promise.all(tabs.map(async t => {
            const tabData = { id: t.id, windowId: t.windowId, index: t.index, groupId: t.groupId };
            if (t.groupId !== -1 && !groupsInfo[t.groupId]) {
                const group = await chrome.tabGroups.get(t.groupId).catch(() => null);
                if (group) {
                    groupsInfo[t.groupId] = { title: group.title, color: group.color };
                }
            }
            return tabData;
        }));

        const historyData = {
            type: 'groups',
            data: tabList,
            groupsInfo: groupsInfo
        };

        // 增强 tabData 的结构，并对 URL 进行解码以让 AI 识别中文路径
        const tabData = tabs.map(t => {
            let decodedUrl = t.url;
            try {
                // 先将可能的非标准编码处理一下，再强制解码
                decodedUrl = decodeURIComponent(t.url.replace(/\+/g, ' '));
                // 如果解码后依然包含百分号且看起来像编码（例如二次编码的情况）
                if (decodedUrl.includes('%')) {
                    decodedUrl = decodeURIComponent(decodedUrl);
                }
            } catch (e) {
                // 如果解码失败，尝试简单的正则替换或保留原样
                console.warn("URL decode failed for:", t.url, e);
            }
            return { 
                id: t.id, 
                url: decodedUrl, 
                title: t.title,
                windowId: t.windowId 
            };
        });

        if (settings.debugMode) {
            console.log("--- API Request Debug ---");
            console.log("Provider:", settings.apiProvider);
            console.log("Target Language:", settings.language);
            console.log("System Prompt:", finalPrompt);
            console.log("Tabs Data (User Message):", tabData);
            console.log("----------------------------------");
        }

        const provider = API_PROVIDERS.find(p => p.id === settings.apiProvider) || API_PROVIDERS[0];
        const apiUrl = provider.id === 'custom' ? settings.customUrl : provider.url;
        const apiModel = provider.id === 'custom' ? settings.customModel : provider.model;

        const requestBody = {
            model: apiModel,
            messages: [
                { role: "system", content: finalPrompt },
                { role: "user", content: JSON.stringify(tabData) }
            ]
        };

        // 如果该提供商支持 JSON Mode，则添加该字段
        if (provider.supportJsonMode || provider.id === 'custom') {
            requestBody.response_format = { type: "json_object" };
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // 错误处理：检查 choices 数组是否存在且不为空
        if (!data.choices || data.choices.length === 0) {
            console.error("Invalid API Response:", data);
            throw new Error(data.error?.message || "API returned no choices");
        }

        let aiMessageContent = data.choices[0].message.content;

        // 自动取出 Markdown 代码块包裹的内容
        if (aiMessageContent.includes("```")) {
            const match = aiMessageContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match && match[1]) {
                aiMessageContent = match[1].trim();
            }
        }

        if (settings.debugMode) {
            console.log("--- API Response Debug ---");
            console.log("Full API Response:", data);
            console.log("AI Content (Processed):", aiMessageContent);
            console.log("-----------------------------------");
        }

        const result = JSON.parse(aiMessageContent);
        
        // 兼容某些模型可能返回的对象包裹情况
        const groups = Array.isArray(result) ? result : (result.groups || []);

        if (groups.length > 0) {
            await saveToHistory(historyData);
        }

        for (const group of groups) {
            if (group.tabIds && group.tabIds.length > 0) {
                // 如果是跨窗口整理，需要先处理标签页所属的窗口
                if (settings.crossWindow) {
                    // 获取这些 tab 现在的 windowId
                    const tabInfos = await Promise.all(group.tabIds.map(id => 
                        chrome.tabs.get(id).catch(() => null)
                    ));
                    
                    const validTabs = tabInfos.filter(t => t !== null);
                    if (validTabs.length === 0) continue;

                    // 找出出现次数最多的 windowId 作为目标窗口，避免频繁跨窗口移动
                    const windowCounts = {};
                    validTabs.forEach(t => {
                        windowCounts[t.windowId] = (windowCounts[t.windowId] || 0) + 1;
                    });
                    const targetWindowId = parseInt(Object.keys(windowCounts).reduce((a, b) => 
                        windowCounts[a] > windowCounts[b] ? a : b
                    ));

                    // 将不在目标窗口的标签移动过去
                    for (const tab of validTabs) {
                        if (tab.windowId !== targetWindowId) {
                            await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 });
                        }
                    }

                    // 在目标窗口中创建或加入组
                    const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
                    await chrome.tabGroups.update(groupId, { title: group.groupName });
                } else {
                    // 仅当前窗口逻辑
                    const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
                    await chrome.tabGroups.update(groupId, { title: group.groupName });
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Organize Error:", error);
        return { success: false, error: error.message };
    }
}
