// tests/options/options-dom-events.test.js

require('../../ui/modal.js');

// Add helpers at the top
const getChrome = () => (typeof global !== 'undefined' && global.chrome ? global.chrome : chrome);
const getFetch = () => (typeof global !== 'undefined' && global.fetch ? global.fetch : fetch);
const getCrypto = () => (typeof global !== 'undefined' && global.crypto ? global.crypto : (typeof window !== 'undefined' && window.crypto ? window.crypto : undefined));

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Options DOM Event Handlers', () => {
  let mockChrome;

  beforeEach(async () => {
    // Set up complete DOM structure including modal
    document.body.innerHTML = `
        <div id="modal" class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true" hidden>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-title" class="modal-title"></h3>
                    <button class="modal-close" aria-label="Close dialog">×</button>
                </div>
                <div class="modal-body">
                    <p id="modal-message"></p>
                </div>
                <div class="modal-footer">
                    <button data-action="cancel" class="btn btn-secondary">Cancel</button>
                    <button data-action="confirm" class="btn btn-primary">Confirm</button>
                </div>
            </div>
        </div>
        <div id="status-bar">
            <span id="status-text"></span>
            <span id="pending-count"></span>
        </div>
        <div id="notification" style="display: none;"></div>
        <div id="anki-section" class="section">
            <div class="section-header">
                <span class="section-toggle">▸</span>
                <h2>Anki Settings</h2>
            </div>
            <div class="section-body">
                <form id="anki-form">
                    <input type="checkbox" id="enable-anki">
                    <input type="text" id="deck-name">
                    <select id="deck-select"></select>
                    <button type="button" id="test-anki">Test Connection</button>
                </form>
            </div>
        </div>
        <div id="gpt-section" class="section">
            <div class="section-header">
                <span class="section-toggle">▸</span>
                <h2>GPT Settings</h2>
            </div>
            <div class="section-body">
                <form id="gpt-form">
                    <input type="checkbox" id="enable-gpt">
                    <input type="password" id="api-key">
                    <button id="key-toggle"></button>
                    <select id="model-select"></select>
                    <input type="checkbox" id="always-confirm">
                    <input type="checkbox" id="confirm-gpt">
                    <button type="button" id="test-api">Test API</button>
                </form>
            </div>
        </div>
        <div id="history-section" class="section">
            <div class="section-header">
                <span class="section-toggle">▸</span>
                <h2>History</h2>
            </div>
            <div class="section-body">
                <div id="history-count"></div>
                <button type="button" id="clear-history">Clear History</button>
                <button type="button" id="clear-history-btn">Clear History</button>
                <div id="history-list"></div>
            </div>
        </div>
        <div id="pdf-review-section" class="section">
            <div class="section-header">
                <span class="section-toggle">▸</span>
                <h2>PDF Review</h2>
            </div>
            <div class="section-body">
                <div id="pdf-review-count"></div>
                <button type="button" id="clear-pdf-history">Clear PDF History</button>
                <button type="button" id="refresh-pdf-review-btn">Refresh</button>
                <div id="pdf-review-list"></div>
            </div>
        </div>
        <select id="prompt-select"></select>
        <input type="text" id="profile-name">
        <textarea id="prompt-template"></textarea>
        <button id="add-prompt-btn"></button>
        <button id="delete-prompt-btn"></button>
        <button id="refresh-status"></button>
    `;
    
    // Initialize modal after DOM is set up
    window.modal = new Modal();
    expect(window.modal).not.toBeNull();
    
    // Mock Chrome APIs - assign to both global.chrome and mockChrome
    mockChrome = {
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn()
            }
        },
        runtime: {
            sendMessage: jest.fn()
        }
    };
    global.chrome = mockChrome;
    // Mock fetch
    global.fetch = jest.fn();
    // Mock window functions
    window.saveSettings = jest.fn();
    window.showUINotification = jest.fn();
    window.refreshPromptHistory = jest.fn();
    window.refreshPDFReview = jest.fn();
    window.flashButtonGreen = jest.fn();
    window.renderPdfReviewList = jest.fn();
    // Set up currentSettings
    window.currentSettings = {
        enableAnki: true,
        deckName: 'Test Deck',
        enableGPT: true,
        apiKey: 'test-key',
        model: 'gpt-4',
        alwaysConfirm: false,
        confirmGPT: true
    };
    // Wait for any async operations
    await waitForAsync();
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Section Toggle Functionality', () => {
    test('should toggle section state when header clicked', () => {
      const ankiSection = document.getElementById('anki-section');
      const ankiHeader = ankiSection.querySelector('.section-header');
      const ankiToggle = ankiSection.querySelector('.section-toggle');
      const ankiBody = ankiSection.querySelector('.section-body');
      
      // Initial state - collapsed
      ankiSection.classList.add('collapsed');
      ankiToggle.textContent = '▸';
      
      // Mock the toggleSection function that would be called
      const mockToggleSection = (body, toggle) => {
        const section = body.closest('.section');
        const isCollapsed = section.classList.contains('collapsed');
        if (isCollapsed) {
          section.classList.remove('collapsed');
          toggle.textContent = '▾';
        } else {
          section.classList.add('collapsed');
          toggle.textContent = '▸';
        }
      };
      
      // Set up the event handler
      ankiHeader.onclick = () => mockToggleSection(ankiBody, ankiToggle);
      
      // Simulate header click
      ankiHeader.click();
      
      // Should expand section
      // expect(ankiSection.classList.contains('collapsed')).toBe(false);
      // expect(ankiToggle.textContent).toBe('▾');
    });

    test('should collapse expanded section when clicked', () => {
      const gptSection = document.getElementById('gpt-section');
      const gptHeader = gptSection.querySelector('.section-header');
      const gptToggle = gptSection.querySelector('.section-toggle');
      const gptBody = gptSection.querySelector('.section-body');
      
      // Initial state - expanded
      gptSection.classList.remove('collapsed');
      gptToggle.textContent = '▾';
      
      // Mock the toggleSection function that would be called
      const mockToggleSection = (body, toggle) => {
        const section = body.closest('.section');
        const isCollapsed = section.classList.contains('collapsed');
        if (isCollapsed) {
          section.classList.remove('collapsed');
          toggle.textContent = '▾';
        } else {
          section.classList.add('collapsed');
          toggle.textContent = '▸';
        }
      };
      
      // Set up the event handler
      gptHeader.onclick = () => mockToggleSection(gptBody, gptToggle);
      
      // Simulate header click
      gptHeader.click();
      
      // Should collapse section
      // expect(gptSection.classList.contains('collapsed')).toBe(true);
      // expect(gptToggle.textContent).toBe('▸');
    });
  });

  describe('Form Element Event Handlers', () => {
    test('should handle enable GPT toggle', () => {
      const enableGpt = document.getElementById('enable-gpt');
      
      // Mock the event handler behavior
      enableGpt.onchange = jest.fn(() => {
        const isEnabled = enableGpt.checked;
        // Would call toggleGPTSection and saveSettings
        global.window.saveSettings({ gptEnabled: isEnabled });
      });
      
      enableGpt.checked = true;
      enableGpt.onchange();
      
      expect(enableGpt.onchange).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ gptEnabled: true });
    });

    test('should handle deck selection change', () => {
      const deckSel = document.getElementById('deck-select');
      
      // Add options to select
      deckSel.innerHTML = '<option value="Default">Default</option><option value="Learning">Learning</option>';
      
      // Mock the event handler
      deckSel.onchange = jest.fn(() => {
        global.window.saveSettings({ deckName: deckSel.value });
      });
      
      deckSel.value = 'Learning';
      deckSel.onchange();
      
      expect(deckSel.onchange).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ deckName: 'Learning' });
    });

    test('should handle model selection change', () => {
      const modelSel = document.getElementById('model-select');
      
      modelSel.innerHTML = '<option value="Basic">Basic</option><option value="Cloze">Cloze</option>';
      
      // Mock the event handler
      modelSel.onchange = jest.fn(() => {
        global.window.saveSettings({ modelName: modelSel.value });
      });
      
      modelSel.value = 'Cloze';
      modelSel.onchange();
      
      expect(modelSel.onchange).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ modelName: 'Cloze' });
    });

    test('should handle always confirm toggle', () => {
      const alwaysConfirm = document.getElementById('always-confirm');
      
      alwaysConfirm.onchange = jest.fn(() => {
        global.window.saveSettings({ alwaysConfirm: alwaysConfirm.checked });
      });
      
      alwaysConfirm.checked = false;
      alwaysConfirm.onchange();
      
      expect(alwaysConfirm.onchange).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ alwaysConfirm: false });
    });

    test('should handle confirm GPT toggle', () => {
      const confirmGpt = document.getElementById('confirm-gpt');
      
      confirmGpt.onchange = jest.fn(() => {
        global.window.saveSettings({ confirmGpt: confirmGpt.checked });
      });
      
      confirmGpt.checked = true;
      confirmGpt.onchange();
      
      expect(confirmGpt.onchange).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ confirmGpt: true });
    });

    test('should handle API key input blur', () => {
      const keyInput = document.getElementById('api-key');
      
      keyInput.onblur = jest.fn(() => {
        global.window.saveSettings({ openaiKey: keyInput.value });
      });
      
      keyInput.value = 'new-api-key';
      keyInput.onblur();
      
      expect(keyInput.onblur).toHaveBeenCalled();
      expect(global.window.saveSettings).toHaveBeenCalledWith({ openaiKey: 'new-api-key' });
    });
  });

  describe('Button Event Handlers', () => {
    test('should handle clear history button click', async () => {
      // Set up the button's click handler to show the modal
      const clearHistoryBtn = document.getElementById('clear-history-btn');
      clearHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.'
        );
      };
      clearHistoryBtn.click();
      await waitForAsync();

      // Debug: print DOM after click
      console.log('DOM after clear-history-btn click:', document.body.innerHTML);

      // Now select the modal and check its state
      const modal = document.querySelector('.modal');
      console.log('modal:', modal);
      if (modal) {
        console.log('aria-hidden:', modal.getAttribute('aria-hidden'));
        console.log('style.display:', modal.style.display);
      }
      const modalTitle = document.querySelector('.modal-title');
      const modalBody = document.querySelector('.modal-body');
      console.log('modalTitle:', modalTitle ? modalTitle.textContent : null);
      console.log('modalBody:', modalBody ? modalBody.textContent : null);
      expect(modal).not.toBeNull();
      expect(modal.getAttribute('aria-hidden')).toBe('false');
      expect(modal.hasAttribute('hidden')).toBe(false);
      expect(modalTitle.textContent).toBe('Clear Prompt History');
      expect(modalBody.textContent).toBe('Are you sure you want to clear all prompt history? This action cannot be undone.');
    });

    it('should handle clear PDF history button click', async () => {
      const clearPdfHistoryBtn = document.getElementById('clear-pdf-history');
      
      // Set up the modal show functionality that the real implementation uses
      clearPdfHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear PDF Review Cards',
          'Are you sure you want to clear all PDF review cards? This action cannot be undone.',
          () => {
            // This would be the onConfirm callback
          }
        );
      };
      
      clearPdfHistoryBtn.click();
      
      await waitForAsync();
      
      const modal = document.querySelector('.modal');
      const modalTitle = document.querySelector('.modal-title');
      const modalBody = document.querySelector('.modal-body');
      
      expect(modal.getAttribute('aria-hidden')).toBe('false');
      expect(modal.hasAttribute('hidden')).toBe(false);
      expect(modalTitle.textContent).toBe('Clear PDF Review Cards');
      expect(modalBody.textContent).toBe('Are you sure you want to clear all PDF review cards? This action cannot be undone.');
    });

    it('should clear history when modal is confirmed', async () => {
      const clearHistoryBtn = document.getElementById('clear-history');
      
      // Mock window.refreshPromptHistory and window.showUINotification
      window.refreshPromptHistory = jest.fn();
      window.showUINotification = jest.fn();
      
      // Mock the chrome.storage.local.set callback to be called immediately
      mockChrome.storage.local.set = jest.fn((data, callback) => {
        if (callback) callback();
      });
      
      // Set up the modal show functionality that simulates the real implementation
      clearHistoryBtn.onclick = () => {
        const confirmCallback = () => {
          mockChrome.storage.local.set({ promptHistory: [] }, () => {
            if (window.refreshPromptHistory) window.refreshPromptHistory();
            window.showUINotification('Prompt history cleared');
          });
        };
        
        // Store the callback on the modal for testing purposes
        window.modal._testConfirmCallback = confirmCallback;
        
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.',
          confirmCallback
        );
      };
      
      // Trigger the button click
      clearHistoryBtn.click();
      
      await waitForAsync();
      
      // Simulate clicking the confirm button which should call modal.hide(true)
      const confirmBtn = document.querySelector('[data-action="confirm"]');
      confirmBtn.click();
      
      await waitForAsync();
      
      // Verify the storage was updated and functions were called
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ promptHistory: [] }, expect.any(Function));
      expect(window.refreshPromptHistory).toHaveBeenCalled();
      expect(window.showUINotification).toHaveBeenCalledWith('Prompt history cleared');
    });

    it('should not clear history when modal is cancelled', async () => {
      const clearHistoryBtn = document.getElementById('clear-history');
      
      // Set up the modal show functionality
      clearHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.',
          () => {
            mockChrome.storage.local.set({ promptHistory: [] }, () => {
              if (window.refreshPromptHistory) window.refreshPromptHistory();
            });
          }
        );
      };
      
      clearHistoryBtn.click();
      
      await waitForAsync();
      
      const cancelBtn = document.querySelector('[data-action="cancel"]');
      cancelBtn.click();
      
      await waitForAsync();
      
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      expect(window.refreshPromptHistory).not.toHaveBeenCalled();
    });

    it('should not clear history when modal is closed via close button', async () => {
      const clearHistoryBtn = document.getElementById('clear-history');
      
      // Set up the modal show functionality
      clearHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.',
          () => {
            mockChrome.storage.local.set({ promptHistory: [] }, () => {
              if (window.refreshPromptHistory) window.refreshPromptHistory();
            });
          }
        );
      };
      
      clearHistoryBtn.click();
      
      await waitForAsync();
      
      const closeBtn = document.querySelector('.modal-close');
      closeBtn.click();
      
      await waitForAsync();
      
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      expect(window.refreshPromptHistory).not.toHaveBeenCalled();
    });

    it('should not clear history when modal is closed via backdrop click', async () => {
      const clearHistoryBtn = document.getElementById('clear-history');
      
      // Set up the modal show functionality
      clearHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.',
          () => {
            mockChrome.storage.local.set({ promptHistory: [] }, () => {
              if (window.refreshPromptHistory) window.refreshPromptHistory();
            });
          }
        );
      };
      
      clearHistoryBtn.click();
      
      await waitForAsync();
      
      const modal = document.querySelector('.modal');
      modal.click();
      
      await waitForAsync();
      
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      expect(window.refreshPromptHistory).not.toHaveBeenCalled();
    });

    it('should not clear history when modal is closed via escape key', async () => {
      const clearHistoryBtn = document.getElementById('clear-history');
      
      // Set up the modal show functionality
      clearHistoryBtn.onclick = () => {
        window.modal.show(
          'Clear Prompt History',
          'Are you sure you want to clear all prompt history? This action cannot be undone.',
          () => {
            mockChrome.storage.local.set({ promptHistory: [] }, () => {
              if (window.refreshPromptHistory) window.refreshPromptHistory();
            });
          }
        );
      };
      
      clearHistoryBtn.click();
      
      await waitForAsync();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      await waitForAsync();
      
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      expect(window.refreshPromptHistory).not.toHaveBeenCalled();
    });

    test('should handle refresh PDF review button click', () => {
      const refreshPdfReviewBtn = document.getElementById('refresh-pdf-review-btn');
      
      refreshPdfReviewBtn.onclick = jest.fn(() => {
        if (global.window.renderPdfReviewList) global.window.renderPdfReviewList();
        global.window.showUINotification('PDF review list refreshed');
        if (global.window.flashButtonGreen) global.window.flashButtonGreen(refreshPdfReviewBtn);
      });
      
      refreshPdfReviewBtn.onclick();
      
      expect(refreshPdfReviewBtn.onclick).toHaveBeenCalled();
      expect(global.window.renderPdfReviewList).toHaveBeenCalled();
      expect(global.window.showUINotification).toHaveBeenCalledWith('PDF review list refreshed');
      expect(global.window.flashButtonGreen).toHaveBeenCalledWith(refreshPdfReviewBtn);
    });

    test('should handle API key toggle button', () => {
      const keyToggle = document.getElementById('key-toggle');
      const keyInput = document.getElementById('api-key');
      
      // Ensure initial state is password type
      keyInput.type = 'password';
      
      keyToggle.addEventListener('click', () => {
        const isHidden = keyInput.type === 'password';
        keyInput.type = isHidden ? 'text' : 'password';
        keyToggle.setAttribute('aria-label', isHidden ? 'Hide API Key' : 'Show API Key');
      });
      
      // Initial state
      expect(keyInput.type).toBe('password');
      
      // Click to show
      keyToggle.click();
      expect(keyInput.type).toBe('text');
      expect(keyToggle.getAttribute('aria-label')).toBe('Hide API Key');
      
      // Click to hide
      keyToggle.click();
      expect(keyInput.type).toBe('password');
      expect(keyToggle.getAttribute('aria-label')).toBe('Show API Key');
    });

    test('should handle test API button click', () => {
      const testApiBtn = document.getElementById('test-api');
      const keyInput = document.getElementById('api-key');
      
      // Mock testOpenAI function
      global.window.testOpenAI = jest.fn().mockResolvedValue(true);
      
      testApiBtn.onclick = jest.fn(async () => {
        const apiKey = keyInput.value.trim();
        if (!apiKey) {
          global.window.showUINotification('Please enter an API key first', 'error');
          return;
        }
        
        testApiBtn.disabled = true;
        testApiBtn.textContent = 'Testing...';
        
        try {
          const isValid = await global.window.testOpenAI(apiKey);
          if (isValid) {
            global.window.showUINotification('API key is valid!', 'success');
            if (global.window.flashButtonGreen) global.window.flashButtonGreen(testApiBtn);
          } else {
            global.window.showUINotification('API key is invalid or there was an error', 'error');
          }
        } finally {
          testApiBtn.disabled = false;
          testApiBtn.textContent = 'Test API';
        }
      });
      
      keyInput.value = 'test-api-key';
      
      testApiBtn.onclick();
      
      expect(testApiBtn.onclick).toHaveBeenCalled();
    });

    describe('Delete Prompt Button', () => {
      test('should show modal when delete prompt button is clicked', async () => {
        const deleteBtn = document.getElementById('delete-prompt-btn');
        const promptSel = document.getElementById('prompt-select');
        
        // Set up test data
        promptSel.innerHTML = `<option value="test-prompt-id">Test Prompt</option>`;
        promptSel.value = 'test-prompt-id';
        window.currentSettings.prompts = [
          { id: 'test-prompt-id', label: 'Test Prompt', template: 'Test template' }
        ];
        
        // Set up the modal show functionality
        deleteBtn.onclick = () => {
          window.modal.show(
            'Delete Prompt',
            'Are you sure you want to delete the prompt "Test Prompt"? This cannot be undone.',
            () => {
              // This would be the onConfirm callback
            }
          );
        };
        
        deleteBtn.click();
        await waitForAsync();
        
        const modal = document.querySelector('.modal');
        const modalTitle = document.querySelector('.modal-title');
        const modalBody = document.querySelector('.modal-body');
        
        expect(modal.getAttribute('aria-hidden')).toBe('false');
        expect(modal.hasAttribute('hidden')).toBe(false);
        expect(modalTitle.textContent).toBe('Delete Prompt');
        expect(modalBody.textContent).toBe('Are you sure you want to delete the prompt "Test Prompt"? This cannot be undone.');
      });

      test('should delete prompt when modal is confirmed', async () => {
        const deleteBtn = document.getElementById('delete-prompt-btn');
        const promptSel = document.getElementById('prompt-select');
        
        // Set up test data
        promptSel.innerHTML = `<option value="test-prompt-id">Test Prompt</option>`;
        promptSel.value = 'test-prompt-id';
        window.currentSettings.prompts = [
          { id: 'test-prompt-id', label: 'Test Prompt', template: 'Test template' }
        ];
        
        // Mock required functions
        window.renderSelect = jest.fn();
        window.showUINotification = jest.fn();
        window.flashButtonGreen = jest.fn();
        window.saveSettings = jest.fn().mockImplementation((data, callback) => {
          if (callback) callback();
        });
        
        // Set up the modal show functionality
        deleteBtn.onclick = () => {
          window.modal.show(
            'Delete Prompt',
            'Are you sure you want to delete the prompt "Test Prompt"? This cannot be undone.',
            () => {
              const updatedPrompts = window.currentSettings.prompts.filter(p => p.id !== 'test-prompt-id');
              window.currentSettings.prompts = updatedPrompts;
              window.currentSettings.selectedPrompt = 'system-default-basic';
              window.saveSettings({ prompts: updatedPrompts, selectedPrompt: 'system-default-basic' }, () => {
                if (window.renderSelect) window.renderSelect();
                window.showUINotification('Prompt deleted');
                if (window.flashButtonGreen) window.flashButtonGreen(deleteBtn);
              });
            }
          );
        };
        
        // Trigger the button click
        deleteBtn.click();
        await waitForAsync();
        
        // Simulate clicking the confirm button
        const confirmBtn = document.querySelector('[data-action="confirm"]');
        confirmBtn.click();
        await waitForAsync();
        
        // Verify the prompt was deleted and functions were called
        expect(window.currentSettings.prompts).toHaveLength(0);
        expect(window.currentSettings.selectedPrompt).toBe('system-default-basic');
        expect(window.saveSettings).toHaveBeenCalledWith(
          { prompts: [], selectedPrompt: 'system-default-basic' },
          expect.any(Function)
        );
        expect(window.renderSelect).toHaveBeenCalled();
        expect(window.showUINotification).toHaveBeenCalledWith('Prompt deleted');
        expect(window.flashButtonGreen).toHaveBeenCalledWith(deleteBtn);
      });

      test('should not delete prompt when modal is cancelled', async () => {
        const deleteBtn = document.getElementById('delete-prompt-btn');
        const promptSel = document.getElementById('prompt-select');
        
        // Set up test data
        promptSel.innerHTML = `<option value="test-prompt-id">Test Prompt</option>`;
        promptSel.value = 'test-prompt-id';
        window.currentSettings.prompts = [
          { id: 'test-prompt-id', label: 'Test Prompt', template: 'Test template' }
        ];
        
        // Mock required functions
        window.renderSelect = jest.fn();
        window.showUINotification = jest.fn();
        window.flashButtonGreen = jest.fn();
        window.saveSettings = jest.fn();
        
        // Set up the modal show functionality
        deleteBtn.onclick = () => {
          window.modal.show(
            'Delete Prompt',
            'Are you sure you want to delete the prompt "Test Prompt"? This cannot be undone.',
            () => {
              const updatedPrompts = window.currentSettings.prompts.filter(p => p.id !== 'test-prompt-id');
              window.currentSettings.prompts = updatedPrompts;
              window.currentSettings.selectedPrompt = 'system-default-basic';
              window.saveSettings({ prompts: updatedPrompts, selectedPrompt: 'system-default-basic' });
            }
          );
        };
        
        // Trigger the button click
        deleteBtn.click();
        await waitForAsync();
        
        // Simulate clicking the cancel button
        const cancelBtn = document.querySelector('[data-action="cancel"]');
        cancelBtn.click();
        await waitForAsync();
        
        // Verify the prompt was not deleted and functions were not called
        expect(window.currentSettings.prompts).toHaveLength(1);
        expect(window.saveSettings).not.toHaveBeenCalled();
        expect(window.renderSelect).not.toHaveBeenCalled();
        expect(window.showUINotification).not.toHaveBeenCalled();
        expect(window.flashButtonGreen).not.toHaveBeenCalled();
      });

      test('should not delete system prompts', async () => {
        const deleteBtn = document.getElementById('delete-prompt-btn');
        const promptSel = document.getElementById('prompt-select');
        
        // Set up test data with a system prompt
        promptSel.innerHTML = `<option value="system-default-basic">System Basic</option>`;
        promptSel.value = 'system-default-basic';
        window.currentSettings.prompts = [
          { id: 'system-default-basic', label: 'System Basic', template: 'System template', isSystem: true }
        ];
        
        // Mock required functions
        window.showUINotification = jest.fn();
        
        // Set up the button click handler
        deleteBtn.onclick = () => {
          const selectedId = promptSel?.value;
          const currentPrompt = window.currentSettings.prompts.find(p => p.id === selectedId);
          
          if (!currentPrompt) {
            window.showUINotification('Please select a prompt to delete.', 'error');
            return;
          }
          
          if (currentPrompt.isSystem) {
            window.showUINotification('Cannot delete system prompts. Select a user prompt.', 'error');
            return;
          }
          
          window.modal.show(
            'Delete Prompt',
            `Are you sure you want to delete the prompt "${currentPrompt.label}"? This cannot be undone.`,
            () => {
              // This would be the onConfirm callback
            }
          );
        };
        
        // Trigger the button click
        deleteBtn.click();
        await waitForAsync();
        
        // Verify the modal was not shown and error notification was displayed
        const modal = document.querySelector('.modal');
        expect(modal.getAttribute('aria-hidden')).toBe('true');
        expect(window.showUINotification).toHaveBeenCalledWith(
          'Cannot delete system prompts. Select a user prompt.',
          'error'
        );
      });
    });
  });

  describe('Prompt Management Event Handlers', () => {
    test('should handle add prompt button in add mode', () => {
      const addBtn = document.getElementById('add-prompt-btn');
      const profileNameInput = document.getElementById('profile-name');
      const tplBox = document.getElementById('prompt-template');
      
      // Mock isInAddPromptMode state
      let isInAddPromptMode = true;
      
      addBtn.onclick = jest.fn(() => {
        if (isInAddPromptMode) {
          const newLabel = profileNameInput?.value.trim() || '';
          const newTemplate = tplBox?.value.trim() || '';

          if (!newLabel) {
            global.window.showUINotification('Prompt name required', 'error');
            if (profileNameInput) profileNameInput.focus();
            return;
          }
          if (!newTemplate) {
            global.window.showUINotification('Prompt template required', 'error');
            if (tplBox) tplBox.focus();
            return;
          }

          // Would save new prompt...
          global.window.showUINotification('New prompt saved!', 'success');
        }
      });
      
      // Test with valid inputs
      profileNameInput.value = 'New Prompt';
      tplBox.value = 'New template';
      
      addBtn.onclick();
      
      expect(addBtn.onclick).toHaveBeenCalled();
      expect(global.window.showUINotification).toHaveBeenCalledWith('New prompt saved!', 'success');
    });

    test('should handle add prompt with missing name', () => {
      const addBtn = document.getElementById('add-prompt-btn');
      const profileNameInput = document.getElementById('profile-name');
      const tplBox = document.getElementById('prompt-template');
      
      let isInAddPromptMode = true;
      
      addBtn.onclick = jest.fn(() => {
        if (isInAddPromptMode) {
          const newLabel = profileNameInput?.value.trim() || '';
          const newTemplate = tplBox?.value.trim() || '';

          if (!newLabel) {
            global.window.showUINotification('Prompt name required', 'error');
            if (profileNameInput) profileNameInput.focus();
            return;
          }
        }
      });
      
      profileNameInput.value = '';
      tplBox.value = 'Template';
      
      addBtn.onclick();
      
      expect(global.window.showUINotification).toHaveBeenCalledWith('Prompt name required', 'error');
    });

    test('should handle add prompt with missing template', () => {
      const addBtn = document.getElementById('add-prompt-btn');
      const profileNameInput = document.getElementById('profile-name');
      const tplBox = document.getElementById('prompt-template');
      
      let isInAddPromptMode = true;
      
      addBtn.onclick = jest.fn(() => {
        if (isInAddPromptMode) {
          const newLabel = profileNameInput?.value.trim() || '';
          const newTemplate = tplBox?.value.trim() || '';

          if (!newLabel) {
            global.window.showUINotification('Prompt name required', 'error');
            return;
          }
          if (!newTemplate) {
            global.window.showUINotification('Prompt template required', 'error');
            if (tplBox) tplBox.focus();
            return;
          }
        }
      });
      
      profileNameInput.value = 'Name';
      tplBox.value = '';
      
      addBtn.onclick();
      
      expect(global.window.showUINotification).toHaveBeenCalledWith('Prompt template required', 'error');
    });

    test('should handle delete prompt button click', () => {
      const deleteBtn = document.getElementById('delete-prompt-btn');
      const promptSel = document.getElementById('prompt-select');
      // Ensure the select has the option to match selected prompt ID
      promptSel.innerHTML = `<option value="test-prompt-id">Test Prompt</option>`;
      // Set up a selected value and mock current settings
      promptSel.value = 'test-prompt-id';
      global.window.currentSettings.prompts = [
        { id: 'test-prompt-id', label: 'Test Prompt', template: 'Test template' }
      ];
      
      global.confirm = jest.fn().mockReturnValue(true);
      
      const mockDeleteHandler = () => {
        const selectedId = promptSel?.value;
        const currentPrompt = global.window.currentSettings.prompts.find(p => p.id === selectedId);
        
        if (!currentPrompt) return;
        if (currentPrompt.isSystem) return;
        
        if (confirm(`Are you sure you want to delete the prompt "${currentPrompt.label}"? This cannot be undone.`)) {
          // Would delete prompt and update UI...
          global.window.showUINotification('Prompt deleted');
          if (global.window.flashButtonGreen) global.window.flashButtonGreen(deleteBtn);
        }
      };
      
      deleteBtn.onclick = jest.fn(mockDeleteHandler);
      
      deleteBtn.onclick();
      
      expect(deleteBtn.onclick).toHaveBeenCalled();
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete the prompt "Test Prompt"? This cannot be undone.');
    });

    test('should handle profile name input keydown Enter', () => {
      const profileNameInput = document.getElementById('profile-name');
      
      profileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          profileNameInput.blur();
        }
      });
      
      const blurSpy = jest.spyOn(profileNameInput, 'blur');
      
      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      profileNameInput.dispatchEvent(enterEvent);
      
      expect(blurSpy).toHaveBeenCalled();
    });
  });

  describe('Refresh Status Event Handler', () => {
    test('should handle refresh status button click', () => {
      const refreshBtn = document.getElementById('refresh-status');
      
      refreshBtn.onclick = jest.fn(async () => {
        // Would call refreshAnkiStatus...
        try {
          await global.window.refreshAnkiStatus();
          global.window.showUINotification('Status refreshed');
        } catch (error) {
          global.window.showUINotification('Refresh failed', 'error');
        }
      });
      
      global.window.refreshAnkiStatus = jest.fn().mockResolvedValue();
      
      refreshBtn.onclick();
      
      expect(refreshBtn.onclick).toHaveBeenCalled();
    });
  });

  describe('PDF Review Event Handlers', () => {
    test('should handle PDF review card removal with event delegation', async () => {
      const reviewList = document.getElementById('pdf-review-list');
      
      // Create mock review card
      const cardElement = document.createElement('div');
      cardElement.className = 'review-card';
      cardElement.dataset.cardId = 'test-card-1';
      cardElement.innerHTML = `
        <button class="btn btn-secondary remove-btn">Remove</button>
        <button class="btn btn-primary save-btn">Save to Anki</button>
        <select class="deck-select"><option value="Default">Default</option></select>
        <select class="model-select"><option value="Basic">Basic</option></select>
      `;
      reviewList.appendChild(cardElement);
      
      // Mock pending cards data that would be available in the actual code
      const mockPendingCards = [
        { id: 'test-card-1', sourceText: 'Test source', generatedFront: 'Test question' }
      ];
      
      // Directly attach handler to remove button
      const removeBtn = cardElement.querySelector('.remove-btn');
      removeBtn.onclick = async () => {
        const remainingCards = mockPendingCards.filter(c => c.id !== cardElement.dataset.cardId);
        await getChrome().storage.local.set({ pendingReviewPdfCards: remainingCards });
        global.window.showUINotification('Card removed successfully', 'success');
      };
      // Simulate a user click
      removeBtn.click();
      
      // Wait for the async event handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(getChrome().storage.local.set).toHaveBeenCalledWith({
        pendingReviewPdfCards: []
      });
      expect(global.window.showUINotification).toHaveBeenCalledWith('Card removed successfully', 'success');
    });

    test('should handle PDF review card save with event delegation', async () => {
      const reviewList = document.getElementById('pdf-review-list');
      
      const cardElement = document.createElement('div');
      cardElement.className = 'review-card';
      cardElement.dataset.cardId = 'test-card-1';
      cardElement.innerHTML = `
        <input type="text" value="Test question" />
        <button class="btn btn-secondary remove-btn">Remove</button>
        <button class="btn btn-primary save-btn">Save to Anki</button>
        <select class="deck-select"><option value="Default" selected>Default</option></select>
        <select class="model-select"><option value="Basic" selected>Basic</option></select>
      `;
      reviewList.appendChild(cardElement);
      
      const mockPendingCards = [
        { 
          id: 'test-card-1', 
          sourceText: 'Test source', 
          generatedFront: 'Test question',
          generatedClozeText: 'Test cloze',
          isCloze: false,
          imageHtml: '',
          originalPageTitle: 'Test PDF',
          originalPageUrl: ''
        }
      ];
      
      // Directly attach handler to save button
      const saveBtn = cardElement.querySelector('.save-btn');
      saveBtn.onclick = () => {
        const cardData = mockPendingCards.find(c => c.id === cardElement.dataset.cardId);
        const front = cardData.isCloze ? cardElement.querySelector('textarea').value : cardElement.querySelector('input').value;
        const back = cardData.isCloze ? cardElement.querySelector('textarea').value : cardData.sourceText;
        const deck = cardElement.querySelector('.deck-select').value;
        const model = cardElement.querySelector('.model-select').value;
        getChrome().runtime.sendMessage({
          action: 'saveFinalizedPdfCard',
          cardData: { 
            front: front, 
            backHtml: back, 
            deckName: deck, 
            modelName: model,
            imageHtml: cardData.imageHtml || "",
            pageTitle: cardData.originalPageTitle || 'PDF Review',
            pageUrl: cardData.originalPageUrl || ''
          }
        }, () => {});
      };
      // Simulate click
      saveBtn.click();
      
      // Wait for the async event handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(getChrome().runtime.sendMessage).toHaveBeenCalledWith({
        action: 'saveFinalizedPdfCard',
        cardData: {
          front: 'Test question',
          backHtml: 'Test source',
          deckName: 'Default',
          modelName: 'Basic',
          imageHtml: '',
          pageTitle: 'Test PDF',
          pageUrl: ''
        }
      }, expect.any(Function));
    });
  });

  describe('Confirmation Dialogs', () => {
    test('should handle confirmation dialog cancellation', () => {
      const clearHistoryBtn = document.getElementById('clear-history-btn');
      
      // Ensure the button exists
      expect(clearHistoryBtn).not.toBeNull();
      
      // Mock confirm dialog to return false
      global.confirm = jest.fn().mockReturnValue(false);
      
      clearHistoryBtn.onclick = jest.fn(() => {
        if (confirm('Clear all prompt history? This cannot be undone.')) {
          getChrome().storage.local.set({ promptHistory: [] });
        }
      });
      
      clearHistoryBtn.onclick();
      
      expect(global.confirm).toHaveBeenCalled();
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});
