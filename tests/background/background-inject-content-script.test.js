// background-inject-content-script.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script injectContentScriptAndWait Function', () => {
  let background;
  let mockChrome;
  beforeEach(() => {
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
      },
      storage: { local: { get: jest.fn(), set: jest.fn() } },
      tabs: { get: jest.fn(), sendMessage: jest.fn() },
      scripting: { executeScript: jest.fn() },
      contextMenus: { create: jest.fn(), onClicked: { addListener: jest.fn() } },
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setBadgeTextColor: jest.fn(), setTitle: jest.fn() },
      alarms: { create: jest.fn(), onAlarm: { addListener: jest.fn() } },
      notifications: { create: jest.fn() }
    };
    global.chrome = mockChrome;
    background = require('../../background.js');
  });

  test('should successfully inject and verify content script', async () => {
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: tabId, url: 'https://example.com', discarded: false, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    mockChrome.scripting.executeScript.mockImplementation((details, callback) => {
      if (callback) callback([{ frameId: 0, result: true }]);
      return Promise.resolve([{ frameId: 0, result: true }]);
    });
    let pingCount = 0;
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (message.action === 'ping') {
        pingCount++;
        if (callback) callback({ ready: true });
        return Promise.resolve({ ready: true });
      }
      if (callback) callback({});
      return Promise.resolve({});
    });
    const result = await background.injectContentScriptAndWait(123);
    expect(result).toBeUndefined();
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
      123,
      { action: 'ping' },
      expect.any(Function)
    );
    expect(pingCount).toBeGreaterThanOrEqual(1);
  }, 20000);

  test('should inject script if ping fails initially', async () => {
    let callCount = 0;
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callCount++;
      if (message.action === 'ping') {
        if (callCount === 1) {
          global.chrome.runtime.lastError = { message: 'No listener' };
          if (callback) callback(undefined);
        } else {
          delete global.chrome.runtime.lastError;
          if (callback) callback({ ready: true });
        }
      }
      return Promise.resolve({ ready: true });
    });
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: tabId, url: 'https://example.com', discarded: false, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    mockChrome.scripting.executeScript.mockImplementation((details, callback) => {
      if (callback) callback([{ frameId: 0, result: true }]);
      return Promise.resolve([{ frameId: 0, result: true }]);
    });
    const result = await background.injectContentScriptAndWait(123);
    expect(result).toBeUndefined();
    expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 123 },
      files: ['contentScript.js']
    }, expect.any(Function));
  });

  test('should retry up to maxRetries', async () => {
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: 123, url: 'https://example.com', discarded: false, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    let callCount = 0;
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callCount++;
      global.chrome.runtime.lastError = { message: 'Always fails' };
      if (callback) callback(undefined);
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
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: 123, url: 'https://example.com', discarded: false, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      global.chrome.runtime.lastError = { message: 'No listener' };
      if (callback) callback(undefined);
      delete global.chrome.runtime.lastError;
      return Promise.resolve(undefined);
    });
    mockChrome.scripting.executeScript.mockImplementation((details, callback) => {
      global.chrome.runtime.lastError = { message: 'Injection failed' };
      if (callback) callback(null);
      delete global.chrome.runtime.lastError;
      return Promise.resolve();
    });
    await expect(background.injectContentScriptAndWait(123)).rejects.toThrow('Injection failed');
  }, 15000);

  test('should handle discarded tabs', async () => {
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: 123, url: 'https://example.com', discarded: true, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    await expect(background.injectContentScriptAndWait(123)).rejects.toThrow('Invalid tab for script injection');
  }, 15000);

  test('should handle chrome-extension URLs', async () => {
    mockChrome.tabs.get.mockImplementation((tabId, callback) => {
      const mockTab = { id: 123, url: 'chrome://settings', discarded: false, status: 'complete' };
      if (callback) callback(mockTab);
      return Promise.resolve(mockTab);
    });
    await expect(background.injectContentScriptAndWait(123)).rejects.toThrow('Cannot inject content script on restricted page');
  }, 15000);
}); 