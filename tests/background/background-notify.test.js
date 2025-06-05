// background-notify.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Notify Function', () => {
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