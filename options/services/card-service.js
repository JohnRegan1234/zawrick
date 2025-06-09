/**
 * @fileoverview Card-related data operations for the browser extension
 */

import { loadPendingClips, savePendingClips, loadPendingPdfCards, savePendingPdfCards } from '../core/storage.js';

/**
 * @typedef {Object} CardOperationResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {Object} [data] - Operation result data
 */

/**
 * Queues a new clip for review
 * @param {Object} clip - The clip to queue
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<CardOperationResult>} Operation result
 */
export const queueClip = async (clip, chromeInjected) => {
    try {
        const pendingClips = await loadPendingClips(chromeInjected);
        pendingClips.push(clip);
        await savePendingClips(pendingClips, chromeInjected);
        
        return {
            success: true,
            data: {
                pendingClips,
                newClip: clip
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to queue clip: ${error.message}`
        };
    }
};

/**
 * Updates pending cards count and returns current state
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<CardOperationResult>} Operation result with current counts
 */
export const updatePendingCards = async (chromeInjected) => {
    try {
        const [pendingClips, pendingReviewPdfCards] = await Promise.all([
            loadPendingClips(chromeInjected),
            loadPendingPdfCards(chromeInjected)
        ]);

        return {
            success: true,
            data: {
                pendingClipsCount: pendingClips.length,
                pendingReviewPdfCardsCount: pendingReviewPdfCards.length,
                pendingClips,
                pendingReviewPdfCards
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to update pending cards: ${error.message}`
        };
    }
};

/**
 * Removes a card from pending review
 * @param {string} cardId - ID of the card to remove
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<CardOperationResult>} Operation result
 */
export const removePendingCard = async (cardId, chromeInjected) => {
    try {
        const pendingReviewPdfCards = await loadPendingPdfCards(chromeInjected);
        const cardData = pendingReviewPdfCards.find(c => c.id === cardId);
        
        if (!cardData) {
            return {
                success: false,
                error: `Card with ID ${cardId} not found`
            };
        }

        const remainingCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
        await savePendingPdfCards(remainingCards, chromeInjected);

        return {
            success: true,
            data: {
                removedCard: cardData,
                remainingCards
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to remove pending card: ${error.message}`
        };
    }
};

/**
 * Clears all pending cards
 * @param {Object} [chromeInjected] - Injected Chrome API for testing
 * @returns {Promise<CardOperationResult>} Operation result
 */
export const clearPendingCards = async (chromeInjected) => {
    try {
        await Promise.all([
            savePendingClips([], chromeInjected),
            savePendingPdfCards([], chromeInjected)
        ]);

        return {
            success: true,
            data: {
                pendingClips: [],
                pendingReviewPdfCards: []
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to clear pending cards: ${error.message}`
        };
    }
}; 