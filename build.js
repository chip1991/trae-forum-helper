/**
 * TRAE 中文社区插件构建脚本
 * 验证插件文件的完整性
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  TRAE 中文社区自动浏览助手 - 构建验证');
console.log('========================================\n');

const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'package.json'
];

const optionalFiles = [
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

let allGood = true;

console.log('检查必需文件:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${file}`);
  if (!exists) allGood = false;
});

console.log('\n检查可选文件（图标）:');
optionalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✓' : '○';
  console.log(`  ${status} ${file}`);
});

console.log('\n验证 manifest.json:');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  console.log('  ✓ manifest.json 格式正确');
  console.log(`  插件名称: ${manifest.name}`);
  console.log(`  版本: ${manifest.version}`);
} catch (error) {
  console.log('  ✗ manifest.json 格式错误:', error.message);
  allGood = false;
}

console.log('\n========================================');
if (allGood) {
  console.log('  ✓ 构建验证通过！');
  console.log('\n使用说明:');
  console.log('1. 打开 Chrome 浏览器');
  console.log('2. 访问 chrome://extensions/');
  console.log('3. 开启"开发者模式"');
  console.log('4. 点击"加载已解压的扩展程序"');
  console.log('5. 选择当前文件夹即可');
} else {
  console.log('  ✗ 构建验证失败，请检查上述错误');
  process.exit(1);
}
console.log('========================================');
