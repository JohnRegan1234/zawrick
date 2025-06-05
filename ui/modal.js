// Modal Dialog Component
class Modal {
    constructor() {
        this.modal = document.querySelector('.modal');
        this.title = document.querySelector('.modal-title');
        this.body = document.querySelector('.modal-body');
        this.confirmBtn = document.querySelector('[data-action="confirm"]');
        this.cancelBtn = document.querySelector('[data-action="cancel"]');
        this.closeBtn = document.querySelector('.modal-close');
        
        if (!this.modal || !this.title || !this.body || !this.confirmBtn || !this.cancelBtn || !this.closeBtn) {
            console.error('Modal: Required elements not found');
            return;
        }

        this.onConfirm = null;
        this.setupEventListeners();
        this.hide();
    }

    setupEventListeners() {
        this.confirmBtn.addEventListener('click', () => this.hide(true));
        this.cancelBtn.addEventListener('click', () => this.hide(false));
        this.closeBtn.addEventListener('click', () => this.hide(false));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide(false);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.getAttribute('aria-hidden') === 'false') {
                this.hide(false);
            }
        });
    }

    show(title, body, onConfirm) {
        if (!this.modal || !this.title || !this.body || !this.confirmBtn || !this.cancelBtn || !this.closeBtn) {
            console.error('Modal: Required elements not found');
            return;
        }

        this.title.textContent = title;
        this.body.textContent = body;
        this.onConfirm = onConfirm;
        
        // Remove hidden attribute and set aria-hidden to false for proper CSS visibility
        this.modal.removeAttribute('hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        
        // Focus confirm button
        if (this.confirmBtn) {
            this.confirmBtn.focus();
        }
    }

    hide(confirmed = false) {
        if (!this.modal) {
            console.error('Modal: Required elements not found');
            return;
        }

        // Add hidden attribute and set aria-hidden to true
        this.modal.setAttribute('hidden', '');
        this.modal.setAttribute('aria-hidden', 'true');
        
        if (confirmed && this.onConfirm) {
            this.onConfirm();
        }
        this.onConfirm = null;
    }
}

// Export for testing
window.Modal = Modal;

// Initialize modal
function initializeModal() {
    try {
        const modalInstance = new Modal();
        if (!modalInstance.modal) return null;
        return modalInstance;
    } catch (error) {
        console.error('Failed to initialize modal:', error);
        return null;
    }
}

// Initialize modal based on environment
if (typeof document !== 'undefined') {
    // Browser environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.modal) {
                window.modal = initializeModal();
            }
        });
    } else {
        // DOM already loaded
        if (!window.modal) {
            window.modal = initializeModal();
        }
    }
} else {
    // Test environment
    window.initializeModal = initializeModal;
    if (!window.modal) {
        window.modal = window.initializeModal();
    }
}

// For test environments (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, initializeModal };
} 