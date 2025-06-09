/**
 * @fileoverview Main entry point for the extension
 */

// Log when extension is initializing
console.log('[Extension] Initializing extension');

import { getCurrentProfile, getPrompts } from './app-state.js';
import { getUIState } from './ui-state.js';
import { makeRequest } from './services/openai-service.js';
import { addPendingCard } from './services/card-service.js';
import { getCurrentTab, getSelectedText } from './chrome-helpers.js';

/**
 * Error types for extension operations
 * @enum {string}
 */
const ExtensionErrorType = {
    INITIALIZATION: 'INITIALIZATION_ERROR',
    PROFILE: 'PROFILE_ERROR',
    PROMPT: 'PROMPT_ERROR',
    API: 'API_ERROR',
    CARD: 'CARD_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Initializes the extension
 * @returns {Promise<void>}
 */
async function initialize() {
    console.log('[Extension] Starting initialization');
    const startTime = performance.now();
    try {
        // Get current profile
        const profile = await getCurrentProfile();
        console.log('[Extension] Retrieved current profile:', { profile });

        // Get prompts for profile
        const prompts = await getPrompts(profile);
        console.log('[Extension] Retrieved prompts:', { 
            profile,
            count: prompts.length 
        });

        // Get UI state
        const uiState = await getUIState();
        console.log('[Extension] Retrieved UI state:', {
            keys: Object.keys(uiState)
        });

        const endTime = performance.now();
        console.log('[Extension] Initialization completed:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[Extension] Initialization failed:', {
            error: error.message,
            type: ExtensionErrorType.INITIALIZATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Handles the create card action
 * @param {string} promptId - ID of the prompt to use
 * @returns {Promise<void>}
 */
async function handleCreateCard(promptId) {
    console.log('[Extension] Handling create card action:', { promptId });
    const startTime = performance.now();
    try {
        // Get current tab
        const tab = await getCurrentTab();
        console.log('[Extension] Retrieved current tab:', {
            id: tab.id,
            url: tab.url
        });

        // Get selected text
        const selectedText = await getSelectedText();
        if (!selectedText) {
            throw new Error('No text selected');
        }
        console.log('[Extension] Retrieved selected text:', {
            length: selectedText.length
        });

        // Get current profile and prompts
        const profile = await getCurrentProfile();
        const prompts = await getPrompts(profile);
        const prompt = prompts.find(p => p.id === promptId);
        
        if (!prompt) {
            throw new Error('Prompt not found');
        }
        console.log('[Extension] Retrieved prompt:', {
            promptId,
            name: prompt.name
        });

        // Make API request
        const response = await makeRequest(prompt.prompt);
        console.log('[Extension] Received API response:', {
            length: response.length
        });

        // Add pending card
        await addPendingCard({
            front: selectedText,
            back: response,
            source: tab.url,
            promptId
        });
        console.log('[Extension] Added pending card');

        const endTime = performance.now();
        console.log('[Extension] Create card action completed:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[Extension] Create card action failed:', {
            error: error.message,
            type: ExtensionErrorType.CARD,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

// Initialize extension
initialize().catch(error => {
    console.error('[Extension] Fatal initialization error:', {
        error: error.message,
        type: ExtensionErrorType.INITIALIZATION
    });
});

// Log when extension is ready
console.log('[Extension] Extension ready');

// Export functions
export { handleCreateCard }; 