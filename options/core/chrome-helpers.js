/**
 * @fileoverview Chrome API helper functions for the browser extension
 */

/**
 * Gets the Chrome API object, handling different environments (browser, Node.js, etc.)
 * @param {Object} [injected] - Injected Chrome API object for testing
 * @returns {Object|undefined} The Chrome API object or undefined if not available
 */
export const getChrome = (injected) => {
    if (injected) return injected;
    
    if (typeof global !== 'undefined' && global.chrome) {
        return global.chrome;
    }
    
    if (typeof window !== 'undefined' && window.chrome) {
        return window.chrome;
    }
    
    return undefined;
};

/**
 * Gets the fetch API function, handling different environments
 * @param {Function} [injected] - Injected fetch function for testing
 * @returns {Function|undefined} The fetch function or undefined if not available
 */
export const getFetch = (injected) => {
    if (injected) return injected;
    
    if (typeof global !== 'undefined' && global.fetch) {
        return global.fetch;
    }
    
    if (typeof window !== 'undefined' && window.fetch) {
        return window.fetch;
    }
    
    return undefined;
};

/**
 * Gets the crypto API object, handling different environments
 * @param {Object} [injected] - Injected crypto object for testing
 * @returns {Object|undefined} The crypto object or undefined if not available
 */
export const getCrypto = (injected) => {
    if (injected) return injected;
    
    if (typeof global !== 'undefined' && global.crypto) {
        return global.crypto;
    }
    
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto;
    }
    
    return undefined;
}; 