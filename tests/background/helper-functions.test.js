// tests/background/helper-functions.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Helper Functions', () => {
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

  describe('Sync State Management', () => {
    test('getSyncScheduled should return current sync state', () => {
      global.syncScheduled = true;
      expect(background.getSyncScheduled()).toBe(true);
      
      global.syncScheduled = false;
      expect(background.getSyncScheduled()).toBe(false);
    });

    test('setSyncScheduled should update sync state', () => {
      background.setSyncScheduled(true);
      expect(global.syncScheduled).toBe(true);
      
      background.setSyncScheduled(false);
      expect(global.syncScheduled).toBe(false);
    });
  });

  describe('Pending Clips Cache Management', () => {
    test('getCachedPendingClips should return cached clips', () => {
      const testClips = [{ id: 1, front: 'test' }];
      global.cachedPendingClips = testClips;
      
      expect(background.getCachedPendingClips()).toEqual(testClips);
    });

    test('setCachedPendingClips should update cached clips', () => {
      const testClips = [{ id: 1, front: 'test' }];
      background.setCachedPendingClips(testClips);
      
      expect(global.cachedPendingClips).toEqual(testClips);
    });
  });

  describe('OpenAI Key Validation', () => {
    test('isValidOpenAiKey should validate API key format', () => {
      expect(background.isValidOpenAiKey('sk-valid-key-123456789')).toBe(true);
      expect(background.isValidOpenAiKey('invalid-key')).toBe(false);
      expect(background.isValidOpenAiKey('')).toBe(false);
      expect(background.isValidOpenAiKey(null)).toBe(false);
      expect(background.isValidOpenAiKey(undefined)).toBe(false);
    });
  });

  describe('HTML Stripping', () => {
    test('stripHtml should remove HTML tags', () => {
      const html = '<p>Test <b>bold</b> and <i>italic</i> text</p>';
      expect(background.stripHtml(html)).toBe('Test bold and italic text');
    });

    test('stripHtml should handle empty input', () => {
      expect(background.stripHtml('')).toBe('');
      expect(background.stripHtml(null)).toBe('');
      expect(background.stripHtml(undefined)).toBe('');
    });
  });

  describe('PDF URL Detection', () => {
    test('isPdfUrl should detect PDF URLs correctly', () => {
      expect(background.isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/file.PDF')).toBe(true);
      expect(background.isPdfUrl('chrome-extension://abc/viewer.html?file=doc.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/document.html')).toBe(false);
      expect(background.isPdfUrl('')).toBe(false);
      expect(background.isPdfUrl(null)).toBe(false);
      expect(background.isPdfUrl(undefined)).toBe(false);
    });
  });

  describe('Back HTML Generation', () => {
    test('generateBackWithSource should include source link', () => {
      const html = '<p>Test content</p>';
      const title = 'Test Page';
      const url = 'https://example.com';
      
      const result = background.generateBackWithSource(html, title, url);
      
      expect(result).toContain(html);
      expect(result).toContain(title);
      expect(result).toContain(url);
      expect(result).toContain('Source:');
    });

    test('generateBackWithSource should omit source when noSource is true', () => {
      const html = '<p>Test content</p>';
      const title = 'Test Page';
      const url = 'https://example.com';
      
      const result = background.generateBackWithSource(html, title, url, { noSource: true });
      
      expect(result).toBe(html);
      expect(result).not.toContain('Source:');
    });

    test('generateBackWithSource should handle empty inputs', () => {
      expect(background.generateBackWithSource('', '', '')).toContain('Source:');
      expect(background.generateBackWithSource('', '', '', { noSource: true })).toBe('');
    });
  });
}); 