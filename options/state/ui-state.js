/**
 * @fileoverview UI state management with observable pattern
 */

/**
 * @typedef {Object} UIState
 * @property {boolean} isInAddPromptMode - Whether in add prompt mode
 * @property {string|null} previouslySelectedPromptId - Previously selected prompt ID
 * @property {Object} sectionStates - Section expanded/collapsed states
 * @property {boolean} isSaving - Whether a save operation is in progress
 */

/**
 * @typedef {Function} UIStateChangeCallback
 * @param {UIState} newState - The new state
 * @param {UIState} oldState - The previous state
 */

class UIState {
    constructor() {
        /** @type {UIState} */
        this._state = {
            isInAddPromptMode: false,
            previouslySelectedPromptId: null,
            sectionStates: {
                anki: false,
                gpt: false,
                history: false,
                pdfReview: false
            },
            isSaving: false
        };
        /** @type {Set<UIStateChangeCallback>} */
        this._subscribers = new Set();
    }

    /**
     * Get current state
     * @returns {UIState} Current state
     */
    get state() {
        return { ...this._state };
    }

    /**
     * Subscribe to state changes
     * @param {UIStateChangeCallback} callback - Function to call on state change
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    /**
     * Notify subscribers of state change
     * @private
     * @param {UIState} newState - New state
     */
    _notifySubscribers(newState) {
        const oldState = { ...this._state };
        this._subscribers.forEach(callback => callback(newState, oldState));
    }

    /**
     * Update state and notify subscribers
     * @private
     * @param {Partial<UIState>} newState - New state values
     */
    _updateState(newState) {
        this._state = { ...this._state, ...newState };
        this._notifySubscribers(this._state);
    }

    /**
     * Enter add prompt mode
     * @param {string} currentPromptId - Currently selected prompt ID
     */
    enterAddPromptMode(currentPromptId) {
        this._updateState({
            isInAddPromptMode: true,
            previouslySelectedPromptId: currentPromptId
        });
    }

    /**
     * Exit add prompt mode
     * @returns {string|null} Previously selected prompt ID
     */
    exitAddPromptMode() {
        const previouslySelectedPromptId = this._state.previouslySelectedPromptId;
        this._updateState({
            isInAddPromptMode: false,
            previouslySelectedPromptId: null
        });
        return previouslySelectedPromptId;
    }

    /**
     * Toggle section expanded state
     * @param {string} sectionId - Section identifier
     * @param {boolean} [expanded] - New expanded state (optional)
     */
    toggleSection(sectionId, expanded) {
        const sectionStates = { ...this._state.sectionStates };
        sectionStates[sectionId] = expanded ?? !sectionStates[sectionId];
        this._updateState({ sectionStates });
    }

    /**
     * Set saving state
     * @param {boolean} isSaving - Whether saving is in progress
     */
    setSaving(isSaving) {
        this._updateState({ isSaving });
    }

    /**
     * Check if in add prompt mode
     * @returns {boolean} Whether in add prompt mode
     */
    isInAddPromptMode() {
        return this._state.isInAddPromptMode;
    }

    /**
     * Get section expanded state
     * @param {string} sectionId - Section identifier
     * @returns {boolean} Whether section is expanded
     */
    isSectionExpanded(sectionId) {
        return this._state.sectionStates[sectionId] ?? true;
    }

    /**
     * Get saving state
     * @returns {boolean} Whether saving is in progress
     */
    isSaving() {
        return this._state.isSaving;
    }
}

// Create singleton instance
export const uiState = new UIState(); 