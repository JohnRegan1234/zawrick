// background-selection.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script getSelectionHtml Function', () => {
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
      tabs: { sendMessage: jest.fn() },
      scripting: { executeScript: jest.fn() },
      contextMenus: { create: jest.fn(), onClicked: { addListener: jest.fn() } },
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setBadgeTextColor: jest.fn(), setTitle: jest.fn() },
      alarms: { create: jest.fn(), onAlarm: { addListener: jest.fn() } },
      notifications: { create: jest.fn() }
    };
    global.chrome = mockChrome;
    background = require('../../background.js');
  });

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
    global.chrome.runtime.lastError = { message: 'Tab not found' };
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (callback) callback(undefined);
      return Promise.resolve(undefined);
    });
    const result = await background.getSelectionHtml(123);
    expect(result).toEqual({ html: '', error: 'Tab not found' });
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
}); 