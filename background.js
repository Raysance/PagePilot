chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "organizeTabs") {
        organizeTabsAction().then(sendResponse);
        return true; // 保持异步
    }
});

async function organizeTabsAction() {
    try {
        const settings = await chrome.storage.sync.get({
            apiKey: '',
            prompt: '',
            language: 'zh'
        });

        if (!settings.apiKey) {
            return { success: false, error: settings.language === 'zh' ? "请先在设置中配置 API Key" : "Please configure API Key in options first" };
        }

        const tabs = await chrome.tabs.query({ currentWindow: true });
        const tabData = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${settings.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: settings.prompt },
                    { role: "user", content: JSON.stringify(tabData) }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        
        // 1. 清洗可能存在的 Markdown 代码块标签
        content = content.replace(/```json\s?|```/g, '').trim();

        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            return { success: false, error: settings.language === 'zh' ? "Json 格式解析错误，请检查 Prompt" : "Received an invalid JSON format, please check Prompt" };
        }
        
        // 2. 严格的结构化检验
        const groups = Array.isArray(result) ? result : (result.groups || []);
        if (!Array.isArray(groups) || groups.length === 0) {
            return { success: false, error: settings.language === 'zh' ? "标签分组无效" : "Failed to generate valid tab groups" };
        }

        // 3. 过滤并执行分组
        let processedCount = 0;
        for (const group of groups) {
            const tabIds = group.tabIds || group.tabID || group.ids; // 容错处理常用同义词
            const name = group.groupName || group.name || group.title;

            if (Array.isArray(tabIds) && tabIds.length > 0 && name) {
                const groupId = await chrome.tabs.group({ tabIds: tabIds.filter(id => typeof id === 'number') });
                await chrome.tabGroups.update(groupId, { title: name });
                processedCount++;
            }
        }

        if (processedCount === 0) {
            return { success: false, error: settings.language === 'zh' ? "数据格式无效" : "Invalid data structure" };
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
