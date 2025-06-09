/**
 * @fileoverview OpenAI API service for the browser extension
 */

import { getFetch } from '../core/chrome-helpers.js';
import { OPENAI_API_URL, DEFAULT_GPT_MODEL } from '../core/constants.js';
import { appState } from '../state/app-state.js';

/**
 * Response object for OpenAI API operations
 * @typedef {Object} OpenAIResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {Object} [data] - Response data if operation succeeded
 */

/**
 * Validates the format of an OpenAI API key
 * @param {string} key - The API key to validate
 * @returns {boolean} Whether the key format is valid
 */
export const isValidOpenAiKey = (key) => {
    if (!key || typeof key !== 'string') {
        return false;
    }

    const trimmedKey = key.trim();
    if (!trimmedKey) {
        return false;
    }

    // OpenAI API keys start with 'sk-' and are 51 characters long
    return /^sk-[A-Za-z0-9]{48}$/.test(trimmedKey);
};

/**
 * Tests an OpenAI API key by making a minimal API request
 * @param {string} apiKey - The API key to test
 * @param {Function} [isValidKeyFn] - Optional custom key validation function
 * @param {Function} [fetchInjected] - Injected fetch function for testing
 * @returns {Promise<OpenAIResponse>} Test result
 */
export const testOpenAI = async (apiKey, isValidKeyFn, fetchInjected) => {
    // Use provided validation function or default
    const isValid = isValidKeyFn || isValidOpenAiKey;

    // Validate key format
    if (!apiKey || !apiKey.trim()) {
        return {
            success: false,
            error: 'No API key provided'
        };
    }

    if (!isValid(apiKey)) {
        return {
            success: false,
            error: 'Invalid API key format'
        };
    }

    // Get fetch function
    const fetchFn = getFetch(fetchInjected);
    if (!fetchFn) {
        return {
            success: false,
            error: 'Fetch API not available'
        };
    }

    try {
        const response = await fetchFn(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: DEFAULT_GPT_MODEL,
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 10
            })
        });

        if (response.ok) {
            return {
                success: true,
                data: await response.json()
            };
        }

        if (response.status === 401) {
            return {
                success: false,
                error: 'Invalid API key'
            };
        }

        return {
            success: false,
            error: `API error: ${response.status}`
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof TypeError ? 'Network error' : 'API error'
        };
    }
};

/**
 * Gets the list of available models from OpenAI API
 * @returns {Promise<string[]>} List of available model names
 */
export async function getAvailableModels() {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${appState.state.openaiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data
            .filter(model => model.id.startsWith('gpt-'))
            .map(model => model.id);
    } catch (error) {
        console.error('[OpenAIService] Failed to get available models:', error);
        // Return default models if API call fails
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
    }
} 