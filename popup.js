/**
 * TRAE 中文社区弹出页面脚本
 * 负责用户界面交互
 */

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const postCountEl = document.getElementById('postCount');
const currentPostEl = document.getElementById('currentPost');
const viewDurationInput = document.getElementById('viewDuration');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

/**
 * 向后台脚本发送消息
 * @param {object} message 消息对象
 * @returns {Promise<any>} 响应
 */
async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('[TRAE助手] 发送消息失败:', error);
    throw error;
  }
}

/**
 * 更新UI状态
 * @param {object} status 状态信息
 */
function updateUI(status) {
  if (status.isRunning) {
    statusIndicator.classList.add('running');
    statusText.textContent = '运行中';
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusIndicator.classList.remove('running');
    statusText.textContent = '就绪';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  postCountEl.textContent = status.postCount || 0;
  currentPostEl.textContent = status.currentPost || 0;
}

/**
 * 刷新状态
 */
async function refreshStatus() {
  try {
    const status = await sendMessage({ action: 'getStatus' });
    updateUI(status);
  } catch (error) {
    console.error('[TRAE助手] 获取状态失败:', error);
  }
}

/**
 * 开始按钮点击事件
 */
startBtn.addEventListener('click', async () => {
  try {
    await sendMessage({ action: 'start' });
    await refreshStatus();
  } catch (error) {
    console.error('[TRAE助手] 启动失败:', error);
  }
});

/**
 * 停止按钮点击事件
 */
stopBtn.addEventListener('click', async () => {
  try {
    await sendMessage({ action: 'stop' });
    await refreshStatus();
  } catch (error) {
    console.error('[TRAE助手] 停止失败:', error);
  }
});

/**
 * 定期刷新状态
 */
setInterval(refreshStatus, 1000);

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const response = await sendMessage({ action: 'getSettings' });
    if (response.success && response.settings) {
      viewDurationInput.value = response.settings.viewDuration || 30;
    }
  } catch (error) {
    console.error('[TRAE助手] 加载设置失败:', error);
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  try {
    const viewDuration = parseInt(viewDurationInput.value) || 30;
    const response = await sendMessage({ 
      action: 'saveSettings', 
      settings: { viewDuration } 
    });
    
    if (response.success) {
      saveSettingsBtn.textContent = '已保存!';
      saveSettingsBtn.style.background = '#10b981';
      setTimeout(() => {
        saveSettingsBtn.textContent = '保存';
        saveSettingsBtn.style.background = '';
      }, 2000);
    } else {
      alert('保存失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('[TRAE助手] 保存设置失败:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 保存设置按钮点击事件
 */
saveSettingsBtn.addEventListener('click', saveSettings);

/**
 * 初始化
 */
refreshStatus();
loadSettings();

console.log('[TRAE助手] 弹出页面已加载');
