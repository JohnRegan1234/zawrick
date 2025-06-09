/**
 * @fileoverview Encryption and decryption utilities
 */

// Log when crypto module is loaded
console.log('[Crypto] Loading encryption module');

/**
 * Encrypts data using AES-GCM
 * @param {string} data - Data to encrypt
 * @param {string} key - Encryption key
 * @returns {Promise<string>} Encrypted data
 */
export async function encrypt(data, key) {
    console.log('[Crypto] Starting encryption');
    try {
        // Convert key to CryptoKey
        const cryptoKey = await importKey(key);
        console.log('[Crypto] Key imported successfully');

        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        console.log('[Crypto] Generated IV:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''));

        // Encrypt data
        const encodedData = new TextEncoder().encode(data);
        console.log('[Crypto] Data encoded, length:', encodedData.length);

        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encodedData
        );
        console.log('[Crypto] Data encrypted successfully');

        // Combine IV and encrypted data
        const result = new Uint8Array(iv.length + encryptedData.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encryptedData), iv.length);
        console.log('[Crypto] IV and encrypted data combined');

        // Convert to base64
        const base64 = btoa(String.fromCharCode(...result));
        console.log('[Crypto] Data converted to base64, length:', base64.length);

        return base64;
    } catch (error) {
        console.error('[Crypto] Encryption failed:', error);
        throw error;
    }
}

/**
 * Decrypts data using AES-GCM
 * @param {string} encryptedData - Data to decrypt
 * @param {string} key - Decryption key
 * @returns {Promise<string>} Decrypted data
 */
export async function decrypt(encryptedData, key) {
    console.log('[Crypto] Starting decryption');
    try {
        // Convert key to CryptoKey
        const cryptoKey = await importKey(key);
        console.log('[Crypto] Key imported successfully');

        // Convert from base64
        const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        console.log('[Crypto] Data converted from base64, length:', data.length);

        // Extract IV and encrypted data
        const iv = data.slice(0, 12);
        const encrypted = data.slice(12);
        console.log('[Crypto] IV extracted:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''));

        // Decrypt data
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encrypted
        );
        console.log('[Crypto] Data decrypted successfully');

        // Convert to string
        const result = new TextDecoder().decode(decryptedData);
        console.log('[Crypto] Data decoded to string, length:', result.length);

        return result;
    } catch (error) {
        console.error('[Crypto] Decryption failed:', error);
        throw error;
    }
}

/**
 * Imports a key for encryption/decryption
 * @param {string} key - Key to import
 * @returns {Promise<CryptoKey>} Imported key
 */
async function importKey(key) {
    console.log('[Crypto] Starting key import');
    try {
        // Convert key to bytes
        const keyData = new TextEncoder().encode(key);
        console.log('[Crypto] Key converted to bytes, length:', keyData.length);

        // Import key
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
        console.log('[Crypto] Key imported successfully');

        return cryptoKey;
    } catch (error) {
        console.error('[Crypto] Key import failed:', error);
        throw error;
    }
}

/**
 * Generates a random encryption key
 * @returns {Promise<string>} Generated key
 */
export async function generateKey() {
    console.log('[Crypto] Starting key generation');
    try {
        // Generate random bytes
        const key = crypto.getRandomValues(new Uint8Array(32));
        console.log('[Crypto] Random bytes generated, length:', key.length);

        // Convert to base64
        const base64 = btoa(String.fromCharCode(...key));
        console.log('[Crypto] Key converted to base64, length:', base64.length);

        return base64;
    } catch (error) {
        console.error('[Crypto] Key generation failed:', error);
        throw error;
    }
}

// Log when crypto module is fully loaded
console.log('[Crypto] Encryption module loaded successfully'); 