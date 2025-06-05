jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Badge, Queue, and Sync Functions', () => {
  let background;
  let mockChrome;
  beforeEach(() => {
    mockChrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        getPlatformInfo: jest.fn(cb => cb({ os: 'mac' })),
      },
      storage: { local: { get: jest.fn(), set: jest.fn() } },
      tabs: { sendMessage: jest.fn() },
      scripting: { executeScript: jest.fn() },
      contextMenus: { create: jest.fn(), onClicked: { addListener: jest.fn() } },
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setBadgeTextColor: jest.fn(), setTitle: jest.fn() },
      alarms: { create: jest.fn(), onAlarm: { addListener: jest.fn() } },
      notifications: { create: jest.fn() }
    };
    global.chrome = mockChrome;
    background = require('../../background.js');
  });

  describe('updateBadge function', () => {
    test('should update badge with pending count', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [{ id: 1 }, { id: 2 }, { id: 3 }] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });
      await background.updateBadge();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });
    test('should clear badge when no pending clips', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });
      await background.updateBadge();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
    test('should handle storage error gracefully', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        global.chrome.runtime.lastError = { message: 'Storage error' };
        if (callback) callback({});
        return Promise.resolve({});
      });
      await expect(background.updateBadge()).resolves.toBeUndefined();
      delete global.chrome.runtime.lastError;
    });
  });

  describe('queueClip function', () => {
    test('should add clip to queue and update badge', async () => {
      const clip = { front: 'Test', back: 'Answer' };
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });
      await background.queueClip(clip);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [clip]
      });
    });
    test('should append to existing clips', async () => {
      const existingClip = { front: 'Existing', back: 'Answer' };
      const newClip = { front: 'New', back: 'Answer' };
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { pendingClips: [existingClip] };
        if (callback) callback(result);
        return Promise.resolve(result);
      });
      await background.queueClip(newClip);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        pendingClips: [existingClip, newClip]
      });
    });
  });

  describe('scheduleSync function', () => {
    test('should schedule sync alarm when not already scheduled', () => {
      global.syncScheduled = false;
      background.scheduleSync();
      expect(mockChrome.alarms.create).toHaveBeenCalledWith('SYNC_PENDING', { delayInMinutes: 0.1 });
      expect(global.syncScheduled).toBe(true);
    });
    test('should not schedule sync when already scheduled', () => {
      global.syncScheduled = true;
      background.scheduleSync();
      expect(mockChrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('flushQueue function', () => {
    test('should process and clear pending clips', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' },
        { front: 'Q2', back: 'A2', deckName: 'Default', modelName: 'Basic' }
      ];
      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 12345, error: null })
      });
      await background.flushQueue();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });
    test('should handle AnkiConnect errors', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' }
      ];
      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: null, error: 'Deck not found' })
      });
      await background.flushQueue();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });
    test('should handle network errors', async () => {
      const pendingClips = [
        { front: 'Q1', back: 'A1', deckName: 'Default', modelName: 'Basic' }
      ];
      mockChrome.storage.local.get.mockResolvedValue({ pendingClips });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      await background.flushQueue();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ pendingClips: [] });
    });
  });
}); 