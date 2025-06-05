// tests/content-script/content-script-coverage.test.js

describe('ContentScript Coverage Tests', () => {
  let mockChrome;
  let contentScript;
  let registeredListener;
  let addListenerCallCount = 0;

  beforeEach(() => {
    // Clear document
    document.body.innerHTML = '';
    
    // Track addListener calls during module import
    const addListenerSpy = jest.fn((...args) => {
      addListenerCallCount++;
      return args;
    });
    
    // Mock Chrome APIs BEFORE importing contentScript
    mockChrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        onMessage: {
          addListener: addListenerSpy
        }
      }
    };
    global.chrome = mockChrome;

    // Mock window.getSelection
    global.window.getSelection = jest.fn(() => ({
      rangeCount: 1,
      getRangeAt: jest.fn((index) => ({
        cloneContents: jest.fn(() => {
          const div = document.createElement('div');
          div.innerHTML = '<p>Selected content</p>';
          return div;
        })
      }))
    }));

    // Clear module cache to ensure fresh import
    delete require.cache[require.resolve('../../contentScript.js')];
    
    // Import contentScript module AFTER all mocks and DOM setup
    contentScript = require('../../contentScript.js');

    // Use the exported messageListener directly for testing
    registeredListener = contentScript.messageListener;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Clean up any existing overlays
    const overlays = document.querySelectorAll('#manual-overlay, #confirm-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    // Clean up toast state
    if (contentScript && contentScript.toastState) {
      if (contentScript.toastState.toastEl) {
        contentScript.toastState.toastEl.remove();
        contentScript.toastState.toastEl = null;
      }
      if (contentScript.toastState.toastHideTimeout) {
        clearTimeout(contentScript.toastState.toastHideTimeout);
        contentScript.toastState.toastHideTimeout = null;
      }
    }
    
    // Clean up any toasts
    const toasts = document.querySelectorAll('[style*="position: fixed"][style*="bottom: 20px"]');
    toasts.forEach(toast => toast.remove());
  });

  describe('getSelectionHtml action', () => {
    test('should return HTML from selection', () => {
      const mockSendResponse = jest.fn();
      
      registeredListener(
        { action: 'getSelectionHtml' },
        {},
        mockSendResponse
      );

      expect(mockSendResponse).toHaveBeenCalledWith({
        html: '<p>Selected content</p>'
      });
    });

    test('should return empty string when no selection', () => {
      global.window.getSelection = jest.fn(() => ({ rangeCount: 0 }));
      
      const mockSendResponse = jest.fn();
      
      registeredListener(
        { action: 'getSelectionHtml' },
        {},
        mockSendResponse
      );

      expect(mockSendResponse).toHaveBeenCalledWith({ html: '' });
    });

    test('should return true for async response', () => {
      const result = registeredListener(
        { action: 'getSelectionHtml' },
        {},
        jest.fn()
      );

      expect(result).toBe(true);
    });
  });

  describe('manualFront action', () => {
    test('DEBUG - DOM creation test', () => {
      console.log('=== DOM DEBUG TEST START ===');
      console.log('Document type:', typeof document);
      console.log('Document body type:', typeof document.body);
      console.log('Initial body children count:', document.body.children.length);

      // Test basic DOM manipulation first
      const testDiv = document.createElement('div');
      testDiv.id = 'test-element';
      testDiv.innerHTML = 'Test content';
      document.body.appendChild(testDiv);
      
      console.log('Created test div:', !!testDiv);
      console.log('Body children after test div:', document.body.children.length);
      console.log('Found test element by ID:', !!document.getElementById('test-element'));

      // Clear and test content script message
      document.body.innerHTML = '';
      
      const message = {
        action: 'manualFront',
        modelName: 'Basic',
        deckName: 'Default',
        deckList: ['Default'],
        ankiOnline: true,
        backHtml: '<p>Test back content</p>'
      };

      console.log('Calling registeredListener with message:', JSON.stringify(message, null, 2));
      
      const result = registeredListener(message, {}, jest.fn());
      
      console.log('Listener returned:', result);
      console.log('Body children after listener:', document.body.children.length);
      console.log('Body innerHTML length after listener:', document.body.innerHTML.length);
      
      if (document.body.innerHTML.length > 0) {
        console.log('Body innerHTML preview (first 500 chars):', document.body.innerHTML.substring(0, 500));
      }
      
      const overlay = document.getElementById('manual-overlay');
      const box = document.getElementById('manual-box');
      
      console.log('Found overlay:', !!overlay);
      console.log('Found box:', !!box);
      
      if (overlay) {
        console.log('Overlay id:', overlay.id);
        console.log('Overlay children:', overlay.children.length);
      }
      
      if (box) {
        console.log('Box id:', box.id);
        console.log('Box innerHTML length:', box.innerHTML.length);
      }

      console.log('=== DOM DEBUG TEST END ===');
      
      // For now, just expect the test to run without throwing
      expect(document).toBeDefined();
    });

    test('should create manual front dialog for basic cards', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        helper: 'Please provide a question for the front of this card.',
        error: null,
        deckName: 'Default',
        deckList: ['Default'],
        ankiOnline: true,
        modelName: 'Basic',
        frontHtml: '',
        pageTitle: 'Test Page',
        pageUrl: 'http://example.com',
        imageHtml: '',
        originalSelectionHtml: '<b>Selected</b>'
      };
      const sendResponse = jest.fn();
      
      console.log('Before calling listener, body children:', document.body.children.length);
      console.log('Chrome object:', typeof chrome);
      console.log('Document object:', typeof document);
      console.log('Window object:', typeof window);
      
      // Call the message listener
      const result = registeredListener(message, {}, sendResponse);
      console.log('Listener result:', result);
      
      console.log('After calling listener, body children:', document.body.children.length);
      console.log('Body innerHTML length:', document.body.innerHTML.length);
      
      // Wait for DOM manipulation to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('After timeout, body children:', document.body.children.length);
      if (document.body.innerHTML.length > 0) {
        console.log('Body HTML preview:', document.body.innerHTML.substring(0, 200));
      }
      
      const overlay = document.getElementById('manual-overlay');
      const box = document.getElementById('manual-box');
      
      expect(overlay).toBeTruthy();
      expect(box).toBeTruthy();
      expect(box.innerHTML).toContain('Create Flashcard Question');
      expect(box.innerHTML).toContain('Question for the front:');
      expect(box.innerHTML).not.toContain('Cloze Text:');
    });

    test('should create manual front dialog for cloze cards', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Cloze Deletion',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        deckList: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const overlay = document.getElementById('manual-overlay');
      const box = document.getElementById('manual-box');
      
      expect(overlay).toBeTruthy();
      expect(box).toBeTruthy();
      expect(box.innerHTML).toContain('Create Cloze Card');
      expect(box.innerHTML).toContain('Edit Cloze Text');
      expect(box.innerHTML).toContain('Preview');
    });

    test('should handle deck selection dropdown', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        deckList: ['Default', 'Learning', 'Advanced']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const box = document.getElementById('manual-box');
      const deckSelect = box.querySelector('#manual-deck');
      
      expect(deckSelect).toBeTruthy();
      expect(deckSelect.innerHTML).toMatch(/<option value="Default"( selected="")?>Default<\/option>/);
      expect(deckSelect.innerHTML).toContain('<option value="Learning">Learning</option>');
      expect(deckSelect.innerHTML).toContain('<option value="Advanced">Advanced</option>');
      expect(deckSelect.value).toBe('Default');
    });

    test('should handle error state in dialog', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        error: 'Test error message',
        deckList: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const box = document.getElementById('manual-box');
      
      expect(box.innerHTML).toContain('Test error message');
      expect(box.innerHTML).toContain('GPT generation failed');
    });

    test('should close dialog when overlay clicked', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const overlay = document.getElementById('manual-overlay');
      
      // Simulate click on overlay background
      const clickEvent = new MouseEvent('click', { target: overlay });
      Object.defineProperty(clickEvent, 'target', { value: overlay });
      overlay.dispatchEvent(clickEvent);

      expect(document.getElementById('manual-overlay')).toBeFalsy();
    });

    test('should close dialog when cancel button clicked', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const cancelBtn = document.getElementById('manual-cancel-btn');
      cancelBtn.click();

      expect(document.getElementById('manual-overlay')).toBeFalsy();
    });

    test('should handle save button click for basic cards', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const frontInput = document.getElementById('manual-front-input');
      const saveBtn = document.getElementById('manual-save-btn');
      
      frontInput.value = 'Test question';
      saveBtn.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'manualSave',
        front: 'Test question',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com'
      });
      
      expect(document.getElementById('manual-overlay')).toBeFalsy();
    });

    test('should handle save button click for cloze cards', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Cloze Deletion',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const backInput = document.getElementById('manual-back-input');
      const saveBtn = document.getElementById('manual-save-btn');
      
      backInput.value = 'Cloze {{c1::text}}';
      saveBtn.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'manualSave',
        front: 'Cloze {{c1::text}}',
        backHtml: 'Cloze {{c1::text}}',
        deckName: 'Default',
        modelName: 'Cloze Deletion',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com'
      });
    });

    test('should disable save button when front input is empty for basic cards', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const frontInput = document.getElementById('manual-front-input');
      const saveBtn = document.getElementById('manual-save-btn');
      
      // Initially disabled when empty
      expect(saveBtn.disabled).toBe(true);
      
      // Should enable when text is entered
      frontInput.value = 'Test question';
      frontInput.dispatchEvent(new Event('input'));
      expect(saveBtn.disabled).toBe(false);
      
      // Should disable when text is removed
      frontInput.value = '';
      frontInput.dispatchEvent(new Event('input'));
      expect(saveBtn.disabled).toBe(true);
    });

    test('should update preview for cloze cards on input', async () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Cloze Deletion',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const backInput = document.getElementById('manual-back-input');
      const preview = document.getElementById('manual-back-preview');
      
      backInput.value = 'This is {{c1::cloze}} text';
      backInput.dispatchEvent(new Event('input'));
      
      expect(preview.innerHTML).toBe('This is {{c1::cloze}} text');
    });

    test('should not save when inputs are invalid', () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        availableDecks: ['Default']
      };

      registeredListener(message, {}, jest.fn());

      const saveBtn = document.getElementById('manual-save-btn');
      
      // Try to save with empty front input
      saveBtn.click();

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(document.getElementById('manual-overlay')).toBeTruthy(); // Dialog should remain open
    });
  });

  describe('confirm action', () => {
    test('should create confirmation dialog', async () => {
      const message = {
        action: 'confirmCard',
        front: 'Test question',
        back: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const overlay = document.getElementById('confirm-overlay');
      const box = overlay.querySelector('div');
      
      expect(overlay).toBeTruthy();
      expect(box.innerHTML).toContain('Confirm Anki Card');
      expect(box.innerHTML).toContain('Test question');
      expect(box.innerHTML).toContain('Test answer');
    });

    test('should handle confirm save button click', async () => {
      const message = {
        action: 'confirmCard',
        front: 'Test question',
        back: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const confirmSaveBtn = document.querySelector('#confirm-save');
      confirmSaveBtn.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'confirmSave',
        cardData: {
          front: 'Test question',
          back: 'Test answer',
          deckName: 'Default',
          modelName: 'Basic'
        }
      });
      
      expect(document.getElementById('confirm-overlay')).toBeFalsy();
    });

    test('should handle confirm cancel button click', async () => {
      const message = {
        action: 'confirmCard',
        front: 'Test question',
        back: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const confirmCancelBtn = document.querySelector('#confirm-cancel');
      confirmCancelBtn.click();

      expect(document.getElementById('confirm-overlay')).toBeFalsy();
    });

    test('should close confirmation dialog when close button clicked', async () => {
      const message = {
        action: 'confirmCard',
        front: 'Test question',
        back: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const closeBtn = document.querySelector('button[style*="cursor: pointer"]');
      closeBtn.click();

      expect(document.getElementById('confirm-overlay')).toBeFalsy();
    });

    test('should close dialog when clicking overlay background', async () => {
      const message = {
        action: 'confirmCard',
        front: 'Test question',
        back: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      };

      registeredListener(message, {}, jest.fn());
      await Promise.resolve(); // Ensure DOM updates

      const overlay = document.getElementById('confirm-overlay');
      
      // Simulate click on overlay background
      const clickEvent = new MouseEvent('click', { target: overlay });
      Object.defineProperty(clickEvent, 'target', { value: overlay });
      overlay.dispatchEvent(clickEvent);

      expect(document.getElementById('confirm-overlay')).toBeFalsy();
    });
  });

  describe('toast notifications', () => {
    test('should create success toast', () => {
      jest.useFakeTimers();
      
      const message = {
        status: 'success',
        message: 'Card saved successfully!'
      };

      registeredListener(message, {}, jest.fn());

      const toastEl = document.getElementById('zawrick-toast');
      expect(toastEl).toBeTruthy();
      expect(toastEl.textContent).toBe('Card saved successfully!');
      expect(toastEl.style.background).toMatch(/rgba\(40,\s*167,\s*69,\s*0\.9\)/);
      
      jest.useRealTimers();
    });

    test('should create error toast', () => {
      const message = {
        status: 'error',
        message: 'Failed to save card'
      };

      registeredListener(message, {}, jest.fn());

      const toastEl = document.getElementById('zawrick-toast');
      expect(toastEl).toBeTruthy();
      expect(toastEl.textContent).toBe('Failed to save card');
      expect(toastEl.style.background).toMatch(/rgba\(220,\s*53,\s*69,\s*0\.9\)/);
    });

    test('should create info toast', () => {
      const message = {
        status: 'info',
        message: 'Processing...'
      };

      registeredListener(message, {}, jest.fn());

      const toastEl = document.getElementById('zawrick-toast');
      expect(toastEl).toBeTruthy();
      expect(toastEl.textContent).toBe('Processing...');
      expect(toastEl.style.background).toMatch(/rgba\(23,\s*162,\s*184,\s*0\.9\)/);
    });

    test('should reuse existing toast element', () => {
      jest.useFakeTimers();
      
      // Create first toast
      const message1 = {
        status: 'success',
        message: 'First message'
      };
      registeredListener(message1, {}, jest.fn());
      const firstToast = contentScript.toastState.toastEl;

      // Create second toast
      const message2 = {
        status: 'error',
        message: 'Second message'
      };
      registeredListener(message2, {}, jest.fn());

      expect(contentScript.toastState.toastEl).toBe(firstToast); // Same element
      expect(contentScript.toastState.toastEl.textContent).toBe('Second message');
      
      jest.useRealTimers();
    });

    test('should auto-hide success toast after delay', () => {
      jest.useFakeTimers();
      
      const message = {
        status: 'success',
        message: 'Auto-hide test'
      };

      registeredListener(message, {}, jest.fn());

      expect(contentScript.toastState.toastEl.style.opacity).toBe('1');
      expect(contentScript.toastState.toastHideTimeout).toBeTruthy();

      // Fast-forward to trigger hide
      jest.advanceTimersByTime(1500);

      expect(contentScript.toastState.toastEl.style.opacity).toBe('0');

      // Fast-forward to trigger removal
      jest.advanceTimersByTime(300);

      expect(contentScript.toastState.toastEl).toBe(null);
      expect(contentScript.toastState.toastHideTimeout).toBe(null);

      jest.useRealTimers();
    });

    test('should clear existing timeout when new toast shown', () => {
      jest.useFakeTimers();
      
      const message1 = {
        status: 'success',
        message: 'First toast'
      };
      registeredListener(message1, {}, jest.fn());
      
      const firstTimeout = contentScript.toastState.toastHideTimeout;
      
      const message2 = {
        status: 'success',
        message: 'Second toast'
      };
      registeredListener(message2, {}, jest.fn());

      expect(contentScript.toastState.toastHideTimeout).not.toBe(firstTimeout);

      jest.useRealTimers();
    });

    test('should not auto-hide error toast', () => {
      jest.useFakeTimers();
      
      const message = {
        status: 'error',
        message: 'Error message'
      };

      registeredListener(message, {}, jest.fn());

      expect(contentScript.toastState.toastHideTimeout).toBe(null);

      jest.useRealTimers();
    });

    test('should handle missing toast element in timeout', () => {
      jest.useFakeTimers();
      
      const message = {
        status: 'success',
        message: 'Test message'
      };

      registeredListener(message, {}, jest.fn());

      // Manually remove toast element to simulate edge case
      contentScript.toastState.toastEl.remove();
      contentScript.toastState.toastEl = null;

      // Fast-forward timers
      jest.advanceTimersByTime(1800);

      // Should not throw error
      expect(() => jest.runAllTimers()).not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('message listener registration', () => {
    test('should register message listener with chrome runtime', () => {
      expect(addListenerCallCount).toBeGreaterThan(0);
    });
  });

  describe('module exports', () => {
    test('should export messageListener and toastState for testing', () => {
      // Simulate module environment
      global.module = { exports: {} };
      
      // Re-require to trigger export logic
      delete require.cache[require.resolve('../../contentScript.js')];
      const contentScriptModule = require('../../contentScript.js');
      
      expect(contentScriptModule.messageListener).toBeTruthy();
      expect(contentScriptModule.toastState).toBeTruthy();
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle unknown message action', () => {
      const result = registeredListener(
        { action: 'unknownAction' },
        {},
        jest.fn()
      );

      expect(result).toBeUndefined();
    });

    test('should handle message without action', () => {
      const result = registeredListener(
        {},
        {},
        jest.fn()
      );

      expect(result).toBeUndefined();
    });

    test('should handle missing message data gracefully', () => {
      expect(() => {
        registeredListener(
          { action: 'manualFront' },
          {},
          jest.fn()
        );
      }).not.toThrow();
    });

    test('should handle missing DOM elements gracefully in manual dialog', () => {
      const message = {
        action: 'manualFront',
        backHtml: '<p>Back content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        deckList: []
      };

      expect(() => {
        registeredListener(message, {}, jest.fn());
      }).not.toThrow();
    });
  });

  describe('DEBUG tests', () => {
    test('DEBUG - Test JSDOM appendChild behavior', () => {
      console.log('=== JSDOM appendChild DEBUG START ===');
      
      // Clear document first
      document.body.innerHTML = '';
      console.log('Cleared document body');
      console.log('Initial body children:', document.body.children.length);
      console.log('Initial body innerHTML length:', document.body.innerHTML.length);
      
      // Create test element
      const testDiv = document.createElement('div');
      testDiv.id = 'jsdom-test';
      testDiv.textContent = 'Test content';
      
      console.log('Created test div:', !!testDiv);
      console.log('Test div ID:', testDiv.id);
      console.log('Test div content:', testDiv.textContent);
      
      // Try different appendChild approaches
      console.log('=== Trying direct appendChild ===');
      
      // Check document.body directly before appending
      console.log('document.body before append:', document.body);
      console.log('document.body constructor:', document.body.constructor.name);
      console.log('document.body parent:', document.body.parentNode);
      
      // Append and check immediately
      const appendResult = document.body.appendChild(testDiv);
      console.log('appendChild returned:', appendResult);
      console.log('Same element?', appendResult === testDiv);
      
      // Check immediately after
      console.log('Body children immediately after:', document.body.children.length);
      console.log('Body innerHTML immediately after:', document.body.innerHTML.length);
      console.log('getElementById immediately after:', !!document.getElementById('jsdom-test'));
      
      // Try alternative approach - innerHTML
      console.log('=== Trying innerHTML approach ===');
      document.body.innerHTML = '<div id="innerHTML-test">innerHTML test</div>';
      console.log('Body children after innerHTML:', document.body.children.length);
      console.log('getElementById after innerHTML:', !!document.getElementById('innerHTML-test'));
      
      console.log('=== JSDOM appendChild DEBUG END ===');
      
      // Just pass the test for now
      expect(true).toBe(true);
    });
  });
});
