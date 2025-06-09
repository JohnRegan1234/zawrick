/**
 * @fileoverview Cryptographic utilities for the browser extension
 */

import { getCrypto } from './chrome-helpers.js';

/**
 * Generates a unique identifier using the Web Crypto API or falls back to a UUID v4 implementation
 * @returns {string} A unique identifier
 * @throws {Error} If neither Web Crypto API nor Math.random is available
 */
export const uid = () => {
    const globalCrypto = getCrypto();
    
    // Try to use Web Crypto API first
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
        return globalCrypto.randomUUID();
    }
    
    // Fallback: RFC4122 version 4 compliant UUID
    if (typeof Math.random === 'function') {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    throw new Error('No suitable random number generator available');
};

/**
 * Generates a random string of specified length
 * @param {number} length - The length of the random string
 * @returns {string} A random string
 * @throws {Error} If neither Web Crypto API nor Math.random is available
 */
export const generateRandomString = (length) => {
    const globalCrypto = getCrypto();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Try to use Web Crypto API first
    if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
        const array = new Uint8Array(length);
        globalCrypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
        return result;
    }
    
    // Fallback to Math.random
    if (typeof Math.random === 'function') {
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }
    
    throw new Error('No suitable random number generator available');
}; 