import * as uiLogic from './options_ui_logic.js';

// Optionally, you can add a JSDoc comment for showNotification if needed
// window.showNotification = function(message, type) { ... }

// Note: TypeScript-specific type declarations removed for JavaScript compatibility

document.addEventListener('DOMContentLoaded', () => {
    window.showUINotification = (message, type = '') => uiLogic.showUINotification(message, type, document);
    window.flashButtonGreen = uiLogic.flashButtonGreen;
    window.updateUIConnectionStatus = (online) => uiLogic.updateUIConnectionStatus(online, document);

    // Add debug logging for section toggle clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('section-toggle')) {
            console.log('[DEBUG][section-toggle] Toggle clicked:', {
                target: e.target,
                currentText: e.target.textContent,
                parentSection: e.target.closest('.section')?.id,
                sectionClasses: Array.from(e.target.closest('.section')?.classList || [])
            });
            
            const section = e.target.closest('.section');
            const sectionBody = section?.querySelector('.section-body');
            
            console.log('[DEBUG][section-toggle] Section elements found:', {
                section: section?.id,
                sectionBody: sectionBody?.id || 'no-id',
                hasCollapsedClass: section?.classList.contains('collapsed')
            });
            
            // Let the main handler in options/index.js run, then log the result
            setTimeout(() => {
                console.log('[DEBUG][section-toggle] After toggle:', {
                    sectionClasses: Array.from(section?.classList || []),
                    toggleText: e.target.textContent
                });
            }, 100);
        }
    });
});
