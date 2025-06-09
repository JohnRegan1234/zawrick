/**
 * @fileoverview UI helper functions for the options page
 * Contains functions for managing UI state, notifications, and visual feedback
 */

// Map to track notification timeouts for cleanup
const notificationTimeouts = new Map();

/**
 * Toggles the GPT section's enabled/disabled state
 * @param {boolean} on - True to enable, false to disable
 */
export function toggleGPTSection(on) {
    const gptBody = document.getElementById('gpt-section')?.querySelector('.section-body');
    if (!gptBody) return;
    const inputs = gptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
    gptBody.style.opacity = on ? '1' : '0.5';
    inputs.forEach(el => {
        // Don't disable the enable GPT checkbox itself
        if (el.id === 'enable-gpt') return;
        el.disabled = !on;
    });
}

/**
 * Toggles a section's collapsed/expanded state
 * @param {HTMLElement} body - The section body element
 * @param {HTMLElement} toggle - The toggle button element
 * @param {boolean|null} initialExpandedState - Force a specific state (null to toggle)
 */
export function toggleSection(body, toggle, initialExpandedState = null) {
    const sectionElement = body.closest('.section');
    if (!sectionElement || !toggle) return;

    let shouldBeExpanded;
    if (initialExpandedState !== null) {
        shouldBeExpanded = initialExpandedState;
    } else {
        // Toggle the current state: if collapsed, expand; if expanded, collapse
        shouldBeExpanded = sectionElement.classList.contains('collapsed');
    }

    if (shouldBeExpanded) {
        sectionElement.classList.remove('collapsed');
        toggle.textContent = '▾';
    } else {
        sectionElement.classList.add('collapsed');
        toggle.textContent = '▸';
    }
}

/**
 * Briefly flashes a button green to indicate a successful action
 * @param {HTMLElement} buttonElement - The button element to flash
 */
export function flashButtonGreen(buttonElement) {
    if (!buttonElement || typeof buttonElement.classList === 'undefined') {
        console.warn('[flashButtonGreen] Invalid button element provided:', buttonElement);
        return;
    }
    buttonElement.classList.add('flash-success');
    setTimeout(() => {
        buttonElement.classList.remove('flash-success');
    }, 1000);
}

/**
 * Displays a UI notification with a message and optional type
 * @param {string} message - The message to display
 * @param {string} type - The notification type ('error' or empty for success)
 * @param {Document} documentContext - The document object to use
 */
export function showUINotification(message, type = '', documentContext = document) {
    console.log('[ui-helpers.js][showUINotification] Called with message:', message, 'type:', type);
    const notif = documentContext.getElementById('notification');
    console.log('[ui-helpers.js][showUINotification] notif element:', notif);
    if (!notif) return;
    
    // Clear any existing timeout
    if (notificationTimeouts.has(notif)) {
        clearTimeout(notificationTimeouts.get(notif));
    }
    
    notif.textContent = message;
    notif.className = 'notification'; // Reset classes
    if (type === 'error') notif.classList.add('error');
    
    // Force a reflow to ensure the transition works
    notif.offsetHeight;
    
    notif.classList.add('show');
    console.log('[ui-helpers.js][showUINotification] notif.classList.add("show") called');
    
    // Auto-hide after 3.5 seconds
    const timeout = setTimeout(() => {
        notif.classList.add('hide');
        notif.classList.remove('show');
        
        // Remove the hide class after the transition completes
        setTimeout(() => {
            notif.classList.remove('hide');
            notificationTimeouts.delete(notif);
        }, 300); // Match the CSS transition duration
        
        console.log('[ui-helpers.js][showUINotification] notif.classList.remove("show") after timeout');
    }, 3500);
    notificationTimeouts.set(notif, timeout);
}

/**
 * Updates the UI connection status display
 * @param {boolean} online - True if connected, false if offline
 * @param {Document} documentContext - The document object to use
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

/**
 * Function to clear all notification timeouts, useful for testing
 */
export function clearAllNotificationTimeouts() {
    for (const timeoutId of notificationTimeouts.values()) {
        clearTimeout(timeoutId);
    }
    notificationTimeouts.clear();
}
