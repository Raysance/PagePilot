// 国际化初始化
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = chrome.i18n.getMessage(key);
});

document.getElementById('sortBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = chrome.i18n.getMessage('statusAnalyzing');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'sortTabs' });
    
    if (response.success) {
      status.textContent = chrome.i18n.getMessage('statusDone');
    } else {
      status.textContent = response.error || 'Error';
    }
  } catch (error) {
    status.textContent = 'Service unavailable';
    console.error(error);
  }
});
