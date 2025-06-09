/**
 * @fileoverview OpenAI service for managing API operations
 */

// Log when OpenAI service is loaded
console.log('[OpenAIService] Loading OpenAI service');

import { get, set } from '../storage.js';
import { DEFAULT_OPENAI_MODEL } from '../constants.js';

/**
 * Error types for OpenAI operations
 * @enum {string}
 */
const OpenAIErrorType = {
    API: 'API_ERROR',
    NETWORK: 'NETWORK_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Validates the API key
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid
 */
function validateApiKey(apiKey) {
    console.log('[OpenAIService] Validating API key');
    const isValid = apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
    console.log('[OpenAIService] API key validation result:', { isValid });
    return isValid;
}

/**
 * Gets the API key from storage
 * @returns {Promise<string>} API key
 */
export async function getApiKey() {
    console.log('[OpenAIService] Getting API key');
    const startTime = performance.now();
    try {
        const apiKey = await get('openaiApiKey');
        const endTime = performance.now();
        console.log('[OpenAIService] Retrieved API key:', {
            hasKey: !!apiKey,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return apiKey;
    } catch (error) {
        const endTime = performance.now();
        console.error('[OpenAIService] Failed to get API key:', {
            error: error.message,
            type: OpenAIErrorType.API,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Sets the API key in storage
 * @param {string} apiKey - API key to set
 * @returns {Promise<void>}
 */
export async function setApiKey(apiKey) {
    console.log('[OpenAIService] Setting API key');
    const startTime = performance.now();
    try {
        if (!validateApiKey(apiKey)) {
            throw new Error('Invalid API key format');
        }
        await set('openaiApiKey', apiKey);
        const endTime = performance.now();
        console.log('[OpenAIService] API key set successfully:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[OpenAIService] Failed to set API key:', {
            error: error.message,
            type: OpenAIErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets the model from storage
 * @returns {Promise<string>} Model name
 */
export async function getModel() {
    console.log('[OpenAIService] Getting model');
    const startTime = performance.now();
    try {
        const model = await get('openaiModel') || DEFAULT_OPENAI_MODEL;
        const endTime = performance.now();
        console.log('[OpenAIService] Retrieved model:', {
            model,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return model;
    } catch (error) {
        const endTime = performance.now();
        console.error('[OpenAIService] Failed to get model:', {
            error: error.message,
            type: OpenAIErrorType.API,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Sets the model in storage
 * @param {string} model - Model name to set
 * @returns {Promise<void>}
 */
export async function setModel(model) {
    console.log('[OpenAIService] Setting model');
    const startTime = performance.now();
    try {
        await set('openaiModel', model);
        const endTime = performance.now();
        console.log('[OpenAIService] Model set successfully:', {
            model,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[OpenAIService] Failed to set model:', {
            error: error.message,
            type: OpenAIErrorType.API,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Makes a request to the OpenAI API
 * @param {string} prompt - Prompt to send
 * @param {string} [model] - Model to use
 * @returns {Promise<string>} API response
 */
export async function makeRequest(prompt, model) {
    console.log('[OpenAIService] Making API request:', { prompt, model });
    const startTime = performance.now();
    try {
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error('API key not set');
        }

        const modelToUse = model || await getModel();
        console.log('[OpenAIService] Using model:', modelToUse);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorType = response.status === 401 
                ? OpenAIErrorType.AUTHENTICATION 
                : response.status === 429 
                    ? OpenAIErrorType.RATE_LIMIT 
                    : response.status >= 500 
                        ? OpenAIErrorType.NETWORK 
                        : OpenAIErrorType.API;

            throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const endTime = performance.now();
        console.log('[OpenAIService] API request successful:', {
            model: modelToUse,
            promptLength: prompt.length,
            responseLength: data.choices[0].message.content.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });

        return data.choices[0].message.content;
    } catch (error) {
        const endTime = performance.now();
        const errorType = error.message.includes('API key not set') 
            ? OpenAIErrorType.AUTHENTICATION 
            : error.message.includes('rate limit') 
                ? OpenAIErrorType.RATE_LIMIT 
                : error.message.includes('network') 
                    ? OpenAIErrorType.NETWORK 
                    : OpenAIErrorType.API;

        console.error('[OpenAIService] API request failed:', {
            error: error.message,
            type: errorType,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets the list of available models
 * @returns {Promise<string[]>} List of model names
 */
export async function getAvailableModels() {
    console.log('[OpenAIService] Getting available models');
    const startTime = performance.now();
    try {
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error('API key not set');
        }

        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const models = data.data.map(model => model.id);
        const endTime = performance.now();
        console.log('[OpenAIService] Retrieved available models:', {
            count: models.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return models;
    } catch (error) {
        const endTime = performance.now();
        console.error('[OpenAIService] Failed to get available models:', {
            error: error.message,
            type: OpenAIErrorType.API,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

// Log when OpenAI service is fully loaded
console.log('[OpenAIService] OpenAI service loaded successfully'); 