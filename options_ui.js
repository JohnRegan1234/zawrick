import * as uiLogic from './options/options_ui_logic.js';

// Optionally, you can add a JSDoc comment for showNotification if needed
// window.showNotification = function(message, type) { ... }

// Note: TypeScript-specific type declarations removed for JavaScript compatibility

document.addEventListener('DOMContentLoaded', () => {
    window.showUINotification = (message, type = '') => uiLogic.showUINotification(message, type, document);
    window.flashButtonGreen = uiLogic.flashButtonGreen;
    window.updateUIConnectionStatus = (online) => uiLogic.updateUIConnectionStatus(online, document);


});
