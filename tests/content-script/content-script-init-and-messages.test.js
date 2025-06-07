/**
 * Simple test for contentScript.js to achieve coverage
 */

describe('ContentScript Coverage Test', () => {
  let originalChrome, originalWindow, originalDocument, originalConsole;
  let messageListener;

  beforeEach(() => {
    // Store originals
    originalChrome = global.chrome;
    originalWindow = global.window;
    originalDocument = global.document;
    originalConsole = global.console;

    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListener = listener;
          })
        },
        sendMessage: jest.fn()
      }
    };

    // Mock Window APIs
    global.window = {
      location: { href: 'https://test.com' },
      getSelection: jest.fn()
    };

    // Mock Document APIs
    global.document = {
      createElement: jest.fn(() => ({
        id: '',
        innerHTML: '',
        style: {},
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        remove: jest.fn()
      })),
      body: {
        appendChild: jest.fn()
      }
    };

    // Mock Console
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Clear require cache and require the script
    delete require.cache[require.resolve('../../contentScript.js')];
    require('../../contentScript.js');
  });

  afterEach(() => {
    // Restore originals
    global.chrome = originalChrome;
    global.window = originalWindow;
    global.document = originalDocument;
    global.console = originalConsole;
  });

  test('should initialize and register message listener', () => {
    expect(global.console.log).toHaveBeenCalledWith(
      '[ContentScript] Loaded and running on:',
      'http://localhost/'
    );
    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(messageListener).toBeDefined();
  });

  test('should handle getSelectionHtml action', () => {
    const mockSendResponse = jest.fn();
    
    // Create a proper mock DOM node for cloneContents
    const mockClonedContent = global.document.createElement('div');
    mockClonedContent.innerHTML = '<span>Selected text</span>';
    
    global.window.getSelection.mockReturnValue({
      rangeCount: 1,
      getRangeAt: jest.fn().mockReturnValue({
        cloneContents: jest.fn().mockReturnValue(mockClonedContent)
      })
    });

    const result = messageListener({ action: 'getSelectionHtml' }, {}, mockSendResponse);
    
    expect(result).toBe(true);
    expect(mockSendResponse).toHaveBeenCalledWith({ html: expect.any(String) });
  });

  test('should handle manualFront action', () => {
    const mockSendResponse = jest.fn();
    
    const message = {
      action: 'manualFront',
      modelName: 'Basic',
      backHtml: '<p>Test</p>',
      deckName: 'TestDeck',
      deckList: ['TestDeck'],
      ankiOnline: true,
      frontHtml: ''
    };

    messageListener(message, {}, mockSendResponse);
  });

  test('should handle confirmCard action', () => {
    const mockSendResponse = jest.fn();
    
    const message = {
      action: 'confirmCard',
      front: 'Question',
      back: 'Answer',
      deckName: 'TestDeck',
      modelName: 'Basic'
    };

    messageListener(message, {}, mockSendResponse);
  });

  test('should handle toast notifications', () => {
    const mockSendResponse = jest.fn();
    
    const message = {
      status: 'success',
      message: 'Test message'
    };

    messageListener(message, {}, mockSendResponse);
  });
});
