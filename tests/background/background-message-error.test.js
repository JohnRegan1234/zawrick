// background-message-error.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Message Handling and Error Cases', () => {
  let background;
  let mockChrome;
  let handleMessage;
  beforeEach(() => {
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
      },
      storage: { local: { get: jest.fn(), set: jest.fn() } },
      tabs: { sendMessage: jest.fn(), get: jest.fn() },
      scripting: { executeScript: jest.fn() },
      contextMenus: { create: jest.fn(), onClicked: { addListener: jest.fn() } },
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setBadgeTextColor: jest.fn(), setTitle: jest.fn() },
      alarms: { create: jest.fn(), onAlarm: { addListener: jest.fn() } },
      notifications: { create: jest.fn() }
    };
    global.chrome = mockChrome;
    background = require('../../background.js');
    handleMessage = background.handleMessage;
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
      global.fetch = jest.fn().mockResolvedValue({
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
      global.fetch = jest.fn().mockResolvedValue({
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
      global.fetch = jest.fn().mockResolvedValue({
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
      expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown action: unknownAction' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle tab not found errors', async () => {
      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Tab not found' };
        if (callback) callback(undefined);
        return Promise.resolve(undefined);
      });
      const result = await background.getSelectionHtml(123);
      expect(result).toEqual({ html: '', error: 'Tab not found' });
      delete global.chrome.runtime.lastError;
    });
    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      await expect(background.queueClip({})).rejects.toThrow('Storage error');
    });
  });
}); 