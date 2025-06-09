/**
 * @fileoverview Storage management utilities
 */

// Log when storage module is loaded
console.log('[Storage] Loading storage module');

/**
 * Storage keys
 * @enum {string}
 */
export const StorageKey = {
    PROMPTS: 'prompts',
    HISTORY: 'history',
    SETTINGS: 'settings',
    PENDING_CARDS: 'pendingCards',
    PENDING_CLIPS: 'pendingClips',
    PENDING_PDF_CARDS: 'pendingPdfCards'
};

console.log('[Storage] Defined storage keys:', Object.values(StorageKey));

/**
 * Gets a value from storage
 * @param {string} key - Storage key
 * @returns {Promise<any>} Stored value
 */
export async function get(key) {
    console.log('[Storage] Getting value for key:', key);
    try {
        const result = await chrome.storage.local.get(key);
        const value = result[key];
        console.log('[Storage] Retrieved value:', value);
        return value;
    } catch (error) {
        console.error('[Storage] Failed to get value for key:', key, error);
        throw error;
    }
}

/**
 * Sets a value in storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {Promise<void>}
 */
export async function set(key, value) {
    console.log('[Storage] Setting value for key:', key, 'value:', value);
    try {
        await chrome.storage.local.set({ [key]: value });
        console.log('[Storage] Value set successfully');
    } catch (error) {
        console.error('[Storage] Failed to set value for key:', key, error);
        throw error;
    }
}

/**
 * Removes a value from storage
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function remove(key) {
    console.log('[Storage] Removing value for key:', key);
    try {
        await chrome.storage.local.remove(key);
        console.log('[Storage] Value removed successfully');
    } catch (error) {
        console.error('[Storage] Failed to remove value for key:', key, error);
        throw error;
    }
}

/**
 * Clears all storage
 * @returns {Promise<void>}
 */
export async function clear() {
    console.log('[Storage] Clearing all storage');
    try {
        await chrome.storage.local.clear();
        console.log('[Storage] Storage cleared successfully');
    } catch (error) {
        console.error('[Storage] Failed to clear storage:', error);
        throw error;
    }
}

/**
 * Gets all storage values
 * @returns {Promise<Object>} All stored values
 */
export async function getAll() {
    console.log('[Storage] Getting all storage values');
    try {
        const result = await chrome.storage.local.get(null);
        console.log('[Storage] Retrieved all values:', result);
        return result;
    } catch (error) {
        console.error('[Storage] Failed to get all values:', error);
        throw error;
    }
}

/**
 * Gets multiple values from storage
 * @param {string[]} keys - Storage keys
 * @returns {Promise<Object>} Stored values
 */
export async function getMultiple(keys) {
    console.log('[Storage] Getting multiple values for keys:', keys);
    try {
        const result = await chrome.storage.local.get(keys);
        console.log('[Storage] Retrieved multiple values:', result);
        return result;
    } catch (error) {
        console.error('[Storage] Failed to get multiple values:', error);
        throw error;
    }
}

/**
 * Sets multiple values in storage
 * @param {Object} values - Values to store
 * @returns {Promise<void>}
 */
export async function setMultiple(values) {
    console.log('[Storage] Setting multiple values:', values);
    try {
        await chrome.storage.local.set(values);
        console.log('[Storage] Multiple values set successfully');
    } catch (error) {
        console.error('[Storage] Failed to set multiple values:', error);
        throw error;
    }
}

/**
 * Removes multiple values from storage
 * @param {string[]} keys - Storage keys
 * @returns {Promise<void>}
 */
export async function removeMultiple(keys) {
    console.log('[Storage] Removing multiple values for keys:', keys);
    try {
        await chrome.storage.local.remove(keys);
        console.log('[Storage] Multiple values removed successfully');
    } catch (error) {
        console.error('[Storage] Failed to remove multiple values:', error);
        throw error;
    }
}

/**
 * Gets the number of bytes used by storage
 * @returns {Promise<number>} Bytes used
 */
export async function getBytesUsed() {
    console.log('[Storage] Getting bytes used');
    try {
        const bytes = await chrome.storage.local.getBytesInUse(null);
        console.log('[Storage] Bytes used:', bytes);
        return bytes;
    } catch (error) {
        console.error('[Storage] Failed to get bytes used:', error);
        throw error;
    }
}

/**
 * Gets the number of bytes used by specific keys
 * @param {string[]} keys - Storage keys
 * @returns {Promise<number>} Bytes used
 */
export async function getBytesUsedByKeys(keys) {
    console.log('[Storage] Getting bytes used by keys:', keys);
    try {
        const bytes = await chrome.storage.local.getBytesInUse(keys);
        console.log('[Storage] Bytes used by keys:', bytes);
        return bytes;
    } catch (error) {
        console.error('[Storage] Failed to get bytes used by keys:', error);
        throw error;
    }
}

/**
 * Gets the maximum number of bytes available in storage
 * @returns {Promise<number>} Maximum bytes available
 */
export async function getMaxBytes() {
    console.log('[Storage] Getting maximum bytes available');
    try {
        const maxBytes = await chrome.storage.local.getBytesInUse(null);
        console.log('[Storage] Maximum bytes available:', maxBytes);
        return maxBytes;
    } catch (error) {
        console.error('[Storage] Failed to get maximum bytes:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage
 * @returns {Promise<number>} Number of items
 */
export async function getItemCount() {
    console.log('[Storage] Getting item count');
    try {
        const items = await chrome.storage.local.get(null);
        const count = Object.keys(items).length;
        console.log('[Storage] Item count:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage for specific keys
 * @param {string[]} keys - Storage keys
 * @returns {Promise<number>} Number of items
 */
export async function getItemCountByKeys(keys) {
    console.log('[Storage] Getting item count for keys:', keys);
    try {
        const items = await chrome.storage.local.get(keys);
        const count = Object.keys(items).length;
        console.log('[Storage] Item count for keys:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count for keys:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage for a specific key
 * @param {string} key - Storage key
 * @returns {Promise<number>} Number of items
 */
export async function getItemCountByKey(key) {
    console.log('[Storage] Getting item count for key:', key);
    try {
        const items = await chrome.storage.local.get(key);
        const count = Object.keys(items).length;
        console.log('[Storage] Item count for key:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count for key:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage for a specific key prefix
 * @param {string} prefix - Key prefix
 * @returns {Promise<number>} Number of items
 */
export async function getItemCountByPrefix(prefix) {
    console.log('[Storage] Getting item count for prefix:', prefix);
    try {
        const items = await chrome.storage.local.get(null);
        const count = Object.keys(items).filter(key => key.startsWith(prefix)).length;
        console.log('[Storage] Item count for prefix:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count for prefix:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage for a specific key suffix
 * @param {string} suffix - Key suffix
 * @returns {Promise<number>} Number of items
 */
export async function getItemCountBySuffix(suffix) {
    console.log('[Storage] Getting item count for suffix:', suffix);
    try {
        const items = await chrome.storage.local.get(null);
        const count = Object.keys(items).filter(key => key.endsWith(suffix)).length;
        console.log('[Storage] Item count for suffix:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count for suffix:', error);
        throw error;
    }
}

/**
 * Gets the number of items in storage for a specific key pattern
 * @param {RegExp} pattern - Key pattern
 * @returns {Promise<number>} Number of items
 */
export async function getItemCountByPattern(pattern) {
    console.log('[Storage] Getting item count for pattern:', pattern);
    try {
        const items = await chrome.storage.local.get(null);
        const count = Object.keys(items).filter(key => pattern.test(key)).length;
        console.log('[Storage] Item count for pattern:', count);
        return count;
    } catch (error) {
        console.error('[Storage] Failed to get item count for pattern:', error);
        throw error;
    }
}

// Log when storage module is fully loaded
console.log('[Storage] Storage module loaded successfully'); 