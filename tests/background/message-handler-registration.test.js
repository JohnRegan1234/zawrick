describe('Background Message Handler Registration', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        getPlatformInfo: jest.fn((cb) => cb({ os: 'mac' })),
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
      tabs: {
        sendMessage: jest.fn(),
        get: jest.fn(),
        query: jest.fn()
      },
      scripting: {
        executeScript: jest.fn()
      },
      alarms: {
        create: jest.fn(),
        onAlarm: { addListener: jest.fn() }
      },
      notifications: {
        create: jest.fn()
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    jest.resetModules();
  });

  test('should register message handler on initialization', () => {
    require('../../background.js');
    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
}); 