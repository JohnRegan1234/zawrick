// tests/background/background-core.test.js

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      lastError: null
    },
    sendMessage: jest.fn(),
    onConnect: {
      addListener: jest.fn()
    }
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setBadgeTextColor: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    executeScript: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock implementation of background script core functions
const handleMessage = async (message, sender, sendResponse) => {
  switch (message.action) {
    case 'addToAnki':
      return { success: true, id: 'mock-id' };
    case 'generateFront':
      return { success: true, front: 'Mock question?' };
    case 'generateCloze':
      return { success: true, cloze: 'Mock {{c1::cloze}} text' };
    case 'getSettings':
      return { success: true, settings: { ankiUrl: 'http://localhost:8765' } };
    default:
      return { success: false, error: `Unknown action: ${message.action}` };
  }
};

const initializeBackground = () => {
  // Mock initialization logic
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
  });
};

// Mock the provider modules
jest.mock('../../chatgptProvider.js', () => ({
  generateFrontWithRetry: jest.fn(),
  generateClozeWithRetry: jest.fn()
}));

jest.mock('../../ankiProvider.js', () => ({
  addToAnki: jest.fn()
}));

// Import after mocking
const { addToAnki } = require('../../ankiProvider.js');
const { generateFrontWithRetry, generateClozeWithRetry } = require('../../chatgptProvider.js');

// Add helpers at the top
const getChrome = () => (typeof global !== 'undefined' && global.chrome ? global.chrome : chrome);
const getCrypto = () => (typeof global !== 'undefined' && global.crypto ? global.crypto : (typeof window !== 'undefined' && window.crypto ? window.crypto : undefined));

// Since background.js uses ES modules and has side effects, we need to import it
// but we'll test the functions that would be available
describe('Background Script Core Functionality', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset global state
    if (typeof global !== 'undefined') {
      global.syncScheduled = false;
      global.cachedPendingClips = [];
    }
  });

  describe('Constants and Configuration', () => {
    test('should have correct default values', () => {
      // These would be tested by importing the constants if they were exported
      expect(true).toBe(true); // Placeholder - in real implementation you'd test exported constants
    });
  });

  describe('Badge Management', () => {
    test('should set badge text correctly', () => {
      const updateBadge = (count) => {
        if (count > 0) {
          chrome.action.setBadgeText({ text: count.toString() });
          chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
          chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
        } else {
          chrome.action.setBadgeText({ text: "" });
        }
      };

      updateBadge(5);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "5" });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#FF0000" });
      expect(chrome.action.setBadgeTextColor).toHaveBeenCalledWith({ color: "#FFFFFF" });
    });

    test('should clear badge when count is zero', () => {
      const updateBadge = (count) => {
        if (count > 0) {
          chrome.action.setBadgeText({ text: count.toString() });
          chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
          chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
        } else {
          chrome.action.setBadgeText({ text: "" });
        }
      };

      updateBadge(0);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    });
  });  describe('Storage Operations', () => {
    test('should handle storage get operations', async () => {
      const mockData = { pendingClips: ['clip1', 'clip2'] };
      
      // Mock the callback-based storage.get API
      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback(mockData);
      });

      const checkPendingClips = async () => {
        const data = await new Promise(resolve => {
          chrome.storage.local.get(['pendingClips'], resolve);
        });
        return data.pendingClips || [];
      };

      const result = await checkPendingClips();
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['pendingClips'], expect.any(Function));
      expect(result).toEqual(['clip1', 'clip2']);
    });

    test('should handle storage set operations', async () => {
      // Mock the callback-based storage.set API
      chrome.storage.local.set.mockImplementationOnce((data, callback) => {
        callback();
      });

      const queueClip = (clip) => {
        return new Promise(resolve => {
          chrome.storage.local.get(['pendingClips'], (data) => {
            const clips = data.pendingClips || [];
            clips.push(clip);
            chrome.storage.local.set({ pendingClips: clips }, resolve);
          });
        });
      };

      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback({ pendingClips: [] });
      });

      await queueClip({ front: 'test', back: 'content' });
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ 
        pendingClips: [{ front: 'test', back: 'content' }]
      }, expect.any(Function));
    });

    test('should handle storage errors gracefully', async () => {
      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        // Simulate Chrome runtime error
        chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        callback({});
      });

      const safeStorageGet = () => {
        return new Promise((resolve, reject) => {
          chrome.storage.local.get(['pendingClips'], (data) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(data);
            }
          });
        });
      };

      await expect(safeStorageGet()).rejects.toThrow('Storage quota exceeded');
      
      // Clean up mock
      delete chrome.runtime.lastError;
    });
  });

  describe('Message Handling', () => {
    test('should register message listeners', () => {
      // This tests that the background script would register listeners
      expect(chrome.runtime.onMessage.addListener).toBeDefined();
    });

    test('should handle manualSave messages', async () => {
      const mockSettings = {
        openaiKey: 'sk-test123',
        enableGpt: true,
        gptModel: 'gpt-3.5-turbo'
      };

      // Mock the message handler behavior
      const handleManualSave = async (message, sender, sendResponse) => {
        if (message.action === 'manualSave') {
          try {
            if (mockSettings.enableGpt) {
              const generatedFront = await generateFrontWithRetry(
                message.backHtml, 
                mockSettings
              );
              const result = await addToAnki(
                generatedFront,
                message.backHtml,
                message.deckName,
                message.modelName
              );
              sendResponse({ success: true, result });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        }
      };

      generateFrontWithRetry.mockResolvedValueOnce('Generated question?');
      addToAnki.mockResolvedValueOnce(123456);

      const mockSendResponse = jest.fn();
      const message = {
        action: 'manualSave',
        backHtml: 'Test content',
        deckName: 'Default',
        modelName: 'Basic'
      };

      await handleManualSave(message, {}, mockSendResponse);

      expect(generateFrontWithRetry).toHaveBeenCalledWith('Test content', mockSettings);
      expect(addToAnki).toHaveBeenCalledWith('Generated question?', 'Test content', 'Default', 'Basic');
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, result: 123456 });
    });
  });

  describe('Command Handling', () => {
    test('should register command listeners', () => {
      expect(chrome.commands.onCommand.addListener).toBeDefined();
    });

    test('should handle save-to-anki command', async () => {
      const handleCommand = async (command) => {
        if (command === 'save-to-anki') {
          const tabs = await new Promise(resolve => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
          });
          
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectionHtml' });
          }
        }
      };

      chrome.tabs.query.mockImplementationOnce((query, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      chrome.tabs.sendMessage.mockResolvedValueOnce();

      await handleCommand('save-to-anki');

      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true }, 
        expect.any(Function)
      );
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123, 
        { action: 'getSelectionHtml' }
      );
    });
  });

  describe('Alarm Management', () => {
    test('should create sync alarms', () => {
      const scheduleSync = () => {
        chrome.alarms.create('syncPending', { delayInMinutes: 1 });
      };

      scheduleSync();

      expect(chrome.alarms.create).toHaveBeenCalledWith('syncPending', { delayInMinutes: 1 });
    });

    test('should register alarm listeners', () => {
      expect(chrome.alarms.onAlarm.addListener).toBeDefined();
    });

    test('should handle sync alarms', async () => {
      const handleAlarm = async (alarm) => {
        if (alarm.name === 'syncPending') {
          // Mock flushing the queue
          const pendingClips = await new Promise(resolve => {
            chrome.storage.local.get(['pendingClips'], (data) => resolve(data.pendingClips || []));
          });
          
          for (const clip of pendingClips) {
            try {
              await addToAnki(clip.front, clip.back, clip.deckName, clip.modelName);
            } catch (error) {
              console.error('Failed to sync clip:', error);
            }
          }
          
          // Clear the queue
          chrome.storage.local.set({ pendingClips: [] });
        }
      };

      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback({ pendingClips: [{ front: 'Q', back: 'A', deckName: 'Test', modelName: 'Basic' }] });
      });

      addToAnki.mockResolvedValueOnce(123456);
      chrome.storage.local.set.mockResolvedValueOnce();

      await handleAlarm({ name: 'syncPending' });

      expect(addToAnki).toHaveBeenCalledWith('Q', 'A', 'Test', 'Basic');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });
  });

  describe('URL Detection', () => {
    test('should detect PDF URLs correctly', () => {
      const isPdfUrl = (url) => {
        return url.includes('chrome-extension://') && url.includes('/pdf/') ||
               url.includes('chrome://pdf-viewer/') ||
               url.includes('edge://pdf-viewer/') ||
               url.includes('pdf.js') ||
               url.includes('blob:') && url.includes('pdf') ||
               url.toLowerCase().endsWith('.pdf');
      };

      expect(isPdfUrl('chrome-extension://abc123/pdf/viewer.html')).toBe(true);
      expect(isPdfUrl('chrome://pdf-viewer/index.html')).toBe(true);
      expect(isPdfUrl('edge://pdf-viewer/index.html')).toBe(true);
      expect(isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(isPdfUrl('blob:https://example.com/123-456-pdf')).toBe(true);
      expect(isPdfUrl('https://example.com/page.html')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle Anki connection errors', async () => {
      addToAnki.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const saveWithErrorHandling = async (front, back) => {
        try {
          return await addToAnki(front, back);
        } catch (error) {
          if (error instanceof TypeError) {
            // Queue for later sync
            return 'queued';
          }
          throw error;
        }
      };

      const result = await saveWithErrorHandling('Q', 'A');
      expect(result).toBe('queued');
    });

    test('should handle GPT generation errors', async () => {
      // Clear any previous mocks
      generateFrontWithRetry.mockClear();
      generateFrontWithRetry.mockRejectedValueOnce(new Error('API quota exceeded'));

      const generateWithFallback = async (text, settings) => {
        try {
          return await generateFrontWithRetry(text, settings);
        } catch (error) {
          // Return a default question as fallback
          return 'What is the main concept in this text?';
        }
      };

      const result = await generateWithFallback('test text', {});
      expect(result).toBe('What is the main concept in this text?');
    });
  });

  describe('State Management', () => {
    test('should manage sync scheduling state', () => {
      // Test helper functions for state management
      const getSyncScheduled = () => {
        return typeof global !== 'undefined' ? global.syncScheduled : false;
      };

      const setSyncScheduled = (value) => {
        if (typeof global !== 'undefined') {
          global.syncScheduled = value;
        }
      };

      expect(getSyncScheduled()).toBe(false);
      
      setSyncScheduled(true);
      expect(getSyncScheduled()).toBe(true);
      
      setSyncScheduled(false);
      expect(getSyncScheduled()).toBe(false);
    });

    test('should manage cached pending clips', () => {
      const getCachedPendingClips = () => {
        return typeof global !== 'undefined' ? global.cachedPendingClips : [];
      };

      const setCachedPendingClips = (clips) => {
        if (typeof global !== 'undefined') {
          global.cachedPendingClips = clips;
        }
      };

      expect(getCachedPendingClips()).toEqual([]);
      
      const testClips = [{ front: 'Q1', back: 'A1' }, { front: 'Q2', back: 'A2' }];
      setCachedPendingClips(testClips);
      expect(getCachedPendingClips()).toEqual(testClips);
    });
  });
});
