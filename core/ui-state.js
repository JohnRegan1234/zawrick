/**
 * @fileoverview UI state management
 */

// Log when UI state module is loaded
console.log('[UIState] Loading UI state module');

import { get, set } from './storage.js';

/**
 * Error types for UI state operations
 * @enum {string}
 */
const UIStateErrorType = {
    STORAGE: 'STORAGE_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Gets the UI state
 * @returns {Promise<Object>} UI state
 */
export async function getUIState() {
    console.log('[UIState] Getting UI state');
    const startTime = performance.now();
    try {
        const state = await get('uiState') || {};
        const endTime = performance.now();
        console.log('[UIState] Retrieved UI state:', {
            keys: Object.keys(state),
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return state;
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to get UI state:', {
            error: error.message,
            type: UIStateErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Sets the UI state
 * @param {Object} state - UI state to set
 * @returns {Promise<void>}
 */
export async function setUIState(state) {
    console.log('[UIState] Setting UI state:', { keys: Object.keys(state) });
    const startTime = performance.now();
    try {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid UI state');
        }
        await set('uiState', state);
        const endTime = performance.now();
        console.log('[UIState] UI state set successfully:', {
            keys: Object.keys(state),
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to set UI state:', {
            error: error.message,
            type: UIStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets a specific UI state value
 * @param {string} key - State key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} State value
 */
export async function getUIStateValue(key, defaultValue) {
    console.log('[UIState] Getting UI state value:', { key });
    const startTime = performance.now();
    try {
        if (!key) {
            throw new Error('Key is required');
        }

        const state = await getUIState();
        const value = state[key] !== undefined ? state[key] : defaultValue;
        const endTime = performance.now();
        console.log('[UIState] Retrieved UI state value:', {
            key,
            hasValue: value !== undefined,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return value;
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to get UI state value:', {
            error: error.message,
            type: UIStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Sets a specific UI state value
 * @param {string} key - State key
 * @param {*} value - Value to set
 * @returns {Promise<void>}
 */
export async function setUIStateValue(key, value) {
    console.log('[UIState] Setting UI state value:', { key });
    const startTime = performance.now();
    try {
        if (!key) {
            throw new Error('Key is required');
        }

        const state = await getUIState();
        state[key] = value;
        await setUIState(state);
        const endTime = performance.now();
        console.log('[UIState] UI state value set successfully:', {
            key,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to set UI state value:', {
            error: error.message,
            type: UIStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Removes a specific UI state value
 * @param {string} key - State key to remove
 * @returns {Promise<void>}
 */
export async function removeUIStateValue(key) {
    console.log('[UIState] Removing UI state value:', { key });
    const startTime = performance.now();
    try {
        if (!key) {
            throw new Error('Key is required');
        }

        const state = await getUIState();
        if (key in state) {
            delete state[key];
            await setUIState(state);
            const endTime = performance.now();
            console.log('[UIState] UI state value removed successfully:', {
                key,
                duration: `${(endTime - startTime).toFixed(2)}ms`
            });
        } else {
            console.log('[UIState] UI state value not found:', { key });
        }
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to remove UI state value:', {
            error: error.message,
            type: UIStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Clears all UI state
 * @returns {Promise<void>}
 */
export async function clearUIState() {
    console.log('[UIState] Clearing UI state');
    const startTime = performance.now();
    try {
        await setUIState({});
        const endTime = performance.now();
        console.log('[UIState] UI state cleared successfully:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[UIState] Failed to clear UI state:', {
            error: error.message,
            type: UIStateErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

// Log when UI state module is fully loaded
console.log('[UIState] UI state module loaded successfully'); 