// background-prompt-template.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script getPromptTemplate Function', () => {
  let background;
  beforeEach(() => {
    global.chrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
      },
      storage: { local: { get: jest.fn(), set: jest.fn() } },
      tabs: { sendMessage: jest.fn() },
      scripting: { executeScript: jest.fn() },
      contextMenus: { create: jest.fn(), onClicked: { addListener: jest.fn() } },
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setBadgeTextColor: jest.fn(), setTitle: jest.fn() },
      alarms: { create: jest.fn(), onAlarm: { addListener: jest.fn() } },
      notifications: { create: jest.fn() }
    };
    background = require('../../background.js');
  });

  test('should return selected prompt template', () => {
    const settings = {
      prompts: [
        { id: 'test1', template: 'Template 1' },
        { id: 'test2', template: 'Template 2' }
      ],
      selectedPrompt: 'test2'
    };
    const result = background.getPromptTemplate(settings);
    expect(result.template).toBe('Template 2');
    expect(result.id).toBe('test2');
  });

  test('should return first prompt if selected not found', () => {
    const settings = {
      prompts: [
        { id: 'test1', template: 'Template 1' },
        { id: 'test2', template: 'Template 2' }
      ],
      selectedPrompt: 'nonexistent'
    };
    const result = background.getPromptTemplate(settings);
    expect(result.template).toBe('Template 1');
    expect(result.id).toBe('test1');
  });

  test('should return default template if no prompts', () => {
    const settings = {
      prompts: [],
      selectedPrompt: 'test'
    };
    const result = background.getPromptTemplate(settings);
    expect(result.template).toContain('You are an expert Anki flash-card creator');
    expect(result.id).toBe('system-default-basic');
  });
}); 