// Core utility functions for the options page

/**
 * Generate a unique ID (UUID v4)
 * @returns {string} A UUID v4 string
 */
export function uid() {
    // Check for crypto API availability
    const crypto = typeof global !== 'undefined' && global.crypto ? global.crypto : 
                   (typeof window !== 'undefined' && window.crypto ? window.crypto : undefined);
    
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    } else if (crypto && crypto.getRandomValues) {
        // Fallback implementation using crypto.getRandomValues
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    } else {
        // Fallback to Math.random (less secure but works in test environments)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

/**
 * Generate a unique prompt label by appending a counter if needed
 * @param {string} baseLabel - The desired label
 * @param {Array} existingPrompts - Array of existing prompts with label property
 * @param {string|null} excludeId - ID to exclude from uniqueness check (for editing)
 * @returns {string} Unique label
 */
export function getUniquePromptLabel(baseLabel, existingPrompts, excludeId = null) {
    let label = baseLabel.trim();
    if (!label) label = 'Untitled';
    
    const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
    let counter = 1;
    let testLabel = label;
    
    while (existing.includes(testLabel)) {
        testLabel = `${label} (${counter})`;
        counter++;
    }
    
    return testLabel;
}
