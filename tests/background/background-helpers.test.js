// background-helpers.test.js

jest.mock('../../ankiProvider.js', () => ({ addToAnki: jest.fn(() => Promise.resolve()) }));
jest.mock('../../chatgptProvider.js', () => ({ generateFrontWithRetry: jest.fn(() => Promise.resolve('Front')), generateClozeWithRetry: jest.fn(() => Promise.resolve('Cloze')) }));

describe('Background Script Helper Functions', () => {
  let background;
  beforeEach(() => {
    global.chrome = {
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
    background = require('../../background.js');
  });

  test('getSyncScheduled should return current sync state', () => {
    global.syncScheduled = true;
    expect(background.getSyncScheduled()).toBe(true);
    global.syncScheduled = false;
    expect(background.getSyncScheduled()).toBe(false);
  });

  test('setSyncScheduled should update sync state', () => {
    background.setSyncScheduled(true);
    expect(global.syncScheduled).toBe(true);
    background.setSyncScheduled(false);
    expect(global.syncScheduled).toBe(false);
  });

  test('getCachedPendingClips should return cached clips', () => {
    const testClips = [{ id: 1, front: 'test' }];
    global.cachedPendingClips = testClips;
    expect(background.getCachedPendingClips()).toEqual(testClips);
  });

  test('setCachedPendingClips should update cached clips', () => {
    const testClips = [{ id: 1, front: 'test' }];
    background.setCachedPendingClips(testClips);
    expect(global.cachedPendingClips).toEqual(testClips);
  });
}); 