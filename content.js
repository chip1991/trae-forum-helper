/**
 * TRAE 中文社区内容脚本
 * 负责与论坛页面交互，执行滚动和点赞操作
 */

let isRunning = false;
let viewedPostCount = 0;
let likedHeartCount = 0;
let scrollAndLikeActive = false;
const STORAGE_KEY = 'trae_forum_stats';

/**
 * 从存储中加载统计数据
 */
async function loadStatsFromStorage() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      viewedPostCount = result[STORAGE_KEY].viewedPostCount || 0;
      likedHeartCount = result[STORAGE_KEY].likedHeartCount || 0;
      console.log('[TRAE助手] 从存储加载统计数据:', { viewedPostCount, likedHeartCount });
    }
  } catch (error) {
    console.error('[TRAE助手] 加载统计数据失败:', error);
  }
}

/**
 * 保存统计数据到存储
 */
async function saveStatsToStorage() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        viewedPostCount,
        likedHeartCount
      }
    });
    console.log('[TRAE助手] 统计数据已保存:', { viewedPostCount, likedHeartCount });
  } catch (error) {
    console.error('[TRAE助手] 保存统计数据失败:', error);
  }
}

/**
 * 初始化悬浮框
 * 页面加载完成后调用，确保悬浮框常驻显示
 */
async function initOverlay() {
  console.log('[TRAE助手] 初始化悬浮框');
}
