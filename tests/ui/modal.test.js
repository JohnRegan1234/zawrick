// tests/ui/modal.test.js

// Mock DOM environment
document.body.innerHTML = `
  <div id="modal" class="modal" aria-hidden="true" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title"></h2>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="confirm">Confirm</button>
      </div>
    </div>
  </div>
`;

// Clear any existing modal instance
delete window.modal;

describe('Modal Component', () => {
  let Modal;

  beforeEach(() => {
    // Set up real DOM for the modal
    document.body.innerHTML = `
      <div id="modal" class="modal" aria-hidden="true" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title"></h2>
            <button class="modal-close" aria-label="Close">×</button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button class="btn btn-primary" data-action="confirm">Confirm</button>
          </div>
        </div>
      </div>
    `;

    // Clear any existing modal instance
    delete window.modal;

    // Import Modal class
    Modal = require('../../ui/modal.js').Modal;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with required elements', () => {
    const modal = new Modal();
    expect(modal).toBeDefined();
    expect(modal.modal).toBeDefined();
    expect(modal.title).toBeDefined();
    expect(modal.body).toBeDefined();
    expect(modal.confirmBtn).toBeDefined();
    expect(modal.cancelBtn).toBeDefined();
    expect(modal.closeBtn).toBeDefined();
  });

  test('shows modal with correct content', () => {
    const modal = new Modal();
    const onConfirm = jest.fn();
    modal.show('Test Title', 'Test Body', onConfirm);

    expect(modal.title.textContent).toBe('Test Title');
    expect(modal.body.textContent).toBe('Test Body');
    expect(modal.modal.getAttribute('aria-hidden')).toBe('false');
    expect(modal.modal.hasAttribute('hidden')).toBe(false);
  });

  test('hides modal and calls confirm callback when confirmed', () => {
    const modal = new Modal();
    const onConfirm = jest.fn();
    modal.show('Test Title', 'Test Body', onConfirm);
    modal.hide(true);

    expect(modal.modal.getAttribute('aria-hidden')).toBe('true');
    expect(modal.modal.hasAttribute('hidden')).toBe(true);
    expect(onConfirm).toHaveBeenCalled();
  });

  test('hides modal without calling confirm callback when cancelled', () => {
    const modal = new Modal();
    const onConfirm = jest.fn();
    modal.show('Test Title', 'Test Body', onConfirm);
    modal.hide(false);

    expect(modal.modal.getAttribute('aria-hidden')).toBe('true');
    expect(modal.modal.hasAttribute('hidden')).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('sets up event listeners', () => {
    // Create spies on the actual elements
    const modal = new Modal();
    
    // Verify that the modal was created properly and elements exist
    expect(modal.modal).toBeTruthy();
    expect(modal.confirmBtn).toBeTruthy();
    expect(modal.cancelBtn).toBeTruthy();
    expect(modal.closeBtn).toBeTruthy();
    
    // Test that clicking confirm button calls hide with true
    const hideSpy = jest.spyOn(modal, 'hide');
    modal.confirmBtn.click();
    expect(hideSpy).toHaveBeenCalledWith(true);
    
    // Test that clicking cancel button calls hide with false
    hideSpy.mockClear();
    modal.cancelBtn.click();
    expect(hideSpy).toHaveBeenCalledWith(false);
    
    // Test that clicking close button calls hide with false
    hideSpy.mockClear();
    modal.closeBtn.click();
    expect(hideSpy).toHaveBeenCalledWith(false);
  });
}); 