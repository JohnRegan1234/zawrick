/**
 * Tests for background script PDF processing and queue management
 * Tests PDF detection, queue operations, badge management, and sync functionality
 */

jest.mock('../../ankiProvider.js', () => ({
  addToAnki: jest.fn()
}));

jest.mock('../../chatgptProvider.js', () => ({
  generateFrontWithRetry: jest.fn(),
  generateClozeWithRetry: jest.fn()
}));

// Force callback-based chrome.storage.local.get/set mocks before any code runs
// This must be done before any describe or require of background.js
// to ensure the background script always sees the callback-based version

delete global.chrome;
global.chrome = {
  storage: {
    local: {}
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setTitle: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setBadgeTextColor: jest.fn()
  },
  notifications: {
    create: jest.fn()
  },
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    getPlatformInfo: jest.fn((cb) => cb({})),
  },
  tabs: {
    sendMessage: jest.fn()
  },
  contextMenus: {
    onClicked: {
      addListener: jest.fn()
    }
  }
};
Object.defineProperty(global.chrome.storage, 'local', {
  value: {},
  writable: true,
  configurable: true
});
// Use plain callback-based functions, not jest.fn()
global.chrome.storage.local.get = function (keys, callback) {
  if (typeof callback === 'function') {
    // Default: empty object, can be overridden in tests
    callback({});
    return;
  }
  // Promise-style usage
  return Promise.resolve({});
};
global.chrome.storage.local.set = function (items, callback) {
  if (typeof callback === 'function') callback();
};

// Add helpers at the top
const getChrome = () => (typeof global !== 'undefined' && global.chrome ? global.chrome : chrome);
const getCrypto = () => (typeof global !== 'undefined' && global.crypto ? global.crypto : (typeof window !== 'undefined' && window.crypto ? window.crypto : undefined));

describe('Background Script - PDF Processing & Queue Management', () => {
  let mockTab;
  let mockInfo;

  beforeEach(() => {
    mockTab = {
      id: 123,
      title: 'Test PDF Document',
      url: 'https://example.com/document.pdf'
    };

    mockInfo = {
      selectionText: 'Selected PDF text content',
      frameUrl: 'https://example.com/document.pdf',
      pageUrl: 'https://example.com/document.pdf'
    };

    // Clear chrome API mocks (only those that are jest.fn())
    global.chrome.action.setBadgeText.mockClear();
    global.chrome.action.setTitle.mockClear();
    global.chrome.action.setBadgeBackgroundColor.mockClear();
    global.chrome.action.setBadgeTextColor.mockClear();
    global.chrome.alarms.create.mockClear();
    global.chrome.notifications.create.mockClear();

    // Reset global state
    global.syncScheduled = false;
    global.cachedPendingClips = [];
  });

  describe('isPdfUrl function', () => {
    let isPdfUrl;
    beforeAll(() => {
      ({ isPdfUrl } = require('../../background.js'));
    });
    test('should detect Chrome PDF viewer URLs', () => {
      expect(isPdfUrl('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/web/viewer.html')).toBe(true);
    });

    test('should detect direct PDF URLs', () => {
      expect(isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(isPdfUrl('http://localhost/file.pdf')).toBe(true);
    });

    test('should detect Edge PDF viewer URLs', () => {
      expect(isPdfUrl('edge://pdf/viewer.html')).toBe(true);
    });

    test('should detect blob PDF URLs', () => {
      expect(isPdfUrl('blob:https://example.com/123-456-789.pdf')).toBe(true);
    });

    test('should detect pdf.js URLs', () => {
      expect(isPdfUrl('resource://pdf.js/web/viewer.html')).toBe(true);
    });

    test('should not detect non-PDF URLs', () => {
      expect(isPdfUrl('https://example.com')).toBe(false);
      expect(isPdfUrl('https://example.com/document.html')).toBe(false);
      expect(isPdfUrl('chrome://settings')).toBe(false);
      expect(isPdfUrl('')).toBe(false);
      expect(isPdfUrl(null)).toBe(false);
      expect(isPdfUrl(undefined)).toBe(false);
    });
  });

  describe('queueClip function (callback-based)', () => {
    let queueClip;
    beforeAll(() => {
      jest.resetModules();
      ({ queueClip } = require('../../background.js'));
    });
    test('should add clip to queue successfully', async () => {
      const existingClips = [
        { front: 'Existing question', backHtml: '<p>Existing answer</p>' }
      ];
      const newClip = {
        front: 'New question',
        backHtml: '<p>New answer</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: '<img src="test.jpg">'
      };
      let getCall = 0;
      global.chrome.storage.local.get = function (keys, callback) {
        getCall++;
        if (typeof callback === 'function') {
          if (getCall === 1) {
            callback({ pendingClips: existingClips });
          } else {
            callback({ pendingClips: [existingClips[0], newClip] });
          }
          return;
        }
        // Promise-style usage
        if (getCall === 1) {
          return Promise.resolve({ pendingClips: existingClips });
        } else {
          return Promise.resolve({ pendingClips: [existingClips[0], newClip] });
        }
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });
      global.chrome.alarms.create.mockImplementation();
      await queueClip(newClip);
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [existingClips[0], newClip]
      });
      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'SYNC_PENDING',
        { delayInMinutes: 0.1 }
      );
      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '2'
      });
    });
    test('should handle empty clip array', async () => {
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: [] });
          return;
        }
        return Promise.resolve({ pendingClips: [] });
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });
      const clip = {
        front: 'First question',
        backHtml: '<p>First answer</p>'
      };
      await queueClip(clip);
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [clip]
      });
    });
    test('should handle non-array pendingClips', async () => {
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: null });
          return;
        }
        return Promise.resolve({ pendingClips: null });
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });
      const clip = {
        front: 'Test question',
        backHtml: '<p>Test answer</p>'
      };
      await queueClip(clip);
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [clip]
      });
    });
  });

  describe('updateBadge function (callback-based)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      Object.defineProperty(global.chrome.storage.local, 'get', {
        value: jest.fn(),
        configurable: true
      });
    });
    test('should set badge text to number of pending clips', async () => {
      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ pendingClips: [{}, {}, {}] });
      });
      const { updateBadge } = require('../../background.js');
      await updateBadge();
      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
    });
    test('should set badge text to empty if no pending clips', async () => {
      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ pendingClips: [] });
      });
      const { updateBadge } = require('../../background.js');
      await updateBadge();
      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
    test('should set badge text to empty if pendingClips is undefined', async () => {
      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });
      const { updateBadge } = require('../../background.js');
      await updateBadge();
      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('scheduleSync function', () => {
    let scheduleSync;
    beforeAll(() => {
      ({ scheduleSync } = require('../../background.js'));
    });
    test('should schedule sync when not already scheduled', () => {
      // Clear the mocks first
      global.chrome.alarms.create.mockClear();
      
      global.syncScheduled = false;

      scheduleSync();

      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'SYNC_PENDING',
        { delayInMinutes: 0.1 }
      );

      expect(global.syncScheduled).toBe(true);
    });

    test('should not schedule sync when already scheduled', () => {
      global.syncScheduled = true;

      scheduleSync();

      expect(global.chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('flushQueue function (callback-based)', () => {
    let flushQueue;
    let addToAnki;
    let queue;
    beforeEach(() => {
      jest.resetModules();
      queue = [];
      global.cachedPendingClips = queue;
      addToAnki = require('../../ankiProvider.js').addToAnki;
      addToAnki.mockClear();
      global.syncScheduled = false;
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: queue });
          return;
        }
        return Promise.resolve({ pendingClips: queue });
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        queue = items.pendingClips;
        global.cachedPendingClips = queue;
        if (typeof callback === 'function') callback();
      });
      ({ flushQueue } = require('../../background.js'));
    });
    test('should process all clips successfully', async () => {
      queue = [
        {
          front: 'Question 1',
          backHtml: '<p>Answer 1</p>',
          deckName: 'Deck1',
          modelName: 'Basic'
        },
        {
          front: 'Question 2',
          backHtml: '<p>Answer 2</p>',
          deckName: 'Deck2',
          modelName: 'Cloze',
          pageTitle: 'Test Page',
          pageUrl: 'https://example.com',
          imageHtml: '<img src="test.jpg">'
        }
      ];
      global.cachedPendingClips = queue;
      addToAnki.mockResolvedValue();
      await flushQueue();
      expect(addToAnki).toHaveBeenCalledTimes(2);
      expect(addToAnki).toHaveBeenNthCalledWith(
        1,
        'Question 1',
        '<p>Answer 1</p>',
        'Deck1',
        'Basic',
        ''
      );
      expect(addToAnki).toHaveBeenNthCalledWith(
        2,
        'Question 2',
        '<p>Answer 2</p>',
        'Deck2',
        'Cloze',
        expect.stringContaining('<img src="test.jpg">')
      );
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: []
      });
    });
    test('should handle partial failures', async () => {
      queue = [
        { front: 'Q1', backHtml: '<p>A1</p>', deckName: 'Deck1', modelName: 'Basic' },
        { front: 'Q2', backHtml: '<p>A2</p>', deckName: 'Deck2', modelName: 'Basic' },
        { front: 'Q3', backHtml: '<p>A3</p>', deckName: 'Deck3', modelName: 'Basic' }
      ];
      global.cachedPendingClips = queue;
      addToAnki.mockClear();
      addToAnki
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Anki error'))
        .mockResolvedValueOnce();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await flushQueue();
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [queue[0]]
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'addToAnki failed for clip:',
        expect.objectContaining({ front: 'Q2' }),
        'Error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
    test('should handle empty queue', async () => {
      queue = [];
      global.cachedPendingClips = queue;
      const { addToAnki } = require('../../ankiProvider.js');
      await flushQueue();
      expect(addToAnki).not.toHaveBeenCalled();
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('checkPendingClips function', () => {
    let checkPendingClips;
    beforeAll(() => {
      ({ checkPendingClips } = require('../../background.js'));
    });
    test('should load and cache pending clips', async () => {
      const clips = [
        { front: 'Q1', backHtml: '<p>A1</p>' },
        { front: 'Q2', backHtml: '<p>A2</p>' }
      ];
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: clips });
          return;
        }
        return Promise.resolve({ pendingClips: clips });
      };
      global.chrome.alarms.create.mockImplementation();
      await checkPendingClips();
      expect(global.cachedPendingClips).toEqual(clips);
      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'SYNC_PENDING',
        { delayInMinutes: 0.1 }
      );
    });
    test('should handle non-array pending clips', async () => {
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: null });
          return;
        }
        return Promise.resolve({ pendingClips: null });
      };
      await checkPendingClips();
      expect(global.cachedPendingClips).toEqual([]);
    });
    test('should not schedule sync for empty clips', async () => {
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: [] });
          return;
        }
        return Promise.resolve({ pendingClips: [] });
      };
      await checkPendingClips();
      expect(global.chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('saveToAnkiOrQueue function', () => {
    let addToAnki;
    let queue;
    beforeEach(() => {
      jest.resetModules();
      queue = [];
      global.cachedPendingClips = queue;
      addToAnki = require('../../ankiProvider.js').addToAnki;
      addToAnki.mockClear();
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: queue });
          return;
        }
        return Promise.resolve({ pendingClips: queue });
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        queue = items.pendingClips;
        global.cachedPendingClips = queue;
        if (typeof callback === 'function') callback();
      });
    });
    test('should save to Anki successfully', async () => {
      const { saveToAnkiOrQueue } = require('../../background.js');
      addToAnki.mockResolvedValue();
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback({});
      });
      await saveToAnkiOrQueue(
        'Test question',
        '<p>Test answer</p>',
        { deckName: 'Default', modelName: 'Basic' },
        123,
        'Test Page',
        'https://example.com'
      );
      expect(addToAnki).toHaveBeenCalledWith(
        'Test question',
        '<p>Test answer</p>',
        'Default',
        'Basic',
        ''
      );
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Card saved to Anki!' },
        expect.any(Function)
      );
    });
    test('should queue on Anki offline (TypeError)', async () => {
      const { saveToAnkiOrQueue } = require('../../background.js');
      addToAnki.mockRejectedValue(new TypeError('Network error'));
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback({});
      });
      await saveToAnkiOrQueue(
        'Test question',
        '<p>Test answer</p>',
        { deckName: 'Default', modelName: 'Basic' },
        123,
        'Test Page',
        'https://example.com',
        '<img src="test.jpg">'
      );
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [{
          front: 'Test question',
          backHtml: '<p>Test answer</p>',
          deckName: 'Default',
          modelName: 'Basic',
          pageTitle: 'Test Page',
          pageUrl: 'https://example.com',
          imageHtml: '<img src="test.jpg">'
        }]
      });
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Anki offline – card saved locally' },
        expect.any(Function)
      );
    });
    test('should handle other Anki errors', async () => {
      const { saveToAnkiOrQueue } = require('../../background.js');
      addToAnki.mockRejectedValue(new Error('Anki deck not found'));
      global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback({});
      });
      await saveToAnkiOrQueue(
        'Test question',
        '<p>Test answer</p>',
        { deckName: 'NonExistent', modelName: 'Basic' },
        123
      );
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'error', message: 'Save failed: Anki deck not found' },
        expect.any(Function)
      );
    });
    test('should handle cloze cards with extra content', async () => {
      const { saveToAnkiOrQueue } = require('../../background.js');
      addToAnki.mockResolvedValue();
      await saveToAnkiOrQueue(
        'Cloze text',
        '<p>Cloze content</p>',
        { deckName: 'Default', modelName: 'Cloze' },
        null,
        'Test Page',
        'https://example.com',
        '<img src="test.jpg">'
      );
      expect(addToAnki).toHaveBeenCalledWith(
        'Cloze text',
        '<p>Cloze content</p>',
        'Default',
        'Cloze',
        expect.stringContaining('<img src="test.jpg">')
      );
    });
    test('should skip notifications for invalid tab IDs', async () => {
      jest.resetModules();
      const { saveToAnkiOrQueue } = require('../../background.js');
      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockResolvedValue();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await saveToAnkiOrQueue(
        'Test question',
        '<p>Test answer</p>',
        { deckName: 'Default', modelName: 'Basic' },
        null // Invalid tab ID
      );

      expect(global.chrome.tabs.sendMessage).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping in-page notification')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('PDF review card management', () => {
    describe('getPendingPdfCards function', () => {
      let getPendingPdfCards;
      beforeAll(() => {
        ({ getPendingPdfCards } = require('../../background.js'));
      });
      test('should return PDF cards array', async () => {
        const pdfCards = [
          {
            id: 'card1',
            sourceText: 'PDF text 1',
            timestamp: Date.now()
          },
          {
            id: 'card2',
            sourceText: 'PDF text 2',
            timestamp: Date.now()
          }
        ];

        global.chrome.storage.local.get = function (keys, callback) {
          if (typeof callback === 'function') {
            callback({ pendingReviewPdfCards: pdfCards });
            return;
          }
          return Promise.resolve({ pendingReviewPdfCards: pdfCards });
        };

        const result = await getPendingPdfCards();

        expect(result).toEqual(pdfCards);
      });

      test('should handle empty PDF cards', async () => {
        global.chrome.storage.local.get = function (keys, callback) {
          if (typeof callback === 'function') {
            callback({ pendingReviewPdfCards: [] });
            return;
          }
          return Promise.resolve({ pendingReviewPdfCards: [] });
        };

        const result = await getPendingPdfCards();

        expect(result).toEqual([]);
      });

      test('should handle non-array PDF cards', async () => {
        global.chrome.storage.local.get = function (keys, callback) {
          if (typeof callback === 'function') {
            callback({ pendingReviewPdfCards: null });
            return;
          }
          return Promise.resolve({ pendingReviewPdfCards: null });
        };

        const result = await getPendingPdfCards();

        expect(result).toEqual([]);
      });

      test('should handle storage errors', async () => {
        global.chrome.storage.local.get = function (keys, callback) {
          throw new Error('Storage error');
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getPendingPdfCards();

        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Background][getPendingPdfCards] Failed to get PDF cards:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('removePdfCard function', () => {
      let removePdfCard;
      beforeAll(() => {
        ({ removePdfCard } = require('../../background.js'));
      });
      test('should remove PDF card successfully', async () => {
        const pdfCards = [
          { id: 'card1', sourceText: 'Text 1' },
          { id: 'card2', sourceText: 'Text 2' },
          { id: 'card3', sourceText: 'Text 3' }
        ];

        global.chrome.storage.local.get = function (keys, callback) {
          if (typeof callback === 'function') {
            callback({ pendingReviewPdfCards: pdfCards });
            return;
          }
          return Promise.resolve({ pendingReviewPdfCards: pdfCards });
        };

        let setCalled = false;
        global.chrome.storage.local.set = jest.fn((items, callback) => {
          setCalled = true;
          if (typeof callback === 'function') callback();
        });

        const result = await removePdfCard('card2');

        expect(result).toBe(true);
        expect(setCalled).toBe(true);
      });

      test('should handle non-existent card ID', async () => {
        const pdfCards = [
          { id: 'card1', sourceText: 'Text 1' }
        ];

        global.chrome.storage.local.get = function (keys, callback) {
          if (typeof callback === 'function') {
            callback({ pendingReviewPdfCards: pdfCards });
            return;
          }
          return Promise.resolve({ pendingReviewPdfCards: pdfCards });
        };

        let setCalled = false;
        global.chrome.storage.local.set = jest.fn((items, callback) => {
          setCalled = true;
          if (typeof callback === 'function') callback();
        });

        const result = await removePdfCard('nonexistent');

        expect(result).toBe(true);
        expect(setCalled).toBe(true);
      });

      test('should handle storage errors', async () => {
        global.chrome.storage.local.get = function (keys, callback) {
          throw new Error('Storage error');
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await removePdfCard('card1');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Background][removePdfCard] Failed to remove PDF card:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('handlePdfSelection function', () => {
    let handlePdfSelection;
    let generateFrontWithRetry;
    let generateClozeWithRetry;
    let addToAnki;
    let queue;
    beforeEach(() => {
      jest.resetModules();
      queue = [];
      global.cachedPendingClips = queue;
      generateFrontWithRetry = require('../../chatgptProvider.js').generateFrontWithRetry;
      generateClozeWithRetry = require('../../chatgptProvider.js').generateClozeWithRetry;
      addToAnki = require('../../ankiProvider.js').addToAnki;
      generateFrontWithRetry.mockClear();
      generateClozeWithRetry.mockClear();
      addToAnki.mockClear();
      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback({ pendingClips: queue });
          return;
        }
        return Promise.resolve({ pendingClips: queue });
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        queue = items.pendingClips;
        global.cachedPendingClips = queue;
        if (typeof callback === 'function') callback();
      });
      ({ handlePdfSelection } = require('../../background.js'));
    });
    test('should process PDF selection with GPT enabled', async () => {
      const settings = {
        gptEnabled: true,
        openaiKey: 'sk-test1234567890abcdef',
        gptModel: 'gpt-3.5-turbo',
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: false
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };

      const { generateFrontWithRetry } = require('../../chatgptProvider.js');
      generateFrontWithRetry.mockResolvedValue('Generated question from PDF');

      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockResolvedValue();

      global.chrome.notifications.create.mockImplementation();

      await handlePdfSelection(mockInfo, mockTab);

      expect(generateFrontWithRetry).toHaveBeenCalledWith(
        'Selected PDF text content',
        expect.objectContaining({
          pageTitle: 'Test PDF Document',
          pageUrl: '',
          openaiKey: 'sk-test1234567890abcdef',
          gptModel: 'gpt-3.5-turbo'
        })
      );

      expect(addToAnki).toHaveBeenCalledWith(
        'Generated question from PDF',
        expect.stringContaining('Selected PDF text content'),
        'Default',
        'Basic',
        ''
      );

      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('pdf_autosave_processed_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Zawrick: PDF Card Processed'
        })
      );
    });

    test('should handle PDF cloze processing with GPT', async () => {
      const settings = {
        gptEnabled: true,
        openaiKey: 'sk-test1234567890abcdef',
        gptModel: 'gpt-3.5-turbo',
        deckName: 'Default',
        modelName: 'Cloze',
        alwaysConfirm: false
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };

      const { generateClozeWithRetry } = require('../../chatgptProvider.js');
      generateClozeWithRetry.mockResolvedValue('This is {{c1::cloze}} text');

      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockResolvedValue();

      await handlePdfSelection(mockInfo, mockTab);

      expect(generateClozeWithRetry).toHaveBeenCalledWith(
        'Selected PDF text content',
        expect.any(String), // Cloze guidance
        'Test PDF Document',
        '',
        'sk-test1234567890abcdef',
        'gpt-3.5-turbo'
      );

      expect(addToAnki).toHaveBeenCalledWith(
        expect.stringContaining('{{c1::cloze}}'),
        expect.stringContaining('{{c1::cloze}}'),
        'Default',
        'Cloze',
        '' // No source for cloze cards
      );
    });

    test('should add to review queue when confirmation needed', async () => {
      const settings = {
        gptEnabled: false,
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: true
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });
      global.chrome.notifications.create.mockImplementation();

      // Mock crypto.randomUUID - needs to be done after jest.clearAllMocks()
      const mockUuid = jest.fn().mockReturnValue('test-uuid-123');
      global.crypto = {
        randomUUID: mockUuid
      };

      await handlePdfSelection(mockInfo, mockTab);

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingReviewPdfCards: [
          expect.objectContaining({
            id: expect.any(String), // Accept any string ID
            sourceText: 'Selected PDF text content',
            originalPageTitle: 'Test PDF Document',
            originalPageUrl: '', // This should be empty due to our fix
            isCloze: false,
            generatedFront: '',
            generatedClozeText: '',
            originalDeckName: 'Default',
            originalModelName: 'Basic',
            imageHtml: '',
            timestamp: expect.any(Number)
          })
        ]
      });

      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('pdf_card_for_review_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Zawrick: Card Ready for Review'
        })
      );
    });

    test('should handle Chrome extension PDF URLs', async () => {
      const chromeTab = {
        ...mockTab,
        url: 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/web/viewer.html?file=document.pdf'
      };

      const settings = {
        gptEnabled: false,
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: true
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });

      await handlePdfSelection(mockInfo, chromeTab);

      const savedCard = global.chrome.storage.local.set.mock.calls[0][0].pendingReviewPdfCards[0];
      expect(savedCard.originalPageTitle).toBe('Test PDF Document');
      expect(savedCard.originalPageUrl).toBe(''); // Should be empty for chrome-extension URLs
    });

    test('should handle GPT errors gracefully', async () => {
      const settings = {
        gptEnabled: true,
        openaiKey: 'sk-test1234567890abcdef',
        gptModel: 'gpt-3.5-turbo',
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: false
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        if (typeof callback === 'function') callback();
      });
      global.chrome.notifications.create.mockImplementation();

      const { generateFrontWithRetry } = require('../../chatgptProvider.js');
      generateFrontWithRetry.mockRejectedValue(new Error('OpenAI API error'));

      await handlePdfSelection(mockInfo, mockTab);

      // Should fall back to manual review
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingReviewPdfCards: [
          expect.objectContaining({
            sourceText: 'Selected PDF text content',
            generatedFront: '' // Empty due to GPT failure
          })
        ]
      });
    });

    test('should handle storage errors', async () => {
      const settings = {
        gptEnabled: false,
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: true
      };

      global.chrome.storage.local.get = function (keys, callback) {
        if (typeof callback === 'function') {
          callback(settings);
          return;
        }
        return Promise.resolve(settings);
      };
      global.chrome.storage.local.set = jest.fn((items, callback) => {
        throw new Error('Storage full');
      });
      global.chrome.notifications.create.mockImplementation();

      await handlePdfSelection(mockInfo, mockTab);

      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('pdf_review_queue_error_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Zawrick: PDF Review Queue Error'
        })
      );
    });
  });
});
