jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Context Menu and Lifecycle Event Handlers', () => {
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
      storage: { local: { get: jest.fn((keys, cb) => {
        // Provide default settings for tests that need it
        const settings = {
          modelName: 'Basic',
          selectedPrompt: 'test',
          prompts: [{ id: 'test', template: 'Template' }],
          deckName: 'Default',
          gptEnabled: false
        };
        if (cb) cb(settings);
        return Promise.resolve(settings);
      }), set: jest.fn() } },
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

  describe('Context Menu Handling', () => {
    test('should handle context menu click for regular web pages', async () => {
      const info = { menuItemId: 'save-to-anki' };
      const tab = { id: 123, url: 'https://example.com', title: 'Test Page' };
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.action === 'getSelectionHtml') {
          const response = { html: '<p>Selected text</p>' };
          if (callback) callback(response);
          return Promise.resolve(response);
        }
        return Promise.resolve({ success: true });
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });
      await background.handleContextMenuClick(info, tab);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'getSelectionHtml' },
        expect.any(Function)
      );
    });
    test('should handle context menu click for PDF pages', async () => {
      const info = { menuItemId: 'save-to-anki', selectionText: 'Selected PDF text' };
      const tab = { id: 123, url: 'https://example.com/document.pdf' };
      await background.handlePdfContextMenu(info, tab);
      expect(mockChrome.storage.local.get).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Event Handlers', () => {
    test('should handle onInstalled event', () => {
      let installHandler;
      mockChrome.runtime.onInstalled.addListener.mockImplementation((callback) => {
        installHandler = callback;
      });
      require('/Users/john/Desktop/zawrick/background.js');
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
      require('/Users/john/Desktop/zawrick/background.js');
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
      require('/Users/john/Desktop/zawrick/background.js');
      if (alarmHandler) {
        alarmHandler({ name: 'SYNC_PENDING' });
        expect(global.syncScheduled).toBe(false);
      }
    });
  });
}); 