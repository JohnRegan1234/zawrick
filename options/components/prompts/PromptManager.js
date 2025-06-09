/**
 * @fileoverview Prompt management component for handling prompt operations and state
 */

import { appState } from '../../state/app-state.js';
import { uiState } from '../../state/ui-state.js';
import { SYSTEM_PROMPTS, DEFAULT_PROFILE } from '../../core/constants.js';

/**
 * @typedef {Object} Prompt
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 * @property {string} template - Prompt template
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} PromptElements
 * @property {HTMLSelectElement} select - Prompt selection dropdown
 * @property {HTMLInputElement} nameInput - Prompt name input
 * @property {HTMLTextAreaElement} promptInput - Prompt template input
 * @property {HTMLTextAreaElement} descriptionInput - Prompt description input
 * @property {HTMLButtonElement} saveButton - Save button
 * @property {HTMLButtonElement} deleteButton - Delete button
 * @property {HTMLButtonElement} [cancelButton] - Optional cancel button
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the prompt is valid
 * @property {string[]} errors - List of validation errors
 */

/**
 * Prompt management component
 */
export class PromptManager {
    /**
     * Create a new PromptManager instance
     */
    constructor() {
        /** @type {PromptElements|null} */
        this._elements = null;
        /** @type {boolean} */
        this._isInitialized = false;

    }

    /**
     * Initialize the component with DOM elements
     * @param {PromptElements} elements - Required DOM elements
     */
    init(elements) {
        if (this._isInitialized) {
            return;
        }

        // Validate required elements
        const requiredElements = ['select', 'nameInput', 'promptInput', 'saveButton', 'deleteButton'];
        const missingElements = requiredElements.filter(key => !elements[key]);
        
        if (missingElements.length > 0) {
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }

        this._elements = elements;
        this._bindEvents();
        this._isInitialized = true;
        
        // Defer the refresh to allow appState to be fully initialized
        setTimeout(() => {
            this.refresh();
        }, 0);
    }

    /**
     * Bind event handlers to elements
     * @private
     */
    _bindEvents() {
        if (!this._elements) {
            return;
        }

        const { select, saveButton, deleteButton } = this._elements;

        if (select) {
            select.onchange = () => this._handlePromptSelection();
        }

        if (saveButton) {
            saveButton.onclick = () => this._handleSave();
        }

        if (deleteButton) {
            deleteButton.onclick = () => this._handleDelete();
        }
    }

    /**
     * Handle prompt selection change
     * @private
     */
    _handlePromptSelection() {
        if (!this._elements?.select) {
            return;
        }

        const selectedId = this._elements.select.value;

        if (uiState.isInAddPromptMode()) {
            uiState.exitAddPromptMode();
            return;
        }

        appState.updateSelectedPrompt(selectedId);
    }

    /**
     * Handle save button click
     * @private
     */
    async _handleSave() {
        if (!this._elements) {
            return;
        }

        const { nameInput, promptInput } = this._elements;
        const prompt = {
            id: `user-prompt-${Date.now()}`,
            label: nameInput.value.trim(),
            template: promptInput.value.trim()
        };

        const validation = this._validatePrompt(prompt);
        if (!validation.isValid) {
            if (window.showUINotification) {
                window.showUINotification(validation.errors.join('\n'), 'error');
            } else {
                alert(validation.errors.join('\n'));
            }
            return;
        }

        try {
            await appState.addPrompt(prompt);
            uiState.exitAddPromptMode();
            this.refresh();
            
            if (window.showUINotification) {
                window.showUINotification('Prompt saved successfully');
            }
            
            // Flash button green if available
            if (window.flashButtonGreen && this._elements.saveButton) {
                window.flashButtonGreen(this._elements.saveButton);
            }
        } catch (error) {
            console.error('[PromptManager] Failed to save prompt:', error);
            if (window.showUINotification) {
                window.showUINotification('Failed to save prompt. Please try again.', 'error');
            } else {
                alert('Failed to save prompt. Please try again.');
            }
        }
    }

    /**
     * Handle delete button click
     * @private
     */
    async _handleDelete() {
        if (!this._elements?.select) {
            return;
        }

        const selectedId = this._elements.select.value;

        if (SYSTEM_PROMPTS.some(p => p.id === selectedId)) {
            // Use UI notification instead of alert
            if (window.showUINotification) {
                window.showUINotification('Cannot delete system prompts', 'error');
            } else {
                alert('Cannot delete system prompts');
            }
            return;
        }

        // Get the prompt details for the confirmation message
        const currentState = appState.state;
        const userPrompts = Array.isArray(currentState.prompts) ? currentState.prompts : [];
        const prompt = SYSTEM_PROMPTS.find(p => p.id === selectedId) || userPrompts.find(p => p.id === selectedId);
        const promptLabel = prompt?.label || 'this prompt';

        // Use the custom modal if available, fallback to confirm
        if (window.modal && window.modal.show) {
            window.modal.show(
                'Delete Prompt',
                `Are you sure you want to delete the prompt "${promptLabel}"? This cannot be undone.`,
                async () => {
                    try {
                        await appState.deletePrompt(selectedId);
                        this.refresh();
                        if (window.showUINotification) {
                            window.showUINotification('Prompt deleted');
                        }
                    } catch (error) {
                        console.error('[PromptManager] Failed to delete prompt:', error);
                        if (window.showUINotification) {
                            window.showUINotification('Failed to delete prompt. Please try again.', 'error');
                        } else {
                            alert('Failed to delete prompt. Please try again.');
                        }
                    }
                }
            );
        } else {
            // Fallback to browser confirm if modal is not available
            if (!confirm(`Are you sure you want to delete the prompt "${promptLabel}"? This cannot be undone.`)) {
                return;
            }

            try {
                await appState.deletePrompt(selectedId);
                this.refresh();
                if (window.showUINotification) {
                    window.showUINotification('Prompt deleted');
                }
            } catch (error) {
                console.error('[PromptManager] Failed to delete prompt:', error);
                if (window.showUINotification) {
                    window.showUINotification('Failed to delete prompt. Please try again.', 'error');
                } else {
                    alert('Failed to delete prompt. Please try again.');
                }
            }
        }
    }

    /**
     * Validate prompt data
     * @private
     * @param {Prompt} prompt - Prompt to validate
     * @returns {ValidationResult} Validation result
     */
    _validatePrompt(prompt) {
        const errors = [];

        if (!prompt.label) {
            errors.push('Prompt name is required');
        }

        if (!prompt.template) {
            errors.push('Prompt template is required');
        }

        if (prompt.label && prompt.label.length > 50) {
            errors.push('Prompt name must be 50 characters or less');
        }

        if (prompt.description && prompt.description.length > 200) {
            errors.push('Description must be 200 characters or less');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Update prompt select options
     * @private
     */
    _updatePromptSelect() {
        if (!this._elements?.select) {
            return;
        }

        // Early return if appState is not properly initialized
        if (!appState || !appState.state) {
            return;
        }
        
        const { select } = this._elements;
        const { prompts = [], selectedPrompt } = appState.state || {};

        // Ensure prompts is an array and handle undefined/null cases
        const safePrompts = Array.isArray(prompts) ? prompts : [];
        
        // Clear existing options
        select.innerHTML = '';

        // Add system prompts
        const systemGroup = document.createElement('optgroup');
        systemGroup.label = 'System Prompts';
        SYSTEM_PROMPTS.forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt.id;
            option.textContent = prompt.label;
            systemGroup.appendChild(option);
        });
        select.appendChild(systemGroup);

        // Add separator if there are user prompts
        if (safePrompts.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            select.appendChild(separator);
        }

        // Add user prompts
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'User Prompts';
        safePrompts.forEach(prompt => {
            if (prompt && prompt.id && prompt.label) {
                const option = new Option(prompt.label, prompt.id);
                userGroup.appendChild(option);
            }
        });
        select.appendChild(userGroup);

        // Set selected value if it exists
        if (selectedPrompt) {
            select.value = selectedPrompt;
        }
    }

    /**
     * Update input fields based on selected prompt
     * @private
     */
    _updateInputFields() {
        if (!this._elements) {
            return;
        }

        // Early return if appState is not properly initialized
        if (!appState || !appState.state) {
            return;
        }
        
        const { select, nameInput, promptInput, saveButton, deleteButton } = this._elements;
        const isInAddMode = uiState.isInAddPromptMode();
        const selectedId = select.value;
        const isSystemPrompt = SYSTEM_PROMPTS.some(p => p.id === selectedId);

        // Update input states
        nameInput.disabled = !isInAddMode;
        promptInput.disabled = !isInAddMode;
        select.disabled = isInAddMode;
        saveButton.style.display = isInAddMode ? 'block' : 'none';
        deleteButton.style.display = !isInAddMode && !isSystemPrompt ? 'block' : 'none';

        // Update input values
        if (isInAddMode) {
            nameInput.value = '';
            promptInput.value = '';
        } else {
            const userPrompts = Array.isArray(appState.state?.prompts) ? appState.state.prompts : [];
            
            const prompt = [...SYSTEM_PROMPTS, ...userPrompts]
                .find(p => p.id === selectedId) || DEFAULT_PROFILE;
            
            nameInput.value = prompt.label;
            promptInput.value = prompt.template;
        }
    }

    /**
     * Enter add prompt mode
     */
    enterAddMode() {
        uiState.enterAddPromptMode(this._elements?.select?.value);
        this._updateInputFields();
    }

    /**
     * Exit add prompt mode
     */
    exitAddMode() {
        uiState.exitAddPromptMode();
        this._updateInputFields();
    }

    /**
     * Refresh the component state
     */
    refresh() {
        this._updatePromptSelect();
        this._updateInputFields();
    }
}

// Create singleton instance
export const promptManager = new PromptManager(); 