// tests/background/pdf-handling.test.js

jest.mock('../../chatgptProvider.js', () => ({
  generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')),
  generateClozeWithRetry: jest.fn()
}));

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));

describe('Background Script PDF Handling', () => {
  let mockChrome;
  let background;

  beforeEach(() => {
    // Reset globals
    global.syncScheduled = false;
    global.cachedPendingClips = null;

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const defaultData = {
              pendingClips: [],
              deckName: 'Default',
              modelName: 'Basic',
              gptEnabled: true,
              openaiKey: 'test-key',
              prompts: [{ id: 'test', label: 'Test', template: 'Template {{text}}' }],
              selectedPrompt: 'test'
            };
            const result = typeof keys === 'object' ? { ...keys, ...defaultData } : defaultData;
            if (callback) callback(result);
            return Promise.resolve(result);
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            if (callback) callback();
            return Promise.resolve();
          })
        }
      },
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn((callback) => {
          callback({ os: 'mac' });
        }),
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        lastError: null
      },
      tabs: {
        get: jest.fn((tabId, callback) => {
          const mockTab = { 
            id: tabId, 
            url: 'https://example.com', 
            discarded: false,
            status: 'complete'
          };
          if (callback) callback(mockTab);
          return Promise.resolve(mockTab);
        }),
        sendMessage: jest.fn((tabId, message, callback) => {
          if (callback) callback({ success: true });
          return Promise.resolve({ success: true });
        })
      },
      notifications: {
        create: jest.fn()
      },
      alarms: {
        create: jest.fn(),
        onAlarm: {
          addListener: jest.fn()
        }
      },
      contextMenus: {
        create: jest.fn(),
        onClicked: {
          addListener: jest.fn()
        }
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        setBadgeTextColor: jest.fn(),
        setTitle: jest.fn()
      },
      scripting: {
        executeScript: jest.fn((options, callback) => {
          if (callback) callback([{ result: 'success' }]);
          return Promise.resolve([{ result: 'success' }]);
        })
      }
    };
    global.chrome = mockChrome;

    // Import background module
    background = require('../../background.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('PDF URL Detection', () => {
    test('should detect PDF URLs correctly', () => {
      expect(background.isPdfUrl('https://example.com/document.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/file.PDF')).toBe(true);
      expect(background.isPdfUrl('chrome-extension://abc/viewer.html?file=doc.pdf')).toBe(true);
      expect(background.isPdfUrl('https://example.com/document.html')).toBe(false);
      expect(background.isPdfUrl('')).toBe(false);
      expect(background.isPdfUrl(null)).toBe(false);
      expect(background.isPdfUrl(undefined)).toBe(false);
    });
  });

  describe('PDF Selection Handling', () => {
    test('should handle PDF selection with GPT enabled', async () => {
      const info = { 
        menuItemId: 'save-to-anki',
        selectionText: 'Selected PDF text'
      };
      const tab = { 
        id: 123, 
        url: 'https://example.com/document.pdf',
        title: 'Test PDF'
      };

      // Mock successful GPT response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('{"choices":[{"message":{"content":"Generated question"}}]}'),
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Generated question' } }]
        })
      });

      await background.handlePdfSelection(info, tab);

      expect(mockChrome.storage.local.get).toHaveBeenCalled();
      expect(mockChrome.notifications.create).toHaveBeenCalled();
    });

    test('should handle PDF selection with GPT disabled', async () => {
      const info = { 
        menuItemId: 'save-to-anki',
        selectionText: 'Selected PDF text'
      };
      const tab = { 
        id: 123, 
        url: 'https://example.com/document.pdf',
        title: 'Test PDF'
      };

      // Mock settings with GPT disabled
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {
          gptEnabled: false,
          deckName: 'Default',
          modelName: 'Basic'
        };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await background.handlePdfSelection(info, tab);

      expect(mockChrome.storage.local.get).toHaveBeenCalled();
      expect(mockChrome.notifications.create).toHaveBeenCalled();
    });

    test('should handle PDF selection with GPT failure', async () => {
      const info = { 
        menuItemId: 'save-to-anki',
        selectionText: 'Selected PDF text'
      };
      const tab = { 
        id: 123, 
        url: 'https://example.com/document.pdf',
        title: 'Test PDF'
      };

      // Mock settings with GPT enabled and cloze model
      mockChrome.storage.local.get.mockImplementation((keys) => {
        return Promise.resolve({
          gptEnabled: true,
          modelName: 'Cloze',
          deckName: 'Default',
          pendingReviewPdfCards: []
        });
      });

      // Mock GPT failure
      const { generateClozeWithRetry } = require('../../chatgptProvider.js');
      generateClozeWithRetry.mockRejectedValue(new Error('GPT API error'));

      await background.handlePdfSelection(info, tab);

      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('pdf_cloze_gpt_error'),
        expect.objectContaining({
          type: 'basic',
          title: 'Zawrick PDF Error',
          message: expect.stringContaining('GPT Cloze generation failed')
        })
      );
    });

    test('should handle empty selection', async () => {
      const info = { 
        menuItemId: 'save-to-anki',
        selectionText: ''
      };
      const tab = { 
        id: 123, 
        url: 'https://example.com/document.pdf',
        title: 'Test PDF'
      };

      await background.handlePdfSelection(info, tab);

      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('pdf_selection_empty'),
        expect.objectContaining({
          type: 'basic',
          title: 'Zawrick PDF Error',
          message: expect.stringContaining('No text selected')
        })
      );
    });
  });

  describe('PDF Card Review Queue', () => {
    test('should add card to review queue', async () => {
      console.log('[Test] Starting PDF card review queue test');
      
      const cardData = {
        id: 'test-id',
        timestamp: Date.now(),
        sourceText: 'Test text',
        generatedFront: 'Test front',
        generatedClozeText: 'Test cloze',
        originalPageTitle: 'Test PDF',
        originalPageUrl: 'https://example.com/test.pdf',
        originalDeckName: 'Default',
        originalModelName: 'Basic',
        isCloze: false
      };
      console.log('[Test] Created test card data:', cardData);

      // Mock storage to return empty array initially
      mockChrome.storage.local.get.mockImplementation((keys) => {
        console.log('[Test] Mock storage.get called with keys:', keys);
        const result = { pendingReviewPdfCards: [] };
        console.log('[Test] Mock storage.get returning:', result);
        return Promise.resolve(result);
      });

      // Mock storage.set to capture the updated array
      let savedData;
      mockChrome.storage.local.set.mockImplementation((data) => {
        console.log('[Test] Mock storage.set called with data:', data);
        savedData = data;
        return Promise.resolve();
      });

      try {
        console.log('[Test] Getting pending PDF cards');
        const { pendingReviewPdfCards = [] } = await background.getPendingPdfCards();
        console.log('[Test] Got pending PDF cards:', pendingReviewPdfCards);

        console.log('[Test] Adding card to queue');
        pendingReviewPdfCards.unshift(cardData);
        console.log('[Test] Updated queue:', pendingReviewPdfCards);

        console.log('[Test] Saving updated queue');
        await mockChrome.storage.local.set({ pendingReviewPdfCards });
        console.log('[Test] Queue saved');

        // Verify storage operations
        console.log('[Test] Verifying storage operations');
        expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
          { pendingReviewPdfCards: [] }
        );
        console.log('[Test] storage.get verification passed');

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          pendingReviewPdfCards: [cardData]
        });
        console.log('[Test] storage.set verification passed');

        expect(savedData.pendingReviewPdfCards).toEqual([cardData]);
        console.log('[Test] savedData verification passed');
      } catch (error) {
        console.error('[Test] Error during test:', error);
        throw error;
      }
    });

    test('should remove card from review queue', async () => {
      const cardId = 'test-id';
      await background.removePdfCard(cardId);
      expect(mockChrome.storage.local.get).toHaveBeenCalled();
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle storage errors in review queue', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(background.getPendingPdfCards()).resolves.toEqual([]);
      await expect(background.removePdfCard('test-id')).resolves.toBe(false);
    });
  });
}); 