import type { TranslationKeys } from './en.js';

export const zh: TranslationKeys = {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
  },
  provider: {
    notFound: '未找到 Provider: {{id}}',
    alreadyExists: 'Provider 已存在: {{name}}',
    apiKeyNotAvailable: '此平台不支持密钥链存储',
    applied: 'Provider "{{name}}" 已应用到 Agent',
    currentProvider: '当前 Provider: {{name}}',
  },
  workspace: {
    initialized: '工作区已初始化: {{path}}',
    integrityOk: '工作区完整性校验通过',
    integrityFailed: '工作区完整性校验失败: {{reason}}',
    missingDir: '缺少必需目录: {{dir}}',
    dbNotReadable: '数据库不可读',
  },
  sync: {
    symlinkCreated: '符号链接已创建: {{from}} -> {{to}}',
    symlinkRemoved: '符号链接已移除: {{path}}',
    brokenSymlinksFound: '发现 {{count}} 个失效符号链接',
    unsupportedPlatform: '不支持的平台: {{platform}}',
  },
  tag: {
    alreadyExists: '标签已存在: {{name}}',
    nameInUse: '标签名已被使用: {{name}}',
    merged: '标签 "{{source}}" 已合并到 "{{target}}"',
  },
  search: {
    noResults: '未找到 "{{query}}" 的相关结果',
  },
  plugin: {
    loaded: '已加载 {{count}} 个插件',
    incompatible: '插件 "{{name}}" 不兼容 (apiVersion {{version}})',
  },
};
