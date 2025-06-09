/**
 * @fileoverview Card service for managing Anki cards
 */

// Log when card service is loaded
console.log('[CardService] Loading card service');

import { get, set } from '../storage.js';
import { addNote, updateNote, deleteNote, getNote } from './anki-service.js';
import { DEFAULT_DECK, DEFAULT_MODEL, MAX_CARD_FRONT_LENGTH, MAX_CARD_BACK_LENGTH, MAX_CARD_TAGS_LENGTH } from '../constants.js';

/**
 * Error types for card operations
 * @enum {string}
 */
const CardErrorType = {
    VALIDATION: 'VALIDATION_ERROR',
    STORAGE: 'STORAGE_ERROR',
    ANKI: 'ANKI_ERROR',
    SYNC: 'SYNC_ERROR',
    NETWORK: 'NETWORK_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Validates a card's data
 * @param {Object} card - Card to validate
 * @returns {Object} Validation result
 */
function validateCard(card) {
    console.log('[CardService] Validating card data:', card);
    const errors = [];

    if (!card.front) {
        errors.push('Front field is required');
    } else if (card.front.length > MAX_CARD_FRONT_LENGTH) {
        errors.push(`Front field exceeds maximum length of ${MAX_CARD_FRONT_LENGTH} characters`);
    }

    if (!card.back) {
        errors.push('Back field is required');
    } else if (card.back.length > MAX_CARD_BACK_LENGTH) {
        errors.push(`Back field exceeds maximum length of ${MAX_CARD_BACK_LENGTH} characters`);
    }

    if (card.tags && card.tags.join('').length > MAX_CARD_TAGS_LENGTH) {
        errors.push(`Tags exceed maximum length of ${MAX_CARD_TAGS_LENGTH} characters`);
    }

    const isValid = errors.length === 0;
    console.log('[CardService] Card validation result:', { isValid, errors });
    return { isValid, errors };
}

/**
 * Gets the list of pending cards
 * @returns {Promise<Object[]>} List of pending cards
 */
export async function getPendingCards() {
    console.log('[CardService] Getting pending cards');
    const startTime = performance.now();
    try {
        const cards = await get('pendingCards') || [];
        const endTime = performance.now();
        console.log('[CardService] Retrieved pending cards:', {
            count: cards.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return cards;
    } catch (error) {
        const endTime = performance.now();
        console.error('[CardService] Failed to get pending cards:', {
            error: error.message,
            type: CardErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Adds a card to the pending list
 * @param {Object} card - Card to add
 * @returns {Promise<void>}
 */
export async function addPendingCard(card) {
    console.log('[CardService] Adding pending card:', card);
    const startTime = performance.now();
    try {
        // Validate card data
        const validation = validateCard(card);
        if (!validation.isValid) {
            throw new Error(`Card validation failed: ${validation.errors.join(', ')}`);
        }

        const cards = await getPendingCards();
        cards.push(card);
        await set('pendingCards', cards);
        const endTime = performance.now();
        console.log('[CardService] Pending card added successfully:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[CardService] Failed to add pending card:', {
            error: error.message,
            type: error.message.includes('validation') ? CardErrorType.VALIDATION : CardErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Removes a card from the pending list
 * @param {number} index - Index of the card to remove
 * @returns {Promise<void>}
 */
export async function removePendingCard(index) {
    console.log('[CardService] Removing pending card at index:', index);
    const startTime = performance.now();
    try {
        const cards = await getPendingCards();
        if (index < 0 || index >= cards.length) {
            throw new Error(`Invalid card index: ${index}`);
        }
        cards.splice(index, 1);
        await set('pendingCards', cards);
        const endTime = performance.now();
        console.log('[CardService] Pending card removed successfully:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[CardService] Failed to remove pending card:', {
            error: error.message,
            type: CardErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Clears the pending cards list
 * @returns {Promise<void>}
 */
export async function clearPendingCards() {
    console.log('[CardService] Clearing pending cards');
    const startTime = performance.now();
    try {
        await set('pendingCards', []);
        const endTime = performance.now();
        console.log('[CardService] Pending cards cleared successfully:', {
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[CardService] Failed to clear pending cards:', {
            error: error.message,
            type: CardErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Syncs pending cards with Anki
 * @returns {Promise<void>}
 */
export async function syncPendingCards() {
    console.log('[CardService] Starting pending cards sync');
    const startTime = performance.now();
    try {
        const cards = await getPendingCards();
        console.log('[CardService] Found pending cards:', cards.length);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const cardStartTime = performance.now();
            console.log('[CardService] Processing card:', i + 1, 'of', cards.length);

            try {
                // Validate card data
                const validation = validateCard(card);
                if (!validation.isValid) {
                    throw new Error(`Card validation failed: ${validation.errors.join(', ')}`);
                }

                const note = {
                    deckName: card.deckName || DEFAULT_DECK,
                    modelName: card.modelName || DEFAULT_MODEL,
                    fields: {
                        Front: card.front,
                        Back: card.back
                    },
                    tags: card.tags || []
                };

                console.log('[CardService] Adding note to Anki:', note);
                await addNote(note);
                console.log('[CardService] Note added successfully');

                await removePendingCard(i);
                console.log('[CardService] Card removed from pending list');
                i--; // Adjust index since we removed an item
                successCount++;

                const cardEndTime = performance.now();
                console.log('[CardService] Card processed successfully:', {
                    duration: `${(cardEndTime - cardStartTime).toFixed(2)}ms`
                });
            } catch (error) {
                errorCount++;
                const cardEndTime = performance.now();
                const errorType = error.message.includes('validation') 
                    ? CardErrorType.VALIDATION 
                    : error.message.includes('network') 
                        ? CardErrorType.NETWORK 
                        : CardErrorType.ANKI;

                errors.push({
                    cardIndex: i,
                    error: error.message,
                    type: errorType,
                    duration: `${(cardEndTime - cardStartTime).toFixed(2)}ms`
                });

                console.error('[CardService] Failed to process card:', {
                    cardIndex: i,
                    error: error.message,
                    type: errorType,
                    duration: `${(cardEndTime - cardStartTime).toFixed(2)}ms`
                });
                // Continue with next card
            }
        }

        const endTime = performance.now();
        console.log('[CardService] Pending cards sync completed:', {
            totalCards: cards.length,
            successCount,
            errorCount,
            errors,
            totalDuration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[CardService] Failed to sync pending cards:', {
            error: error.message,
            type: CardErrorType.SYNC,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets the list of pending clips
 * @returns {Promise<Object[]>} List of pending clips
 */
export async function getPendingClips() {
    console.log('[CardService] Getting pending clips');
    try {
        const clips = await get('pendingClips') || [];
        console.log('[CardService] Retrieved pending clips:', clips.length);
        return clips;
    } catch (error) {
        console.error('[CardService] Failed to get pending clips:', error);
        throw error;
    }
}

/**
 * Adds a clip to the pending list
 * @param {Object} clip - Clip to add
 * @returns {Promise<void>}
 */
export async function addPendingClip(clip) {
    console.log('[CardService] Adding pending clip:', clip);
    try {
        const clips = await getPendingClips();
        clips.push(clip);
        await set('pendingClips', clips);
        console.log('[CardService] Pending clip added successfully');
    } catch (error) {
        console.error('[CardService] Failed to add pending clip:', error);
        throw error;
    }
}

/**
 * Removes a clip from the pending list
 * @param {number} index - Index of the clip to remove
 * @returns {Promise<void>}
 */
export async function removePendingClip(index) {
    console.log('[CardService] Removing pending clip at index:', index);
    try {
        const clips = await getPendingClips();
        clips.splice(index, 1);
        await set('pendingClips', clips);
        console.log('[CardService] Pending clip removed successfully');
    } catch (error) {
        console.error('[CardService] Failed to remove pending clip:', error);
        throw error;
    }
}

/**
 * Clears the pending clips list
 * @returns {Promise<void>}
 */
export async function clearPendingClips() {
    console.log('[CardService] Clearing pending clips');
    try {
        await set('pendingClips', []);
        console.log('[CardService] Pending clips cleared successfully');
    } catch (error) {
        console.error('[CardService] Failed to clear pending clips:', error);
        throw error;
    }
}

/**
 * Gets the list of pending PDF cards
 * @returns {Promise<Object[]>} List of pending PDF cards
 */
export async function getPendingPdfCards() {
    console.log('[CardService] Getting pending PDF cards');
    try {
        const cards = await get('pendingPdfCards') || [];
        console.log('[CardService] Retrieved pending PDF cards:', cards.length);
        return cards;
    } catch (error) {
        console.error('[CardService] Failed to get pending PDF cards:', error);
        throw error;
    }
}

/**
 * Adds a PDF card to the pending list
 * @param {Object} card - PDF card to add
 * @returns {Promise<void>}
 */
export async function addPendingPdfCard(card) {
    console.log('[CardService] Adding pending PDF card:', card);
    try {
        const cards = await getPendingPdfCards();
        cards.push(card);
        await set('pendingPdfCards', cards);
        console.log('[CardService] Pending PDF card added successfully');
    } catch (error) {
        console.error('[CardService] Failed to add pending PDF card:', error);
        throw error;
    }
}

/**
 * Removes a PDF card from the pending list
 * @param {number} index - Index of the PDF card to remove
 * @returns {Promise<void>}
 */
export async function removePendingPdfCard(index) {
    console.log('[CardService] Removing pending PDF card at index:', index);
    try {
        const cards = await getPendingPdfCards();
        cards.splice(index, 1);
        await set('pendingPdfCards', cards);
        console.log('[CardService] Pending PDF card removed successfully');
    } catch (error) {
        console.error('[CardService] Failed to remove pending PDF card:', error);
        throw error;
    }
}

/**
 * Clears the pending PDF cards list
 * @returns {Promise<void>}
 */
export async function clearPendingPdfCards() {
    console.log('[CardService] Clearing pending PDF cards');
    try {
        await set('pendingPdfCards', []);
        console.log('[CardService] Pending PDF cards cleared successfully');
    } catch (error) {
        console.error('[CardService] Failed to clear pending PDF cards:', error);
        throw error;
    }
}

// Log when card service is fully loaded
console.log('[CardService] Card service loaded successfully'); 