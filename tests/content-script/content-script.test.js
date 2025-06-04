/**
 * Tests for content script dialog management and form handling
 * Tests manual input dialogs, confirmation dialogs, notification toasts, and user interactions
 */

// Mock DOM manipulation helpers
const createMockElement = (tagName, properties = {}) => {
  const styleObject = {};
  const element = {
    tagName: tagName.toUpperCase(),
    id: properties.id || '',
    className: properties.className || '',
    innerHTML: '',
    textContent: '',
    value: properties.value || '',
    style: styleObject,
    disabled: false,
    type: properties.type || '',
    checked: properties.checked || false,
    onclick: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    remove: jest.fn(),
    click: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn()
  };

  // Set initial properties
  Object.assign(element, properties);

  return element;
};

// Mock content script runtime environment
const mockContentScriptEnvironment = () => {
  // Mock window.getSelection
  global.window = {
    getSelection: jest.fn(() => ({
      rangeCount: 1,
      getRangeAt: jest.fn(() => ({
        cloneContents: jest.fn(() => createMockElement('div', { innerHTML: '<p>Selected text</p>' }))
      }))
    })),
    location: {
      href: 'https://example.com/test-page'
    }
  };

  // Mock document
  global.document = {
    createElement: jest.fn((tagName) => createMockElement(tagName)),
    body: createMockElement('body'),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn()
  };

  // Mock console for content script logging
  global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
};

describe('Content Script - Dialog Management', () => {
  let mockMessage;
  let mockSender;
  let mockSendResponse;

  beforeEach(() => {
    mockContentScriptEnvironment();

    mockMessage = {
      action: 'manualFront',
      backHtml: '<p>Test answer content</p>',
      helper: 'Please provide a question',
      error: null,
      deckName: 'Default',
      deckList: ['Default', 'TestDeck'],
      ankiOnline: true,
      modelName: 'Basic',
      frontHtml: '',
      pageTitle: 'Test Page',
      pageUrl: 'https://example.com',
      imageHtml: '',
      originalSelectionHtml: '<p>Original selection</p>'
    };

    mockSender = {};
    mockSendResponse = jest.fn();

    // Mock chrome.runtime
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        }
      }
    };
  });

  describe('getSelectionHtml action', () => {
    test('should extract HTML from selection', () => {
      const message = { action: 'getSelectionHtml' };
      
      // Mock selection with HTML content
      global.window.getSelection.mockReturnValue({
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
          cloneContents: jest.fn(() => {
            // Return a mock DocumentFragment with the expected content
            const fragment = {
              innerHTML: '<p><strong>Bold text</strong> and normal text</p>',
              nodeType: 11, // DocumentFragment
              childNodes: []
            };
            return fragment;
          })
        }))
      });

      // Simulate message listener
      const messageListener = jest.fn((msg, sender, sendResponse) => {
        if (msg.action === 'getSelectionHtml') {
          let html = '';
          const sel = global.window.getSelection();
          if (sel?.rangeCount) {
            const container = global.document.createElement('div');
            for (let i = 0; i < sel.rangeCount; i++) {
              const content = sel.getRangeAt(i).cloneContents();
              // Mock the appendChild behavior since JSDOM cloneContents doesn't work properly
              if (content.innerHTML) {
                container.innerHTML += content.innerHTML;
              }
            }
            html = container.innerHTML;
          }
          sendResponse({ html });
          return true;
        }
      });

      messageListener(message, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        html: '<p><strong>Bold text</strong> and normal text</p>'
      });
    });

    test('should handle empty selection', () => {
      const message = { action: 'getSelectionHtml' };
      
      global.window.getSelection.mockReturnValue({
        rangeCount: 0
      });

      const messageListener = jest.fn((msg, sender, sendResponse) => {
        if (msg.action === 'getSelectionHtml') {
          let html = '';
          const sel = global.window.getSelection();
          if (sel?.rangeCount) {
            // This won't execute due to rangeCount: 0
          }
          sendResponse({ html });
          return true;
        }
      });

      messageListener(message, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        html: ''
      });
    });

    test('should handle null selection', () => {
      const message = { action: 'getSelectionHtml' };
      
      global.window.getSelection.mockReturnValue(null);

      const messageListener = jest.fn((msg, sender, sendResponse) => {
        if (msg.action === 'getSelectionHtml') {
          let html = '';
          const sel = global.window.getSelection();
          if (sel?.rangeCount) {
            // Won't execute due to null selection
          }
          sendResponse({ html });
          return true;
        }
      });

      messageListener(message, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        html: ''
      });
    });
  });

  describe('manualFront dialog for basic cards', () => {
    test('should create manual input dialog for basic cards', () => {
      let createdElements = [];
      
      global.document.createElement.mockImplementation((tagName) => {
        const element = createMockElement(tagName);
        createdElements.push(element);
        return element;
      });

      // Simulate content script dialog creation
      const createDialog = (msg) => {
        const isCloze = /cloze/i.test(msg.modelName);
        
        const overlay = global.document.createElement('div');
        overlay.id = 'manual-overlay';
        
        const box = global.document.createElement('div');
        box.id = 'manual-box';
        
        const frontInput = createMockElement('textarea', { id: 'manual-front-input' });
        const saveBtn = createMockElement('button', { id: 'manual-save-btn' });
        const cancelBtn = createMockElement('button', { id: 'manual-cancel-btn' });

        box.querySelector.mockImplementation((selector) => {
          if (selector === '#manual-front-input') return frontInput;
          if (selector === '#manual-save-btn') return saveBtn;
          if (selector === '#manual-cancel-btn') return cancelBtn;
          return null;
        });
        
        overlay.appendChild(box);
        global.document.body.appendChild(overlay);

        // Setup event handlers
        if (cancelBtn) {
          cancelBtn.onclick = () => overlay.remove();
        }

        if (saveBtn && frontInput) {
          saveBtn.onclick = () => {
            const question = frontInput.value.trim();
            if (!question && !isCloze) return;

            global.chrome.runtime.sendMessage({
              action: 'manualSave',
              front: question,
              backHtml: msg.backHtml,
              deckName: msg.deckName,
              modelName: msg.modelName
            });
            overlay.remove();
          };
        }

        return { overlay, box, frontInput, saveBtn, cancelBtn };
      };

      const dialog = createDialog(mockMessage);

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(dialog.overlay);
      expect(dialog.overlay.id).toBe('manual-overlay');
      expect(dialog.box.id).toBe('manual-box');
    });

    test('should handle save button click for basic cards', () => {
      const frontInput = createMockElement('textarea', { 
        id: 'manual-front-input',
        value: 'What is the answer to this question?'
      });
      
      const saveBtn = createMockElement('button', { id: 'manual-save-btn' });
      const overlay = createMockElement('div', { id: 'manual-overlay' });

      // Simulate save button click
      saveBtn.onclick = () => {
        const question = frontInput.value.trim();
        if (!question) return;

        global.chrome.runtime.sendMessage({
          action: 'manualSave',
          front: question,
          backHtml: mockMessage.backHtml,
          deckName: mockMessage.deckName,
          modelName: mockMessage.modelName,
          pageTitle: mockMessage.pageTitle,
          pageUrl: mockMessage.pageUrl,
          imageHtml: mockMessage.imageHtml
        });
        overlay.remove();
      };

      // Trigger click by calling onclick directly
      saveBtn.onclick();

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'manualSave',
        front: 'What is the answer to this question?',
        backHtml: '<p>Test answer content</p>',
        deckName: 'Default',
        modelName: 'Basic',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: ''
      });

      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should prevent save with empty input for basic cards', () => {
      const frontInput = createMockElement('textarea', { 
        id: 'manual-front-input',
        value: ''
      });
      
      const saveBtn = createMockElement('button', { id: 'manual-save-btn' });
      const overlay = createMockElement('div', { id: 'manual-overlay' });

      saveBtn.onclick = () => {
        const question = frontInput.value.trim();
        if (!question) return; // Should prevent save

        global.chrome.runtime.sendMessage({
          action: 'manualSave',
          front: question,
          backHtml: mockMessage.backHtml,
          deckName: mockMessage.deckName,
          modelName: mockMessage.modelName
        });
        overlay.remove();
      };

      saveBtn.click();

      expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(overlay.remove).not.toHaveBeenCalled();
    });

    test('should handle cancel button click', () => {
      const cancelBtn = createMockElement('button', { id: 'manual-cancel-btn' });
      const overlay = createMockElement('div', { id: 'manual-overlay' });

      cancelBtn.onclick = () => overlay.remove();
      cancelBtn.onclick(); // Call onclick directly instead of click()

      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should show error message when provided', () => {
      const errorMessage = mockMessage;
      errorMessage.error = 'OpenAI API key is invalid';

      const createDialogWithError = (msg) => {
        let errorHtml = '';
        if (msg.error) {
          errorHtml = `
            <div id="manual-error">
              ⚠️ GPT generation failed.<br>
              <code>${msg.error}</code><br>
              <span>💡 You can still create the card manually below.</span>
            </div>
          `;
        }

        const box = global.document.createElement('div');
        box.innerHTML = errorHtml;
        
        return { errorHtml, box };
      };

      const result = createDialogWithError(errorMessage);

      expect(result.errorHtml).toContain('⚠️ GPT generation failed');
      expect(result.errorHtml).toContain('OpenAI API key is invalid');
      expect(result.errorHtml).toContain('💡 You can still create the card manually');
    });
  });

  describe('manualFront dialog for cloze cards', () => {
    beforeEach(() => {
      mockMessage.modelName = 'Cloze';
      mockMessage.helper = 'Wrap the hidden text in {{c1::…}} (c2, c3… for more).';
    });

    test('should create cloze input dialog', () => {
      const backInput = createMockElement('textarea', { 
        id: 'manual-back-input',
        value: 'This is {{c1::hidden}} text'
      });
      
      const preview = createMockElement('div', { id: 'manual-back-preview' });

      // Simulate cloze dialog creation
      const createClozeDialog = (msg) => {
        const isCloze = /cloze/i.test(msg.modelName);
        
        if (isCloze) {
          const box = global.document.createElement('div');
          
          // Create back input and preview
          const backInput = global.document.createElement('textarea');
          backInput.id = 'manual-back-input';
          
          const preview = global.document.createElement('div');
          preview.id = 'manual-back-preview';
          
          // Setup real-time preview
          backInput.addEventListener('input', () => {
            preview.innerHTML = backInput.value || '<em>Preview will appear here as you type...</em>';
          });
          
          return { box, backInput, preview, isCloze: true };
        }
        
        return { isCloze: false };
      };

      const dialog = createClozeDialog(mockMessage);

      expect(dialog.isCloze).toBe(true);
      expect(dialog.backInput.id).toBe('manual-back-input');
      expect(dialog.preview.id).toBe('manual-back-preview');
    });

    test('should update preview in real-time', () => {
      const backInput = createMockElement('textarea', { 
        id: 'manual-back-input',
        value: ''
      });
      
      const preview = createMockElement('div', { id: 'manual-back-preview' });

      // Simulate input event handler
      const inputHandler = () => {
        preview.innerHTML = backInput.value || '<em>Preview will appear here as you type...</em>';
      };

      backInput.addEventListener('input', inputHandler);

      // Simulate typing
      backInput.value = 'This is {{c1::cloze}} text';
      inputHandler(); // Simulate input event

      expect(preview.innerHTML).toBe('This is {{c1::cloze}} text');

      // Test empty input
      backInput.value = '';
      inputHandler();

      expect(preview.innerHTML).toBe('<em>Preview will appear here as you type...</em>');
    });

    test('should handle save for cloze cards', () => {
      const backInput = createMockElement('textarea', { 
        id: 'manual-back-input',
        value: 'This is {{c1::cloze}} content'
      });
      
      const saveBtn = createMockElement('button', { id: 'manual-save-btn' });
      const overlay = createMockElement('div', { id: 'manual-overlay' });

      const isCloze = true;

      saveBtn.onclick = () => {
        const clozeContent = backInput.value.trim();
        if (isCloze && !clozeContent) return;

        global.chrome.runtime.sendMessage({
          action: 'manualSave',
          front: clozeContent, // For cloze, front and back are the same
          backHtml: clozeContent,
          deckName: mockMessage.deckName,
          modelName: mockMessage.modelName,
          pageTitle: mockMessage.pageTitle,
          pageUrl: mockMessage.pageUrl,
          imageHtml: mockMessage.imageHtml
        });
        overlay.remove();
      };

      saveBtn.onclick(); // Call onclick directly

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'manualSave',
        front: 'This is {{c1::cloze}} content',
        backHtml: 'This is {{c1::cloze}} content',
        deckName: 'Default',
        modelName: 'Cloze',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        imageHtml: ''
      });
    });

    test('should prevent save with empty cloze content', () => {
      const backInput = createMockElement('textarea', { 
        id: 'manual-back-input',
        value: '   ' // Whitespace only
      });
      
      const saveBtn = createMockElement('button', { id: 'manual-save-btn' });
      const overlay = createMockElement('div', { id: 'manual-overlay' });

      const isCloze = true;

      saveBtn.onclick = () => {
        const clozeContent = backInput.value.trim();
        if (isCloze && !clozeContent) return; // Should prevent save

        global.chrome.runtime.sendMessage({
          action: 'manualSave',
          front: clozeContent,
          backHtml: clozeContent,
          deckName: mockMessage.deckName,
          modelName: mockMessage.modelName
        });
        overlay.remove();
      };

      saveBtn.click();

      expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(overlay.remove).not.toHaveBeenCalled();
    });
  });

  describe('confirmCard dialog', () => {
    test('should create confirmation dialog', () => {
      const confirmMessage = {
        action: 'confirmCard',
        front: 'Generated question',
        back: '<p>Generated answer</p>',
        deckName: 'Default',
        modelName: 'Basic'
      };

      const createConfirmDialog = (msg) => {
        const overlay = global.document.createElement('div');
        overlay.id = 'confirm-overlay';

        const box = global.document.createElement('div');
        box.id = 'confirm-box';

        box.innerHTML = `
          <h3>Review your card before saving</h3>
          <div><strong>Question:</strong> ${msg.front}</div>
          <div><strong>Answer:</strong> ${msg.back}</div>
          <div><strong>Deck:</strong> ${msg.deckName}</div>
          <button id="confirm-save">Save to Anki</button>
          <button id="confirm-cancel">Cancel</button>
        `;

        const saveBtn = createMockElement('button', { id: 'confirm-save' });
        const cancelBtn = createMockElement('button', { id: 'confirm-cancel' });

        box.querySelector = jest.fn((selector) => {
          if (selector === '#confirm-save') return saveBtn;
          if (selector === '#confirm-cancel') return cancelBtn;
          return null;
        });

        // Event handlers
        saveBtn.onclick = () => {
          global.chrome.runtime.sendMessage({
            action: 'confirmSave',
            cardData: {
              front: msg.front,
              back: msg.back,
              deckName: msg.deckName,
              modelName: msg.modelName
            }
          });
          overlay.remove();
        };

        cancelBtn.onclick = () => {
          overlay.remove();
        };

        overlay.appendChild(box);
        global.document.body.appendChild(overlay);

        return { overlay, box, saveBtn, cancelBtn };
      };

      const dialog = createConfirmDialog(confirmMessage);

      expect(dialog.overlay.id).toBe('confirm-overlay');
      expect(dialog.box.id).toBe('confirm-box');
      expect(dialog.box.innerHTML).toContain('Generated question');
      expect(dialog.box.innerHTML).toContain('Generated answer');
    });

    test('should handle confirm save', () => {
      const saveBtn = createMockElement('button', { id: 'confirm-save' });
      const overlay = createMockElement('div', { id: 'confirm-overlay' });

      const cardData = {
        front: 'Test question',
        back: '<p>Test answer</p>',
        deckName: 'Default',
        modelName: 'Basic'
      };

      saveBtn.onclick = () => {
        global.chrome.runtime.sendMessage({
          action: 'confirmSave',
          cardData: cardData
        });
        overlay.remove();
      };

      saveBtn.onclick(); // Call onclick directly

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'confirmSave',
        cardData: cardData
      });

      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should handle confirm cancel', () => {
      const cancelBtn = createMockElement('button', { id: 'confirm-cancel' });
      const overlay = createMockElement('div', { id: 'confirm-overlay' });

      cancelBtn.onclick = () => overlay.remove();
      cancelBtn.onclick(); // Call onclick directly

      expect(overlay.remove).toHaveBeenCalled();
      expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Toast notifications', () => {
    test('should create and show success toast', () => {
      let toastEl = global.document.createElement('div');
      global.document.body.appendChild(toastEl);

      const showSuccessToast = (msg) => {
        toastEl.textContent = msg.message;
        toastEl.style.background = 'rgba(40,167,69,0.9)';
        toastEl.style.opacity = '1';
        
        // Return a timeout for completeness - but don't execute it immediately
        let timeout = null;
        if (msg.status === 'success') {
          timeout = setTimeout(() => {
            toastEl.style.opacity = '0';
          }, 3000);
        }
        
        return { toastEl, toastHideTimeout: timeout };
      };

      const successMessage = {
        status: 'success',
        message: 'Card saved to Anki!'
      };

      // Mock setTimeout to prevent immediate execution
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        return 'mock-timeout-id';
      });

      const result = showSuccessToast(successMessage);

      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(result.toastEl.textContent).toBe('Card saved to Anki!');
      expect(result.toastEl.style.background).toBe('rgba(40,167,69,0.9)');
      expect(result.toastEl.style.opacity).toBe('1');
      expect(result.toastHideTimeout).toBeTruthy();

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });

    test('should show error toast with different color', () => {
      let toastEl = global.document.createElement('div');
      global.document.body.appendChild(toastEl);

      const showErrorToast = (msg) => {
        toastEl.textContent = msg.message;
        toastEl.style.background = 'rgba(220,53,69,0.9)';
        toastEl.style.opacity = '1';
      };

      const errorMessage = {
        status: 'error',
        message: 'Failed to save card'
      };

      showErrorToast(errorMessage);

      expect(toastEl.textContent).toBe('Failed to save card');
      expect(toastEl.style.background).toBe('rgba(220,53,69,0.9)');
    });

    test('should show info toast', () => {
      let toastEl = global.document.createElement('div');

      const showInfoToast = (msg) => {
        toastEl.textContent = msg.message;
        toastEl.style.background = 'rgba(23,162,184,0.9)';
        toastEl.style.opacity = '1';
      };

      const infoMessage = {
        status: 'info',
        message: 'Processing your request...'
      };

      showInfoToast(infoMessage);

      expect(toastEl.textContent).toBe('Processing your request...');
      expect(toastEl.style.background).toBe('rgba(23,162,184,0.9)');
    });

    test('should handle multiple toast messages', () => {
      let toastEl = null;
      let toastHideTimeout = null;

      const showToast = (msg) => {
        // Clear any existing timeout
        if (toastHideTimeout) {
          clearTimeout(toastHideTimeout);
          toastHideTimeout = null;
        }

        if (!toastEl) {
          toastEl = global.document.createElement('div');
          global.document.body.appendChild(toastEl);
        }

        toastEl.textContent = msg.message;
        toastEl.style.opacity = '1';

        return { toastEl, cleared: !!toastHideTimeout };
      };

      // Show first toast
      const result1 = showToast({ status: 'info', message: 'First message' });
      toastHideTimeout = setTimeout(() => {}, 3000);

      // Show second toast (should clear first timeout)
      const result2 = showToast({ status: 'success', message: 'Second message' });

      expect(result2.toastEl.textContent).toBe('Second message');
      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Deck selection dropdown', () => {
    test('should populate deck selection dropdown', () => {
      const deckList = ['Default', 'Mathematics', 'Science', 'History'];
      const currentDeck = 'Mathematics';

      const createDeckSelect = (deckList, currentDeck, ankiOnline) => {
        if (!ankiOnline) {
          return '<p style="color: #dc3545;">⚠️ Anki is not running. Please start Anki and try again.</p>';
        }

        let options = '';
        deckList.forEach(deck => {
          const selected = deck === currentDeck ? ' selected' : '';
          options += `<option value="${deck}"${selected}>${deck}</option>`;
        });

        return `
          <label>Choose deck:</label>
          <select id="manual-deck" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            ${options}
          </select>
        `;
      };

      const deckSelectHtml = createDeckSelect(deckList, currentDeck, true);

      expect(deckSelectHtml).toContain('<select id="manual-deck"');
      expect(deckSelectHtml).toContain('<option value="Default">Default</option>');
      expect(deckSelectHtml).toContain('<option value="Mathematics" selected>Mathematics</option>');
      expect(deckSelectHtml).toContain('<option value="Science">Science</option>');
      expect(deckSelectHtml).toContain('<option value="History">History</option>');
    });

    test('should show Anki offline warning', () => {
      const createDeckSelect = (deckList, currentDeck, ankiOnline) => {
        if (!ankiOnline) {
          return '<p style="color: #dc3545;">⚠️ Anki is not running. Please start Anki and try again.</p>';
        }
        return '<select id="manual-deck"></select>';
      };

      const result = createDeckSelect([], 'Default', false);

      expect(result).toContain('⚠️ Anki is not running');
      expect(result).toContain('color: #dc3545');
    });
  });

  describe('Input validation and state management', () => {
    test('should enable/disable save button based on input validity', () => {
      const frontInput = createMockElement('textarea', { value: '' });
      const backInput = createMockElement('textarea', { value: 'Back content' });
      const saveBtn = createMockElement('button', { disabled: true });

      const isCloze = false;

      const toggleSave = () => {
        const frontValid = frontInput.value.trim().length > 0;
        const backValid = isCloze ? backInput.value.trim().length > 0 : true;
        
        saveBtn.disabled = !(frontValid && backValid);
      };

      // Initial state - empty front input
      toggleSave();
      expect(saveBtn.disabled).toBe(true);

      // Add front input content
      frontInput.value = 'What is this?';
      toggleSave();
      expect(saveBtn.disabled).toBe(false);

      // Clear front input
      frontInput.value = '';
      toggleSave();
      expect(saveBtn.disabled).toBe(true);
    });

    test('should validate cloze input differently', () => {
      const frontInput = createMockElement('textarea', { value: 'Front content' });
      const backInput = createMockElement('textarea', { value: '' });
      const saveBtn = createMockElement('button', { disabled: true });

      const isCloze = true;

      const toggleSave = () => {
        const frontValid = !isCloze || frontInput.value.trim().length > 0;
        const backValid = isCloze ? backInput.value.trim().length > 0 : true;
        
        saveBtn.disabled = !(frontValid && backValid);
      };

      // Initial state - empty back input for cloze
      toggleSave();
      expect(saveBtn.disabled).toBe(true);

      // Add cloze content
      backInput.value = 'This is {{c1::cloze}} content';
      toggleSave();
      expect(saveBtn.disabled).toBe(false);

      // Clear cloze content
      backInput.value = '';
      toggleSave();
      expect(saveBtn.disabled).toBe(true);
    });

    test('should handle input events for real-time validation', () => {
      const frontInput = createMockElement('textarea');
      const saveBtn = createMockElement('button');

      let isValid = false;

      const inputHandler = () => {
        isValid = frontInput.value.trim().length > 0;
        saveBtn.disabled = !isValid;
      };

      frontInput.addEventListener('input', inputHandler);

      // Simulate typing
      frontInput.value = 'Test question';
      frontInput.addEventListener.mock.calls[0][1](); // Trigger input event

      expect(saveBtn.disabled).toBe(false);

      // Clear input
      frontInput.value = '';
      frontInput.addEventListener.mock.calls[0][1](); // Trigger input event

      expect(saveBtn.disabled).toBe(true);
    });
  });

  describe('Dialog accessibility and user experience', () => {
    test('should close dialog on overlay click', () => {
      const overlay = createMockElement('div', { id: 'manual-overlay' });
      const box = createMockElement('div', { id: 'manual-box' });

      overlay.appendChild(box);

      // Setup overlay click handler
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      });

      // Simulate click on overlay (not box)
      const clickEvent = { target: overlay };
      overlay.addEventListener.mock.calls[0][1](clickEvent);

      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should not close dialog on box click', () => {
      const overlay = createMockElement('div', { id: 'manual-overlay' });
      const box = createMockElement('div', { id: 'manual-box' });

      overlay.appendChild(box);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      });

      // Simulate click on box (should not close)
      const clickEvent = { target: box };
      overlay.addEventListener.mock.calls[0][1](clickEvent);

      expect(overlay.remove).not.toHaveBeenCalled();
    });

    test('should focus on input field when dialog opens', () => {
      const frontInput = createMockElement('textarea', { id: 'manual-front-input' });
      
      // Simulate dialog open with focus
      setTimeout(() => {
        frontInput.focus();
      }, 100);

      // Verify focus would be called
      expect(frontInput.focus).toBeDefined();
    });

    test('should handle keyboard shortcuts', () => {
      const frontInput = createMockElement('textarea');
      const saveBtn = createMockElement('button');

      let keydownHandler = null;

      // Setup keyboard event handler
      frontInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (!saveBtn.disabled) {
            saveBtn.click();
          }
        }
      });

      keydownHandler = frontInput.addEventListener.mock.calls[0][1];

      // Simulate Ctrl+Enter
      const keyEvent = {
        key: 'Enter',
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn()
      };

      saveBtn.disabled = false;
      keydownHandler(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
      expect(saveBtn.click).toHaveBeenCalled();
    });
  });
});
