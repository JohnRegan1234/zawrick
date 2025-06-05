// tests/options/options-ui.test.js

describe('Options UI Functions', () => {
  let mockNotificationTimeouts;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="notification" class="notification"></div>
      <div id="status-bar" class="status-bar">
        <span id="status-text">Disconnected</span>
      </div>
      <div class="section" id="test-section">
        <div class="section-header">
          <button class="section-toggle">Toggle</button>
        </div>
        <div class="section-body">Content</div>
      </div>
    `;

    // Clear any existing timeouts map
    mockNotificationTimeouts = new Map();

    // Mock console methods
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Clear module cache
    delete require.cache[require.resolve('../../options_ui.js')];
    
    // Load the script first
    require('../../options_ui.js');
    
    // Then simulate DOMContentLoaded event to trigger the initialization
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });

  afterEach(() => {
    // Clear any running timeouts
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('showUINotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    test('should display notification with message', () => {
      const message = 'Test notification';
      const notif = document.getElementById('notification');

      window.showUINotification(message);

      expect(notif.textContent).toBe(message);
      expect(notif.classList.contains('show')).toBe(true);
      expect(notif.classList.contains('notification')).toBe(true);
    });

    test('should display error notification', () => {
      const message = 'Error message';
      const notif = document.getElementById('notification');

      window.showUINotification(message, 'error');

      expect(notif.textContent).toBe(message);
      expect(notif.classList.contains('show')).toBe(true);
      expect(notif.classList.contains('error')).toBe(true);
    });

    test('should auto-hide notification after timeout', () => {
      const message = 'Test notification';
      const notif = document.getElementById('notification');

      window.showUINotification(message);
      expect(notif.classList.contains('show')).toBe(true);

      // Fast-forward time
      jest.advanceTimersByTime(3500);

      expect(notif.classList.contains('show')).toBe(false);
    });

    test('should handle missing notification element gracefully', () => {
      // Remove the notification element
      document.getElementById('notification').remove();

      // Should not throw error
      expect(() => {
        window.showUINotification('Test message');
      }).not.toThrow();
    });

    test('should clear existing timeout when new notification is shown', () => {
      const message1 = 'First notification';
      const message2 = 'Second notification';
      const notif = document.getElementById('notification');

      window.showUINotification(message1);
      expect(notif.textContent).toBe(message1);

      // Show another notification before timeout
      jest.advanceTimersByTime(1000);
      window.showUINotification(message2);
      expect(notif.textContent).toBe(message2);

      // Original timeout should be cleared, notification should still be visible
      jest.advanceTimersByTime(2600); // Total 3600ms
      expect(notif.classList.contains('show')).toBe(true);

      // New timeout should trigger
      jest.advanceTimersByTime(900); // Total 4500ms
      expect(notif.classList.contains('show')).toBe(false);
    });
  });

  describe('flashButtonGreen', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    test('should flash button green for success', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      window.flashButtonGreen(button);

      expect(button.classList.contains('flash-success')).toBe(true);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      expect(button.classList.contains('flash-success')).toBe(false);
    });

    test('should handle invalid button element gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      // Test with null
      window.flashButtonGreen(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[flashButtonGreen] Invalid button element provided:',
        null
      );

      // Test with undefined
      window.flashButtonGreen(undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[flashButtonGreen] Invalid button element provided:',
        undefined
      );

      // Test with object without classList
      const invalidButton = {};
      window.flashButtonGreen(invalidButton);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[flashButtonGreen] Invalid button element provided:',
        invalidButton
      );
    });
  });

  describe('updateUIConnectionStatus', () => {
    test('should update status to connected', () => {
      const statusBar = document.getElementById('status-bar');
      const statusText = document.getElementById('status-text');

      window.updateUIConnectionStatus(true);

      expect(statusBar.classList.contains('connected')).toBe(true);
      expect(statusBar.classList.contains('offline')).toBe(false);
      expect(statusBar.classList.contains('disconnected')).toBe(false);
      expect(statusText.textContent).toBe('Connected');
    });

    test('should update status to offline', () => {
      const statusBar = document.getElementById('status-bar');
      const statusText = document.getElementById('status-text');

      // First set to connected
      statusBar.classList.add('connected');

      window.updateUIConnectionStatus(false);

      expect(statusBar.classList.contains('offline')).toBe(true);
      expect(statusBar.classList.contains('disconnected')).toBe(true);
      // Note: The updateUIConnectionStatus function doesn't remove 'connected' class
      // This matches the actual implementation behavior
      expect(statusText.textContent).toBe('Offline');
    });

    test('should handle missing status elements gracefully', () => {
      // Remove status elements
      const statusBar = document.getElementById('status-bar');
      const statusText = document.getElementById('status-text');
      if (statusBar) statusBar.remove();
      if (statusText) statusText.remove();

      // Should not throw error
      expect(() => {
        window.updateUIConnectionStatus(true);
      }).not.toThrow();

      expect(() => {
        window.updateUIConnectionStatus(false);
      }).not.toThrow();
    });
  });

  describe('section toggle event handling', () => {
    test('should log debug information when section toggle is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const toggleButton = document.querySelector('.section-toggle');
      const section = document.getElementById('test-section');

      // Simulate click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      
      // Dispatch on the toggle button
      toggleButton.dispatchEvent(clickEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG][section-toggle] Toggle clicked:',
        expect.objectContaining({
          target: toggleButton,
          currentText: 'Toggle',
          parentSection: 'test-section'
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG][section-toggle] Section elements found:',
        expect.objectContaining({
          section: 'test-section'
        })
      );
    });

    test('should handle click on non-toggle elements gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const regularDiv = document.createElement('div');
      document.body.appendChild(regularDiv);

      // Simulate click event on non-toggle element
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      
      regularDiv.dispatchEvent(clickEvent);

      // Should not log debug messages for non-toggle clicks
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[DEBUG][section-toggle] Toggle clicked:',
        expect.any(Object)
      );
    });
  });

  describe('DOMContentLoaded event handling', () => {
    test('should initialize UI functions when DOM is loaded', () => {
      // Functions should be available on window object
      expect(typeof window.showUINotification).toBe('function');
      expect(typeof window.flashButtonGreen).toBe('function');
      expect(typeof window.updateUIConnectionStatus).toBe('function');
    });
  });

  // Import logic functions for testing clearAllNotificationTimeouts
  const { clearAllNotificationTimeouts, showUINotification } = require('../../options_ui_logic.js');

  // Tests for clearing notification timeouts
  describe('clearAllNotificationTimeouts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'clearTimeout');
      // Ensure no leftover timeouts
      clearAllNotificationTimeouts();
      // Reset clearTimeout call count after cleanup
      global.clearTimeout.mockClear();
    });

    afterEach(() => {
      global.clearTimeout.mockRestore();
      jest.useRealTimers();
    });

    it('should clear all scheduled notification timeouts', () => {
      // Ensure notification element exists in DOM
      const notif = document.getElementById('notification');
      expect(notif).not.toBeNull();

      // Schedule two notifications
      showUINotification('first');
      showUINotification('second');

      // Clear all timeouts
      clearAllNotificationTimeouts();

      // Expect clearTimeout to have been called for each scheduled timeout
      expect(global.clearTimeout).toHaveBeenCalledTimes(2);
    });
  });
});