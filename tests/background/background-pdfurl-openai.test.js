// background-pdfurl-openai.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script PDF URL Detection and OpenAI Integration', () => {
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

  describe('PDF URL detection', () => {
    test('should detect PDF URLs correctly', () => {
      expect(background.isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/file.PDF')).toBe(true);
      expect(background.isPdfUrl('https://example.com/document.html')).toBe(false);
      expect(background.isPdfUrl('chrome-extension://abc/viewer.html?file=doc.pdf')).toBe(true);
    });
  });

  describe('OpenAI Integration', () => {
    test('should generate content with OpenAI', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('{"choices":[{"message":{"content":"Generated question"}}]}'),
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Generated question' } }]
        })
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await background.generateWithOpenAI(
        'Test template {{text}}',
        'source text',
        'test-api-key',
        'Test Page',
        'https://example.com'
      );
      expect(result).toBe('Generated question');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });
    test('should handle OpenAI API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('{"error": {"message": "Unauthorized"}}')
      });
      await expect(background.generateWithOpenAI(
        'Template',
        'text',
        'invalid-key',
        'Page',
        'https://example.com'
      )).rejects.toThrow('OpenAI API Error (401): {"error": {"message":');
    });
    test('should handle network errors in OpenAI calls', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      await expect(background.generateWithOpenAI(
        'Template',
        'text',
        'api-key',
        'Page',
        'https://example.com'
      )).rejects.toThrow('Network error');
    });
  });
}); 