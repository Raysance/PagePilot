import { API_CONFIG, DEFAULT_SETTINGS } from './constants.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "organizeTabs") {
        organizeTabsAction(request.customPrompt).then(sendResponse);
        return true; // 保持异步
    }
});

async function organizeTabsAction(customPrompt) {
    try {
        const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

        if (!settings.apiKey) {
            return { success: false, error: settings.language === 'zh' ? "请先在设置中配置 API Key" : "Please configure API Key in options first" };
        }

        // 使用传递过来的自定义提示词，如果没有则使用存储中的
        let finalPrompt = customPrompt || settings.prompt;
        
        if (!finalPrompt) {
            return { success: false, error: "Prompt is missing. Please save settings first." };
        }

        const queryInfo = settings.crossWindow 
            ? { windowType: 'normal' } 
            : { currentWindow: true, windowType: 'normal' };
        const tabs = await chrome.tabs.query(queryInfo);
        
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
            console.log("--- DeepSeek API Request Debug ---");
            console.log("Target Language:", settings.language);
            console.log("System Prompt:", finalPrompt);
            console.log("Tabs Data (User Message):", tabData);
            console.log("----------------------------------");
        }

        const response = await fetch(API_CONFIG.URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: [
                    { role: "system", content: finalPrompt },
                    { role: "user", content: JSON.stringify(tabData) }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        
        if (settings.debugMode) {
            console.log("--- DeepSeek API Response Debug ---");
            console.log("Full API Response:", data);
            const aiMessageContent = data.choices[0].message.content;
            console.log("AI Content:", aiMessageContent);
            console.log("-----------------------------------");
        }

        const aiMessageContent = data.choices[0].message.content;
        const result = JSON.parse(aiMessageContent);
        
        // 兼容某些模型可能返回的对象包裹情况
        const groups = Array.isArray(result) ? result : (result.groups || []);

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
        console.error(error);
        return { success: false, error: error.message };
    }
}
