/**
 * TRAE 中文社区后台脚本
 * 负责管理自动化浏览流程：点击开始→跳转到 forum.trae.cn/new→收集帖子→进入帖子→滚动点赞→返回论坛→下一个帖子
 */

let isRunning = false;
let postLinks = [];
let currentPostIndex = 0;
let currentTabId = null;
let VIEW_DURATION = 30;
const STORAGE_KEY = 'trae_forum_helper_settings';
const FORUM_URL = 'https://forum.trae.cn/new';

/**
 * 加载设置
 * 从本地存储中读取插件配置
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY] && result[STORAGE_KEY].viewDuration) {
      VIEW_DURATION = result[STORAGE_KEY].viewDuration;
      console.log('[TRAE助手] 已加载浏览时间设置:', VIEW_DURATION, '秒');
    }
  } catch (error) {
    console.error('[TRAE助手] 加载设置失败:', error);
  }
}

/**
 * 保存设置
 * 将插件配置保存到本地存储
 * @param {object} settings 要保存的设置对象
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    if (settings.viewDuration) {
      VIEW_DURATION = settings.viewDuration;
    }
    console.log('[TRAE助手] 已保存设置:', settings);
  } catch (error) {
    console.error('[TRAE助手] 保存设置失败:', error);
  }
}

/**
 * 插件安装时初始化
 * 加载设置并重置状态
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[TRAE助手] 插件已安装');
  await loadSettings();
  resetState();
});

/**
 * 插件启动时加载设置
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[TRAE助手] 插件启动');
  await loadSettings();
});

/**
 * 重置状态
 * 将所有状态变量重置为初始值
 */
function resetState() {
  console.log('[TRAE助手] 重置状态');
  isRunning = false;
  postLinks = [];
  currentPostIndex = 0;
  currentTabId = null;
}

/**
 * 获取活动标签页
 * @returns {Promise<chrome.tabs.Tab>} 当前活动的标签页对象
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[TRAE助手] 获取活动标签页:', tab?.id);
  return tab;
}

/**
 * 向内容脚本发送消息
 * @param {number} tabId 目标标签页ID
 * @param {object} message 要发送的消息对象
 * @returns {Promise<any>} 内容脚本的响应
 */
async function sendMessageToContent(tabId, message) {
  try {
    console.log('[TRAE助手] 向标签页', tabId, '发送消息:', message);
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('[TRAE助手] 发送消息到标签页', tabId, '失败:', error);
    throw error;
  }
}

/**
 * 开始自动化流程
 * 点击开始按钮后调用，启动完整的自动化浏览和点赞流程
 */
async function startAutomation() {
  if (isRunning) {
    console.log('[TRAE助手] 自动化流程已经在运行中');
    return;
  }

  console.log('[TRAE助手] ===== 开始自动化流程 =====');

  try {
    const tab = await getActiveTab();
    if (!tab) {
      console.log('[TRAE助手] 未找到活动标签页');
      return;
    }

    isRunning = true;
    currentTabId = tab.id;
    currentPostIndex = 0;

    console.log('[TRAE助手] 设置运行状态为true，当前标签页:', currentTabId);
    
    await sendMessageToContent(currentTabId, { action: 'setRunning', running: true });
    
    console.log('[TRAE助手] 开始导航到论坛页面');
    await navigateToForum();
  } catch (error) {
    console.error('[TRAE助手] 启动自动化流程失败:', error);
    stopAutomation();
  }
}

/**
 * 导航到论坛页面
 * 将标签页导航到 forum.trae.cn/new 并收集帖子链接
 */
async function navigateToForum() {
  if (!isRunning) {
    console.log('[TRAE助手] 流程已停止，取消导航');
    return;
  }

  console.log('[TRAE助手] 导航到论坛页面:', FORUM_URL);
  
  try {
    await chrome.tabs.update(currentTabId, { url: FORUM_URL });
    
    console.log('[TRAE助手] 等待页面加载...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('[TRAE助手] 开始收集帖子链接');
    await collectPostLinks();
    
    if (postLinks.length > 0) {
      console.log('[TRAE助手] 收集到', postLinks.length, '个帖子，开始处理');
      await processPost();
    } else {
      console.log('[TRAE助手] 未找到帖子链接，重新加载页面');
      await navigateToForum();
    }
  } catch (error) {
    console.error('[TRAE助手] 导航失败:', error);
    stopAutomation();
  }
}

/**
 * 收集帖子链接
 * 从当前论坛列表页获取所有帖子的URL
 */
async function collectPostLinks() {
  try {
    console.log('[TRAE助手] 向内容脚本请求帖子链接');
    const response = await sendMessageToContent(currentTabId, { action: 'getPostLinks' });
    postLinks = response.links || [];
    console.log('[TRAE助手] 收集到', postLinks.length, '个帖子链接:', postLinks);
  } catch (error) {
    console.error('[TRAE助手] 收集帖子链接失败:', error);
    throw error;
  }
}

/**
 * 处理当前帖子
 * 导航到帖子详情页并执行滚动和点赞操作
 */
async function processPost() {
  if (!isRunning) {
    console.log('[TRAE助手] 流程已停止，取消处理帖子');
    return;
  }

  if (currentPostIndex >= postLinks.length) {
    console.log('[TRAE助手] 当前页所有帖子处理完毕，重新加载论坛页面');
    currentPostIndex = 0;
    await navigateToForum();
    return;
  }

  const postUrl = postLinks[currentPostIndex];
  console.log('[TRAE助手] 正在处理帖子', currentPostIndex + 1, '/', postLinks.length, ':', postUrl);

  try {
    console.log('[TRAE助手] 导航到帖子:', postUrl);
    await chrome.tabs.update(currentTabId, { url: postUrl });
    
    console.log('[TRAE助手] 等待帖子页面加载...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('[TRAE助手] 开始滚动和点赞');
    await sendMessageToContent(currentTabId, { action: 'startScrollAndLike' });
  } catch (error) {
    console.error('[TRAE助手] 处理帖子失败:', error);
    currentPostIndex++;
    await navigateToForum();
  }
}

/**
 * 滚动和点赞完成后的处理
 * 内容脚本完成一个帖子的处理后调用，继续处理下一个帖子
 */
async function handleScrollAndLikeComplete() {
  if (!isRunning) {
    console.log('[TRAE助手] 流程已停止，取消后续处理');
    return;
  }

  console.log('[TRAE助手] 滚动和点赞完成，准备处理下一个帖子');

  try {
    currentPostIndex++;
    console.log('[TRAE助手] 当前帖子索引更新为:', currentPostIndex);
    await navigateToForum();
  } catch (error) {
    console.error('[TRAE助手] 返回论坛页面失败:', error);
    currentPostIndex++;
    await navigateToForum();
  }
}

/**
 * 停止自动化流程
 * 中断当前正在进行的自动化操作
 */
function stopAutomation() {
  console.log('[TRAE助手] ===== 停止自动化流程 =====');
  isRunning = false;
  
  if (currentTabId) {
    console.log('[TRAE助手] 通知内容脚本停止');
    sendMessageToContent(currentTabId, { action: 'setRunning', running: false }).catch(() => {});
  }
}

/**
 * 监听来自弹出页面和内容脚本的消息
 * 处理各种指令和状态查询
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TRAE助手] 收到消息:', request, '来自:', sender?.tab?.id || 'popup');

  switch (request.action) {
    case 'start':
      console.log('[TRAE助手] 收到开始指令');
      startAutomation();
      sendResponse({ success: true });
      break;

    case 'stop':
      console.log('[TRAE助手] 收到停止指令');
      stopAutomation();
      sendResponse({ success: true });
      break;

    case 'getStatus':
      console.log('[TRAE助手] 收到状态查询请求');
      sendResponse({
        isRunning,
        postCount: postLinks.length,
        currentPost: currentPostIndex + 1,
        viewDuration: VIEW_DURATION
      });
      break;

    case 'scrollAndLikeComplete':
      console.log('[TRAE助手] 收到滚动和点赞完成通知');
      handleScrollAndLikeComplete();
      sendResponse({ success: true });
      break;

    case 'getSettings':
      console.log('[TRAE助手] 收到设置查询请求');
      chrome.storage.local.get(STORAGE_KEY).then(result => {
        const settings = result[STORAGE_KEY] || { viewDuration: VIEW_DURATION };
        sendResponse({ success: true, settings });
      }).catch(error => {
        console.error('[TRAE助手] 获取设置失败:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'saveSettings':
      console.log('[TRAE助手] 收到保存设置请求:', request.settings);
      saveSettings(request.settings).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        console.error('[TRAE助手] 保存设置失败:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
  }

  return true;
});

console.log('[TRAE助手] 后台脚本已加载完成');
