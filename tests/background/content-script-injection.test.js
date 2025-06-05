// tests/background/content-script-injection.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Content Script Injection', () => {
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
          const mockTab = { 
            id: tabId, 
            url: 'https://example.com', 
            discarded: false,
            status: 'complete'
          };
          if (callback) callback(mockTab);
          return Promise.resolve(mockTab);
        }),
        sendMessage: jest.fn((tabId, message, callback) => {
          if (callback) callback({ success: true });
          return Promise.resolve({ success: true });
        })
      },
      scripting: {
        executeScript: jest.fn((details, callback) => {
          if (callback) callback([{ frameId: 0, result: true }]);
          return Promise.resolve([{ frameId: 0, result: true }]);
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

  describe('injectContentScriptAndWait function', () => {
    test('should successfully inject and verify content script', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'ping' && callback) {
          callback({ ready: true });
        }
        return Promise.resolve({ ready: true });
      });

      const result = await background.injectContentScriptAndWait(123);

      expect(result).toBeUndefined();
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123, 
        { action: 'ping' },
        expect.any(Function)
      );
    });

    test('should inject script if ping fails initially', async () => {
      let callCount = 0;
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callCount++;
        if (message.action === 'ping') {
          if (callCount === 1) {
            // First call fails
            global.chrome.runtime.lastError = { message: 'No listener' };
            if (callback) callback(undefined);
          } else {
            // Second call succeeds after injection
            delete global.chrome.runtime.lastError;
            if (callback) callback({ ready: true });
          }
        }
        return Promise.resolve({ ready: true });
      });

      const result = await background.injectContentScriptAndWait(123);

      expect(result).toBeUndefined();
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['contentScript.js']
      }, expect.any(Function));
    });

    test('should retry up to maxRetries', async () => {
      // Mock a valid tab
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        const mockTab = {
          id: 123,
          url: 'https://example.com',
          discarded: false,
          status: 'complete'
        };
        if (callback) callback(mockTab);
        return Promise.resolve(mockTab);
      });

      let callCount = 0;
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callCount++;
        // Simulate runtime error in callback context
        global.chrome.runtime.lastError = { message: 'Always fails' };
        if (callback) callback(undefined);
        // Clean up after callback
        delete global.chrome.runtime.lastError;
        return Promise.resolve(undefined);
      });
      mockChrome.scripting.executeScript.mockImplementation((details, callback) => {
        if (callback) callback([{ frameId: 0, result: true }]);
        return Promise.resolve([{ frameId: 0, result: true }]);
      });

      await expect(background.injectContentScriptAndWait(123, 2)).rejects.toThrow('Content script not ready after 2 attempts');
    }, 15000);

    test('should handle script injection failure', async () => {
      // Mock a valid tab
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        const mockTab = {
          id: 123,
          url: 'https://example.com',
          discarded: false,
          status: 'complete'
        };
        if (callback) callback(mockTab);
        return Promise.resolve(mockTab);
      });

      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        // Simulate runtime error in callback context
        global.chrome.runtime.lastError = { message: 'No listener' };
        if (callback) callback(undefined);
        delete global.chrome.runtime.lastError;
        return Promise.resolve(undefined);
      });
      mockChrome.scripting.executeScript.mockImplementation((details, callback) => {
        // Simulate injection failure
        global.chrome.runtime.lastError = { message: 'Injection failed' };
        if (callback) callback(null);
        delete global.chrome.runtime.lastError;
        return Promise.resolve(); // Don't reject, just call callback with error
      });

      await expect(background.injectContentScriptAndWait(123)).rejects.toThrow('Injection failed');
    }, 15000);

    test('should handle discarded tabs', async () => {
      // Discarded tab test: discarded=true, non-restricted URL
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        const mockTab = {
          id: 123,
          url: 'https://example.com',
          discarded: true,
          status: 'complete'
        };
        if (callback) callback(mockTab);
        return Promise.resolve(mockTab);
      });
      await expect(background.injectContentScriptAndWait(123))
        .rejects.toThrow('Invalid tab for script injection');
    }, 15000);

    test('should handle chrome-extension URLs', async () => {
      // Restricted URL test: discarded=false, restricted URL
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        const mockTab = {
          id: 123,
          url: 'chrome://settings',
          discarded: false,
          status: 'complete'
        };
        if (callback) callback(mockTab);
        return Promise.resolve(mockTab);
      });
      await expect(background.injectContentScriptAndWait(123))
        .rejects.toThrow('Cannot inject content script on restricted page');
    }, 15000);

    test('should handle invalid tab ID', async () => {
      await expect(background.injectContentScriptAndWait(-1))
        .rejects.toThrow('Invalid tab for script injection');
    });

    test('should handle missing tab URL', async () => {
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        const mockTab = {
          id: 123,
          discarded: false,
          status: 'complete'
        };
        if (callback) callback(mockTab);
        return Promise.resolve(mockTab);
      });
      await expect(background.injectContentScriptAndWait(123))
        .rejects.toThrow('Invalid tab for script injection');
    });

    test('should handle tab get error', async () => {
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        global.chrome.runtime.lastError = { message: 'Tab not found' };
        if (callback) callback(null);
        return Promise.resolve(null);
      });
      await expect(background.injectContentScriptAndWait(123))
        .rejects.toThrow('Invalid tab for script injection');
    });
  });
}); 