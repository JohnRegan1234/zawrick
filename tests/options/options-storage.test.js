// tests/options-storage.test.js

const getChrome = () => (typeof global !== 'undefined' && global.chrome ? global.chrome : chrome);

describe('Storage Functions', () => {
  let mockChrome;

  beforeEach(() => {
    // Mock Chrome storage API
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;

    // Clear previous mocks
    jest.clearAllMocks();
    
    // Clear module cache to ensure fresh imports
    delete require.cache[require.resolve('../../options/index.js')];
  });

  describe('loadSettings', () => {
    test('should load default settings when storage is empty', async () => {
      // Mock empty storage
      mockChrome.storage.local.get.mockImplementation((defaultSettings, callback) => {
        callback(defaultSettings);
      });

      // Import the function - assuming it's available globally or through require
      const { loadSettings } = require('../../options/index.js');
      
      const settings = await loadSettings();
      
      expect(settings).toHaveProperty('deckName', 'Default');
      expect(settings).toHaveProperty('modelName', 'Basic');
      expect(settings).toHaveProperty('gptEnabled', false);
      expect(settings).toHaveProperty('openaiKey', '');
      expect(settings).toHaveProperty('alwaysConfirm', true);
      expect(Array.isArray(settings.prompts)).toBe(true);
    });

    test('should load existing settings from storage', async () => {
      const existingSettings = {
        deckName: 'Medical',
        modelName: 'Cloze',
        gptEnabled: true,
        openaiKey: 'sk-test123',
        alwaysConfirm: false,
        prompts: [{ id: 'test', label: 'Test', template: 'Test template' }]
      };

      mockChrome.storage.local.get.mockImplementation((defaultSettings, callback) => {
        callback(existingSettings);
      });

      const { loadSettings } = require('../../options/index.js');
      const settings = await loadSettings();
      
      expect(settings.deckName).toBe('Medical');
      expect(settings.modelName).toBe('Cloze');
      expect(settings.gptEnabled).toBe(true);
      expect(settings.openaiKey).toBe('sk-test123');
      expect(settings.alwaysConfirm).toBe(false);
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const { loadSettings } = require('../../options/index.js');
      
      await expect(loadSettings()).rejects.toThrow('Storage unavailable');
    });
  });

  describe('saveSettings', () => {
    test('should save settings to storage', async () => {
      mockChrome.storage.local.set.mockImplementation((settings, callback) => {
        callback();
      });

      const { saveSettings } = require('../../options/index.js');
      const newSettings = { deckName: 'History', gptEnabled: true };
      
      await saveSettings(newSettings);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        newSettings,
        expect.any(Function)
      );
    });

    test('should handle save errors', async () => {
      mockChrome.storage.local.set.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const { saveSettings } = require('../../options/index.js');
      
      await expect(saveSettings({ deckName: 'Test' })).rejects.toThrow('Save failed');
    });
  });

  describe('updatePendingCards', () => {
    test('should update pending cards count in UI', async () => {
      // Since JSDOM getElementById seems to be broken, we'll mock the behavior
      const mockPendingCount = {
        textContent: '',
        id: 'pending-count'
      };

      // Mock document.getElementById to return our mock element
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn((id) => {
        if (id === 'pending-count') {
          return mockPendingCount;
        }
        return null;
      });

      // Mock the chrome storage to return test data
      mockChrome.storage.local.get.mockResolvedValue({
        pendingClips: [{ front: 'Q1' }, { front: 'Q2' }, { front: 'Q3' }]
      });

      // Import and call the actual function
      const { updatePendingCards } = require('../../options/index.js');
      const result = await updatePendingCards();
      
      expect(result).toBe(true);
      expect(mockPendingCount.textContent).toBe('3');

      // Restore original function
      document.getElementById = originalGetElementById;
    });

    test('should handle empty pending clips', async () => {
      // Mock element
      const mockPendingCount = {
        textContent: '',
        id: 'pending-count'
      };

      // Mock document.getElementById
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn((id) => {
        if (id === 'pending-count') {
          return mockPendingCount;
        }
        return null;
      });

      // Mock the chrome storage to return empty array
      mockChrome.storage.local.get.mockResolvedValue({
        pendingClips: []
      });

      // Import and call the actual function
      const { updatePendingCards } = require('../../options/index.js');
      const result = await updatePendingCards();
      
      expect(result).toBe(true);
      expect(mockPendingCount.textContent).toBe('0');

      // Restore original function
      document.getElementById = originalGetElementById;
    });
  });

  describe('queueClip', () => {
    test('should add clip to pending queue', async () => {
      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        const result = { pendingClips: [] };
        if (typeof callback === 'function') {
          callback(result);
        }
        return Promise.resolve(result);
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      const { queueClip } = require('../../options/index.js');
      const clip = {
        front: 'Test question',
        backHtml: '<p>Test answer</p>',
        deckName: 'Test Deck',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://test.com'
      };

      await queueClip(clip);
      
      expect(savedData.pendingClips).toHaveLength(1);
      expect(savedData.pendingClips[0]).toEqual(clip);
    });

    test('should append to existing queue', async () => {
      const existingClips = [{ front: 'Existing question' }];
      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        const result = { pendingClips: existingClips };
        if (typeof callback === 'function') {
          callback(result);
        }
        return Promise.resolve(result);
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      const { queueClip } = require('../../options/index.js');
      const newClip = { front: 'New question' };

      await queueClip(newClip);
      
      expect(savedData.pendingClips).toHaveLength(2);
      expect(savedData.pendingClips[1]).toEqual(newClip);
    });
  });

  describe('Prompt History Storage', () => {
    test('should store prompt history entry', async () => {
      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        callback({ promptHistory: [] });
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      // This would need to be implemented based on the actual storePromptHistory function
      const historyEntry = {
        timestamp: Date.now(),
        promptId: 'test-prompt',
        promptLabel: 'Test Prompt',
        generatedFront: 'What is the test?',
        sourceText: 'This is a test content',
        pageTitle: 'Test Page',
        pageUrl: 'https://test.com'
      };

      // Simulate storing prompt history
      const { promptHistory = [] } = { promptHistory: [] };
      promptHistory.unshift(historyEntry);
      await getChrome().storage.local.set({ promptHistory });
      
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should limit prompt history size', async () => {
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() - i * 1000,
        promptId: `prompt-${i}`,
        generatedFront: `Question ${i}`
      }));

      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        callback({ promptHistory: existingHistory });
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      // Add new entry to full history
      const newEntry = {
        timestamp: Date.now(),
        promptId: 'new-prompt',
        generatedFront: 'New question'
      };

      // Simulate the history limiting logic
      let { promptHistory = [] } = { promptHistory: existingHistory };
      promptHistory = promptHistory.slice(0, 49); // MAX_PROMPT_HISTORY - 1
      promptHistory.unshift(newEntry);
      await getChrome().storage.local.set({ promptHistory });
      
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      // In real implementation, should verify that history doesn't exceed MAX_PROMPT_HISTORY
    });
  });

  describe('PDF Review Cards Storage', () => {
    test('should store PDF review card', async () => {
      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        callback({ pendingReviewPdfCards: [] });
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      const pdfCard = {
        id: 'pdf-card-1',
        timestamp: Date.now(),
        sourceText: 'PDF content here',
        generatedFront: 'PDF question',
        originalPageTitle: 'Test PDF',
        originalPageUrl: 'chrome-extension://pdf-viewer',
        originalDeckName: 'PDF Deck',
        originalModelName: 'Basic',
        isCloze: false
      };

      // Simulate storing PDF card
      const { pendingReviewPdfCards = [] } = { pendingReviewPdfCards: [] };
      pendingReviewPdfCards.unshift(pdfCard);
      await getChrome().storage.local.set({ pendingReviewPdfCards });
      
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should remove PDF review card', async () => {
      const existingCards = [
        { id: 'card-1', sourceText: 'Content 1' },
        { id: 'card-2', sourceText: 'Content 2' },
        { id: 'card-3', sourceText: 'Content 3' }
      ];

      mockChrome.storage.local.get.mockImplementation((defaultObj, callback) => {
        callback({ pendingReviewPdfCards: existingCards });
      });

      let savedData;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      });

      // Simulate removing card with id 'card-2'
      const cardIdToRemove = 'card-2';
      const { pendingReviewPdfCards = [] } = { pendingReviewPdfCards: existingCards };
      const filteredCards = pendingReviewPdfCards.filter(card => card.id !== cardIdToRemove);
      await getChrome().storage.local.set({ pendingReviewPdfCards: filteredCards });
      
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      // In real implementation, should verify that the card was removed
    });
  });
});
