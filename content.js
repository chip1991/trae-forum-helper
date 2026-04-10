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
  await loadStatsFromStorage();
  createOrUpdateOverlay(isRunning);
}

/**
 * 创建或更新悬浮框
 * @param {boolean} running 是否运行中
 */
function createOrUpdateOverlay(running = false) {
  let overlay = document.getElementById('trae-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'trae-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: rgba(0, 0, 0, 0.92) !important;
      color: white !important;
      padding: 18px 22px !important;
      border-radius: 12px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6) !important;
      min-width: 300px !important;
      line-height: 1.7 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    document.body.appendChild(overlay);
    console.log('[TRAE助手] 悬浮框已创建');
  }
  
  overlay.innerHTML = '';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'trae-toggle-btn';
  toggleBtn.textContent = running ? '⏹ 停止' : '▶ 开始';
  toggleBtn.style.cssText = `
    background: ${running ? '#ef4444' : '#10b981'} !important;
    color: white !important;
    border: none !important;
    padding: 10px 24px !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    width: 100% !important;
    margin-bottom: 14px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  `;
  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.transform = 'scale(1.02)';
    toggleBtn.style.boxShadow = `0 4px 12px rgba(${running ? '239, 68, 68' : '16, 185, 129'}, 0.4)`;
  });
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.transform = 'scale(1)';
    toggleBtn.style.boxShadow = 'none';
  });
  toggleBtn.addEventListener('click', () => {
    console.log('[TRAE助手] 点击按钮:', running ? '停止' : '开始');
    sendMessage({ action: running ? 'stop' : 'start' });
  });
  
  overlay.appendChild(toggleBtn);
  
  const statsDiv = document.createElement('div');
  statsDiv.id = 'trae-stats';
  statsDiv.innerHTML = `
    <div style="margin-bottom: 8px; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
      📄 已浏览帖子: <strong style="color: #60a5fa; font-size: 16px;">${viewedPostCount}</strong>
    </div>
    <div style="padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
      ❤️ 已点赞: <strong style="color: #f87171; font-size: 16px;">${likedHeartCount}</strong>
    </div>
  `;
  statsDiv.style.cssText = `
    font-size: 13px !important;
  `;
  overlay.appendChild(statsDiv);
  
  // 添加双击重置统计功能
  overlay.addEventListener('dblclick', async () => {
    if (confirm('确定要重置统计数据吗？')) {
      await resetStats();
    }
  });
  
  console.log('[TRAE助手] 悬浮框已更新，运行状态:', running, '浏览数:', viewedPostCount, '点赞数:', likedHeartCount);
}

/**
 * 更新统计信息
 * 重新渲染悬浮框以显示最新的统计数据
 */
function updateStats() {
  console.log('[TRAE助手] 更新统计信息');
  createOrUpdateOverlay(isRunning);
}

/**
 * 增加已浏览帖子计数
 * 每完成一个帖子浏览后调用
 */
async function incrementViewedPost() {
  viewedPostCount++;
  console.log('[TRAE助手] 已浏览帖子数更新:', viewedPostCount);
  await saveStatsToStorage();
  updateStats();
}

/**
 * 增加已点赞计数
 * @param {number} count 点赞数量，默认为1
 */
async function incrementLikedHeart(count = 1) {
  likedHeartCount += count;
  console.log('[TRAE助手] 已点赞数更新:', likedHeartCount);
  await saveStatsToStorage();
  updateStats();
}

/**
 * 检测当前页面类型
 * @returns {string} 'list' - 帖子列表页, 'post' - 帖子详情页, 'unknown' - 其他页面
 */
function detectPageType() {
  const url = window.location.href;
  let pageType = 'unknown';
  
  if (url.includes('forum.trae.cn/t/')) {
    pageType = 'post';
  } else if (url.includes('forum.trae.cn')) {
    pageType = 'list';
  }
  
  console.log('[TRAE助手] 检测页面类型:', pageType, 'URL:', url);
  return pageType;
}

/**
 * 获取帖子列表中的所有帖子链接
 * @returns {Array<string>} 帖子链接数组
 */
function getPostLinks() {
  console.log('[TRAE助手] 开始获取帖子链接');
  const links = [];
  const postElements = document.querySelectorAll('a[href*="/t/"]');
  
  console.log('[TRAE助手] 找到', postElements.length, '个包含 /t/ 的链接元素');
  
  postElements.forEach(element => {
    const href = element.href;
    if (href && !links.includes(href)) {
      links.push(href);
    }
  });
  
  console.log('[TRAE助手] 获取到', links.length, '个唯一帖子链接');
  return links;
}

/**
 * 查找所有爱心图标
 * 针对 Discourse 论坛结构优化，查找未点赞的爱心按钮
 * @returns {Array<HTMLElement>} 爱心按钮元素数组
 */
function findAllHeartIcons() {
  console.log('[TRAE助手] 开始查找爱心图标');
  const heartElements = [];
  
  // 方法1: 查找 Discourse 论坛的点赞按钮 (使用 data-action="like")
  const likeButtons1 = document.querySelectorAll('[data-action="like"]:not([data-liked="true"])');
  console.log('[TRAE助手] 方法1 - data-action="like" 找到:', likeButtons1.length, '个');
  
  // 方法2: 查找包含 heart SVG 但不包含 d-liked class 的按钮
  const allSvgs = document.querySelectorAll('svg');
  console.log('[TRAE助手] 页面共有', allSvgs.length, '个SVG元素');
  
  allSvgs.forEach((svg, index) => {
    // 检查是否是 heart 相关的 SVG
    const useHref = svg.querySelector('use')?.getAttribute('href');
    const hasHeartClass = svg.classList.contains('d-icon-heart') || 
                          (useHref && (useHref.includes('heart') || useHref === '#heart'));
    
    // 排除已经点赞过的
    const isLiked = svg.classList.contains('d-icon-d-liked');
    
    if (hasHeartClass && !isLiked) {
      console.log('[TRAE助手] 找到未点赞的爱心SVG', index, 'classList:', svg.className);
      
      // 向上查找可点击的父元素
      let parent = svg;
      let depth = 0;
      const maxDepth = 8;
      
      while (parent && parent !== document.body && depth < maxDepth) {
        const tagName = parent.tagName?.toLowerCase();
        const role = parent.getAttribute('role');
        const dataAction = parent.getAttribute('data-action');
        const isButton = tagName === 'button' || 
                         role === 'button' ||
                         dataAction === 'like' ||
                         parent.style.cursor === 'pointer' ||
                         parent.onclick !== null;
        
        if (isButton) {
          if (!heartElements.includes(parent)) {
            heartElements.push(parent);
            console.log('[TRAE助手] 找到可点击的爱心按钮:', tagName, 'data-action:', dataAction);
          }
          break;
        }
        
        parent = parent.parentElement;
        depth++;
      }
    }
  });
  
  // 去重
  const uniqueElements = [...new Set(heartElements)];
  console.log('[TRAE助手] 共找到', uniqueElements.length, '个未点赞的爱心按钮');
  return uniqueElements;
}

/**
 * 滚动到指定位置
 * @param {number} scrollTop 要滚动到的垂直位置（像素）
 */
function scrollToPosition(scrollTop) {
  console.log('[TRAE助手] 滚动到位置:', scrollTop);
  window.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  });
}

/**
 * 检查元素是否在视口中
 * @param {HTMLElement} element 要检查的DOM元素
 * @returns {boolean} 元素是否完全在当前视口中可见
 */
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  const isVisible = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
  console.log('[TRAE助手] 检查元素是否在视口中:', isVisible, '位置:', rect.top, rect.bottom);
  return isVisible;
}

/**
 * 随机延迟函数
 * 在指定的最小和最大毫秒数之间随机等待
 * @param {number} minMs 最小延迟时间（毫秒）
 * @param {number} maxMs 最大延迟时间（毫秒）
 * @returns {Promise<void>} 延迟结束后resolve的Promise
 */
function randomDelay(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log('[TRAE助手] 随机等待', delay, '毫秒 (', minMs, '-', maxMs, ')');
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 点击爱心图标
 * @param {HTMLElement} element 要点击的爱心元素
 * @returns {Promise<boolean>} 是否点击成功
 */
async function clickHeartIcon(element) {
  console.log('[TRAE助手] 准备点击爱心图标，元素:', element);
  
  // 尝试多种方式触发点击
  let clicked = false;
  
  // 方法1: 直接点击
  try {
    element.click();
    clicked = true;
    console.log('[TRAE助手] 方法1 - 直接点击成功');
  } catch (e) {
    console.log('[TRAE助手] 方法1失败:', e);
  }
  
  // 方法2: 触发 mousedown + mouseup + click 事件
  if (!clicked) {
    try {
      const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      element.dispatchEvent(mouseDown);
      element.dispatchEvent(mouseUp);
      element.dispatchEvent(click);
      clicked = true;
      console.log('[TRAE助手] 方法2 - 事件触发成功');
    } catch (e) {
      console.log('[TRAE助手] 方法2失败:', e);
    }
  }
  
  // 方法3: 查找内部的按钮或可点击元素
  if (!clicked) {
    try {
      const innerButton = element.querySelector('button, [role="button"], [data-action="like"]');
      if (innerButton) {
        innerButton.click();
        clicked = true;
        console.log('[TRAE助手] 方法3 - 内部元素点击成功');
      }
    } catch (e) {
      console.log('[TRAE助手] 方法3失败:', e);
    }
  }
  
  return clicked;
}

/**
 * 查找当前视口中未处理的爱心图标
 * @param {Set<string>} processedElements 已处理元素的唯一标识集合
 * @returns {Array<HTMLElement>} 未处理的爱心元素数组
 */
function findUnprocessedHeartsInViewport(processedElements) {
  const allHearts = findAllHeartIcons();
  const unprocessed = [];
  
  allHearts.forEach(element => {
    // 生成元素的唯一标识
    const elementId = getElementUniqueId(element);
    
    if (!processedElements.has(elementId) && isElementInViewport(element)) {
      unprocessed.push(element);
    }
  });
  
  return unprocessed;
}

/**
 * 获取元素的唯一标识
 * @param {HTMLElement} element DOM元素
 * @returns {string} 唯一标识
 */
function getElementUniqueId(element) {
  // 使用元素在文档中的路径作为标识
  let path = '';
  let current = element;
  
  while (current && current !== document.body) {
    const tag = current.tagName?.toLowerCase() || 'unknown';
    const index = Array.from(current.parentNode?.children || []).indexOf(current);
    path = `${tag}[${index}]/${path}`;
    current = current.parentElement;
  }
  
  return path;
}

/**
 * 开始滚动和点赞流程
 * 在帖子详情页执行滚动浏览和点赞操作 - 边滚动边点赞
 */
async function startScrollAndLike() {
  if (scrollAndLikeActive) {
    console.log('[TRAE助手] 滚动和点赞流程已经在运行中，跳过');
    return;
  }

  console.log('[TRAE助手] ===== 开始滚动和点赞流程 =====');
  scrollAndLikeActive = true;
  isRunning = true;
  createOrUpdateOverlay(true);

  const processedElements = new Set();
  let likedCount = 0;
  let lastScrollHeight = 0;
  let sameHeightCount = 0;
  const scrollStep = 400;
  const scrollDelay = 600;
  const maxScrollAttempts = 50;

  try {
    // 从顶部开始
    scrollToPosition(0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    for (let scrollCount = 0; scrollCount < maxScrollAttempts; scrollCount++) {
      if (!scrollAndLikeActive) {
        console.log('[TRAE助手] 流程被中断');
        break;
      }
      
      const currentScrollHeight = document.documentElement.scrollHeight;
      
      // 检查是否已滚动到底部
      if (currentScrollHeight === lastScrollHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 9) {
          console.log('[TRAE助手] 页面已滚动到底部，结束');
          break;
        }
      } else {
        sameHeightCount = 0;
        lastScrollHeight = currentScrollHeight;
      }
      
      // 查找当前视口中未处理的爱心
      const unprocessedHearts = findUnprocessedHeartsInViewport(processedElements);
      
      if (unprocessedHearts.length > 0) {
        console.log('[TRAE助手] 找到', unprocessedHearts.length, '个未处理的爱心图标');
        
        for (const element of unprocessedHearts) {
          if (!scrollAndLikeActive) break;
          
          const elementId = getElementUniqueId(element);
          
          // 标记为已处理
          processedElements.add(elementId);
          
          // 随机延迟后点击
          await randomDelay(800, 2000);
          
          if (!scrollAndLikeActive) break;
          
          try {
            const clicked = await clickHeartIcon(element);
            if (clicked) {
              likedCount++;
              console.log('[TRAE助手] 成功点赞，累计:', likedCount);
            }
          } catch (error) {
            console.error('[TRAE助手] 点击爱心图标发生异常:', error);
          }
        }
      }
      
      // 滚动一点
      const newScrollTop = Math.min(
        window.pageYOffset + scrollStep,
        document.documentElement.scrollHeight - window.innerHeight
      );
      
      console.log('[TRAE助手] 滚动进度:', scrollCount + 1, '/', maxScrollAttempts, 
                  '当前位置:', window.pageYOffset, 
                  '页面高度:', currentScrollHeight,
                  '已点赞:', likedCount);
      
      if (newScrollTop === window.pageYOffset) {
        // 没有滚动空间了
        sameHeightCount++;
        if (sameHeightCount >= 9) {
          console.log('[TRAE助手] 无法继续滚动，结束');
          break;
        }
      } else {
        scrollToPosition(newScrollTop);
      }
      
      await new Promise(resolve => setTimeout(resolve, scrollDelay));
    }

    console.log('[TRAE助手] ===== 点赞完成，共点赞:', likedCount, '=====');
    
    console.log('[TRAE助手] 更新统计数据');
    await incrementLikedHeart(likedCount);
    await incrementViewedPost();

    console.log('[TRAE助手] 等待3秒后继续下一个帖子');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('[TRAE助手] 滚动和点赞流程发生错误:', error);
  }

  console.log('[TRAE助手] ===== 滚动和点赞流程结束 =====');
  scrollAndLikeActive = false;
  sendMessage({ action: 'scrollAndLikeComplete' });
}

/**
 * 停止滚动和点赞流程
 * 中断当前正在进行的滚动和点赞操作
 */
function stopScrollAndLike() {
  console.log('[TRAE助手] 停止滚动和点赞流程');
  scrollAndLikeActive = false;
  isRunning = false;
  createOrUpdateOverlay(false);
}

/**
 * 与后台脚本通信
 * @param {object} message 要发送的消息对象
 */
function sendMessage(message) {
  console.log('[TRAE助手] 向后台发送消息:', message);
  chrome.runtime.sendMessage(message);
}

/**
 * 处理来自后台脚本的消息
 * 监听并响应background.js发送的各种指令
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TRAE助手] 收到来自后台的消息:', request);
  
  switch (request.action) {
    case 'getPageType':
      const pageType = detectPageType();
      sendResponse({ type: pageType });
      break;
      
    case 'getPostLinks':
      const links = getPostLinks();
      sendResponse({ links });
      break;
      
    case 'startScrollAndLike':
      startScrollAndLike();
      sendResponse({ success: true });
      break;
      
    case 'stopScrollAndLike':
      stopScrollAndLike();
      sendResponse({ success: true });
      break;
      
    case 'setRunning':
      console.log('[TRAE助手] 设置运行状态为:', request.running);
      isRunning = request.running;
      createOrUpdateOverlay(isRunning);
      sendResponse({ success: true });
      break;
  }
  
  return true;
});

/**
 * 重置统计数据
 * 双击悬浮框可以重置统计
 */
async function resetStats() {
  viewedPostCount = 0;
  likedHeartCount = 0;
  await saveStatsToStorage();
  updateStats();
  console.log('[TRAE助手] 统计数据已重置');
}

/**
 * 页面加载完成后初始化
 * 确保悬浮框在页面加载后立即显示
 */
if (document.readyState === 'loading') {
  console.log('[TRAE助手] 等待DOM加载完成');
  document.addEventListener('DOMContentLoaded', () => {
    initOverlay();
  });
} else {
  console.log('[TRAE助手] DOM已加载，直接初始化');
  initOverlay();
}

console.log('[TRAE助手] 内容脚本已加载完成');
