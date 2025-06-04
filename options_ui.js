// Optionally, you can add a JSDoc comment for showNotification if needed
// window.showNotification = function(message, type) { ... }

// Note: TypeScript-specific type declarations removed for JavaScript compatibility

document.addEventListener('DOMContentLoaded', () => {
    // Remove the toggle switch handling - this is handled in options.js
    // The click handlers here were conflicting with the main toggle logic

    // Notification helper
    const notificationTimeouts = new Map();

    /**
     * Displays a UI notification with a message and optional type.
     * @param {string} message - The message to display in the notification.
     * @param {string} [type] - The type of notification (e.g., 'error').
     */
    window.showUINotification = function(message, type = '') {
        console.log('[options_ui.js][showUINotification] Called with message:', message, 'type:', type);
        const notif = document.getElementById('notification');
        console.log('[options_ui.js][showUINotification] notif element:', notif);
        if (!notif) return;
        
        notif.textContent = message;
        notif.className = 'notification';
        if (type === 'error') notif.classList.add('error');
        notif.classList.add('show');
        console.log('[options_ui.js][showUINotification] notif.classList.add("show") called');
        
        // Clear any existing timeout
        if (notificationTimeouts.has(notif)) {
            clearTimeout(notificationTimeouts.get(notif));
        }
        
        // Auto-hide after 3.5 seconds
        const timeout = setTimeout(() => {
            notif.classList.remove('show');
            notificationTimeouts.delete(notif);
            console.log('[options_ui.js][showUINotification] notif.classList.remove("show") after timeout');
        }, 3500);
        notificationTimeouts.set(notif, timeout);
    };

    /**
     * Briefly flashes a button green to indicate a successful action.
     * @param {HTMLElement} buttonElement - The button HTML element to flash.
     */
    window.flashButtonGreen = function(buttonElement) {
      if (!buttonElement || typeof buttonElement.classList === 'undefined') {
        console.warn('[flashButtonGreen] Invalid button element provided:', buttonElement);
        return;
      }
      buttonElement.classList.add('flash-success');
      setTimeout(() => {
        buttonElement.classList.remove('flash-success');
      }, 1000); // Flash duration in milliseconds
    };

    // UI connection status helper
    window.updateUIConnectionStatus = function(online) {
        const bar = document.getElementById('status-bar');
        const statusTextEl = document.getElementById('status-text');
        if (!bar || !statusTextEl) return;
        const STATUS_TEXT = {
            connected: 'Connected',
            offline: 'Offline'
        };

        if (online) {
            bar.classList.remove('offline', 'disconnected');
            bar.classList.add('connected');
            statusTextEl.textContent = STATUS_TEXT.connected;
        } else {
            bar.classList.add('offline', 'disconnected');
            statusTextEl.textContent = STATUS_TEXT.offline;
        }
    };

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
            
            // Let the main handler in options.js run, then log the result
            setTimeout(() => {
                console.log('[DEBUG][section-toggle] After toggle:', {
                    sectionClasses: Array.from(section?.classList || []),
                    toggleText: e.target.textContent
                });
            }, 100);
        }
    });
});
