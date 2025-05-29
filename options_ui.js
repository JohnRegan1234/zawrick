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
        const notif = document.getElementById('notification');
        if (!notif) return;
        
        notif.textContent = message;
        notif.className = 'notification';
        if (type === 'error') notif.classList.add('error');
        notif.classList.add('show');
        
        // Clear any existing timeout
        if (notificationTimeouts.has(notif)) {
            clearTimeout(notificationTimeouts.get(notif));
        }
        
        // Auto-hide after 3.5 seconds
        const timeout = setTimeout(() => {
            notif.classList.remove('show');
            notificationTimeouts.delete(notif);
        }, 3500);
        notificationTimeouts.set(notif, timeout);
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
});
