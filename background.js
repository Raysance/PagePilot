chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "organizeTabs") {
        organizeTabsAction(request.customPrompt).then(sendResponse);
        return true; // 保持异步
    }
});

async function organizeTabsAction(customPrompt) {
    try {
        const settings = await chrome.storage.sync.get({
            apiKey: '',
            prompt: '',
            language: 'zh',
            strategy: 'domain',
            debugMode: false,
            crossWindow: false
        });

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

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sortTabs') {
    handleSortTabs().then(sendResponse);
    return true; // 保持异步连接
  }
});

async function handleSortTabs() {
  try {
    const { apiKey, language } = await chrome.storage.local.get(['apiKey', 'language']);
    if (!apiKey) {
      return { success: false, error: chrome.i18n.getMessage('errorApiKey') };
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    // 过滤掉已经在组里但名字已经是正确分组的（可选优化），这里简单处理所有非固定标签
    const tabData = tabs.filter(t => !t.pinned).map(t => ({ id: t.id, title: t.title, url: t.url }));

    const userLang = language || chrome.i18n.getUILanguage();
    const isChinese = userLang.startsWith('zh');
    
    const prompt = isChinese 
      ? `你是一个浏览器标签管理专家 PagePilot。请将以下标签页组织成逻辑合理的分组，并决定它们的顺序。
语言要求：请使用中文作为分组名称。
必须返回一个 JSON 对象，其中包含一个名为 "groups" 的数组：
{
  "groups": [
    {"groupName": "分类名称", "tabIds": [1, 5, 2]}
  ]
}
标签列表：
${JSON.stringify(tabData)}`
      : `You are PagePilot, a browser tab management expert. Organize the following tabs into logical groups and determine their order.
Language: Please use English for group names.
Return a JSON object with a "groups" array:
{
  "groups": [
    {"groupName": "Category Name", "tabIds": [1, 5, 2]}
  ]
}
Tabs:
${JSON.stringify(tabData)}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant that organizes browser tabs." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    if (result.error) {
       throw new Error(result.error.message || 'DeepSeek API Error');
    }

    let contentStr = result.choices[0].message.content;
    // 鲁棒性处理：去除可能存在的 Markdown 代码块包裹
    contentStr = contentStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    let content;
    try {
      content = JSON.parse(contentStr);
    } catch (e) {
      console.error('Failed to parse JSON content:', contentStr);
      throw new Error('Invalid JSON format returned from AI');
    }
    
    // 统一处理返回结构
    let groups = [];
    if (Array.isArray(content)) {
      groups = content;
    } else if (content.groups && Array.isArray(content.groups)) {
      groups = content.groups;
    }

    if (groups.length === 0) {
      return { success: false, error: "No groups generated" };
    }

    for (const group of groups) {
      if (group.tabIds && group.tabIds.length > 0) {
        // 创建或移动到组
        const groupId = await chrome.tabs.group({ tabIds: group.tabIds.map(id => parseInt(id)) });
        await chrome.tabGroups.update(groupId, { title: group.groupName });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Sort error:', error);
    return { success: false, error: error.message };
  }
}
