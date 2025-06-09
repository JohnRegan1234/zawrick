/**
 * @fileoverview Main entry point for options page
 * This file is kept for backward compatibility and re-exports necessary functions
 */

// Re-export core functionality
export { uid } from './core/crypto.js';
export { getUniquePromptLabel } from './core/utils.js';
export { toggleGPTSection, toggleSection } from './core/ui-helpers.js';
export { flashButtonGreen, showUINotification, updateUIConnectionStatus, clearAllNotificationTimeouts } from './core/ui-helpers.js';

// Re-export service functions
export { fetchAnki, fetchDeckNames, fetchModelNames, checkAnkiStatus } from './services/anki-service.js';
export { testOpenAI, isValidOpenAiKey } from './services/openai-service.js';

// Re-export storage functions
export { 
    loadSettings, 
    saveSettings, 
    loadPromptHistory, 
    savePromptHistory,
    loadPendingPdfCards,
    savePendingPdfCards,
    loadPendingClips,
    savePendingClips,
    updatePendingCards
} from './core/storage.js';

// Import and initialize main functionality
import { initialize } from './index.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize); 