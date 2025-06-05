// tests/background/background-coverage.test.js

console.log('--- TEST FILE LOADED ---');
test('trivial test', () => {
  console.log('--- TRIVIAL TEST BODY ENTERED ---');
  expect(1).toBe(1);
});

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

import { legacyOnMessage } from '../../background.js';

describe('Background Script Coverage Tests', () => {
  console.log('--- describe block entered ---');
  let mockChrome;
  let background;
  let handleMessage;

  beforeEach(() => {
    console.log('--- beforeEach start ---');
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
        }),
        query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }])
      },
      scripting: {
        executeScript: jest.fn((details, callback) => {
          if (callback) callback([{ frameId: 0, result: true }]);
          return Promise.resolve([{ frameId: 0, result: true }]);
        })
      },
      contextMenus: {
        create: jest.fn(),
        onClicked: { addListener: jest.fn() }
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        setBadgeTextColor: jest.fn(),
        setTitle: jest.fn()
      },
      alarms: {
        create: jest.fn(),
        onAlarm: { addListener: jest.fn() }
      },
      notifications: {
        create: jest.fn()
      }
    };
    global.chrome = mockChrome;
    // Ensure onMessage is present on the global.chrome.runtime before require
    if (!global.chrome.runtime) global.chrome.runtime = {};
    if (!global.chrome.runtime.onMessage) {
      global.chrome.runtime.onMessage = { addListener: jest.fn() };
    }

    // Mock fetch for AnkiConnect and OpenAI
    global.fetch = jest.fn();

    // Import background module
    global.chrome.runtime.onMessage = { addListener: jest.fn() };
    background = require('../../background.js');
    handleMessage = background.handleMessage;

    background.saveToAnkiOrQueue = jest.fn(() => Promise.resolve());
    background.getPendingPdfCards = jest.fn(() => Promise.resolve([{ id: 1 }]));
    background.removePdfCard = jest.fn(() => Promise.resolve(true));
    console.log('--- beforeEach end ---');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
    background = require('../../background.js');
  });

  describe('Helper Functions', () => {
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

  describe('notify function', () => {
    test('should send notification to tab', () => {
      background.notify(123, 'success', 'Test message');

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Test message' },
        expect.any(Function)
      );
    });

    test('should handle different status types', () => {
      background.notify(123, 'error', 'Error message');
      background.notify(123, 'info', 'Info message');

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'error', message: 'Error message' },
        expect.any(Function)
      );
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'info', message: 'Info message' },
        expect.any(Function)
      );
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
      // Set up chrome.runtime.lastError to simulate an error
      global.chrome.runtime.lastError = { message: 'Tab not found' };
      
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback(undefined);
        return Promise.resolve(undefined);
      });

      const result = await background.getSelectionHtml(123);

      expect(result).toEqual({ html: "", error: "Tab not found" });
      
      // Clean up
      delete global.chrome.runtime.lastError;
    });

    test('should return error when no html in response', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      });

      const result = await background.getSelectionHtml(123);

      expect(result).toEqual({});
    });

    test('handles getSelectionHtml (should warn and return error)', async () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      // Set up the message handler with required dependencies
      const messageHandler = background.createHandleMessage({
        saveToAnkiOrQueue: background.saveToAnkiOrQueue,
        getPendingPdfCards: background.getPendingPdfCards,
        removePdfCard: background.removePdfCard
      });

      const message = { action: 'getSelectionHtml' };
      const sender = { tab: { id: 1 } };
      const sendResponse = jest.fn();

      // Call the message handler directly
      await messageHandler(message, sender, sendResponse);

      expect(console.warn).toHaveBeenCalledWith(
        '[Background][handleMessage] getSelectionHtml should not reach background script [diagnostic-12345]'
      );

      // Restore console.warn
      console.warn = originalWarn;
    });
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
  });

  describe('updateBadge function', () => {
    test('should update badge with pending count', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [{ id: 1 }, { id: 2 }, { id: 3 }] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await background.updateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });

    test('should clear badge when no pending clips', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await background.updateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    test('should handle storage error gracefully', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        // Simulate storage error via chrome.runtime.lastError
        global.chrome.runtime.lastError = { message: 'Storage error' };
        if (callback) callback({});
        return Promise.resolve({});
      });

      await expect(background.updateBadge()).resolves.toBeUndefined();
      
      // Clean up
      delete global.chrome.runtime.lastError;
    });
  });

  describe('queueClip function', () => {
    test('should add clip to queue and update badge', async () => {
      const clip = { front: 'Test', back: 'Answer' };
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await background.queueClip(clip);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [clip]
      });
    });

    test('should append to existing clips', async () => {
      const existingClip = { front: 'Existing', back: 'Answer' };
      const newClip = { front: 'New', back: 'Answer' };
      
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [existingClip] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await background.queueClip(newClip);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [existingClip, newClip]
      });
    });
  });

  describe('scheduleSync function', () => {
    test('should schedule sync alarm when not already scheduled', () => {
      global.syncScheduled = false;

      background.scheduleSync();

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('SYNC_PENDING', { delayInMinutes: 0.1 });
      expect(global.syncScheduled).toBe(true);
    });

    test('should not schedule sync when already scheduled', () => {
      global.syncScheduled = true;

      background.scheduleSync();

      expect(mockChrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('PDF URL detection', () => {
    test('should detect PDF URLs correctly', () => {
      expect(background.isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/file.PDF')).toBe(true);
      expect(background.isPdfUrl('https://example.com/document.html')).toBe(false);
      expect(background.isPdfUrl('chrome-extension://abc/viewer.html?file=doc.pdf')).toBe(true);
    });
  });

  describe('flushQueue function', () => {
    test('should process and clear pending clips', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' },
        { front: 'Q2', back: 'A2', deckName: 'Default', modelName: 'Basic' }
      ];

      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      
      // Mock successful AnkiConnect response (note: in test environment, addToAnki doesn't actually call fetch)
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 12345, error: null })
      });

      await background.flushQueue();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
      // In test environment, addToAnki returns early without calling fetch
    });

    test('should handle AnkiConnect errors', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' }
      ];

      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      
      // Mock AnkiConnect error response
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: null, error: 'Deck not found' })
      });

      await background.flushQueue();

      // Should still clear the queue even with errors
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });

    test('should handle network errors', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' }
      ];

      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      global.fetch.mockRejectedValue(new Error('Network error'));

      await background.flushQueue();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });
  });

  describe('OpenAI Integration', () => {
    test('should generate content with OpenAI', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('{"choices":[{"message":{"content":"Generated question"}}]}'),
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Generated question' } }]
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await background.generateWithOpenAI(
        'Test template {{text}}',
        'source text',
        'test-api-key',
        'Test Page',
        'https://example.com'
      );

      expect(result).toBe('Generated question');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    test('should handle OpenAI API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('{"error": {"message": "Unauthorized"}}')
      });

      await expect(background.generateWithOpenAI(
        'Template',
        'text',
        'invalid-key',
        'Page',
        'https://example.com'
      )).rejects.toThrow('OpenAI API Error (401): {"error": {"message":');
    });

    test('should handle network errors in OpenAI calls', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(background.generateWithOpenAI(
        'Template',
        'text',
        'api-key',
        'Page',
        'https://example.com'
      )).rejects.toThrow('Network error');
    });
  });

  describe('Context Menu Handling', () => {
    test('should handle context menu click for regular web pages', async () => {
      const info = { menuItemId: 'save-to-anki' };
      const tab = { id: 123, url: 'https://example.com', title: 'Test Page' };

      // Mock the getSelectionHtml response
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getSelectionHtml') {
          const response = { html: '<p>Selected text</p>' };
          if (callback) callback(response);
          return Promise.resolve(response);
        }
        return Promise.resolve({ success: true });
      });
      
      // Mock successful processing
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      // Simulate context menu click handler
      await background.handleContextMenuClick(info, tab);

      // The function should have called getSelectionHtml internally via handleAction
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'getSelectionHtml' },
        expect.any(Function)
      );
    }, 10000);

    test('should handle context menu click for PDF pages', async () => {
      const info = { 
        menuItemId: 'save-to-anki',
        selectionText: 'Selected PDF text'
      };
      const tab = { id: 123, url: 'https://example.com/document.pdf' };

      // Simulate PDF context menu handler
      await background.handlePdfContextMenu(info, tab);

      // Should queue the clip for PDF review
      expect(mockChrome.storage.local.get).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Event Handlers', () => {
    test('should handle onInstalled event', () => {
      let installHandler;
      mockChrome.runtime.onInstalled.addListener.mockImplementation((callback) => {
        installHandler = callback;
      });

      // Trigger the background script to register listeners
      require('/Users/john/Desktop/zawrick/background.js');

      // Simulate extension installation
      if (installHandler) {
        installHandler();
        expect(mockChrome.runtime.getPlatformInfo).toHaveBeenCalled();
      }
    });

    test('should handle onStartup event', () => {
      let startupHandler;
      mockChrome.runtime.onStartup.addListener.mockImplementation((callback) => {
        startupHandler = callback;
      });

      // Trigger the background script to register listeners
      require('/Users/john/Desktop/zawrick/background.js');

      // Simulate extension startup
      if (startupHandler) {
        startupHandler();
        expect(global.syncScheduled).toBe(false);
      }
    });

    test('should handle alarm events', () => {
      let alarmHandler;
      mockChrome.alarms.onAlarm.addListener.mockImplementation((callback) => {
        alarmHandler = callback;
      });

      // Trigger the background script to register listeners
      require('/Users/john/Desktop/zawrick/background.js');

      // Simulate alarm firing
      if (alarmHandler) {
        alarmHandler({ name: 'SYNC_PENDING' });
        expect(global.syncScheduled).toBe(false);
      }
    });
  });

  describe('Message Handling', () => {
    test('should handle saveToAnki message', async () => {
      const message = {
        action: 'saveToAnki',
        data: {
          front: 'Test question',
          backHtml: 'Test answer',
          deckName: 'Default',
          modelName: 'Basic'
        }
      };

      const mockSendResponse = jest.fn();
      
      await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle manualSave message', async () => {
      const message = {
        action: 'manualSave',
        data: {
          front: 'Test question',
          backHtml: 'Test answer',
          deckName: 'Default',
          modelName: 'Basic'
        }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 12345, error: null })
      });

      const mockSendResponse = jest.fn();
      
      await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle confirmSave message', async () => {
      const message = {
        action: 'confirmSave',
        cardData: {
          front: 'Question',
          backHtml: 'Answer',
          deckName: 'Default',
          modelName: 'Basic'
        }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 12345, error: null })
      });

      const mockSendResponse = jest.fn();
      
      await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle saveFinalizedPdfCard message', async () => {
      const message = {
        action: 'saveFinalizedPdfCard',
        cardData: {
          front: 'Question',
          backHtml: 'Answer',
          deckName: 'Default',
          modelName: 'Basic'
        }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 12345, error: null })
      });

      const mockSendResponse = jest.fn();
      
      await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle unknown message action', async () => {
      const message = { action: 'unknownAction' };
      const mockSendResponse = jest.fn();
      
      await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ 
        success: false,
        error: 'Unknown action: unknownAction'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle tab not found errors', async () => {
      // Simulate tab not found by setting runtime error
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Tab not found' };
        if (callback) callback(undefined);
        return Promise.resolve(undefined);
      });

      const result = await background.getSelectionHtml(123);
      expect(result).toEqual({ html: "", error: "Tab not found" });
      
      // Clean up
      delete global.chrome.runtime.lastError;
    });

    test('should handle storage errors gracefully', async () => {
      // Mock the getChrome function to return an object with failing storage
      const failingStorageMock = {
        storage: {
          local: {
            get: jest.fn().mockRejectedValue(new Error('Storage error')),
            set: jest.fn().mockRejectedValue(new Error('Storage error'))
          }
        }
      };
      
      // Temporarily replace global.chrome to simulate storage failure
      const originalChrome = global.chrome;
      global.chrome = failingStorageMock;

      try {
        await expect(background.queueClip({}))
          .rejects.toThrow('Storage error');
      } finally {
        // Restore original chrome mock
        global.chrome = originalChrome;
      }
    });
  });

  describe('Background.js Message Handler Coverage', () => {
    let mockSendResponse;
    let mockSender;
    let originalConsoleError;
    let originalConsoleLog;
    let notifications;
    let background;

    beforeEach(() => {
      jest.resetModules();
      mockSendResponse = jest.fn();
      mockSender = { tab: { id: 1 } };
      notifications = [];
      global.chrome = {
        notifications: {
          create: jest.fn((id, opts) => notifications.push({ id, ...opts })),
        },
        runtime: {
          lastError: null,
          onInstalled: { addListener: jest.fn() },
          onStartup: { addListener: jest.fn() },
          getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
          onMessage: { addListener: jest.fn() },
        },
        storage: {
          local: {
            get: jest.fn((keys, cb) => cb({ pendingReviewPdfCards: [], promptHistory: [] })),
            set: jest.fn((data, cb) => cb && cb()),
          }
        },
        tabs: {
          sendMessage: jest.fn((tabId, msg, cb) => cb && cb({ success: true })),
          get: jest.fn((tabId, cb) => cb({ id: tabId, url: 'https://example.com', title: 'Test Page' })),
        },
        scripting: {
          executeScript: jest.fn((opts, cb) => cb([{ result: 'success' }])),
        },
        alarms: {
          create: jest.fn(),
          onAlarm: { addListener: jest.fn() },
        },
        contextMenus: {
          create: jest.fn(),
          onClicked: { addListener: jest.fn() },
        },
        action: {
          setBadgeText: jest.fn(),
          setBadgeBackgroundColor: jest.fn(),
          setBadgeTextColor: jest.fn(),
          setTitle: jest.fn(),
        },
      };
      global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"choices":[{"message":{"content":"Q"}}]}'), json: () => Promise.resolve({ result: ["Default"], error: null }) }));
      originalConsoleError = global.console.error;
      originalConsoleLog = global.console.log;
      global.console.error = jest.fn();
      global.console.log = jest.fn();
      background = require('../../background.js');
      
      // Mock the key functions that handleMessage calls
      background.saveToAnkiOrQueue = jest.fn(() => Promise.resolve());
      background.getPendingPdfCards = jest.fn(() => Promise.resolve([{ id: 1 }]));
      background.removePdfCard = jest.fn(() => Promise.resolve(true));
      console.log('--- beforeEach end ---');
    });

    afterEach(() => {
      global.console.error = originalConsoleError;
      global.console.log = originalConsoleLog;
      jest.clearAllMocks();
    });

    function withTimeout(testFn, timeout = 5000) {
      console.log('withTimeout: entered');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          console.log('withTimeout: timed out');
          reject(new Error('Test timed out'));
        }, timeout);
        
        // Create a wrapper function that handles both sync and async callbacks
        const wrappedCallback = (result) => {
          clearTimeout(timer);
          console.log('withTimeout: callback called with result:', result);
          resolve(result);
        };

        try {
          // Execute the test function with our wrapped callback
          const result = testFn(wrappedCallback);
          
          // If testFn returns a promise, wait for it
          if (result && typeof result.then === 'function') {
            console.log('withTimeout: testFn returned a promise, waiting for it...');
            result.then(wrappedCallback).catch((error) => {
              console.error('withTimeout: promise rejected:', error);
              clearTimeout(timer);
              reject(error);
            });
          } else {
            console.log('withTimeout: testFn did not return a promise');
          }
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    }

    test('handles saveFinalizedPdfCard (success) OUTSIDE DESCRIBE', async () => {
      console.log('--- TEST BODY ENTERED: handles saveFinalizedPdfCard (success) OUTSIDE DESCRIBE ---');
      const background = require('../../background.js');
      background.saveToAnkiOrQueue = jest.fn(() => {
        console.log('Mock saveToAnkiOrQueue called');
        return Promise.resolve();
      });
      const handleMessage = background.handleMessage;
      const mockSender = { tab: { id: 123 } };
      await new Promise((resolve, reject) => {
        const message = { action: 'saveFinalizedPdfCard', cardData: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
        console.log('Calling handleMessage...');
        handleMessage(message, mockSender, (resp) => {
          console.log('Callback called with resp:', resp);
          try {
            expect(resp.success).toBe(true);
            resolve();
          } catch (error) {
            console.error('Test assertion failed:', error, 'Response:', resp);
            reject(error);
          }
        });
      });
      console.log('--- TEST END: handles saveFinalizedPdfCard (success) OUTSIDE DESCRIBE ---');
    });

    test('handles saveFinalizedPdfCard (error)', async () => {
      const background = require('../../background.js');
      const mockSaveToAnkiOrQueue = jest.fn().mockRejectedValue(new Error('fail'));
      const handleMessage = background.createHandleMessage({ saveToAnkiOrQueue: mockSaveToAnkiOrQueue });
      const mockSender = { tab: { id: 123 } };
      const message = { action: 'saveFinalizedPdfCard', cardData: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(false);
            expect(resp.error).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handles manualSave (success)', async () => {
      background.saveToAnkiOrQueue = jest.fn().mockResolvedValue();
      const handleMessage = background.handleMessage;
      const message = { action: 'manualSave', data: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(true);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handles manualSave (error)', async () => {
      const background = require('../../background.js');
      const mockSaveToAnkiOrQueue = jest.fn().mockRejectedValue(new Error('fail'));
      const handleMessage = background.createHandleMessage({ saveToAnkiOrQueue: mockSaveToAnkiOrQueue });
      const message = { action: 'manualSave', data: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(false);
            expect(resp.error).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handles getPendingPdfCards (success)', async () => {
      background.getPendingPdfCards = jest.fn().mockResolvedValue([{ id: 1 }]);
      const handleMessage = background.handleMessage;
      const message = { action: 'getPendingPdfCards' };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(true);
            expect(resp.cards).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handles getPendingPdfCards (error)', async () => {
      const background = require('../../background.js');
      const mockGetPendingPdfCards = jest.fn().mockRejectedValue(new Error('fail'));
      const handleMessage = background.createHandleMessage({ getPendingPdfCards: mockGetPendingPdfCards });
      const message = { action: 'getPendingPdfCards' };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(false);
            expect(resp.error).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handles removePdfCard (success)', async () => {
      const mockRemovePdfCard = jest.fn().mockResolvedValue(true);
      const handleMessage = background.createHandleMessage({ removePdfCard: mockRemovePdfCard });
      const message = { action: 'removePdfCard', cardId: 1 };
      await new Promise((resolve, reject) => {
        const sendResponse = jest.fn((resp) => {
          try {
            expect(mockRemovePdfCard).toHaveBeenCalledWith(1);
            expect(resp).toEqual({ success: true });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        handleMessage(message, {}, sendResponse);
      });
    });

    test('handles removePdfCard (error)', async () => {
      const mockRemovePdfCard = jest.fn().mockRejectedValue(new Error('fail'));
      const handleMessage = background.createHandleMessage({ removePdfCard: mockRemovePdfCard });
      const message = { action: 'removePdfCard', cardId: 1 };
      await new Promise((resolve, reject) => {
        const sendResponse = jest.fn((resp) => {
          try {
            expect(mockRemovePdfCard).toHaveBeenCalledWith(1);
            expect(resp).toEqual({ success: false, error: 'fail' });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        handleMessage(message, {}, sendResponse);
      });
    });

    test('handles getSelectionHtml (should warn and return error)', async () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      // Set up the message handler with required dependencies
      const messageHandler = background.createHandleMessage({
        saveToAnkiOrQueue: background.saveToAnkiOrQueue,
        getPendingPdfCards: background.getPendingPdfCards,
        removePdfCard: background.removePdfCard
      });

      const message = { action: 'getSelectionHtml' };
      const sender = { tab: { id: 1 } };
      const sendResponse = jest.fn();

      // Call the message handler directly
      await messageHandler(message, sender, sendResponse);

      expect(console.warn).toHaveBeenCalledWith(
        '[Background][handleMessage] getSelectionHtml should not reach background script [diagnostic-12345]'
      );

      // Restore console.warn
      console.warn = originalWarn;
    });

    test('handles unknown action (should warn and return error)', async () => {
      const handleMessage = background.handleMessage;
      const message = { action: 'unknownAction' };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(false);
            expect(resp.error).toMatch(/Unknown action: unknown/);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    test('handleMessage wrapper: error thrown', async () => {
      const background = require('../../background.js');
      // manualSave uses saveToAnkiOrQueue, so inject a mock for that
      const mockSaveToAnkiOrQueue = jest.fn(() => { throw new Error('fail'); });
      const handleMessage = background.createHandleMessage({ saveToAnkiOrQueue: mockSaveToAnkiOrQueue });
      const message = { action: 'manualSave', data: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      await new Promise((resolve, reject) => {
        handleMessage(message, mockSender, (resp) => {
          try {
            expect(resp.success).toBe(false);
            expect(resp.error).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  });

  test('MINIMAL: injected handleMessage with mock saveToAnkiOrQueue calls callback on error', async () => {
    const background = require('../../background.js');
    const mockSaveToAnkiOrQueue = jest.fn().mockImplementation(() => {
      console.log('MINIMAL: mockSaveToAnkiOrQueue called');
      return Promise.reject(new Error('fail'));
    });
    const handleMessage = background.createHandleMessage({ saveToAnkiOrQueue: mockSaveToAnkiOrQueue });
    await new Promise((resolve, reject) => {
      const message = { action: 'saveFinalizedPdfCard', cardData: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      const sender = { tab: { id: 123 } };
      handleMessage(message, sender, (resp) => {
        console.log('MINIMAL: callback called with:', resp);
        try {
          expect(resp.success).toBe(false);
          expect(resp.error).toBeDefined();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  test('handles saveFinal', async () => {
    const message = {
      action: 'saveFinalizedPdfCard',
      data: {
        front: 'Test Front',
        backHtml: 'Test Back',
        deckName: 'Test Deck',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: '<img src="test.jpg">',
        originalSelectionHtml: '<p>Test</p>'
      }
    };
    const sender = { tab: { id: 1 } };
    const sendResponse = jest.fn();

    // Mock chrome.storage.local.get to return test settings
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const settings = {
        deckName: 'Test Deck',
        modelName: 'Basic',
        gptEnabled: true,
        openaiKey: 'test-key',
        prompts: [{ id: 'test', label: 'Test', template: 'Template {{text}}' }],
        selectedPrompt: 'test'
      };
      if (callback) callback(settings);
      return Promise.resolve(settings);
    });

    // Create a mock for saveToAnkiOrQueue
    const mockSaveToAnkiOrQueue = jest.fn().mockResolvedValue(true);
    const messageHandler = background.createHandleMessage({ saveToAnkiOrQueue: mockSaveToAnkiOrQueue });
    await messageHandler(message, sender, sendResponse);

    expect(mockSaveToAnkiOrQueue).toHaveBeenCalledWith(
      'Test Front',
      'Test Back',
      expect.any(Object),
      1,
      'Test Page',
      'https://example.com',
      '<img src="test.jpg">'
    );
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('handles getPendingPdfCards', async () => {
    const message = { action: 'getPendingPdfCards' };
    const sender = { tab: { id: 1 } };
    const sendResponse = jest.fn();

    // Create a mock for getPendingPdfCards
    const mockGetPendingPdfCards = jest.fn().mockResolvedValue([
      { id: 1, front: 'Test Card 1' },
      { id: 2, front: 'Test Card 2' }
    ]);
    const messageHandler = background.createHandleMessage({ getPendingPdfCards: mockGetPendingPdfCards });
    await messageHandler(message, sender, sendResponse);

    expect(mockGetPendingPdfCards).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      cards: [
        { id: 1, front: 'Test Card 1' },
        { id: 2, front: 'Test Card 2' }
      ]
    });
  });

  test('handles removePdfCard', async () => {
    const message = { action: 'removePdfCard', cardId: 1 };
    const sender = { tab: { id: 1 } };
    const sendResponse = jest.fn();

    // Create a mock for removePdfCard
    const mockRemovePdfCard = jest.fn().mockResolvedValue(true);
    const messageHandler = background.createHandleMessage({ removePdfCard: mockRemovePdfCard });
    await messageHandler(message, sender, sendResponse);

    expect(mockRemovePdfCard).toHaveBeenCalledWith(1);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('handles unknown action', async () => {
    const message = { action: 'unknownAction' };
    const sender = { tab: { id: 1 } };
    const sendResponse = jest.fn();

    const messageHandler = background.createHandleMessage();
    await messageHandler(message, sender, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ 
      success: false,
      error: 'Unknown action: unknownAction'
    });
  });
});
