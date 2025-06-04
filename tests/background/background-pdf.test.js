/**
 * Tests for background script PDF processing and queue management
 * Tests PDF detection, queue operations, badge management, and sync functionality
 */

const {
  isPdfUrl,
  queueClip,
  flushQueue,
  updateBadge,
  checkPendingClips,
  scheduleSync,
  saveToAnkiOrQueue,
  handlePdfSelection,
  getPendingPdfCards,
  removePdfCard
} = require('../../background.js');

// Mock the imported functions
jest.mock('../../ankiProvider.js', () => ({
  addToAnki: jest.fn()
}));

jest.mock('../../chatgptProvider.js', () => ({
  generateFrontWithRetry: jest.fn(),
  generateClozeWithRetry: jest.fn()
}));

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

    // Clear chrome API mocks
    global.chrome.storage.local.get.mockClear();
    global.chrome.storage.local.set.mockClear();
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

  describe('queueClip function', () => {
    test('should add clip to queue successfully', async () => {
      const existingClips = [
        { front: 'Existing question', backHtml: '<p>Existing answer</p>' }
      ];

      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: existingClips
      });

      global.chrome.storage.local.set.mockResolvedValue();
      global.chrome.alarms.create.mockImplementation();

      const newClip = {
        front: 'New question',
        backHtml: '<p>New answer</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: '<img src="test.jpg">'
      };

      await queueClip(newClip);

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [existingClips[0], newClip]
      });

      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'syncPending',
        { delayInMinutes: 1 }
      );

      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '2'
      });
    });

    test('should handle empty clip array', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: []
      });

      global.chrome.storage.local.set.mockResolvedValue();

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
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: null
      });

      global.chrome.storage.local.set.mockResolvedValue();

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

  describe('updateBadge function', () => {
    test('should set badge text for pending clips', () => {
      // Clear the mocks first
      global.chrome.action.setBadgeText.mockClear();
      global.chrome.action.setTitle.mockClear();
      global.chrome.action.setBadgeBackgroundColor.mockClear();
      global.chrome.action.setBadgeTextColor.mockClear();
      
      global.cachedPendingClips = [
        { front: 'Q1' },
        { front: 'Q2' },
        { front: 'Q3' }
      ];

      updateBadge();

      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '3'
      });

      expect(global.chrome.action.setTitle).toHaveBeenCalledWith({
        title: '3 pending clips'
      });

      expect(global.chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#FF0000'
      });

      expect(global.chrome.action.setBadgeTextColor).toHaveBeenCalledWith({
        color: '#FFFFFF'
      });
    });

    test('should clear badge when no pending clips', () => {
      // Clear the mocks first
      global.chrome.action.setBadgeText.mockClear();
      global.chrome.action.setTitle.mockClear();
      global.chrome.action.setBadgeBackgroundColor.mockClear();
      global.chrome.action.setBadgeTextColor.mockClear();
      
      global.cachedPendingClips = [];

      updateBadge();

      expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: ''
      });

      expect(global.chrome.action.setTitle).toHaveBeenCalledWith({
        title: 'Web Clipper → Anki'
      });

      expect(global.chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#000'
      });

      expect(global.chrome.action.setBadgeTextColor).toHaveBeenCalledWith({
        color: '#000'
      });
    });

    test('should handle single pending clip', () => {
      global.cachedPendingClips = [{ front: 'Single question' }];

      updateBadge();

      expect(global.chrome.action.setTitle).toHaveBeenCalledWith({
        title: '1 pending clip'
      });
    });
  });

  describe('scheduleSync function', () => {
    test('should schedule sync when not already scheduled', () => {
      // Clear the mocks first
      global.chrome.alarms.create.mockClear();
      
      global.syncScheduled = false;

      scheduleSync();

      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'syncPending',
        { delayInMinutes: 1 }
      );

      expect(global.syncScheduled).toBe(true);
    });

    test('should not schedule sync when already scheduled', () => {
      global.syncScheduled = true;

      scheduleSync();

      expect(global.chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('flushQueue function', () => {
    test('should process all clips successfully', async () => {
      const clips = [
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

      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: clips
      });

      global.chrome.storage.local.set.mockResolvedValue();

      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockResolvedValue();

      await flushQueue();

      expect(addToAnki).toHaveBeenCalledTimes(2);

      // First call - basic card
      expect(addToAnki).toHaveBeenNthCalledWith(
        1,
        'Question 1',
        '<p>Answer 1</p>',
        'Deck1',
        'Basic',
        '' // No extra content for non-cloze
      );

      // Second call - cloze card with extra content
      expect(addToAnki).toHaveBeenNthCalledWith(
        2,
        'Question 2',
        '<p>Answer 2</p>',
        'Deck2',
        'Cloze',
        expect.stringContaining('<img src="test.jpg">') // Should include image and source
      );

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: []
      });
    });

    test('should handle partial failures', async () => {
      const clips = [
        { front: 'Q1', backHtml: '<p>A1</p>', deckName: 'Deck1', modelName: 'Basic' },
        { front: 'Q2', backHtml: '<p>A2</p>', deckName: 'Deck2', modelName: 'Basic' },
        { front: 'Q3', backHtml: '<p>A3</p>', deckName: 'Deck3', modelName: 'Basic' }
      ];

      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: clips
      });

      global.chrome.storage.local.set.mockResolvedValue();

      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki
        .mockResolvedValueOnce() // First succeeds
        .mockRejectedValueOnce(new Error('Anki error')) // Second fails
        .mockResolvedValueOnce(); // Third succeeds

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await flushQueue();

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [clips[1]] // Only failed clip remains
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'addToAnki failed for clip:',
        clips[1],
        'Error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle empty queue', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: []
      });

      const { addToAnki } = require('../../ankiProvider.js');

      await flushQueue();

      expect(addToAnki).not.toHaveBeenCalled();
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('checkPendingClips function', () => {
    test('should load and cache pending clips', async () => {
      const clips = [
        { front: 'Q1', backHtml: '<p>A1</p>' },
        { front: 'Q2', backHtml: '<p>A2</p>' }
      ];

      // Clear the mocks first
      global.chrome.storage.local.get.mockClear();
      global.chrome.alarms.create.mockClear();
      
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: clips
      });

      global.chrome.alarms.create.mockImplementation();

      await checkPendingClips();

      expect(global.cachedPendingClips).toEqual(clips);
      expect(global.chrome.alarms.create).toHaveBeenCalledWith(
        'syncPending',
        { delayInMinutes: 1 }
      );
    });

    test('should handle non-array pending clips', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: null
      });

      await checkPendingClips();

      expect(global.cachedPendingClips).toEqual([]);
    });

    test('should not schedule sync for empty clips', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        pendingClips: []
      });

      await checkPendingClips();

      expect(global.chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('saveToAnkiOrQueue function', () => {
    test('should save to Anki successfully', async () => {
      const { addToAnki } = require('../../ankiProvider.js');
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
        '' // No extra content for basic cards
      );

      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { status: 'success', message: 'Card saved to Anki!' },
        expect.any(Function)
      );
    });

    test('should queue on Anki offline (TypeError)', async () => {
      const { addToAnki } = require('../../ankiProvider.js');
      addToAnki.mockRejectedValue(new TypeError('Network error'));

      global.chrome.storage.local.get.mockResolvedValue({ pendingClips: [] });
      global.chrome.storage.local.set.mockResolvedValue();
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
      const { addToAnki } = require('../../ankiProvider.js');
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
      const { addToAnki } = require('../../ankiProvider.js');
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
        expect.stringContaining('<img src="test.jpg">') // Should include image and source
      );
    });

    test('should skip notifications for invalid tab IDs', async () => {
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

        global.chrome.storage.local.get.mockResolvedValue({
          pendingReviewPdfCards: pdfCards
        });

        const result = await getPendingPdfCards();

        expect(result).toEqual(pdfCards);
      });

      test('should handle empty PDF cards', async () => {
        global.chrome.storage.local.get.mockResolvedValue({
          pendingReviewPdfCards: []
        });

        const result = await getPendingPdfCards();

        expect(result).toEqual([]);
      });

      test('should handle non-array PDF cards', async () => {
        global.chrome.storage.local.get.mockResolvedValue({
          pendingReviewPdfCards: null
        });

        const result = await getPendingPdfCards();

        expect(result).toEqual([]);
      });

      test('should handle storage errors', async () => {
        global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

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
      test('should remove PDF card successfully', async () => {
        const pdfCards = [
          { id: 'card1', sourceText: 'Text 1' },
          { id: 'card2', sourceText: 'Text 2' },
          { id: 'card3', sourceText: 'Text 3' }
        ];

        global.chrome.storage.local.get.mockResolvedValue({
          pendingReviewPdfCards: pdfCards
        });

        global.chrome.storage.local.set.mockResolvedValue();

        const result = await removePdfCard('card2');

        expect(result).toBe(true);
        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
          pendingReviewPdfCards: [
            { id: 'card1', sourceText: 'Text 1' },
            { id: 'card3', sourceText: 'Text 3' }
          ]
        });
      });

      test('should handle non-existent card ID', async () => {
        const pdfCards = [
          { id: 'card1', sourceText: 'Text 1' }
        ];

        global.chrome.storage.local.get.mockResolvedValue({
          pendingReviewPdfCards: pdfCards
        });

        global.chrome.storage.local.set.mockResolvedValue();

        const result = await removePdfCard('nonexistent');

        expect(result).toBe(true);
        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
          pendingReviewPdfCards: pdfCards // Unchanged
        });
      });

      test('should handle storage errors', async () => {
        global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

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
    test('should process PDF selection with GPT enabled', async () => {
      const settings = {
        gptEnabled: true,
        openaiKey: 'sk-test1234567890abcdef',
        gptModel: 'gpt-3.5-turbo',
        deckName: 'Default',
        modelName: 'Basic',
        alwaysConfirm: false
      };

      global.chrome.storage.local.get.mockResolvedValue(settings);

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

      global.chrome.storage.local.get.mockResolvedValue(settings);

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

      global.chrome.storage.local.get.mockResolvedValue(settings);
      global.chrome.storage.local.set.mockResolvedValue();
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

      global.chrome.storage.local.get.mockResolvedValue(settings);
      global.chrome.storage.local.set.mockResolvedValue();

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

      global.chrome.storage.local.get.mockResolvedValue(settings);

      const { generateFrontWithRetry } = require('../../chatgptProvider.js');
      generateFrontWithRetry.mockRejectedValue(new Error('OpenAI API error'));

      global.chrome.storage.local.set.mockResolvedValue();
      global.chrome.notifications.create.mockImplementation();

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

      global.chrome.storage.local.get.mockResolvedValue(settings);
      global.chrome.storage.local.set.mockRejectedValue(new Error('Storage full'));
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
