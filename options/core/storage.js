/**
 * @fileoverview Storage operations for the browser extension
 */

import { getChrome } from './chrome-helpers.js';
import { DEFAULT_SETTINGS } from './constants.js';

/**
 * Loads settings from Chrome storage
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<Object>} The loaded settings
 */
export const loadSettings = async (chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        console.warn('Storage unavailable, using default settings');
        return DEFAULT_SETTINGS;
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to load settings:', chrome.runtime.lastError.message);
                resolve(DEFAULT_SETTINGS);
                return;
            }
            resolve(settings);
        });
    });
};

/**
 * Saves settings to Chrome storage
 * @param {Object} settings - The settings to save
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<void>}
 * @throws {Error} If storage is unavailable or operation fails
 */
export const saveSettings = async (settings, chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.set(settings, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to save settings: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve();
        });
    });
};

/**
 * Loads prompt history from storage
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<Array>} The prompt history
 * @throws {Error} If storage is unavailable or operation fails
 */
export const loadPromptHistory = async (chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get({ promptHistory: [] }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to load prompt history: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve(result.promptHistory);
        });
    });
};

/**
 * Saves prompt history to storage
 * @param {Array} history - The prompt history to save
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<void>}
 * @throws {Error} If storage is unavailable or operation fails
 */
export const savePromptHistory = async (history, chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ promptHistory: history }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to save prompt history: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve();
        });
    });
};

/**
 * Loads pending PDF review cards from storage
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<Array>} The pending PDF review cards
 * @throws {Error} If storage is unavailable or operation fails
 */
export const loadPendingPdfCards = async (chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get({ pendingReviewPdfCards: [] }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to load pending PDF cards: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve(result.pendingReviewPdfCards);
        });
    });
};

/**
 * Saves pending PDF review cards to storage
 * @param {Array} cards - The pending PDF review cards to save
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<void>}
 * @throws {Error} If storage is unavailable or operation fails
 */
export const savePendingPdfCards = async (cards, chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ pendingReviewPdfCards: cards }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to save pending PDF cards: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve();
        });
    });
};

/**
 * Loads pending clips from storage
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<Array>} The pending clips
 * @throws {Error} If storage is unavailable or operation fails
 */
export const loadPendingClips = async (chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get({ pendingClips: [] }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to load pending clips: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve(result.pendingClips);
        });
    });
};

/**
 * Saves pending clips to storage
 * @param {Array} clips - The pending clips to save
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<void>}
 * @throws {Error} If storage is unavailable or operation fails
 */
export const savePendingClips = async (clips, chromeInjected) => {
    const chrome = getChrome(chromeInjected);
    if (!chrome?.storage?.local) {
        throw new Error('Storage unavailable');
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ pendingClips: clips }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to save pending clips: ${chrome.runtime.lastError.message}`));
                return;
            }
            resolve();
        });
    });
}; 