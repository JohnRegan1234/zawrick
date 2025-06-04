// Test setup file - runs before all tests
// Using jsdom environment configured in jest.config.js

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
        
        if (typeof callback === 'function') {
          callback(mockData);
        }
        return Promise.resolve(mockData);
      }),
      set: jest.fn((data, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
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
    lastError: null
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
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

// Mock window functions that might be used
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

// Mock document.createElement with enhanced functionality
const originalCreateElement = document.createElement.bind(document);
document.createElement = jest.fn((tagName) => {
  const element = originalCreateElement(tagName);
  
  // Enhanced classList mock
  const classNames = new Set();
  element.classList = {
    add: jest.fn((className) => classNames.add(className)),
    remove: jest.fn((className) => classNames.delete(className)),
    contains: jest.fn((className) => classNames.has(className)),
    toggle: jest.fn((className) => {
      if (classNames.has(className)) {
        classNames.delete(className);
        return false;
      } else {
        classNames.add(className);
        return true;
      }
    })
  };
  
  // Enhanced style mock
  const styles = {};
  Object.defineProperty(element, 'style', {
    value: new Proxy(styles, {
      get: (target, prop) => {
        if (prop === 'setProperty') {
          return jest.fn((property, value) => {
            styles[property] = value;
          });
        }
        if (prop === 'removeProperty') {
          return jest.fn((property) => {
            delete styles[property];
          });
        }
        return target[prop];
      },
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      }
    }),
    configurable: true
  });
  
  // Add mock methods for commonly used elements
  if (tagName === 'div') {
    element.remove = jest.fn();
    element.click = jest.fn();
  }
  if (tagName === 'button') {
    element.click = jest.fn();
  }
  if (tagName === 'input') {
    element.focus = jest.fn();
    element.type = 'text';
  }
  
  // Mock common properties
  element.textContent = '';
  element.innerHTML = '';
  element.value = '';
  element.disabled = false;
  element.placeholder = '';
  
  // Mock getAttribute/setAttribute
  const attributes = {};
  element.getAttribute = jest.fn((attr) => attributes[attr] || null);
  element.setAttribute = jest.fn((attr, value) => {
    attributes[attr] = value;
  });
  
  return element;
});

// Mock document.body methods
if (document.body) {
  document.body.appendChild = jest.fn();
  document.body.removeChild = jest.fn();
}

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((callback, delay) => {
  if (typeof callback === 'function') {
    callback();
  }
  return 123; // Mock timer ID
});
global.clearTimeout = jest.fn();

// Mock console.log to avoid noise in tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add DOM testing utilities
global.createMockElement = (tagName, id, className) => {
  const element = document.createElement(tagName);
  if (id) element.id = id;
  if (className) element.className = className;
  return element;
};

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
