
const notificationTimeouts = new Map();

/**
 * Displays a UI notification with a message and optional type.
 * @param {string} message - The message to display in the notification.
 * @param {string} [type] - The type of notification (e.g., 'error').
 * @param {Document} documentContext - The document object to use.
 */
export function showUINotification(message, type = '', documentContext = document) {
    console.log('[options_ui_logic.js][showUINotification] Called with message:', message, 'type:', type);
    const notif = documentContext.getElementById('notification');
    console.log('[options_ui_logic.js][showUINotification] notif element:', notif);
    if (!notif) return;
    
    notif.textContent = message;
    notif.className = 'notification'; // Reset classes
    if (type === 'error') notif.classList.add('error');
    notif.classList.add('show');
    console.log('[options_ui_logic.js][showUINotification] notif.classList.add("show") called');
    
    // Clear any existing timeout
    if (notificationTimeouts.has(notif)) {
        clearTimeout(notificationTimeouts.get(notif));
    }
    
    // Auto-hide after 3.5 seconds
    const timeout = setTimeout(() => {
        notif.classList.remove('show');
        notificationTimeouts.delete(notif);
        console.log('[options_ui_logic.js][showUINotification] notif.classList.remove("show") after timeout');
    }, 3500);
    notificationTimeouts.set(notif, timeout);
}

/**
 * Briefly flashes a button green to indicate a successful action.
 * @param {HTMLElement} buttonElement - The button HTML element to flash.
 */
export function flashButtonGreen(buttonElement) {
  if (!buttonElement || typeof buttonElement.classList === 'undefined') {
    console.warn('[flashButtonGreen] Invalid button element provided:', buttonElement);
    return;
  }
  buttonElement.classList.add('flash-success');
  setTimeout(() => {
    buttonElement.classList.remove('flash-success');
  }, 1000); // Flash duration in milliseconds
}

/**
 * Updates the UI connection status display.
 * @param {boolean} online - True if connected, false otherwise.
 * @param {Document} documentContext - The document object to use.
 */
export function updateUIConnectionStatus(online, documentContext = document) {
    const bar = documentContext.getElementById('status-bar');
    const statusTextEl = documentContext.getElementById('status-text');
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
        bar.classList.remove('connected'); // Ensure connected is removed when offline
        bar.classList.add('offline', 'disconnected');
        statusTextEl.textContent = STATUS_TEXT.offline;
    }
}

// Function to clear timeouts, useful for testing
export function clearAllNotificationTimeouts() {
    for (const timeoutId of notificationTimeouts.values()) {
        clearTimeout(timeoutId);
    }
    notificationTimeouts.clear();
}
