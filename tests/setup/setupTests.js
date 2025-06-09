// Test setup file - runs before all tests
// Using jsdom environment configured in jest.config.js

// Add helper at the top
const getChrome = () => (typeof global !== 'undefined' && global.chrome ? global.chrome : chrome);

// Mock Chrome Extension API
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const mockData = {
          deckName: 'Default',
          modelName: 'Basic',
          gptEnabled: false,
          openaiKey: '',
          confirmGpt: false,
          alwaysConfirm: true,
          prompts: [{
            id: 'basic-default',
            label: 'Default Basic',
            template: 'Test template'
          }],
          selectedPrompt: 'basic-default',
          pendingClips: [],
          promptHistory: [],
          pendingReviewPdfCards: []
        };
        
        // Clear any previous error
        global.chrome.runtime.lastError = undefined;
        
        // Simulate async callback behavior
        setTimeout(() => {
          if (typeof callback === 'function') {
            // If keys is an array, return only requested keys
            if (Array.isArray(keys)) {
              const result = {};
              keys.forEach(key => {
                if (mockData.hasOwnProperty(key)) {
                  result[key] = mockData[key];
                }
              });
              callback(result);
            } else if (typeof keys === 'object') {
              // If keys is an object with defaults, merge with mockData
              const result = { ...keys, ...mockData };
              callback(result);
            } else {
              callback(mockData);
            }
          }
        }, 0);
        return Promise.resolve(mockData);
      }),
      set: jest.fn((data, callback) => {
        // Clear any previous error
        global.chrome.runtime.lastError = undefined;
        
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback();
          }
        }, 0);
        return Promise.resolve();
      })
    }
  },
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (typeof callback === 'function') {
        callback({ success: true });
      }
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    getPlatformInfo: jest.fn((callback) => {
      if (typeof callback === 'function') {
        callback({ os: 'mac' });
      }
    }),
    getURL: jest.fn((path) => {
      return `chrome-extension://test-id/${path}`;
    }),
    lastError: undefined
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: jest.fn((tabId, message, callback) => {
      // Simulate async callback behavior
      setTimeout(() => {
        if (typeof callback === 'function') {
          // Provide appropriate response based on message action
          if (message.action === 'getSelectionHtml') {
            callback({ html: '<p>Selected text</p>' });
          } else if (message.action === 'ping') {
            callback({ ready: true });
          } else {
            callback({ success: true });
          }
        }
      }, 0);
      return Promise.resolve({ success: true });
    }),
    get: jest.fn((tabId, callback) => {
      const mockTab = { id: tabId, url: 'https://example.com', title: 'Test Page' };
      if (typeof callback === 'function') {
        callback(mockTab);
      }
      return Promise.resolve(mockTab);
    })
  },
  notifications: {
    create: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn((options, callback) => {
      if (typeof callback === 'function') {
        callback([{ result: 'success' }]);
      }
      return Promise.resolve([{ result: 'success' }]);
    })
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setBadgeTextColor: jest.fn(),
    setTitle: jest.fn()
  }
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      result: ['Default'],
      error: null
    })
  })
);

// Mock window functions that might be used (only if window is an object)
if (typeof global.window === 'object') {
  global.window.showUINotification = jest.fn();
  global.window.flashButtonGreen = jest.fn();

  // Initialize window.currentSettings for tests
  global.window.currentSettings = {
      deckName: 'Default',
      modelName: 'Basic',
      gptEnabled: false,
      openaiKey: '',
      confirmGpt: false,
      alwaysConfirm: true,
      prompts: [{
          id: 'basic-default',
          label: 'Default Basic',
          template: 'Test template'
      }],
      selectedPrompt: 'basic-default',
      pendingClips: [],
      promptHistory: [],
      pendingReviewPdfCards: []
  };

  // Mock DOM APIs
  global.window.getSelection = jest.fn(() => ({
    rangeCount: 0,
    getRangeAt: jest.fn(),
    toString: jest.fn(() => '')
  }));
}

// Mock setTimeout and clearTimeout only in jsdom environment
if (typeof window === 'object') {
  // Store the original functions before overriding
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  
  global.setTimeout = jest.fn((callback, delay) => {
    if (typeof callback === 'function') {
      // For immediate execution in tests
      callback();
    }
    return 123; // Mock timer ID
  });
  global.clearTimeout = jest.fn();

  // Also add a global function to restore original timers if needed
  global.restoreTimers = () => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  };
}

// Override HTMLElement.prototype.click to ensure onclick handlers are called
if (typeof HTMLElement !== 'undefined') {
  const originalClick = HTMLElement.prototype.click;
  
  HTMLElement.prototype.click = function() {
    // First call the onclick handler if it exists
    if (this.onclick && typeof this.onclick === 'function') {
      this.onclick();
    }
    
    // Then call the original click method for any other behavior
    if (originalClick) {
      originalClick.call(this);
    }
  };
}

// Mock console.log to avoid noise in tests (optional) - TEMPORARILY DISABLED FOR DEBUGGING
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn()
// };

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add DOM testing utilities
if (typeof document !== 'undefined') {
  global.createMockElement = (tagName, id, className) => {
    const element = document.createElement(tagName);
    if (id) element.id = id;
    if (className) element.className = className;
    return element;
  };
}

global.createMockSelect = (id, options = []) => {
  const select = document.createElement('select');
  select.id = id;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value || option;
    opt.textContent = option.text || option;
    select.appendChild(opt);
  });
  return select;
};

// Chrome APIs are already mocked in the global.chrome object above
