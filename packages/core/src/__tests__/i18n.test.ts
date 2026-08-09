import { describe, it, expect, beforeEach } from 'vitest';
import { initI18n, t, changeLanguage, resetI18n } from '../i18n/index.js';

describe('i18n', () => {
  beforeEach(() => {
    resetI18n();
  });

  it('initializes with English by default', async () => {
    await initI18n();
    expect(t('common.confirm')).toBe('Confirm');
  });

  it('initializes with Chinese', async () => {
    await initI18n('zh');
    expect(t('common.confirm')).toBe('确认');
  });

  it('translates with interpolation', async () => {
    await initI18n();
    expect(t('provider.notFound', { id: 'abc' })).toBe('Provider not found: abc');
  });

  it('translates with interpolation in Chinese', async () => {
    await initI18n('zh');
    expect(t('provider.notFound', { id: 'abc' })).toBe('未找到 Provider: abc');
  });

  it('changes language', async () => {
    await initI18n('en');
    expect(t('common.save')).toBe('Save');
    await changeLanguage('zh');
    expect(t('common.save')).toBe('保存');
  });

  it('t() works without explicit init', () => {
    expect(t('common.cancel')).toBe('Cancel');
  });
});
