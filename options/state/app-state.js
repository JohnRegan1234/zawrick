/**
 * @fileoverview Application state management with observable pattern
 */

import { DEFAULT_SETTINGS, DEFAULT_PROFILE, SYSTEM_PROMPTS } from '../core/constants.js';
import { saveSettings } from '../core/storage.js';

/**
 * @typedef {Object} Settings
 * @property {Array<Object>} prompts - List of prompt templates
 * @property {string} selectedPrompt - ID of currently selected prompt
 * @property {string} deckName - Selected Anki deck name
 * @property {string} modelName - Selected Anki model name
 * @property {boolean} gptEnabled - Whether GPT features are enabled
 * @property {boolean} alwaysConfirm - Whether to always show confirmation
 * @property {string} openaiKey - OpenAI API key
 * @property {boolean} confirmGpt - Whether to confirm GPT operations
 */

/**
 * @typedef {Function} StateChangeCallback
 * @param {Settings} newState - The new state
 * @param {Settings} oldState - The previous state
 */

class AppState {
    constructor() {
        /** @type {Settings} */
        this._state = { ...DEFAULT_SETTINGS };
        /** @type {Set<StateChangeCallback>} */
        this._subscribers = new Set();
    }

    /**
     * Get current state
     * @returns {Settings} Current state
     */
    get state() {
        return { ...this._state };
    }

    /**
     * Subscribe to state changes
     * @param {StateChangeCallback} callback - Function to call on state change
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    /**
     * Notify subscribers of state change
     * @private
     * @param {Settings} newState - New state
     */
    _notifySubscribers(newState) {
        const oldState = { ...this._state };
        this._subscribers.forEach(callback => callback(newState, oldState));
    }

    /**
     * Update state and notify subscribers
     * @private
     * @param {Partial<Settings>} newState - New state values
     */
    _updateState(newState) {
        this._state = { ...this._state, ...newState };
        this._notifySubscribers(this._state);
    }

    /**
     * Initialize state from saved settings
     * @param {Settings} settings - Saved settings
     */
    initialize(settings) {
        // Ensure prompts array exists and has at least the default profile
        const safeSettings = {
            ...DEFAULT_SETTINGS,
            ...(settings || {}),
            prompts: Array.isArray(settings?.prompts) ? settings.prompts.filter(p => p && p.id && p.label) : [DEFAULT_PROFILE],
            selectedPrompt: settings?.selectedPrompt || DEFAULT_PROFILE.id
        };

        // Validate prompts array
        if (!safeSettings.prompts || !Array.isArray(safeSettings.prompts) || !safeSettings.prompts.length) {
            console.warn('[AppState] No valid prompts found, using default profile');
            safeSettings.prompts = [DEFAULT_PROFILE];
        }

        this._updateState(safeSettings);
    }

    /**
     * Update prompts list
     * @param {Array<Object>} prompts - New prompts list
     * @returns {Promise<void>}
     */
    async updatePrompts(prompts) {
        const selectedPromptId = this._state.selectedPrompt;
        
        // If selected prompt is not in new list, select first prompt
        if (!prompts.some(p => p.id === selectedPromptId)) {
            const newSelectedId = prompts[0]?.id || DEFAULT_PROFILE.id;
            this._updateState({ prompts, selectedPrompt: newSelectedId });
            await saveSettings({ prompts, selectedPrompt: newSelectedId });
        } else {
            this._updateState({ prompts });
            await saveSettings({ prompts });
        }
    }

    /**
     * Update selected prompt
     * @param {string} promptId - ID of prompt to select
     * @returns {Promise<void>}
     */
    async updateSelectedPrompt(promptId) {
        this._updateState({ selectedPrompt: promptId });
        await saveSettings({ selectedPrompt: promptId });
    }

    /**
     * Add new prompt
     * @param {Object} prompt - New prompt to add
     * @returns {Promise<void>}
     */
    async addPrompt(prompt) {
        const prompts = [...this._state.prompts, prompt];
        this._updateState({ prompts, selectedPrompt: prompt.id });
        await saveSettings({ prompts, selectedPrompt: prompt.id });
    }

    /**
     * Update existing prompt
     * @param {string} promptId - ID of prompt to update
     * @param {Object} updatedPrompt - Updated prompt data
     * @returns {Promise<void>}
     */
    async updatePrompt(promptId, updatedPrompt) {
        const prompts = this._state.prompts.map(p => 
            p.id === promptId ? { ...p, ...updatedPrompt } : p
        );
        this._updateState({ prompts });
        await saveSettings({ prompts });
    }

    /**
     * Delete prompt
     * @param {string} promptId - ID of prompt to delete
     * @returns {Promise<void>}
     */
    async deletePrompt(promptId) {
        const prompts = this._state.prompts.filter(p => p.id !== promptId);
        const newSelectedPromptId = prompts.find(p => !SYSTEM_PROMPTS.some(sp => sp.id === p.id))?.id || 
                                  SYSTEM_PROMPTS[0]?.id || 
                                  DEFAULT_PROFILE.id;
        
        this._updateState({ prompts, selectedPrompt: newSelectedPromptId });
        await saveSettings({ prompts, selectedPrompt: newSelectedPromptId });
    }

    /**
     * Update GPT settings
     * @param {Object} gptSettings - GPT-related settings
     * @returns {Promise<void>}
     */
    async updateGptSettings(gptSettings) {
        this._updateState(gptSettings);
        await saveSettings(gptSettings);
        
        // Update model display if model changed
        if (gptSettings.gptModel) {
            const modelDisplay = document.getElementById('gpt-model-display');
            if (modelDisplay) {
                modelDisplay.textContent = `Model: ${gptSettings.gptModel}`;
            }
        }
    }

    /**
     * Update Anki settings
     * @param {Object} ankiSettings - Anki-related settings
     * @returns {Promise<void>}
     */
    async updateAnkiSettings(ankiSettings) {
        this._updateState(ankiSettings);
        await saveSettings(ankiSettings);
    }
}

// Create singleton instance
export const appState = new AppState(); 