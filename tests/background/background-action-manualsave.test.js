// background-action-manualsave.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script handleAction and manualSave', () => {
  let background;
  let handleMessage;
  let mockChrome;
  let mockSendResponse;
  let mockSender;
  let originalConsoleWarn;
  let originalConsoleError;
  let originalConsoleLog;
  let notifications;

  beforeEach(() => {
    jest.resetModules();
    mockSendResponse = jest.fn();
    mockSender = { tab: { id: 1 } };
    notifications = [];
    
    // Restore real timers for this test since it uses withTimeout
    if (typeof global.restoreTimers === 'function') {
      global.restoreTimers();
    }
    
    // Set up the Chrome mock BEFORE requiring background.js
    mockChrome = {
      notifications: {
        create: jest.fn((id, opts) => notifications.push({ id, ...opts })),
      },
      runtime: {
        lastError: null,
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
        onMessage: { addListener: jest.fn() },
      },
      storage: {
        local: {
          get: jest.fn((keys, cb) => cb({ pendingReviewPdfCards: [], promptHistory: [] })),
          set: jest.fn((data, cb) => cb && cb()),
        }
      },
      tabs: {
        sendMessage: jest.fn((tabId, msg, cb) => cb && cb({ success: true })),
        get: jest.fn((tabId, cb) => cb({ id: tabId, url: 'https://example.com', title: 'Test Page' })),
      },
      scripting: {
        executeScript: jest.fn((opts, cb) => cb([{ result: 'success' }])),
      },
      alarms: {
        create: jest.fn(),
        onAlarm: { addListener: jest.fn() },
      },
      contextMenus: {
        create: jest.fn(),
        onClicked: { addListener: jest.fn() },
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        setBadgeTextColor: jest.fn(),
        setTitle: jest.fn(),
      },
    };
    global.chrome = mockChrome;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"choices":[{"message":{"content":"Q"}}]}'), json: () => Promise.resolve({ result: ["Default"], error: null }) }));
    originalConsoleWarn = global.console.warn;
    originalConsoleError = global.console.error;
    originalConsoleLog = global.console.log;
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
    global.console.log = jest.fn();
    
    // Now require background.js after Chrome mock is set up
    background = require('../../background.js');
    handleMessage = background.handleMessage;
  });

  afterEach(() => {
    global.console.warn = originalConsoleWarn;
    global.console.error = originalConsoleError;
    global.console.log = originalConsoleLog;
    jest.clearAllMocks();
  });

  // Increase timeout for async operations
  jest.setTimeout(10000);

  function withTimeout(testFn, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test timed out')), timeout);
      testFn(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  test('should handle saveToAnki message', async () => {
    const message = {
      action: 'saveToAnki',
      data: {
        front: 'Test question',
        backHtml: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      }
    };
    await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should handle manualSave message', async () => {
    const message = {
      action: 'manualSave',
      data: {
        front: 'Test question',
        backHtml: 'Test answer',
        deckName: 'Default',
        modelName: 'Basic'
      }
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ result: 12345, error: null })
    });
    await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should handle confirmSave message', async () => {
    const message = {
      action: 'confirmSave',
      cardData: {
        front: 'Question',
        backHtml: 'Answer',
        deckName: 'Default',
        modelName: 'Basic'
      }
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ result: 12345, error: null })
    });
    await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should handle saveFinalizedPdfCard message', async () => {
    const message = {
      action: 'saveFinalizedPdfCard',
      cardData: {
        front: 'Question',
        backHtml: 'Answer',
        deckName: 'Default',
        modelName: 'Basic'
      }
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ result: 12345, error: null })
    });
    await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should handle unknown message action', async () => {
    const message = { action: 'unknownAction' };
    await handleMessage(message, { tab: { id: 123 } }, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: expect.stringMatching(/Unknown action/) });
  });

  test('handles saveFinalizedPdfCard (success)', async () => {
    await withTimeout((done) => {
      const message = { action: 'saveFinalizedPdfCard', cardData: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      handleMessage(message, mockSender, (resp) => {
        expect(resp.success).toBe(true);
        done();
      });
    });
  });

  test('handles saveFinalizedPdfCard (error)', async () => {
    background.saveToAnkiOrQueue = jest.fn(() => { throw new Error('fail'); });
    await withTimeout((done) => {
      const message = { action: 'saveFinalizedPdfCard', cardData: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      handleMessage(message, mockSender, (resp) => {
        expect(resp.success).toBe(false);
        expect(resp.error).toBeDefined();
        done();
      });
    });
  });

  test('handles manualSave (success)', async () => {
    await withTimeout((done) => {
      const message = { action: 'manualSave', data: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      handleMessage(message, mockSender, (resp) => {
        expect(resp.success).toBe(true);
        done();
      });
    });
  });

  test('handles manualSave (error)', async () => {
    background.queueClip = jest.fn(() => { throw new Error('fail'); });
    await withTimeout((done) => {
      const message = { action: 'manualSave', data: { front: 'f', backHtml: 'b', deckName: 'd', modelName: 'm' } };
      handleMessage(message, mockSender, (resp) => {
        expect(resp.success).toBe(false);
        expect(resp.error).toBeDefined();
        done();
      });
    });
  });

  test('saveToAnki action with manual review', async () => {
    const message = {
      action: 'saveToAnki',
      front: 'Test Front',
      backHtml: 'Test Back',
      settings: {
        deckName: 'Test Deck',
        modelName: 'Basic',
        alwaysConfirm: true
      },
      tabId: 1
    };

    const sendResponse = jest.fn();
    await handleMessage(message, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('manualSave action', async () => {
    const message = {
      action: 'manualSave',
      front: 'Test Front',
      backHtml: 'Test Back',
      settings: {
        deckName: 'Test Deck',
        modelName: 'Basic'
      },
      tabId: 1
    };

    const sendResponse = jest.fn();
    await handleMessage(message, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
}); 