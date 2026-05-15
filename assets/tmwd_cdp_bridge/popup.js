document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('refresh');
  const savePortBtn = document.getElementById('savePort');
  btn.addEventListener('click', fetchCookies);
  savePortBtn.addEventListener('click', savePort);
  refreshBridgeStatus();
  fetchCookies();
});

async function refreshBridgeStatus() {
  const status = document.getElementById('bridgeStatus');
  const portInput = document.getElementById('port');
  try {
    const resp = await chrome.runtime.sendMessage({ cmd: 'status' });
    if (!resp?.ok) throw new Error(resp?.error || 'unknown');
    const data = resp.data || {};
    portInput.value = data.wsPort || 18765;
    status.textContent = `状态: ${data.wsConnected ? '已连接' : '未连接'} ${data.wsUrl || ''}`;
  } catch (e) {
    status.textContent = '状态读取失败: ' + e.message;
    status.className = 'error';
  }
}

async function savePort() {
  const portInput = document.getElementById('port');
  const portMsg = document.getElementById('portMsg');
  try {
    const port = Number(portInput.value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('端口必须是 1-65535');
    }
    if (port === 18767) {
      throw new Error('18767 是 agent-browser-cli API 端口，请换一个插件端口');
    }
    const resp = await chrome.runtime.sendMessage({ cmd: 'setPort', port });
    if (!resp?.ok) throw new Error(resp?.error || 'unknown');
    portMsg.textContent = `Success: 已保存端口 ${port}，正在使用新端口重连`;
    portMsg.className = 'status';
    await refreshBridgeStatus();
  } catch (e) {
    portMsg.textContent = '保存失败: ' + e.message;
    portMsg.className = 'error';
  }
}

async function fetchCookies() {
  const out = document.getElementById('out');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) { out.textContent = 'No active tab'; return; }
    const resp = await chrome.runtime.sendMessage({ cmd: 'cookies', url: tab.url });
    if (!resp?.ok) { out.textContent = 'Error: ' + (resp?.error || 'unknown'); return; }
    if (!resp.data.length) { out.textContent = '(no cookies)'; return; }
    // 展示带标记
    out.textContent = resp.data.map(c =>
      `${c.name}=${c.value}` + (c.httpOnly ? ' [H]' : '') + (c.secure ? ' [S]' : '') + (c.partitionKey ? ' [P]' : '')
    ).join('\n');
    // 自动复制 name=value; 格式到剪贴板
    const str = resp.data.map(c => `${c.name}=${c.value}`).join('; ');
    await navigator.clipboard.writeText(str);
  } catch (e) { out.textContent = 'Error: ' + e.message; }
}
