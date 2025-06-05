// tests/background/background-message-listener.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Message Listener', () => {
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

  describe('Message Handler', () => {
    test('should handle unknown action', async () => {
      const message = { action: 'unknown' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      await background.handleMessage(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown action: unknown'
      });
    });

    test('should handle getSelectionHtml action', async () => {
      const message = { action: 'getSelectionHtml' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      await background.handleMessage(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        html: '',
        error: 'Invalid routing - this should be handled by content script'
      });
    });

    test('should handle getPendingPdfCards action', async () => {
      const message = { action: 'getPendingPdfCards' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      await background.handleMessage(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        cards: []
      });
    });

    test('should handle removePdfCard action', async () => {
      // Set up the mock before importing the module
      global.testBackground = { removePdfCard: jest.fn().mockResolvedValue(true) };
      
      // Re-import the module to get the updated mock
      background = require('../../background.js');

      const message = { action: 'removePdfCard', cardId: 'test-id' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      // Call handleMessage and wait for the Promise to resolve
      await background.handleMessage(message, sender, sendResponse);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true
      });
    });
  });
}); 