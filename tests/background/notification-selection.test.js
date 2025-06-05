// tests/background/notification-selection.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Notification and Selection', () => {
  let background;
  let mockChrome;

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
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
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
    // Clear require cache and re-import background.js for each test
    delete require.cache[require.resolve('../../background.js')];
    background = require('../../background.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('notify function', () => {
    beforeEach(() => {
      // Clear lastError before each test
      global.chrome.runtime.lastError = null;
    });

    test('should send notification to tab', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback({ status: 'success' });
      });
      await background.notify(123, 'success', 'Test message');
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Test message' },
        expect.any(Function)
      );
    });

    test('should handle different status types', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback({ status: message.status });
      });
      await background.notify(123, 'error', 'Error message');
      await background.notify(123, 'info', 'Info message');
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should handle invalid tabId', async () => {
      const result = await background.notify(-1, 'success', 'Test message');
      expect(result).toBeUndefined();
    });

    test('should handle message port closed error', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'The message port closed before a response was received' };
        if (callback) callback(undefined);
        global.chrome.runtime.lastError = null;
      });
      await background.notify(123, 'success', 'Test message');
      // No script injection expected for this error
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    test('should handle receiving end does not exist error', async () => {
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        if (typeof callback === 'function') {
          callback(null); // Simulate invalid tab for script injection
        }
      });
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Receiving end does not exist' };
        if (callback) callback(undefined);
        global.chrome.runtime.lastError = null;
      });
      await background.notify(123, 'success', 'Test message');
      // No script injection expected if tab is invalid
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('getSelectionHtml function', () => {
    test('should get HTML selection from tab', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback({ html: '<p>Selected text</p>' });
        return Promise.resolve({ html: '<p>Selected text</p>' });
      });

      const result = await background.getSelectionHtml(123);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'getSelectionHtml' },
        expect.any(Function)
      );
      expect(result).toEqual({ html: '<p>Selected text</p>' });
    });

    test('should return error object on chrome runtime error', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Tab not found' };
        if (callback) callback(undefined);
        return Promise.resolve(undefined);
      });

      const result = await background.getSelectionHtml(123);

      expect(result).toEqual({ html: "", error: "Tab not found" });
    });

    test('should return error when no html in response', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      });

      const result = await background.getSelectionHtml(123);

      expect(result).toEqual({});
    });

    test('should handle invalid tabId', async () => {
      const result = await background.getSelectionHtml(-1);
      expect(result).toEqual({ html: "", error: "Invalid tabId" });
    });

    test('should inject content script if receiving end does not exist', async () => {
      let callCount = 0;
      // Mock chrome.tabs.get to return a valid tab
      mockChrome.tabs.get.mockImplementation((tabId, callback) => {
        global.chrome.runtime.lastError = null; // Clear lastError to prevent error leakage
        console.log('[TEST] tabs.get called with tabId:', tabId);
        if (typeof callback === 'function') {
          callback({ id: tabId, url: 'https://example.com', title: 'Test Page' });
        }
        return Promise.resolve({ id: tabId, url: 'https://example.com', title: 'Test Page' });
      });
      // Mock chrome.scripting.executeScript to simulate successful script injection
      mockChrome.scripting.executeScript.mockImplementation((options, callback) => {
        console.log('[TEST] scripting.executeScript called with options:', options);
        if (callback) callback([{ result: 'success' }]);
        return Promise.resolve([{ result: 'success' }]);
      });
      // Use a call counter to simulate the error path and retry logic
      let sendMessageCallCount = 0;
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        sendMessageCallCount++;
        if (sendMessageCallCount === 1) {
          // First call: simulate 'Receiving end does not exist'
          global.chrome.runtime.lastError = { message: 'Receiving end does not exist' };
          callback(undefined);
        } else if (message.action === 'ping') {
          // Ping after injection
          global.chrome.runtime.lastError = null;
          callback({ ready: true });
        } else {
          // Second getSelectionHtml call after injection
          global.chrome.runtime.lastError = null;
          callback({ html: '<p>Selected text</p>' });
        }
      });
      console.log('[TEST] Calling getSelectionHtml...');
      const result = await background.getSelectionHtml(123);
      console.log('[TEST] getSelectionHtml result:', result);
      // Verify script injection was attempted
      console.log('[TEST] Asserting executeScript was called...');
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith(
        {
          target: { tabId: 123 },
          files: ['contentScript.js']
        },
        expect.any(Function)
      );
      // Verify the final result
      console.log('[TEST] Asserting result is correct...');
      expect(result).toEqual({ html: '<p>Selected text</p>' });
    });
  });
}); 