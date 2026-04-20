chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sortTabs') {
    handleSortTabs().then(sendResponse);
    return true; // 保持异步连接
  }
});

async function handleSortTabs() {
  try {
    const { apiKey } = await chrome.storage.local.get(['apiKey']);
    if (!apiKey) {
      return { success: false, error: chrome.i18n.getMessage('errorApiKey') };
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    // 过滤掉已经在组里但名字已经是正确分组的（可选优化），这里简单处理所有非固定标签
    const tabData = tabs.filter(t => !t.pinned).map(t => ({ id: t.id, title: t.title, url: t.url }));

    const userLang = chrome.i18n.getUILanguage();
    const prompt = `
You are PagePilot, a browser tab management expert. Organize the following tabs into logical groups and determine their order.
Language: Please use ${userLang.startsWith('zh') ? 'Chinese' : 'English'} for group names.
Return ONLY a plain JSON array of objects:
[
  {"groupName": "Category Name", "tabIds": [1, 5, 2]}
]
Tabs:
${JSON.stringify(tabData)}
`;

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
    const content = JSON.parse(result.choices[0].message.content);
    
    // 支持不同的返回结构（有些模型可能还是会包一层）
    const groups = Array.isArray(content) ? content : (content.groups || []);

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
