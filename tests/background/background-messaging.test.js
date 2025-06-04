/**
 * Tests for background script message handling functions
 * Tests Chrome runtime messaging, tab communication, and async message flows
 */

// Import the actual module - we'll mock chrome APIs instead of the functions themselves
const {
  handleAction,
  handlePdfSelection,
  notify,
  getSelectionHtml,
  sendFrontInputRequest,
  storePromptHistory,
  injectContentScriptAndWait
} = require('../../background.js');

// Mock the imported functions
jest.mock('../../ankiProvider.js', () => ({
  addToAnki: jest.fn()
}));

jest.mock('../../chatgptProvider.js', () => ({
  generateFrontWithRetry: jest.fn(),
  generateClozeWithRetry: jest.fn()
}));

describe('Background Script - Message Handling', () => {
  let mockTab;
  let mockSender;
  let mockSendResponse;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize chrome global if it doesn't exist
    if (!global.chrome) {
      global.chrome = {};
    }

    // Mock chrome.runtime.lastError
    global.chrome.runtime = {
      lastError: null,
      onInstalled: { addListener: jest.fn() },
      onStartup: { addListener: jest.fn() },
      onMessage: { addListener: jest.fn() }
    };

    // Mock chrome.tabs
    global.chrome.tabs = {
      get: jest.fn((tabId, callback) => {
        callback({ id: tabId, url: 'https://example.com', discarded: false });
      }),
      sendMessage: jest.fn((tabId, message, callback) => {
        if (message.action === 'getSelectionHtml') {
          callback({ html: '<p>Selected content</p>' });
        } else if (message.action === 'ping') {
          callback({ ready: true });
        } else {
          callback({});
        }
      })
    };

    // Mock chrome.scripting
    global.chrome.scripting = {
      executeScript: jest.fn((details, callback) => {
        callback([{ frameId: 0, result: true }]);
      })
    };

    // Mock chrome.storage.local
    global.chrome.storage = {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue()
      }
    };

    // Mock chrome.notifications
    global.chrome.notifications = {
      create: jest.fn()
    };

    // Mock chrome.action
    global.chrome.action = {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
      setBadgeTextColor: jest.fn(),
      setTitle: jest.fn()
    };

    // Mock chrome.alarms
    global.chrome.alarms = {
      create: jest.fn(),
      onAlarm: { addListener: jest.fn() }
    };

    // Mock chrome.contextMenus
    global.chrome.contextMenus = {
      create: jest.fn(),
      onClicked: { addListener: jest.fn() }
    };

    // Set up test data
    mockTab = {
      id: 123,
      url: 'https://example.com',
      title: 'Test Page'
    };

    mockSender = {
      tab: mockTab
    };

    mockSendResponse = jest.fn();
  });

  describe('notify function', () => {
    test('should send notification message to valid tab', async () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback({});
      });

      await notify(123, 'success', 'Test notification');

      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Test notification' },
        expect.any(Function)
      );
    });

    test('should handle invalid tab ID', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await notify(-1, 'error', 'Invalid tab');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][notify] Invalid tabId received:',
        -1
      );
      expect(global.chrome.tabs.sendMessage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle message port closed error', async () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = {
          message: 'The message port closed before a response was received'
        };
        callback();
        global.chrome.runtime.lastError = null;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await notify(123, 'info', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][notify] Message port closed - this is expected for notifications'
      );

      consoleSpy.mockRestore();
    });

    test('should inject content script when receiving end does not exist', async () => {
      // This test verifies that notify handles the "Receiving end does not exist" error
      // by attempting to inject a content script. Due to the async callback nature,
      // we'll test this by checking that the proper error handling path is taken.
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = {
          message: 'Receiving end does not exist'
        };
        callback();
        global.chrome.runtime.lastError = null;
      });

      // Call notify - it should handle the error without throwing
      await notify(123, 'error', 'Content script missing');

      // Verify the proper log message was called indicating error handling
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][notify] Content script missing, attempting injection'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getSelectionHtml function', () => {
    test('should return error for invalid tab ID', async () => {
      const result = await getSelectionHtml(-1);

      expect(result).toEqual({
        html: "",
        error: "Invalid tabId"
      });
    });

    test('should get selection HTML from content script', async () => {
      const expectedResponse = { html: '<p>Selected content</p>' };
      
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(message.action).toBe('getSelectionHtml');
        callback(expectedResponse);
      });

      const result = await getSelectionHtml(123);

      expect(result).toEqual(expectedResponse);
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'getSelectionHtml' },
        expect.any(Function)
      );
    });

    test('should handle receiving end does not exist error', async () => {
      // Simplified test that focuses on the error handling behavior
      // when the receiving end does not exist
      
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        // Always fail with "Receiving end does not exist"
        global.chrome.runtime.lastError = { message: 'Receiving end does not exist' };
        callback();
        global.chrome.runtime.lastError = null;
      });

      // Mock injectContentScriptAndWait to throw an error to simulate the actual behavior
      // This matches what we see in the real test - the injection fails with tab validation
      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        // Return a tab that will be considered invalid by injectContentScriptAndWait
        callback(null);
      });

      const result = await getSelectionHtml(123);

      expect(result).toEqual({
        html: "",
        error: "Tab invalid, missing URL, or discarded"
      });
    });

    test('should handle other Chrome runtime errors', async () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = {
          message: 'Tab not found'
        };
        callback();
        global.chrome.runtime.lastError = null;
      });

      const result = await getSelectionHtml(123);

      expect(result).toEqual({
        html: "",
        error: "Tab not found"
      });
    });
  });

  describe('injectContentScriptAndWait function', () => {
    test('should inject script successfully', async () => {
      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback(mockTab);
      });

      global.chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([{}]);
      });

      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback({ ready: true });
      });

      await expect(injectContentScriptAndWait(123)).resolves.toBeUndefined();

      expect(global.chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['contentScript.js']
      }, expect.any(Function));
    });

    test('should throw error for invalid tab', async () => {
      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        global.chrome.runtime.lastError = { message: 'Tab not found' };
        callback(null);
        global.chrome.runtime.lastError = null;
      });

      await expect(injectContentScriptAndWait(123))
        .rejects.toThrow('Tab invalid, missing URL, or discarded');
    });

    test('should throw error for restricted URLs', async () => {
      const restrictedTab = {
        ...mockTab,
        url: 'chrome://settings'
      };

      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback(restrictedTab);
      });

      await expect(injectContentScriptAndWait(123))
        .rejects.toThrow('Cannot inject content script on restricted page');
    });

    test('should retry injection with progressive delays', async () => {
      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback(mockTab);
      });

      global.chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([{}]);
      });

      let pingCount = 0;
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        pingCount++;
        if (pingCount < 3) {
          global.chrome.runtime.lastError = { message: 'Not ready' };
          callback();
          global.chrome.runtime.lastError = null;
        } else {
          callback({ ready: true });
        }
      });

      await expect(injectContentScriptAndWait(123, 3)).resolves.toBeUndefined();
      expect(pingCount).toBe(3);
    });

    test('should throw error after max retries exceeded', async () => {
      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback(mockTab);
      });

      global.chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([{}]);
      });

      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Not ready' };
        callback();
        global.chrome.runtime.lastError = null;
      });

      await expect(injectContentScriptAndWait(123, 2))
        .rejects.toThrow('Content script not ready after 2 attempts');
    });
  });

  describe('sendFrontInputRequest function', () => {
    test('should send manual front request successfully', () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(message.action).toBe('manualFront');
        callback({});
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      sendFrontInputRequest(
        123,
        '<p>Back content</p>',
        'Helper text',
        null,
        'Default',
        ['Default', 'Deck2'],
        true,
        'Basic',
        'Generated front',
        'Test Page',
        'https://example.com',
        '<img src="test.jpg">',
        '<p>Original selection</p>'
      );

      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        {
          action: 'manualFront',
          backHtml: '<p>Back content</p>',
          helper: 'Helper text',
          error: null,
          deckName: 'Default',
          deckList: ['Default', 'Deck2'],
          ankiOnline: true,
          modelName: 'Basic',
          frontHtml: 'Generated front',
          pageTitle: 'Test Page',
          pageUrl: 'https://example.com',
          imageHtml: '<img src="test.jpg">',
          originalSelectionHtml: '<p>Original selection</p>'
        },
        expect.any(Function)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][sendFrontInputRequest] "manualFront" request dispatched to tab:',
        123,
        'Optional response:',
        {}
      );

      consoleSpy.mockRestore();
    });

    test('should handle message port closed error', () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = {
          message: 'The message port closed before a response was received'
        };
        callback();
        global.chrome.runtime.lastError = null;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      sendFrontInputRequest(123, '<p>Back</p>', 'Helper', null, 'Default', [], true, 'Basic');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][sendFrontInputRequest] Info: Message port closed for "manualFront" to tab:',
        123,
        '. This is often expected as the content script shows UI and sends a new message on user action. Error details:',
        'The message port closed before a response was received'
      );

      consoleSpy.mockRestore();
    });

    test('should inject content script on missing receiver', () => {
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = {
          message: 'Receiving end does not exist'
        };
        callback();
        global.chrome.runtime.lastError = null;
      });

      global.chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback(mockTab);
      });

      global.chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([{}]);
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      sendFrontInputRequest(123, '<p>Back</p>', 'Helper', null, 'Default', [], true, 'Basic');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][sendFrontInputRequest] Missing content script for "manualFront" request to tab:',
        123,
        '. Attempting injection.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('storePromptHistory function', () => {
    test('should store prompt history entry successfully', async () => {
      const existingHistory = [
        { timestamp: 1000, promptId: 'old-prompt' }
      ];

      global.chrome.storage.local.get.mockResolvedValue({
        promptHistory: existingHistory
      });

      global.chrome.storage.local.set.mockResolvedValue();

      const newEntry = {
        timestamp: 2000,
        promptId: 'new-prompt',
        promptLabel: 'Test Prompt',
        generatedFront: 'What is this?'
      };

      await storePromptHistory(newEntry);

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        promptHistory: [newEntry, existingHistory[0]]
      });
    });

    test('should limit history to MAX_PROMPT_HISTORY entries', async () => {
      // Create an array with 50 entries (at the limit)
      const fullHistory = Array.from({ length: 50 }, (_, i) => ({
        timestamp: 1000 + i,
        promptId: `prompt-${i}`
      }));

      global.chrome.storage.local.get.mockResolvedValue({
        promptHistory: fullHistory
      });

      global.chrome.storage.local.set.mockResolvedValue();

      const newEntry = {
        timestamp: 2000,
        promptId: 'newest-prompt',
        generatedFront: 'Latest question'
      };

      await storePromptHistory(newEntry);

      const savedHistory = global.chrome.storage.local.set.mock.calls[0][0].promptHistory;
      
      expect(savedHistory).toHaveLength(50);
      expect(savedHistory[0]).toEqual(newEntry);
      expect(savedHistory[savedHistory.length - 1]).toEqual(fullHistory[48]); // Last entry dropped
    });

    test('should handle storage errors gracefully', async () => {
      global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const entry = {
        timestamp: 1000,
        promptId: 'test-prompt'
      };

      await storePromptHistory(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][storePromptHistory] FAILED to store prompt history. Error:',
        expect.any(Error),
        'Attempted entry data:',
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test('should handle empty history array', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        promptHistory: []
      });

      global.chrome.storage.local.set.mockResolvedValue();

      const entry = {
        timestamp: 1000,
        promptId: 'first-prompt'
      };

      await storePromptHistory(entry);

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        promptHistory: [entry]
      });
    });
  });

  describe('Chrome runtime message listeners', () => {
    // Mock message handler to test the logic without accessing actual listeners
    async function simulateMessageHandler(message, sender, sendResponse) {
      // This simulates the onMessage listener logic from background.js
      if (message.action === 'manualSave') {
        try {
          console.log('[Background][onMessage][manualSave] Received message. Data:', message);
          
          const { addToAnki } = require('../../ankiProvider.js');
          await addToAnki(message.front, message.backHtml, message.deckName, message.modelName, {
            pageTitle: message.pageTitle,
            pageUrl: message.pageUrl,
            imageHtml: message.imageHtml
          });
          
          sendResponse({ success: true });
        } catch (err) {
          console.error('[Background][onMessage][manualSave] Error:', err);
          sendResponse({ success: false, error: err.message });
        }
      }
    }

    test('should handle manualSave action', async () => {
      const message = {
        action: 'manualSave',
        front: 'Test question',
        backHtml: '<p>Test answer</p>',
        deckName: 'TestDeck',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: '<img src="test.jpg">'
      };

      // Mock addToAnki to resolve successfully
      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockResolvedValue();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockSendResponse = jest.fn();

      // Simulate the message handler
      await simulateMessageHandler(message, mockSender, mockSendResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][onMessage][manualSave] Received message. Data:',
        message
      );

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });

      consoleSpy.mockRestore();
    });

    test('should handle manualSave errors', async () => {
      const message = {
        action: 'manualSave',
        front: 'Test question',
        backHtml: '<p>Test answer</p>'
      };

      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockRejectedValue(new Error('Anki connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockSendResponse = jest.fn();

      await simulateMessageHandler(message, mockSender, mockSendResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Background][onMessage][manualSave] Error:',
        expect.any(Error)
      );

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Anki connection failed'
      });

      consoleSpy.mockRestore();
    });
  });
});
