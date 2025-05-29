// Notification management
let notificationTimeout = null;

function showNotification(message, type = 'success') {
  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  // Create or update notification element
  let notification = document.getElementById('zawrick-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'zawrick-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      transition: opacity 0.3s ease, transform 0.3s ease;
      transform: translateY(-10px);
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(notification);
  }

  // Set message and style based on type
  notification.textContent = message;
  if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
  } else {
    notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  }

  // Show notification
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';
  notification.style.pointerEvents = 'auto';

  // Auto-hide after 3.5 seconds
  notificationTimeout = setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    notification.style.pointerEvents = 'none';
    notificationTimeout = null;
  }, 3500);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.status) {
    showNotification(message.message, message.status);
  }
  
  if (message.action === "getSelectionHtml") {
    // ...existing code for getSelectionHtml...
  }
  
  if (message.action === "manualFront") {
    // ...existing code for manualFront...
    // Make sure to hide any existing notifications when overlay appears
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
    const existingNotification = document.getElementById('zawrick-notification');
    if (existingNotification) {
      existingNotification.style.opacity = '0';
      existingNotification.style.transform = 'translateY(-10px)';
      existingNotification.style.pointerEvents = 'none';
    }
  }
});