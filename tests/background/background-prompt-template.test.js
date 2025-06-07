// tests/background/prompt-template.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Prompt Template', () => {
  let mockChrome;
  let background;

  beforeEach(() => {
    // Reset globals
    global.syncScheduled = false;
    global.cachedPendingClips = null;

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const defaultData = {
              pendingClips: [],
              deckName: 'Default',
              modelName: 'Basic',
              gptEnabled: true,
              openaiKey: 'test-key',
              prompts: [{ id: 'test', label: 'Test', template: 'Template {{text}}' }],
              selectedPrompt: 'test'
            };
            const result = typeof keys === 'object' ? { ...keys, ...defaultData } : defaultData;
            if (callback) callback(result);
            return Promise.resolve(result);
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            if (callback) callback();
            return Promise.resolve();
          })
        }
      },
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn((callback) => {
          callback({ os: 'mac' });
        }),
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        lastError: null
      },
      tabs: {
        get: jest.fn((tabId, callback) => {
          const mockTab = { id: tabId, url: 'https://example.com', discarded: false };
          if (callback) callback(mockTab);
          return Promise.resolve(mockTab);
        }),
        sendMessage: jest.fn((tabId, message, callback) => {
          if (callback) callback({ success: true });
          return Promise.resolve({ success: true });
        })
      },
      notifications: {
        create: jest.fn()
      },
      alarms: {
        create: jest.fn(),
        onAlarm: {
          addListener: jest.fn()
        }
      },
      contextMenus: {
        create: jest.fn(),
        onClicked: {
          addListener: jest.fn()
        }
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        setBadgeTextColor: jest.fn(),
        setTitle: jest.fn()
      },
      scripting: {
        executeScript: jest.fn((options, callback) => {
          if (callback) callback([{ result: 'success' }]);
          return Promise.resolve([{ result: 'success' }]);
        })
      }
    };
    global.chrome = mockChrome;

    // Import background module
    background = require('../../background.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('getPromptTemplate function', () => {
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

    test('should handle system default basic prompt', () => {
      const settings = {
        prompts: [],
        selectedPrompt: 'system-default-basic'
      };

      const result = background.getPromptTemplate(settings);

      expect(result.template).toContain('You are an expert Anki flash-card creator');
      expect(result.id).toBe('system-default-basic');
      expect(result.label).toBe('System Default - Basic Cards');
    });

    test('should handle system default cloze prompt', () => {
      const settings = {
        prompts: [],
        selectedPrompt: 'system-default-cloze'
      };

      const result = background.getPromptTemplate(settings);

      expect(result.template).toContain('You are an expert Anki flash-card creator');
      expect(result.id).toBe('system-default-basic');
      expect(result.label).toBe('System Default - Basic Cards');
    });

    test('should handle invalid settings object', () => {
      const result = background.getPromptTemplate(null);
      expect(result.template).toContain('You are an expert Anki flash-card creator');
      expect(result.id).toBe('system-default-basic');
    });

    test('should handle settings with invalid prompts array', () => {
      const settings = {
        prompts: null,
        selectedPrompt: 'test'
      };

      const result = background.getPromptTemplate(settings);

      expect(result.template).toContain('You are an expert Anki flash-card creator');
      expect(result.id).toBe('system-default-basic');
    });

    test('should handle settings with invalid prompt objects', () => {
      const settings = {
        prompts: [
          { id: 'test1' }, // Missing template
          { template: 'Template 2' } // Missing id
        ],
        selectedPrompt: 'test1'
      };

      const result = background.getPromptTemplate(settings);

      expect(result.template).toContain('You are an expert Anki flash-card creator');
      expect(result.id).toBe('system-default-basic');
    });
  });
}); 