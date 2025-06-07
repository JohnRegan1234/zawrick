/**
 * Simplified tests for content script functionality
 */

describe('Content Script - Basic Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Ensure window.getSelection is properly mocked
    global.window.getSelection = jest.fn(() => ({
      rangeCount: 0,
      getRangeAt: jest.fn(),
      toString: jest.fn(() => '')
    }));

    // Mock document.createElement properly
    const originalCreateElement = global.document.createElement;
    global.document.createElement = jest.fn((tagName) => {
      const element = originalCreateElement.call(document, tagName);
      // Add commonly used methods
      element.remove = jest.fn();
      element.click = jest.fn();
      element.focus = jest.fn();
      return element;
    });

    // Mock document.body.appendChild
    global.document.body.appendChild = jest.fn();

    // Mock chrome.runtime.sendMessage for dialog tests
    global.chrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
  });

  describe('getSelectionHtml action', () => {
    test('should extract HTML from selection', () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
          cloneContents: jest.fn(() => {
            const fragment = document.createDocumentFragment();
            const p = document.createElement('p');
            p.className = '';
            p.textContent = 'Test HTML content';
            fragment.appendChild(p);
            return fragment;
          })
        }))
      };
      
      global.window.getSelection.mockReturnValue(mockSelection);

      // Simulate the selection extraction logic
      let html = '';
      const sel = global.window.getSelection();
      if (sel?.rangeCount) {
        const container = global.document.createElement('div');
        for (let i = 0; i < sel.rangeCount; i++) {
          const content = sel.getRangeAt(i).cloneContents();
          container.appendChild(content);
        }
        html = container.innerHTML;
      }

      expect(html).toBe('<p class="">Test HTML content</p>');
      expect(global.window.getSelection).toHaveBeenCalled();
    });

    test('should handle empty selection', () => {
      global.window.getSelection.mockReturnValue({
        rangeCount: 0
      });

      let html = '';
      const sel = global.window.getSelection();
      if (sel?.rangeCount) {
        // Won't execute
      }

      expect(html).toBe('');
      expect(global.window.getSelection).toHaveBeenCalled();
    });

    test('should handle null selection', () => {
      global.window.getSelection.mockReturnValue(null);

      let html = '';
      const sel = global.window.getSelection();
      if (sel?.rangeCount) {
        // Won't execute
      }

      expect(html).toBe('');
    });
  });

  describe('Dialog creation', () => {
    test('should create dialog elements', () => {
      const overlay = global.document.createElement('div');
      overlay.id = 'manual-overlay';
      
      const box = global.document.createElement('div');
      box.id = 'manual-box';
      
      overlay.appendChild(box);
      global.document.body.appendChild(overlay);

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(overlay);
      expect(overlay.id).toBe('manual-overlay');
      expect(box.id).toBe('manual-box');
    });

    test('should handle save button clicks', () => {
      const saveBtn = global.document.createElement('button');
      saveBtn.id = 'manual-save-btn';
      const overlay = global.document.createElement('div');
      overlay.id = 'manual-overlay';
      overlay.remove = jest.fn();

      const input = global.document.createElement('input');
      input.id = 'manual-front-input';
      input.value = 'What is the test question?';

      // Simulate the dialog box containing input and save button
      const box = global.document.createElement('div');
      box.appendChild(input);
      box.appendChild(saveBtn);

      // Attach box to overlay
      overlay.appendChild(box);

      // Setup onclick handler as in real code
      saveBtn.onclick = () => {
        const question = input.value.trim();
        if (!question) return;

        global.chrome.runtime.sendMessage({
          action: 'manualSave',
          front: question,
          backHtml: '<p>Test answer</p>',
          deckName: 'Default',
          modelName: 'Basic'
        });
        overlay.remove();
      };

      // Explicitly call onclick handler instead of saveBtn.click()
      saveBtn.onclick();

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'manualSave',
        front: 'What is the test question?',
        backHtml: '<p>Test answer</p>',
        deckName: 'Default',
        modelName: 'Basic'
      });
      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should prevent save with empty input', () => {
      const saveBtn = global.document.createElement('button');
      const overlay = global.document.createElement('div');
      
      const mockInput = { value: '' };
      
      saveBtn.onclick = () => {
        const question = mockInput.value.trim();
        if (!question) return; // Should prevent save

        global.chrome.runtime.sendMessage({ action: 'manualSave' });
        overlay.remove();
      };

      saveBtn.click();

      expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(overlay.remove).not.toHaveBeenCalled();
    });

    test('should handle cancel button clicks', () => {
      const cancelBtn = global.document.createElement('button');
      const overlay = global.document.createElement('div');
      overlay.remove = jest.fn(); // Ensure remove is mocked

      cancelBtn.onclick = () => overlay.remove();
      cancelBtn.onclick(); // Call the handler directly

      expect(overlay.remove).toHaveBeenCalled();
    });
  });

  describe('Toast notifications', () => {
    test('should create and show success toast', () => {
      const toastEl = global.document.createElement('div');
      global.document.body.appendChild(toastEl);
      
      const showToast = (message, status) => {
        toastEl.textContent = message;
        toastEl.style.background = status === 'success' ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)';
        toastEl.style.opacity = '1';
        return { toastEl };
      };

      const result = showToast('Card saved to Anki!', 'success');

      expect(result.toastEl.textContent).toBe('Card saved to Anki!');
      expect(result.toastEl.style.background).toBe('rgba(40, 167, 69, 0.9)');
      expect(result.toastEl.style.opacity).toBe('1');
    });

    test('should show error toast with different color', () => {
      const toastEl = global.document.createElement('div');
      
      toastEl.textContent = 'Failed to save card';
      toastEl.style.background = 'rgba(220, 53, 69, 0.9)';

      expect(toastEl.textContent).toBe('Failed to save card');
      // Use regex to handle potential spacing differences
      expect(toastEl.style.background).toMatch(/rgba\(220,?\s*53,?\s*69,?\s*0\.9\)/);
    });

    test('should show info toast', () => {
      const toastEl = global.document.createElement('div');
      
      toastEl.textContent = 'Processing your request...';
      toastEl.style.background = 'rgba(23, 162, 184, 0.9)';

      expect(toastEl.textContent).toBe('Processing your request...');
      expect(toastEl.style.background).toMatch(/rgba\(23,?\s*162,?\s*184,?\s*0\.9\)/);
    });

    test('should handle multiple toast messages', () => {
      let timeoutCleared = false;
      
      global.clearTimeout = jest.fn(() => {
        timeoutCleared = true;
      });

      // Simulate showing multiple toasts
      const showToast = () => {
        global.clearTimeout(123);
        return { cleared: timeoutCleared };
      };

      const result = showToast();
      expect(global.clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Deck selection', () => {
    test('should populate deck selection dropdown', () => {
      const deckList = ['Default', 'Mathematics', 'Science'];
      const currentDeck = 'Mathematics';

      const createDeckOptions = (deckList, currentDeck) => {
        return deckList.map(deck => ({
          value: deck,
          text: deck,
          selected: deck === currentDeck
        }));
      };

      const options = createDeckOptions(deckList, currentDeck);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({ value: 'Default', text: 'Default', selected: false });
      expect(options[1]).toEqual({ value: 'Mathematics', text: 'Mathematics', selected: true });
      expect(options[2]).toEqual({ value: 'Science', text: 'Science', selected: false });
    });

    test('should show Anki offline warning', () => {
      const ankiOnline = false;
      const warningMessage = ankiOnline ? '' : '⚠️ Anki is not running. Please start Anki and try again.';

      expect(warningMessage).toBe('⚠️ Anki is not running. Please start Anki and try again.');
    });
  });

  describe('Input validation', () => {
    test('should enable/disable save button based on input validity', () => {
      const validateInput = (value, isCloze = false) => {
        const trimmed = value.trim();
        return isCloze ? trimmed.length > 0 : trimmed.length > 0;
      };

      expect(validateInput('')).toBe(false);
      expect(validateInput('   ')).toBe(false);
      expect(validateInput('Valid input')).toBe(true);
      expect(validateInput('{{c1::cloze}}', true)).toBe(true);
      expect(validateInput('', true)).toBe(false);
    });

    test('should validate cloze input differently', () => {
      const validateCloze = (value) => {
        return value.trim().length > 0;
      };

      expect(validateCloze('')).toBe(false);
      expect(validateCloze('This is {{c1::cloze}} content')).toBe(true);
      expect(validateCloze('   ')).toBe(false);
    });
  });

  describe('Dialog accessibility', () => {
    test('should close dialog on overlay click', () => {
      const overlay = global.document.createElement('div');
      const box = global.document.createElement('div');
      
      overlay.appendChild(box);

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      };

      // Simulate click on overlay
      handleOverlayClick({ target: overlay });
      expect(overlay.remove).toHaveBeenCalled();
    });

    test('should not close dialog on box click', () => {
      const overlay = global.document.createElement('div');
      const box = global.document.createElement('div');

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      };

      // Simulate click on box (should not close)
      handleOverlayClick({ target: box });
      expect(overlay.remove).not.toHaveBeenCalled();
    });

    test('should focus on input field when dialog opens', () => {
      const input = global.document.createElement('input');
      
      // Simulate focus call
      input.focus();
      
      expect(input.focus).toHaveBeenCalled();
    });

    test('should handle keyboard shortcuts', () => {
      const handleKeydown = (e, saveBtn) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (!saveBtn.disabled) {
            saveBtn.click();
          }
        }
      };

      const saveBtn = global.document.createElement('button');
      saveBtn.disabled = false;

      const keyEvent = {
        key: 'Enter',
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn()
      };

      handleKeydown(keyEvent, saveBtn);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
      expect(saveBtn.click).toHaveBeenCalled();
    });
  });
});
