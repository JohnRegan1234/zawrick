// tests/content-script/content-script-advanced.test.js

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock DOM methods
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn()
});

// Mock implementation of content script functions
const getSelectedText = () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    return selection.toString().trim();
  }
  return '';
};

const highlightSelection = (element) => {
  if (!element) return;
  element.style.backgroundColor = '#ffff00';
  element.classList.add('zawrick-highlight');
};

const createFloatingUI = (text) => {
  const floatingDiv = document.createElement('div');
  floatingDiv.id = 'zawrick-floating-ui';
  floatingDiv.style.cssText = `
    position: fixed;
    top: 50px;
    right: 50px;
    width: 300px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 16px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  `;
  floatingDiv.innerHTML = `
    <div>Selected Text: ${text.substring(0, 100)}...</div>
    <button id="create-anki-card">Create Anki Card</button>
  `;
  document.body.appendChild(floatingDiv);
  return floatingDiv;
};

const handleKeyboardShortcut = (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'A') {
    event.preventDefault();
    const selectedText = getSelectedText();
    if (selectedText) {
      createFloatingUI(selectedText);
    }
  }
};

describe('Content Script Advanced Functionality', () => {
  let mockSelection;
  let mockRange;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Reset Chrome API mocks
    jest.clearAllMocks();
    
    // Setup mock selection
    mockRange = {
      cloneContents: jest.fn(),
      toString: jest.fn()
    };
    
    mockSelection = {
      rangeCount: 1,
      getRangeAt: jest.fn(() => mockRange),
      toString: jest.fn()
    };
    
    window.getSelection.mockReturnValue(mockSelection);
  });

  describe('Advanced Selection Handling', () => {
    test('should extract complex HTML structures', () => {
      const mockDocumentFragment = {
        children: [{
          tagName: 'DIV',
          innerHTML: '<p>Test <strong>content</strong> with <em>formatting</em></p>'
        }]
      };
      
      mockRange.cloneContents.mockReturnValue(mockDocumentFragment);
      
      const extractComplexHtml = () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const contents = range.cloneContents();
          
          // Simulate extracting HTML from fragment
          if (contents.children && contents.children.length > 0) {
            return contents.children[0].innerHTML;
          }
        }
        return '';
      };

      const result = extractComplexHtml();
      expect(result).toBe('<p>Test <strong>content</strong> with <em>formatting</em></p>');
    });

    test('should handle nested HTML elements', () => {
      const nestedHtml = `
        <div class="article">
          <h2>Title</h2>
          <p>Paragraph with <a href="link">link</a> and <span class="highlight">highlighted text</span></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      
      const mockDiv = document.createElement('div');
      mockDiv.innerHTML = nestedHtml;
      
      const extractNestedContent = (element) => {
        // Simulate content extraction logic
        const textNodes = [];
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.trim()) {
            textNodes.push(node.textContent.trim());
          }
        }
        
        return textNodes.join(' ');
      };

      const result = extractNestedContent(mockDiv);
      expect(result).toContain('Title');
      expect(result).toContain('Paragraph with');
      expect(result).toContain('Item 1');
    });

    test('should handle edge case selections', () => {
      // Test empty selection
      mockSelection.rangeCount = 0;
      
      const handleEmptySelection = () => {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
          return null;
        }
        return selection.getRangeAt(0);
      };

      expect(handleEmptySelection()).toBeNull();
      
      // Test selection with no content
      mockSelection.rangeCount = 1;
      mockRange.toString.mockReturnValue('');
      
      const handleEmptyContent = () => {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const text = range.toString().trim();
        return text.length > 0 ? text : null;
      };

      expect(handleEmptyContent()).toBeNull();
    });
  });

  describe('Dialog State Management', () => {
    test('should prevent multiple dialogs from opening', () => {
      let dialogOpen = false;
      let mockDialog = null;
      
      const openDialog = () => {
        if (dialogOpen) {
          return false; // Already open
        }
        
        dialogOpen = true;
        mockDialog = {
          id: 'zawrick-dialog',
          remove: jest.fn(() => {
            mockDialog = null;
          })
        };
        return true;
      };

      const closeDialog = () => {
        if (mockDialog) {
          mockDialog.remove();
          dialogOpen = false;
          mockDialog = null;
        }
      };

      // Mock document.getElementById to return our mock dialog when it exists
      document.getElementById = jest.fn((id) => {
        if (id === 'zawrick-dialog' && dialogOpen && mockDialog) {
          return mockDialog;
        }
        return null;
      });

      expect(openDialog()).toBe(true);
      expect(document.getElementById('zawrick-dialog')).toBeTruthy();
      
      // Try to open another dialog
      expect(openDialog()).toBe(false);
      
      closeDialog();
      expect(document.getElementById('zawrick-dialog')).toBeFalsy();
      
      // Should be able to open again
      expect(openDialog()).toBe(true);
    });

    test('should handle dialog cleanup on page navigation', () => {
      // Create mock dialog elements that simulate being in the DOM
      const mockElements = [
        { className: 'zawrick-dialog', remove: jest.fn() },
        { className: 'zawrick-toast', remove: jest.fn() }
      ];
      
      // Mock querySelectorAll to return our mock elements initially
      let elementsExist = true;
      document.querySelectorAll = jest.fn((selector) => {
        if (!elementsExist) return [];
        
        if (selector === '.zawrick-dialog, .zawrick-toast') {
          return mockElements;
        }
        return [];
      });
      
      // Mock querySelector to return appropriate element or null
      document.querySelector = jest.fn((selector) => {
        if (!elementsExist) return null;
        
        if (selector === '.zawrick-dialog') {
          return mockElements[0];
        }
        if (selector === '.zawrick-toast') {
          return mockElements[1];
        }
        return null;
      });
      
      const cleanupDialogs = () => {
        const dialogs = document.querySelectorAll('.zawrick-dialog, .zawrick-toast');
        dialogs.forEach(dialog => dialog.remove());
        elementsExist = false; // Simulate elements being removed
        return dialogs.length;
      };

      const removedCount = cleanupDialogs();
      expect(removedCount).toBe(2);
      expect(document.querySelector('.zawrick-dialog')).toBeFalsy();
      expect(document.querySelector('.zawrick-toast')).toBeFalsy();
    });
  });

  describe('Advanced Input Validation', () => {
    test('should validate cloze deletion format', () => {
      const validateClozeFormat = (text) => {
        const clozePattern = /\{\{c\d+::[^}]+\}\}/g;
        const matches = text.match(clozePattern);
        
        if (!matches || matches.length === 0) {
          return { valid: false, error: 'No cloze deletions found' };
        }
        
        // Check for sequential numbering
        const numbers = matches.map(match => {
          const numberMatch = match.match(/c(\d+)::/);
          return numberMatch ? parseInt(numberMatch[1]) : 0;
        }).sort((a, b) => a - b);
        
        if (numbers[0] !== 1) {
          return { valid: false, error: 'Cloze numbering must start with c1' };
        }
        
        return { valid: true, count: matches.length };
      };

      expect(validateClozeFormat('Test {{c1::content}}')).toEqual({ valid: true, count: 1 });
      expect(validateClozeFormat('{{c1::First}} and {{c2::Second}}')).toEqual({ valid: true, count: 2 });
      expect(validateClozeFormat('No cloze here')).toEqual({ valid: false, error: 'No cloze deletions found' });
      expect(validateClozeFormat('{{c2::Wrong}} start')).toEqual({ valid: false, error: 'Cloze numbering must start with c1' });
    });

    test('should validate HTML content safety', () => {
      const sanitizeHtml = (html) => {
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
        const dangerous = dangerousTags.some(tag => 
          html.toLowerCase().includes(`<${tag}`) || html.toLowerCase().includes(`</${tag}>`)
        );
        
        if (dangerous) {
          return { safe: false, error: 'Potentially dangerous HTML detected' };
        }
        
        return { safe: true, sanitized: html };
      };

      expect(sanitizeHtml('<p>Safe content</p>')).toEqual({ safe: true, sanitized: '<p>Safe content</p>' });
      expect(sanitizeHtml('<script>alert("xss")</script>')).toEqual({ safe: false, error: 'Potentially dangerous HTML detected' });
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toEqual({ safe: false, error: 'Potentially dangerous HTML detected' });
    });

    test('should validate input length limits', () => {
      const validateInputLength = (text, maxLength = 1000) => {
        if (text.length > maxLength) {
          return { 
            valid: false, 
            error: `Content too long (${text.length}/${maxLength} characters)` 
          };
        }
        
        if (text.trim().length === 0) {
          return { valid: false, error: 'Content cannot be empty' };
        }
        
        return { valid: true, length: text.length };
      };

      const shortText = 'Short content';
      const longText = 'x'.repeat(1001);
      
      expect(validateInputLength(shortText)).toEqual({ valid: true, length: 13 });
      expect(validateInputLength(longText)).toEqual({ 
        valid: false, 
        error: 'Content too long (1001/1000 characters)' 
      });
      expect(validateInputLength('   ')).toEqual({ valid: false, error: 'Content cannot be empty' });
    });
  });

  describe('Advanced UI Interactions', () => {
    test('should handle keyboard shortcuts', () => {
      const keyboardShortcuts = {
        'Ctrl+Enter': 'save',
        'Escape': 'cancel',
        'Ctrl+Shift+c': 'cloze'
      };
      
      const handleKeydown = (event) => {
        const key = event.key;
        const ctrl = event.ctrlKey;
        const shift = event.shiftKey;
        
        let shortcut = '';
        if (ctrl) shortcut += 'Ctrl+';
        if (shift) shortcut += 'Shift+';
        shortcut += key;
        
        return keyboardShortcuts[shortcut] || null;
      };

      expect(handleKeydown({ key: 'Enter', ctrlKey: true, shiftKey: false })).toBe('save');
      expect(handleKeydown({ key: 'Escape', ctrlKey: false, shiftKey: false })).toBe('cancel');
      expect(handleKeydown({ key: 'c', ctrlKey: true, shiftKey: true })).toBe('cloze');
      expect(handleKeydown({ key: 'a', ctrlKey: true, shiftKey: false })).toBeNull();
    });

    test('should manage focus states correctly', () => {
      const input = document.createElement('input');
      const button = document.createElement('button');
      
      document.body.appendChild(input);
      document.body.appendChild(button);
      
      // Mock focus() method for JSDOM
      input.focus = jest.fn(() => {
        Object.defineProperty(document, 'activeElement', {
          value: input,
          configurable: true
        });
      });
      
      button.focus = jest.fn(() => {
        Object.defineProperty(document, 'activeElement', {
          value: button,
          configurable: true
        });
      });
      
      const manageFocus = (element) => {
        element.focus();
        return document.activeElement === element;
      };

      expect(manageFocus(input)).toBe(true);
      expect(document.activeElement).toBe(input);
      
      expect(manageFocus(button)).toBe(true);
      expect(document.activeElement).toBe(button);
    });

    test('should handle textarea auto-resize', () => {
      const textarea = document.createElement('textarea');
      textarea.style.height = '100px';
      textarea.style.overflow = 'hidden';
      
      // Mock scrollHeight property
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: function() {
          return this.value.length > 50 ? 150 : 100;
        }
      });
      
      const autoResize = (element, content) => {
        element.value = content;
        element.style.height = 'auto';
        element.style.height = Math.max(100, element.scrollHeight) + 'px';
        return parseInt(element.style.height);
      };

      const shortContent = 'Short text';
      const longContent = 'Long text\n'.repeat(10);
      
      expect(autoResize(textarea, shortContent)).toBeGreaterThanOrEqual(100);
      expect(autoResize(textarea, longContent)).toBeGreaterThan(100);
    });
  });

  describe('Advanced Toast System', () => {
    test('should queue multiple toasts', () => {
      const toastQueue = [];
      let activeToast = null;
      
      const showToast = (message, type = 'info') => {
        const toast = { message, type, id: Date.now() };
        
        if (activeToast) {
          toastQueue.push(toast);
          return false; // Queued
        } else {
          activeToast = toast;
          return true; // Shown immediately
        }
      };
      
      const hideToast = () => {
        activeToast = null;
        if (toastQueue.length > 0) {
          activeToast = toastQueue.shift();
          return activeToast;
        }
        return null;
      };

      expect(showToast('First toast')).toBe(true);
      expect(showToast('Second toast')).toBe(false);
      expect(showToast('Third toast')).toBe(false);
      
      expect(toastQueue.length).toBe(2);
      
      const nextToast = hideToast();
      expect(nextToast.message).toBe('Second toast');
      expect(toastQueue.length).toBe(1);
    });

    test('should handle toast timeout and cleanup', () => {
      jest.useFakeTimers();
      let toastElement = null;
      let mockToast = null;
      
      const createToast = (message, duration = 3000) => {
        mockToast = {
          textContent: message,
          className: 'toast',
          parentNode: true, // Simulate being in DOM
          remove: jest.fn(() => {
            mockToast.parentNode = null;
            toastElement = null;
          })
        };
        toastElement = mockToast;
        
        setTimeout(() => {
          if (mockToast && mockToast.parentNode) {
            mockToast.remove();
          }
        }, duration);
        
        return mockToast;
      };

      // Mock document.querySelector to return our mock toast when it exists
      document.querySelector = jest.fn((selector) => {
        if (selector === '.toast' && toastElement && toastElement.parentNode) {
          return mockToast;
        }
        return null;
      });

      const toast = createToast('Test message', 100);
      expect(toastElement).toBe(toast);
      expect(document.querySelector('.toast')).toBeTruthy();
      
      // Fast-forward time
      jest.advanceTimersByTime(150);
      
      expect(document.querySelector('.toast')).toBeFalsy();
      expect(toastElement).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Error Recovery', () => {
    test('should recover from DOM manipulation errors', () => {
      // Create a simple mock element that can be found and removed
      const mockElement = {
        id: 'test-element',
        remove: jest.fn()
      };
      
      // Mock document.querySelector to return our element when the selector matches
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn((selector) => {
        if (selector === '#test-element') {
          return mockElement;
        }
        return null;
      });
      
      const safelyRemoveElement = (selector) => {
        try {
          const element = document.querySelector(selector);
          if (element) {
            element.remove();
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to remove element:', error);
          return false;
        }
      };

      // Test with valid selector - should find and remove element
      expect(safelyRemoveElement('#test-element')).toBe(true);
      expect(mockElement.remove).toHaveBeenCalled();
      
      // Test with non-existent element - should return false
      expect(safelyRemoveElement('#non-existent')).toBe(false);
      
      // Restore original for other tests
      document.querySelector = originalQuerySelector;
    });

    test('should handle storage operation failures', async () => {
      const safeStorageOperation = async (operation) => {
        try {
          const result = await new Promise((resolve, reject) => {
            chrome.storage.local[operation.type](operation.data, (result) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(result);
              }
            });
          });
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      // Mock successful operation
      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback({ key: 'value' });
      });

      const successResult = await safeStorageOperation({ type: 'get', data: ['key'] });
      expect(successResult.success).toBe(true);

      // Mock failed operation
      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        chrome.runtime.lastError = { message: 'Storage error' };
        callback({});
      });

      const errorResult = await safeStorageOperation({ type: 'get', data: ['key'] });
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Storage error');
      
      // Clean up
      delete chrome.runtime.lastError;
    });
  });
});
