/**
 * @fileoverview AnkiConnect service for interacting with Anki
 */

import { getFetch } from '../core/chrome-helpers.js';
import { ANKI_CONNECT_URL } from '../core/constants.js';

/**
 * Makes a request to AnkiConnect
 * @param {string} action - The AnkiConnect action to perform
 * @param {Object} [params={}] - Parameters for the action
 * @param {Function} [fetchInjected] - Injected fetch function for testing
 * @returns {Promise<any>} The result from AnkiConnect
 * @throws {Error} If the request fails or AnkiConnect returns an error
 */
export const fetchAnki = async (action, params = {}, fetchInjected) => {
    const fetchFn = getFetch(fetchInjected);
    if (!fetchFn) {
        throw new Error('Fetch API not available');
    }

    try {
        const response = await fetchFn(ANKI_CONNECT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, version: 6, params })
        });

        if (!response.ok) {
            throw new Error(`Network error: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data.result;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Network failure');
        }
        throw error;
    }
};

/**
 * Fetches the list of deck names from Anki
 * @param {Function} [fetchInjected] - Injected fetch function for testing
 * @returns {Promise<string[]>} Array of deck names
 * @throws {Error} If the request fails
 */
export const fetchDeckNames = async (fetchInjected) => {
    try {
        const result = await fetchAnki("deckNames", {}, fetchInjected);
        if (!Array.isArray(result)) {
            throw new Error('Invalid response format');
        }
        return result;
    } catch (err) {
        console.warn('[AnkiService][fetchDeckNames] Could not fetch deck names:', err);
        return [];
    }
};

/**
 * Fetches the list of note type names from Anki
 * @param {Function} [fetchInjected] - Injected fetch function for testing
 * @returns {Promise<string[]>} Array of note type names
 * @throws {Error} If the request fails
 */
export const fetchModelNames = async (fetchInjected) => {
    try {
        const result = await fetchAnki("modelNames", {}, fetchInjected);
        if (!Array.isArray(result)) {
            throw new Error('Invalid response format');
        }
        return result;
    } catch (err) {
        console.warn('[AnkiService][fetchModelNames] Could not fetch model names:', err);
        return ['Basic', 'Cloze']; // Default models
    }
};

/**
 * Checks the connection status with Anki and retrieves current deck/model information
 * @param {Function} [fetchInjected] - Injected fetch function for testing
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<{isOnline: boolean, decks: string[], models: string[], error?: string}>} Connection status and data
 */
export const checkAnkiStatus = async (fetchInjected, chromeInjected) => {
    try {
        // Fetch all required data at once
        const [decks, models] = await Promise.all([
            fetchDeckNames(fetchInjected),
            fetchModelNames(fetchInjected)
        ]);

        if (!Array.isArray(decks) || decks.length === 0) {
            throw new Error('No decks available');
        }
        if (!Array.isArray(models) || models.length === 0) {
            throw new Error('No models available');
        }

        return {
            isOnline: true,
            decks,
            models
        };
    } catch (err) {
        return {
            isOnline: false,
            decks: [],
            models: ['Basic', 'Cloze'],
            error: err.message
        };
    }
}; 