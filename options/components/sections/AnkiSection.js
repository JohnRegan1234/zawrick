/**
 * @fileoverview Anki section component for managing Anki settings and status
 */

import { fetchDeckNames, fetchModelNames, checkAnkiStatus } from '../../services/anki-service.js';
import { appState } from '../../state/app-state.js';
import { uiState } from '../../state/ui-state.js';

/**
 * @typedef {Object} AnkiElements
 * @property {HTMLElement} section - The Anki section element
 * @property {HTMLSelectElement} deckSelect - Deck selection dropdown
 * @property {HTMLSelectElement} modelSelect - Note type selection dropdown
 * @property {HTMLElement} statusText - Status text element
 * @property {HTMLElement} statusHelp - Status help element
 */

/**
 * Anki section component for managing Anki settings and status
 */
export class AnkiSection {
    /**
     * Create a new AnkiSection instance
     */
    constructor() {
        /** @type {AnkiElements|null} */
        this._elements = null;
        /** @type {boolean} */
        this._isInitialized = false;
        console.log('[AnkiSection] Created new instance');
    }

    /**
     * Initialize the component with DOM elements
     * @param {AnkiElements} elements - Required DOM elements
     */
    init(elements) {
        if (this._isInitialized) {
            console.warn('[AnkiSection] Already initialized');
            return;
        }

        console.log('[AnkiSection] Initializing with elements:', {
            section: elements.section?.id,
            deckSelect: elements.deckSelect?.id,
            modelSelect: elements.modelSelect?.id,
            statusText: elements.statusText?.id,
            statusHelp: elements.statusHelp?.id
        });

        // Validate required elements
        const requiredElements = ['section', 'deckSelect', 'modelSelect', 'statusText', 'statusHelp'];
        const missingElements = requiredElements.filter(key => !elements[key]);
        
        if (missingElements.length > 0) {
            console.error('[AnkiSection] Missing required elements:', missingElements);
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }

        this._elements = elements;
        this._bindEvents();
        this._isInitialized = true;
        console.log('[AnkiSection] Initialization complete');
        this.refresh();
    }

    /**
     * Bind event handlers to elements
     * @private
     */
    _bindEvents() {
        if (!this._elements) {
            console.warn('[AnkiSection] Cannot bind events: elements not initialized');
            return;
        }

        console.log('[AnkiSection] Binding event handlers');
        const { deckSelect, modelSelect } = this._elements;

        if (deckSelect) {
            deckSelect.onchange = () => this._handleDeckChange();
            console.log('[AnkiSection] Bound change handler to deck select');
        }

        if (modelSelect) {
            modelSelect.onchange = () => this._handleModelChange();
            console.log('[AnkiSection] Bound change handler to model select');
        }
    }

    /**
     * Handle deck selection change
     * @private
     */
    _handleDeckChange() {
        if (!this._elements?.deckSelect) {
            console.warn('[AnkiSection] Cannot handle deck change: deck select not found');
            return;
        }

        const selectedDeck = this._elements.deckSelect.value;
        console.log('[AnkiSection] Deck selection changed:', selectedDeck);
        appState.updateAnkiSettings({ deckName: selectedDeck });
    }

    /**
     * Handle model selection change
     * @private
     */
    _handleModelChange() {
        if (!this._elements?.modelSelect) {
            console.warn('[AnkiSection] Cannot handle model change: model select not found');
            return;
        }

        const selectedModel = this._elements.modelSelect.value;
        console.log('[AnkiSection] Model selection changed:', selectedModel);
        appState.updateAnkiSettings({ modelName: selectedModel });
    }

    /**
     * Update deck selection options
     * @private
     */
    async _updateDeckSelect() {
        if (!this._elements?.deckSelect) {
            console.warn('[AnkiSection] Cannot update deck select: element not found');
            return;
        }

        console.log('[AnkiSection] Updating deck select options');
        const { deckSelect } = this._elements;
        const { deckName } = appState.state;

        try {
            console.log('[AnkiSection] Fetching deck names from Anki');
            const decks = await fetchDeckNames();
            console.log('[AnkiSection] Fetched decks:', decks);

            // Clear existing options
            deckSelect.innerHTML = '';
            console.log('[AnkiSection] Cleared existing deck options');

            // Add new options
            decks.forEach(deckName => {
                const option = new Option(deckName, deckName);
                deckSelect.appendChild(option);
            });
            console.log('[AnkiSection] Added deck options');

            // Set selected value
            deckSelect.value = deckName;
            console.log('[AnkiSection] Set selected deck:', deckName);
        } catch (error) {
            console.error('[AnkiSection] Failed to update deck select:', error);
            deckSelect.innerHTML = '<option value="">Failed to load decks</option>';
        }
    }

    /**
     * Update model selection options
     * @private
     */
    async _updateModelSelect() {
        if (!this._elements?.modelSelect) {
            console.warn('[AnkiSection] Cannot update model select: element not found');
            return;
        }

        console.log('[AnkiSection] Updating model select options');
        const { modelSelect } = this._elements;
        const { modelName } = appState.state;

        try {
            console.log('[AnkiSection] Fetching model names from Anki');
            const models = await fetchModelNames();
            console.log('[AnkiSection] Fetched models:', models);

            // Clear existing options
            modelSelect.innerHTML = '';
            console.log('[AnkiSection] Cleared existing model options');

            // Add new options
            models.forEach(modelName => {
                const option = new Option(modelName, modelName);
                modelSelect.appendChild(option);
            });
            console.log('[AnkiSection] Added model options');

            // Set selected value
            modelSelect.value = modelName;
            console.log('[AnkiSection] Set selected model:', modelName);
        } catch (error) {
            console.error('[AnkiSection] Failed to update model select:', error);
            modelSelect.innerHTML = '<option value="">Failed to load models</option>';
        }
    }

    /**
     * Update Anki connection status
     * @private
     */
    async _updateStatus() {
        if (!this._elements) {
            console.warn('[AnkiSection] Cannot update status: elements not initialized');
            return;
        }

        console.log('[AnkiSection] Updating Anki connection status');
        const { statusText, statusHelp, deckSelect, modelSelect } = this._elements;

        try {
            console.log('[AnkiSection] Checking Anki status');
            const status = await checkAnkiStatus();
            console.log('[AnkiSection] Anki status:', status);

            const isOnline = status.isOnline;
            statusText.textContent = isOnline ? 'Connected to Anki' : 'Not connected to Anki';
            statusText.className = isOnline ? 'status-connected' : 'status-disconnected';
            statusHelp.style.display = isOnline ? 'none' : 'block';

            // Update select states
            deckSelect.disabled = !isOnline;
            modelSelect.disabled = !isOnline;

            console.log('[AnkiSection] Status update complete:', {
                isOnline,
                deckSelectDisabled: deckSelect.disabled,
                modelSelectDisabled: modelSelect.disabled
            });
        } catch (error) {
            console.error('[AnkiSection] Failed to update status:', error);
            statusText.textContent = 'Error checking Anki status';
            statusText.className = 'status-error';
            statusHelp.style.display = 'block';
            deckSelect.disabled = true;
            modelSelect.disabled = true;
        }
    }

    /**
     * Refresh the component state
     */
    async refresh() {
        console.log('[AnkiSection] Refreshing component state');
        await Promise.all([
            this._updateStatus(),
            this._updateDeckSelect(),
            this._updateModelSelect()
        ]);
        console.log('[AnkiSection] Refresh complete');
    }

    /**
     * Toggle section expanded state
     * @param {boolean} [expanded] - New expanded state (optional)
     */
    toggleSection(expanded) {
        if (!this._elements?.section) return;
        uiState.toggleSection('anki', expanded);
    }

    /**
     * Get current section state
     * @returns {boolean} Whether section is expanded
     */
    isExpanded() {
        return uiState.isSectionExpanded('anki');
    }
}

// Create singleton instance
export const ankiSection = new AnkiSection(); 