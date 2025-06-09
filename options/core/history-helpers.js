/**
 * History-related helper functions for the options page
 * Handles prompt history and PDF review card management
 */

// Import required dependencies
import { loadPromptHistory, loadPendingPdfCards, savePendingPdfCards } from './storage.js';

/**
 * Refreshes and displays the prompt history list
 * Fetches history from storage and renders it in the DOM
 */
export async function refreshPromptHistory() {
    const historyList = document.getElementById('history-list');
    const historyCount = document.getElementById('history-count');
    
    if (!historyList) return;

    try {
        const promptHistory = await loadPromptHistory();
        
        if (historyCount) {
            historyCount.textContent = `${promptHistory.length} entries`;
        }

        // Only clear and rebuild if the list is empty or we're doing a full refresh
        if (historyList.children.length === 0 || promptHistory.length === 0) {
            historyList.innerHTML = '';
        }

        if (promptHistory.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No prompt history found.</div>';
            return;
        }

        // Create a map of existing entries for efficient lookup
        const existingEntries = new Map();
        Array.from(historyList.children).forEach(child => {
            if (child.dataset.entryId) {
                existingEntries.set(child.dataset.entryId, child);
            }
        });

        // Show most recent first
        promptHistory.slice().reverse().slice(0, 20).forEach(entry => {
            const existingEntry = existingEntries.get(entry.id);
            if (existingEntry) {
                // Entry already exists, just update its content if needed
                existingEntries.delete(entry.id);
                return;
            }

            const item = document.createElement('div');
            item.className = 'review-card';
            item.dataset.entryId = entry.id;
            
            const date = new Date(entry.timestamp).toLocaleString();
            const sourceText = entry.sourceText || 'N/A';
            const generatedContent = entry.generatedFront || entry.generatedClozeText || 'N/A';
            const pageTitle = entry.pageTitle || 'Unknown Page';
            const pageUrl = entry.pageUrl || '';
            
            // Format the source information
            const sourceHtml = pageUrl 
                ? `<div class="source-info" style="margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                    <strong>Source:</strong> <a href="${pageUrl}" target="_blank" rel="noopener noreferrer">${pageTitle}</a>
                   </div>`
                : `<div class="source-info" style="margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                    <strong>Source:</strong> ${pageTitle}
                   </div>`;
            
            item.innerHTML = `
                <div class="review-card-header" style="background-color: var(--border-light); border-bottom: 1px solid var(--border); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                    <span>From: <strong>${entry.promptLabel || 'Unknown Prompt'}</strong></span>
                    <span>${date}</span>
                </div>
                <div class="review-card-body" style="padding: 16px;">
                    <div class="form-group">
                        <label class="form-label">Source Text</label>
                        <textarea class="form-textarea" rows="4" readonly style="resize: vertical; min-height: 80px;">${sourceText}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Generated Content</label>
                        <textarea class="form-textarea" rows="4" readonly style="resize: vertical; min-height: 80px;">${generatedContent}</textarea>
                    </div>
                    ${sourceHtml}
                </div>
            `;
            historyList.appendChild(item);
        });

        // Remove entries that are no longer in the history
        existingEntries.forEach(entryElement => {
            entryElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            entryElement.style.opacity = '0';
            entryElement.style.transform = 'translateX(-20px)';
            setTimeout(() => entryElement.remove(), 300);
        });

    } catch (error) {
        console.error('Error loading prompt history:', error);
        historyList.innerHTML = '<div class="review-error">Error loading history.</div>';
    }
}

/**
 * Renders the PDF review cards list
 * Fetches pending PDF cards from storage and creates editable cards
 */
export async function renderPdfReviewList() {
    const reviewList = document.getElementById('pdf-review-list');
    const reviewCount = document.getElementById('pdf-review-count');
    
    if (!reviewList) return;

    try {
        const pendingReviewPdfCards = await loadPendingPdfCards();
        
        if (reviewCount) {
            reviewCount.textContent = `${pendingReviewPdfCards.length} cards for review`;
        }

        // Only clear and rebuild if the list is empty or we're doing a full refresh
        if (reviewList.children.length === 0 || pendingReviewPdfCards.length === 0) {
            reviewList.innerHTML = '';
        }

        if (pendingReviewPdfCards.length === 0) {
            reviewList.innerHTML = '<div class="review-empty">No PDF cards are currently awaiting review.</div>';
            return;
        }

        // Fetch available decks and models for dropdowns
        const [deckNames, modelNames] = await Promise.all([
            fetchDeckNames(),
            fetchModelNames()
        ]);

        // Create a map of existing cards for efficient lookup
        const existingCards = new Map();
        Array.from(reviewList.children).forEach(child => {
            if (child.dataset.cardId) {
                existingCards.set(child.dataset.cardId, child);
            }
        });

        // Add new cards and update existing ones
        pendingReviewPdfCards.forEach(card => {
            const existingCard = existingCards.get(card.id);
            if (existingCard) {
                // Card already exists, just update its content if needed
                existingCards.delete(card.id);
                return;
            }

            // Create new card element
            const cardElement = document.createElement('div');
            cardElement.className = 'review-card';
            cardElement.dataset.cardId = card.id;
            
            // Generate deck and model options with current selections
            const deckOptions = deckNames.map(d => 
                `<option value="${d}" ${d === card.originalDeckName ? 'selected' : ''}>${d}</option>`
            ).join('');
            const modelOptions = modelNames.map(m => 
                `<option value="${m}" ${m === card.originalModelName ? 'selected' : ''}>${m}</option>`
            ).join('');

            const contentInput = card.isCloze
                ? `<textarea class="form-textarea" rows="5">${card.generatedClozeText || card.sourceText}</textarea>`
                : `<textarea class="form-input" rows="2" placeholder="Enter question front...">${card.generatedFront}</textarea>`;

            // Show image preview if the card has an image
            const imagePreview = card.imageHtml ? `
                <div class="form-group">
                    <label class="form-label">Image (will be added to Extra field)</label>
                    <div class="image-preview" style="border: 1px solid #dee2e6; padding: 8px; border-radius: 4px; background: #f8f9fa;">
                        ${card.imageHtml}
                    </div>
                </div>
            ` : '';

            cardElement.innerHTML = `
                <div class="review-card-header">
                    <span>From: <strong>${card.originalPageTitle || 'PDF Document'}</strong></span>
                    <span>${new Date(card.timestamp).toLocaleString()}</span>
                </div>
                <div class="review-card-body">
                    <div class="form-group">
                        <label class="form-label">${card.isCloze ? 'Cloze Content' : 'Front (Question)'}</label>
                        ${contentInput}
                    </div>
                    ${imagePreview}
                    <div class="form-group">
                        <label class="form-label">Source Text (for reference)</label>
                        <div class="source-text-preview" style="border: 1px solid var(--border-color); border-radius: 4px; padding: 8px; background-color: var(--bg-color); min-height: 2em;">${card.sourceText}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Deck</label>
                            <select class="form-select deck-select">${deckOptions}</select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Note Type</label>
                            <select class="form-select model-select">${modelOptions}</select>
                        </div>
                    </div>
                </div>
                <div class="review-card-footer" style="background-color: var(--bg-color); border-top: 1px solid var(--border-color);">
                    <button class="btn btn-secondary remove-btn">Remove</button>
                    <button class="btn btn-primary save-btn">Save to Anki</button>
                </div>
            `;
            reviewList.appendChild(cardElement);
        });

        // Remove cards that are no longer in the pending list
        existingCards.forEach(cardElement => {
            cardElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateX(-20px)';
            setTimeout(() => cardElement.remove(), 300);
        });

        // Add event listeners for the buttons and inputs
        reviewList.addEventListener('click', async (e) => {
            const cardElement = e.target.closest('.review-card');
            if (!cardElement) return;

            const cardId = cardElement.dataset.cardId;
            const cardData = pendingReviewPdfCards.find(c => c.id === cardId);
            if (!cardData) return;

            if (e.target.classList.contains('remove-btn')) {
                // Remove card from review queue with animation
                cardElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                cardElement.style.opacity = '0';
                cardElement.style.transform = 'translateX(-20px)';
                
                setTimeout(async () => {
                    const updatedCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
                    await savePendingPdfCards(updatedCards);
                    cardElement.remove();
                    if (typeof window !== 'undefined' && window.showUINotification) {
                        window.showUINotification('Card removed from review queue');
                    }
                }, 300);
            } else if (e.target.classList.contains('save-btn')) {
                // Save card to Anki with animation
                const saveBtn = e.target;
                const originalText = saveBtn.textContent;
                
                // Flash the button green and show "Saved"
                if (typeof window !== 'undefined' && window.flashButtonGreen) {
                    window.flashButtonGreen(saveBtn);
                }
                saveBtn.textContent = 'Saved';
                saveBtn.disabled = true;
                
                const textarea = cardElement.querySelector('textarea');
                const front = textarea ? textarea.value : cardData.generatedFront || '';
                const back = cardData.isCloze ? (textarea ? textarea.value : '') : cardData.sourceText;
                const deck = cardElement.querySelector('.deck-select')?.value || cardData.originalDeckName || 'Default';
                const model = cardElement.querySelector('.model-select')?.value || cardData.originalModelName || 'Basic';
                const imageHtml = cardData.imageHtml || "";
                const pageTitle = cardData.originalPageTitle || 'PDF Review';
                const pageUrl = cardData.originalPageUrl || '';

                // Format the source information
                const sourceHtml = pageUrl 
                    ? `<div class="source-info" style="margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                        <strong>Source:</strong> <a href="${pageUrl}" target="_blank" rel="noopener noreferrer">${pageTitle}</a>
                       </div>`
                    : `<div class="source-info" style="margin-top: 1em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                        <strong>Source:</strong> ${pageTitle}
                       </div>`;

                const formattedBack = `${back}\n${sourceHtml}`;

                // Send message to background script to save the card
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({
                        action: 'saveFinalizedPdfCard',
                        cardData: { 
                            front: front, 
                            backHtml: formattedBack, 
                            deckName: deck, 
                            modelName: model,
                            imageHtml: imageHtml,
                            pageTitle: pageTitle,
                            pageUrl: pageUrl
                        }
                    }, async (response) => {
                        if (response && response.success) {
                            // Wait a moment to show the "Saved" state
                            setTimeout(async () => {
                                // Animate the card away
                                cardElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                                cardElement.style.opacity = '0';
                                cardElement.style.transform = 'translateX(20px)';
                                
                                // Remove the card after animation
                                setTimeout(async () => {
                                    const remainingCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
                                    await savePendingPdfCards(remainingCards);
                                    cardElement.remove();
                                    if (typeof window !== 'undefined' && window.showUINotification) {
                                        window.showUINotification('Card saved to Anki successfully!', 'success');
                                    }
                                }, 300);
                            }, 500); // Show "Saved" for 500ms before animating away
                        } else {
                            // Restore button and card if save failed
                            saveBtn.textContent = originalText;
                            saveBtn.disabled = false;
                            cardElement.style.opacity = '1';
                            cardElement.style.transform = 'translateX(0)';
                            if (typeof window !== 'undefined' && window.showUINotification) {
                                window.showUINotification(`Save failed: ${response?.error || 'Unknown error'}`, 'error');
                            }
                        }
                    });
                }
            }
        });

    } catch (error) {
        console.error('Error loading PDF review cards:', error);
        reviewList.innerHTML = '<div class="review-error">Error loading PDF review cards.</div>';
    }
}

// Helper functions for fetching Anki data
async function fetchDeckNames() {
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deckNames',
                version: 6
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.result || ['Default'];
    } catch (error) {
        console.error('Failed to fetch deck names:', error);
        return ['Default'];
    }
}

async function fetchModelNames() {
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'modelNames',
                version: 6
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.result || ['Basic'];
    } catch (error) {
        console.error('Failed to fetch model names:', error);
        return ['Basic'];
    }
}
