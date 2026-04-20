// 国际化初始化
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = chrome.i18n.getMessage(key);
});

document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.local.set({ apiKey: apiKey }, () => {
    const status = document.getElementById('status');
    status.textContent = chrome.i18n.getMessage('saveSuccess');
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

// 加载现有设置
chrome.storage.local.get(['apiKey'], (result) => {
  if (result.apiKey) {
    document.getElementById('apiKey').value = result.apiKey;
  }
});
