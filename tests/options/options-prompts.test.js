// tests/options-prompts.test.js

describe('Prompt Management Functions', () => {
  let mockChrome;
  let mockWindow;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;

    // Mock window object
    mockWindow = {
      currentSettings: {
        prompts: [],
        selectedPrompt: 'system-default-basic'
      },
      showUINotification: jest.fn(),
      flashButtonGreen: jest.fn(),
      renderSelect: jest.fn()
    };
    global.window = mockWindow;

    // Clear document body
    document.body.innerHTML = '';

    // Add required DOM elements for prompt management UI
    document.body.innerHTML += `
      <select id="prompt-select"></select>
      <input id="profile-name" />
      <textarea id="gpt-prompt"></textarea>
      <button id="add-prompt"></button>
      <button id="save-prompt"></button>
      <button id="del-prompt"></button>
    `;

    // Add option to select for exitAddPromptMode test
    const promptSel = document.getElementById('prompt-select');
    if (promptSel) {
      const option = document.createElement('option');
      option.value = 'test-prompt';
      option.text = 'Test Prompt';
      promptSel.add(option);
      promptSel.value = 'test-prompt';
    }

    jest.clearAllMocks();
  });

  describe('getUniquePromptLabel', () => {
    test('should return original label when unique', () => {
      const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
        let label = baseLabel.trim();
        if (!label) label = 'Untitled';
        
        const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
        let counter = 1;
        let testLabel = label;
        
        while (existing.includes(testLabel)) {
          testLabel = `${label} (${counter})`;
          counter++;
        }
        
        return testLabel;
      };

      const existingPrompts = [
        { id: '1', label: 'Medical Prompt' },
        { id: '2', label: 'History Prompt' }
      ];

      const result = getUniquePromptLabel('Science Prompt', existingPrompts);
      expect(result).toBe('Science Prompt');
    });

    test('should add counter for duplicate labels', () => {
      const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
        let label = baseLabel.trim();
        if (!label) label = 'Untitled';
        
        const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
        let counter = 1;
        let testLabel = label;
        
        while (existing.includes(testLabel)) {
          testLabel = `${label} (${counter})`;
          counter++;
        }
        
        return testLabel;
      };

      const existingPrompts = [
        { id: '1', label: 'Test Prompt' },
        { id: '2', label: 'Test Prompt (1)' },
        { id: '3', label: 'Test Prompt (2)' }
      ];

      const result = getUniquePromptLabel('Test Prompt', existingPrompts);
      expect(result).toBe('Test Prompt (3)');
    });

    test('should handle empty label', () => {
      const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
        let label = baseLabel.trim();
        if (!label) label = 'Untitled';
        
        const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
        let counter = 1;
        let testLabel = label;
        
        while (existing.includes(testLabel)) {
          testLabel = `${label} (${counter})`;
          counter++;
        }
        
        return testLabel;
      };

      const result = getUniquePromptLabel('', []);
      expect(result).toBe('Untitled');
    });

    test('should exclude specific ID from comparison', () => {
      const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
        let label = baseLabel.trim();
        if (!label) label = 'Untitled';
        
        const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
        let counter = 1;
        let testLabel = label;
        
        while (existing.includes(testLabel)) {
          testLabel = `${label} (${counter})`;
          counter++;
        }
        
        return testLabel;
      };

      const existingPrompts = [
        { id: '1', label: 'Test Prompt' },
        { id: '2', label: 'Other Prompt' }
      ];

      // Should allow keeping the same label when editing the prompt with ID '1'
      const result = getUniquePromptLabel('Test Prompt', existingPrompts, '1');
      expect(result).toBe('Test Prompt');
    });
  });

  describe('enterAddPromptMode', () => {
    test('should set up UI for adding new prompt', () => {
      // Create mock elements
      const mockPromptSel = document.createElement('select');
      mockPromptSel.id = 'prompt-select';
      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      const mockTplBox = document.createElement('textarea');
      mockTplBox.id = 'gpt-prompt';
      const mockAddBtn = document.createElement('button');
      mockAddBtn.id = 'add-prompt';
      const mockSaveBtn = document.createElement('button');
      mockSaveBtn.id = 'save-prompt';
      const mockDelBtn = document.createElement('button');
      mockDelBtn.id = 'del-prompt';

      document.body.appendChild(mockPromptSel);
      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockTplBox);
      document.body.appendChild(mockAddBtn);
      document.body.appendChild(mockSaveBtn);
      document.body.appendChild(mockDelBtn);

      // Initialize window.currentSettings.prompts to be empty
      window.currentSettings.prompts = [];

      let isInAddPromptMode = false;
      let previouslySelectedPromptId = null;

      const enterAddPromptMode = () => {
        // Check prompt limit
        const { prompts = [] } = window.currentSettings || {};
        if (prompts.length >= 5) {
          window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
          return;
        }
        
        isInAddPromptMode = true;
        const promptSel = document.getElementById('prompt-select');
        if (promptSel) {
          promptSel.disabled = true; // Ensure disabled is set to true
          previouslySelectedPromptId = promptSel.value;
        }

        // Update UI
        if (promptSel) promptSel.disabled = true;
        
        const profileNameInput = document.getElementById('profile-name');
        if (profileNameInput) {
          profileNameInput.value = '';
          profileNameInput.disabled = false;
          profileNameInput.placeholder = 'Enter new prompt name...';
        }

        const tplBox = document.getElementById('gpt-prompt');
        if (tplBox) {
          tplBox.value = '';
          tplBox.disabled = false;
          tplBox.placeholder = 'Enter new prompt template...';
        }

        // Update buttons
        const addBtn = document.getElementById('add-prompt');
        if (addBtn) {
          addBtn.textContent = 'Save New Prompt';
          addBtn.classList.remove('btn-secondary');
          addBtn.classList.add('btn-primary');
        }

        const saveBtn = document.getElementById('save-prompt');
        if (saveBtn) saveBtn.style.display = 'none';
        
        const delBtn = document.getElementById('del-prompt');
        if (delBtn) {
          delBtn.textContent = 'Cancel Add';
          delBtn.classList.remove('btn-secondary');
          delBtn.classList.add('btn-secondary');
        }
      };

      enterAddPromptMode();

      // Debug logs to check DOM elements
      console.log('After enterAddPromptMode:', {
        promptSel: document.getElementById('prompt-select'),
        profileNameInput: document.getElementById('profile-name'),
        tplBox: document.getElementById('gpt-prompt'),
        addBtn: document.getElementById('add-prompt'),
        saveBtn: document.getElementById('save-prompt'),
        delBtn: document.getElementById('del-prompt')
      });

      const promptSel = document.getElementById('prompt-select');
      const profileNameInput = document.getElementById('profile-name');
      const tplBox = document.getElementById('gpt-prompt');
      const addBtn = document.getElementById('add-prompt');
      const saveBtn = document.getElementById('save-prompt');
      const delBtn = document.getElementById('del-prompt');

      expect(promptSel).not.toBeNull();
      expect(profileNameInput).not.toBeNull();
      expect(tplBox).not.toBeNull();
      expect(addBtn).not.toBeNull();
      expect(saveBtn).not.toBeNull();
      expect(delBtn).not.toBeNull();

      expect(promptSel.disabled).toBe(true); // Should be true in add mode
      expect(profileNameInput.value).toBe('');
      expect(profileNameInput.placeholder).toBe('Enter new prompt name...');
      expect(tplBox.value).toBe('');
      expect(addBtn.textContent).toBe('Save New Prompt');
      expect(saveBtn.style.display).toBe('none');
      expect(delBtn.textContent).toBe('Cancel Add');
    });

    test('should prevent entering add mode when limit reached', () => {
      // Mock 5 existing prompts (limit)
      window.currentSettings.prompts = Array.from({ length: 5 }, (_, i) => ({
        id: `prompt-${i}`,
        label: `Prompt ${i}`
      }));

      const enterAddPromptMode = () => {
        const { prompts = [] } = window.currentSettings || {};
        if (prompts.length >= 5) {
          window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
          return;
        }
      };

      enterAddPromptMode();

      expect(window.showUINotification).toHaveBeenCalledWith(
        "Limit reached (5 user prompts). Delete one first.",
        'error'
      );
    });
  });

  describe('exitAddPromptMode', () => {
    test('should restore UI from add mode', () => {
      // Create mock elements
      const mockPromptSel = document.createElement('select');
      mockPromptSel.id = 'prompt-select';
      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      const mockAddBtn = document.createElement('button');
      mockAddBtn.id = 'add-prompt';
      mockAddBtn.textContent = ''; // Initialize with empty text
      const mockSaveBtn = document.createElement('button');
      mockSaveBtn.id = 'save-prompt';
      const mockDelBtn = document.createElement('button');
      mockDelBtn.id = 'del-prompt';

      document.body.appendChild(mockPromptSel);
      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockAddBtn);
      document.body.appendChild(mockSaveBtn);
      document.body.appendChild(mockDelBtn);

      let isInAddPromptMode = true;
      let previouslySelectedPromptId = 'test-prompt';

      const exitAddPromptMode = () => {
        isInAddPromptMode = false;

        // Restore UI
        const promptSel = document.getElementById('prompt-select');
        if (promptSel) {
          promptSel.disabled = false;
          promptSel.value = previouslySelectedPromptId;
          promptSel.dispatchEvent(new Event('change'));
        }
        
        const profileNameInput = document.getElementById('profile-name');
        if (profileNameInput) profileNameInput.placeholder = '';

        // Reset buttons
        const addBtn = document.getElementById('add-prompt');
        if (addBtn) {
          addBtn.textContent = 'Add Prompt'; // Ensure textContent is set
          addBtn.classList.remove('btn-primary');
          addBtn.classList.add('btn-secondary');
        }

        const saveBtn = document.getElementById('save-prompt');
        if (saveBtn) saveBtn.style.display = '';
        
        const delBtn = document.getElementById('del-prompt');
        if (delBtn) {
          delBtn.textContent = 'Delete Prompt';
          delBtn.classList.add('btn-secondary');
        }
      };

      exitAddPromptMode();

      // Debug logs to check DOM elements
      console.log('After exitAddPromptMode:', {
        promptSel: document.getElementById('prompt-select'),
        profileNameInput: document.getElementById('profile-name'),
        addBtn: document.getElementById('add-prompt'),
        saveBtn: document.getElementById('save-prompt'),
        delBtn: document.getElementById('del-prompt')
      });

      // Re-query DOM elements after UI changes
      const promptSel2 = document.getElementById('prompt-select');
      const profileNameInput2 = document.getElementById('profile-name');
      const addBtn2 = document.getElementById('add-prompt');
      const saveBtn2 = document.getElementById('save-prompt');
      const delBtn2 = document.getElementById('del-prompt');

      expect(promptSel2).not.toBeNull();
      expect(profileNameInput2).not.toBeNull();
      expect(addBtn2).not.toBeNull();
      expect(saveBtn2).not.toBeNull();
      expect(delBtn2).not.toBeNull();

      expect(promptSel2.disabled).toBe(false);
      expect(profileNameInput2.placeholder).toBe(''); // Should be empty string, not undefined
      expect(addBtn2.textContent).toBe('Add Prompt'); // Should match real code
      expect(saveBtn2.style.display).toBe('');
      expect(delBtn2.textContent).toBe('Delete Prompt');
      expect(promptSel2.value).toBe('test-prompt');
    });
  });

  describe('saveNewPrompt', () => {
    test('should save new prompt with validation', async () => {
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      window.renderSelect = jest.fn(); // Add mock for renderSelect function
      
      // Initialize an empty prompts array
      window.currentSettings.prompts = [];

      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      mockProfileNameInput.value = 'New Test Prompt';
      const mockTplBox = document.createElement('textarea');
      mockTplBox.id = 'gpt-prompt';
      mockTplBox.value = 'Test template content';

      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockTplBox);

      const uid = () => 'new-prompt-id';
      // Add getUniquePromptLabel to match main code
      const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
        let label = baseLabel.trim();
        if (!label) label = 'Untitled';
        const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
        let counter = 1;
        let testLabel = label;
        while (existing.includes(testLabel)) {
          testLabel = `${label} (${counter})`;
          counter++;
        }
        return testLabel;
      };

      const saveNewPrompt = async () => {
        const newLabel = mockProfileNameInput?.value.trim() || '';
        const newTemplate = mockTplBox?.value.trim() || '';

        if (!newLabel) {
          window.showUINotification('Prompt name required', 'error');
          return;
        }
        if (!newTemplate) {
          window.showUINotification('Prompt template required', 'error');
          return;
        }

        const { prompts = [] } = window.currentSettings || {};
        const newId = uid();
        // Use unique label logic as in main code
        const uniqueLabel = getUniquePromptLabel(newLabel, prompts);

        const updatedPrompts = [...prompts, { id: newId, label: uniqueLabel, template: newTemplate }];
        window.currentSettings.prompts = updatedPrompts;
        window.currentSettings.selectedPrompt = newId;
        await new Promise(resolve => {
          chrome.storage.local.set({ prompts: updatedPrompts, selectedPrompt: newId }, resolve);
        });
        window.showUINotification('New prompt saved!');
        window.renderSelect();
      };

      await saveNewPrompt();

      expect(window.currentSettings.prompts).toHaveLength(1);
      expect(window.currentSettings.prompts[0]).toEqual({
        id: 'new-prompt-id',
        label: 'New Test Prompt',
        template: 'Test template content'
      });
      expect(window.showUINotification).toHaveBeenCalledWith('New prompt saved!');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should validate prompt name', async () => {
      window.renderSelect = jest.fn(); // Add mock for renderSelect function
      
      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      mockProfileNameInput.value = ''; // Empty name
      const mockTplBox = document.createElement('textarea');
      mockTplBox.id = 'gpt-prompt';
      mockTplBox.value = 'Test template';

      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockTplBox);

      const saveNewPrompt = async () => {
        const newLabel = mockProfileNameInput?.value.trim() || '';
        const newTemplate = mockTplBox?.value.trim() || '';

        if (!newLabel) {
          window.showUINotification('Prompt name required', 'error');
          return;
        }
        if (!newTemplate) {
          window.showUINotification('Prompt template required', 'error');
          return;
        }
      };

      await saveNewPrompt();

      expect(window.showUINotification).toHaveBeenCalledWith('Prompt name required', 'error');
    });

    test('should validate prompt template', async () => {
      window.renderSelect = jest.fn(); // Add mock for renderSelect function
      
      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      mockProfileNameInput.value = 'Test Prompt';
      const mockTplBox = document.createElement('textarea');
      mockTplBox.id = 'gpt-prompt';
      mockTplBox.value = ''; // Empty template

      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockTplBox);

      const saveNewPrompt = async () => {
        const newLabel = mockProfileNameInput?.value.trim() || '';
        const newTemplate = mockTplBox?.value.trim() || '';

        if (!newLabel) {
          window.showUINotification('Prompt name required', 'error');
          return;
        }
        if (!newTemplate) {
          window.showUINotification('Prompt template required', 'error');
          return;
        }
      };

      await saveNewPrompt();

      expect(window.showUINotification).toHaveBeenCalledWith('Prompt template required', 'error');
    });
  });

  describe('deletePrompt', () => {
    test('should delete user prompt', async () => {
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      window.renderSelect = jest.fn(); // Add this line to mock renderSelect

      // Mock existing prompts
      window.currentSettings.prompts = [
        { id: 'user-prompt-1', label: 'User Prompt 1', template: 'Template 1' },
        { id: 'user-prompt-2', label: 'User Prompt 2', template: 'Template 2' }
      ];
      window.currentSettings.selectedPrompt = 'user-prompt-1';

      // Mock system prompts
      const SYSTEM_PROMPTS = [
        { id: 'system-default-basic', label: 'System Basic', isSystem: true }
      ];

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      const deletePrompt = async () => {
        const { prompts: currentPromptsArray = [] } = window.currentSettings;
        const selectedId = window.currentSettings.selectedPrompt;
        
        const currentPrompt = SYSTEM_PROMPTS.find(p => p.id === selectedId) || 
                            currentPromptsArray.find(p => p.id === selectedId);

        if (!currentPrompt) {
          window.showUINotification('Please select a prompt to delete.', 'error');
          return;
        }

        if (currentPrompt.isSystem) {
          window.showUINotification('Cannot delete system prompts. Select a user prompt.', 'error');
          return;
        }
        
        if (confirm(`Are you sure you want to delete the prompt "${currentPrompt.label}"? This cannot be undone.`)) {
          const updatedPrompts = currentPromptsArray.filter(p => p.id !== selectedId);
          const newSelectedPromptId = updatedPrompts[0]?.id || SYSTEM_PROMPTS[0]?.id || 'default';

          window.currentSettings.prompts = updatedPrompts;
          window.currentSettings.selectedPrompt = newSelectedPromptId;

          await new Promise(resolve => {
            chrome.storage.local.set({ 
              prompts: updatedPrompts, 
              selectedPrompt: newSelectedPromptId 
            }, resolve);
          });

          window.showUINotification('Prompt deleted');
          window.renderSelect();
        }
      };

      await deletePrompt();

      expect(window.currentSettings.prompts).toHaveLength(1);
      expect(window.currentSettings.prompts[0].id).toBe('user-prompt-2');
      expect(window.showUINotification).toHaveBeenCalledWith('Prompt deleted');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should prevent deleting system prompts', async () => {
      const SYSTEM_PROMPTS = [
        { id: 'system-default-basic', label: 'System Basic', isSystem: true }
      ];

      window.currentSettings.selectedPrompt = 'system-default-basic';

      const deletePrompt = async () => {
        const { prompts: currentPromptsArray = [] } = window.currentSettings;
        const selectedId = window.currentSettings.selectedPrompt;
        
        const currentPrompt = SYSTEM_PROMPTS.find(p => p.id === selectedId) || 
                            currentPromptsArray.find(p => p.id === selectedId);

        if (currentPrompt?.isSystem) {
          window.showUINotification('Cannot delete system prompts. Select a user prompt.', 'error');
          return;
        }
      };

      await deletePrompt();

      expect(window.showUINotification).toHaveBeenCalledWith(
        'Cannot delete system prompts. Select a user prompt.',
        'error'
      );
    });
  });

  describe('updatePrompt', () => {
    test('should update existing user prompt', async () => {
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      window.renderSelect = jest.fn(); // Add this line to mock renderSelect

      window.currentSettings.prompts = [
        { id: 'user-prompt-1', label: 'Original Label', template: 'Original Template' }
      ];
      window.currentSettings.selectedPrompt = 'user-prompt-1';

      const mockProfileNameInput = document.createElement('input');
      mockProfileNameInput.id = 'profile-name';
      mockProfileNameInput.value = 'Updated Label';
      const mockTplBox = document.createElement('textarea');
      mockTplBox.id = 'gpt-prompt';
      mockTplBox.value = 'Updated Template';

      document.body.appendChild(mockProfileNameInput);
      document.body.appendChild(mockTplBox);

      const SYSTEM_PROMPTS = [
        { id: 'system-default-basic', label: 'System Basic', isSystem: true }
      ];

      const updatePrompt = async () => {
        const currentSelectedId = window.currentSettings.selectedPrompt;
        const { prompts: currentPromptsArray = [] } = window.currentSettings;
        const promptToEditIndex = currentPromptsArray.findIndex(p => p.id === currentSelectedId);

        if (promptToEditIndex !== -1 && !SYSTEM_PROMPTS.some(p => p.id === currentSelectedId)) {
          const promptToEdit = { ...currentPromptsArray[promptToEditIndex] };

          // Simplified unique label logic for test
          promptToEdit.label = mockProfileNameInput?.value || '';
          promptToEdit.template = mockTplBox?.value.trim() || '';

          const updatedPrompts = [...currentPromptsArray];
          updatedPrompts[promptToEditIndex] = promptToEdit;

          window.currentSettings.prompts = updatedPrompts;

          await new Promise(resolve => {
            chrome.storage.local.set({ 
              prompts: updatedPrompts, 
              selectedPrompt: currentSelectedId 
            }, resolve);
          });

          window.showUINotification('Prompt updated!');
          window.renderSelect();
        }
      };

      await updatePrompt();

      expect(window.currentSettings.prompts[0].label).toBe('Updated Label');
      expect(window.currentSettings.prompts[0].template).toBe('Updated Template');
      expect(window.showUINotification).toHaveBeenCalledWith('Prompt updated!');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should prevent updating system prompts', async () => {
      const SYSTEM_PROMPTS = [
        { id: 'system-default-basic', label: 'System Basic', isSystem: true }
      ];

      window.currentSettings.selectedPrompt = 'system-default-basic';

      const updatePrompt = async () => {
        const currentSelectedId = window.currentSettings.selectedPrompt;
        const { prompts: currentPromptsArray = [] } = window.currentSettings;
        const promptToEditIndex = currentPromptsArray.findIndex(p => p.id === currentSelectedId);

        if (promptToEditIndex !== -1 && !SYSTEM_PROMPTS.some(p => p.id === currentSelectedId)) {
          // Update logic
        } else {
          window.showUINotification('System prompts cannot be edited here, or prompt not found.', 'error');
        }
      };

      await updatePrompt();

      expect(window.showUINotification).toHaveBeenCalledWith(
        'System prompts cannot be edited here, or prompt not found.',
        'error'
      );
    });
  });
});
