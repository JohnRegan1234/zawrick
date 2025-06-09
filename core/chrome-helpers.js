/**
 * @fileoverview Chrome API helper functions
 */

/**
 * Get the current tab
 * @returns {Promise<chrome.tabs.Tab>} Current tab
 */
export async function getCurrentTab() {
    console.log('[ChromeHelpers] Getting current tab');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[ChromeHelpers] Current tab:', {
            id: tab.id,
            url: tab.url,
            title: tab.title
        });
        return tab;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current tab:', error);
        throw error;
    }
}

/**
 * Get the current window
 * @returns {Promise<chrome.windows.Window>} Current window
 */
export async function getCurrentWindow() {
    console.log('[ChromeHelpers] Getting current window');
    try {
        const window = await chrome.windows.getCurrent();
        console.log('[ChromeHelpers] Current window:', {
            id: window.id,
            type: window.type,
            state: window.state
        });
        return window;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window:', error);
        throw error;
    }
}

/**
 * Get the current window's tabs
 * @returns {Promise<chrome.tabs.Tab[]>} Current window's tabs
 */
export async function getCurrentWindowTabs() {
    console.log('[ChromeHelpers] Getting current window tabs');
    try {
        const window = await getCurrentWindow();
        const tabs = await chrome.tabs.query({ windowId: window.id });
        console.log('[ChromeHelpers] Current window tabs:', {
            windowId: window.id,
            tabCount: tabs.length,
            tabIds: tabs.map(tab => tab.id)
        });
        return tabs;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window tabs:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab
 * @returns {Promise<chrome.tabs.Tab>} Current window's active tab
 */
export async function getCurrentWindowActiveTab() {
    console.log('[ChromeHelpers] Getting current window active tab');
    try {
        const window = await getCurrentWindow();
        const [tab] = await chrome.tabs.query({ windowId: window.id, active: true });
        console.log('[ChromeHelpers] Current window active tab:', {
            windowId: window.id,
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        });
        return tab;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's URL
 * @returns {Promise<string>} Current window's active tab's URL
 */
export async function getCurrentWindowActiveTabUrl() {
    console.log('[ChromeHelpers] Getting current window active tab URL');
    try {
        const tab = await getCurrentWindowActiveTab();
        console.log('[ChromeHelpers] Current window active tab URL:', tab.url);
        return tab.url;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab URL:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's title
 * @returns {Promise<string>} Current window's active tab's title
 */
export async function getCurrentWindowActiveTabTitle() {
    console.log('[ChromeHelpers] Getting current window active tab title');
    try {
        const tab = await getCurrentWindowActiveTab();
        console.log('[ChromeHelpers] Current window active tab title:', tab.title);
        return tab.title;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab title:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's favicon
 * @returns {Promise<string>} Current window's active tab's favicon
 */
export async function getCurrentWindowActiveTabFavicon() {
    console.log('[ChromeHelpers] Getting current window active tab favicon');
    try {
        const tab = await getCurrentWindowActiveTab();
        console.log('[ChromeHelpers] Current window active tab favicon:', tab.favIconUrl);
        return tab.favIconUrl;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab favicon:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text
 * @returns {Promise<string>} Current window's active tab's selected text
 */
export async function getCurrentWindowActiveTabSelectedText() {
    console.log('[ChromeHelpers] Getting current window active tab selected text');
    try {
        const tab = await getCurrentWindowActiveTab();
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
        });
        console.log('[ChromeHelpers] Current window active tab selected text:', {
            tabId: tab.id,
            textLength: result.length,
            textPreview: result.substring(0, 50) + (result.length > 50 ? '...' : '')
        });
        return result;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range
 * @returns {Promise<Range>} Current window's active tab's selected text's range
 */
export async function getCurrentWindowActiveTabSelectedTextRange() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range');
    try {
        const tab = await getCurrentWindowActiveTab();
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const selection = window.getSelection();
                if (!selection.rangeCount) return null;
                const range = selection.getRangeAt(0);
                return {
                    startContainer: range.startContainer.textContent,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer.textContent,
                    endOffset: range.endOffset
                };
            }
        });
        console.log('[ChromeHelpers] Current window active tab selected text range:', {
            tabId: tab.id,
            range: result
        });
        return result;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text
 * @returns {Promise<string>} Current window's active tab's selected text's range's text
 */
export async function getCurrentWindowActiveTabSelectedTextRangeText() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text');
    try {
        const tab = await getCurrentWindowActiveTab();
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const selection = window.getSelection();
                if (!selection.rangeCount) return '';
                const range = selection.getRangeAt(0);
                return range.toString();
            }
        });
        console.log('[ChromeHelpers] Current window active tab selected text range text:', {
            tabId: tab.id,
            textLength: result.length,
            textPreview: result.substring(0, 50) + (result.length > 50 ? '...' : '')
        });
        return result;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's length
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's length
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextLength() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text length');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        console.log('[ChromeHelpers] Current window active tab selected text range text length:', text.length);
        return text.length;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text length:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's word count
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's word count
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextWordCount() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text word count');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        const wordCount = text.trim().split(/\s+/).length;
        console.log('[ChromeHelpers] Current window active tab selected text range text word count:', wordCount);
        return wordCount;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text word count:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's character count
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's character count
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextCharacterCount() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text character count');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        console.log('[ChromeHelpers] Current window active tab selected text range text character count:', text.length);
        return text.length;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text character count:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's line count
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's line count
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextLineCount() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text line count');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        const lineCount = text.split('\n').length;
        console.log('[ChromeHelpers] Current window active tab selected text range text line count:', lineCount);
        return lineCount;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text line count:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's paragraph count
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's paragraph count
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextParagraphCount() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text paragraph count');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        const paragraphCount = text.split(/\n\s*\n/).length;
        console.log('[ChromeHelpers] Current window active tab selected text range text paragraph count:', paragraphCount);
        return paragraphCount;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text paragraph count:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's sentence count
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's sentence count
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextSentenceCount() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text sentence count');
    try {
        const text = await getCurrentWindowActiveTabSelectedTextRangeText();
        const sentenceCount = text.split(/[.!?]+/).length;
        console.log('[ChromeHelpers] Current window active tab selected text range text sentence count:', sentenceCount);
        return sentenceCount;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text sentence count:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's reading time
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's reading time in minutes
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextReadingTime() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text reading time');
    try {
        const wordCount = await getCurrentWindowActiveTabSelectedTextRangeTextWordCount();
        const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute
        console.log('[ChromeHelpers] Current window active tab selected text range text reading time:', readingTime);
        return readingTime;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text reading time:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's reading time in seconds
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's reading time in seconds
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextReadingTimeInSeconds() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text reading time in seconds');
    try {
        const wordCount = await getCurrentWindowActiveTabSelectedTextRangeTextWordCount();
        const readingTimeInSeconds = Math.ceil((wordCount / 200) * 60); // Assuming 200 words per minute
        console.log('[ChromeHelpers] Current window active tab selected text range text reading time in seconds:', readingTimeInSeconds);
        return readingTimeInSeconds;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text reading time in seconds:', error);
        throw error;
    }
}

/**
 * Get the current window's active tab's selected text's range's text's reading time in milliseconds
 * @returns {Promise<number>} Current window's active tab's selected text's range's text's reading time in milliseconds
 */
export async function getCurrentWindowActiveTabSelectedTextRangeTextReadingTimeInMilliseconds() {
    console.log('[ChromeHelpers] Getting current window active tab selected text range text reading time in milliseconds');
    try {
        const wordCount = await getCurrentWindowActiveTabSelectedTextRangeTextWordCount();
        const readingTimeInMilliseconds = Math.ceil((wordCount / 200) * 60 * 1000); // Assuming 200 words per minute
        console.log('[ChromeHelpers] Current window active tab selected text range text reading time in milliseconds:', readingTimeInMilliseconds);
        return readingTimeInMilliseconds;
    } catch (error) {
        console.error('[ChromeHelpers] Failed to get current window active tab selected text range text reading time in milliseconds:', error);
        throw error;
    }
} 