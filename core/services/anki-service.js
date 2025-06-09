/**
 * @fileoverview Anki service for managing Anki operations
 */

// Log when Anki service is loaded
console.log('[AnkiService] Loading Anki service');

/**
 * Checks if Anki is running and AnkiConnect is enabled
 * @returns {Promise<boolean>} True if Anki is running and AnkiConnect is enabled
 */
export async function isOnline() {
    console.log('[AnkiService] Checking Anki connection status');
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'version',
                version: 6
            })
        });
        const data = await response.json();
        const isConnected = data.result !== null;
        console.log('[AnkiService] Anki connection status:', isConnected);
        return isConnected;
    } catch (error) {
        console.error('[AnkiService] Failed to check Anki connection:', error);
        return false;
    }
}

/**
 * Gets the list of deck names
 * @returns {Promise<string[]>} List of deck names
 */
export async function getDeckNames() {
    console.log('[AnkiService] Getting deck names');
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deckNames',
                version: 6
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved deck names:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get deck names:', error);
        throw error;
    }
}

/**
 * Gets the list of model names
 * @returns {Promise<string[]>} List of model names
 */
export async function getModelNames() {
    console.log('[AnkiService] Getting model names');
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'modelNames',
                version: 6
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved model names:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get model names:', error);
        throw error;
    }
}

/**
 * Gets the list of field names for a model
 * @param {string} modelName - Name of the model
 * @returns {Promise<string[]>} List of field names
 */
export async function getModelFieldNames(modelName) {
    console.log('[AnkiService] Getting field names for model:', modelName);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'modelFieldNames',
                version: 6,
                params: {
                    modelName
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved field names:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get field names:', error);
        throw error;
    }
}

/**
 * Adds a note to Anki
 * @param {Object} note - Note to add
 * @param {string} note.deckName - Name of the deck
 * @param {string} note.modelName - Name of the model
 * @param {Object} note.fields - Fields of the note
 * @param {string[]} note.tags - Tags of the note
 * @returns {Promise<number>} ID of the added note
 */
export async function addNote(note) {
    console.log('[AnkiService] Adding note:', note);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addNote',
                version: 6,
                params: {
                    note
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Note added successfully, ID:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to add note:', error);
        throw error;
    }
}

/**
 * Updates a note in Anki
 * @param {Object} note - Note to update
 * @param {number} note.id - ID of the note
 * @param {string} note.deckName - Name of the deck
 * @param {string} note.modelName - Name of the model
 * @param {Object} note.fields - Fields of the note
 * @param {string[]} note.tags - Tags of the note
 * @returns {Promise<void>}
 */
export async function updateNote(note) {
    console.log('[AnkiService] Updating note:', note);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateNote',
                version: 6,
                params: {
                    note
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Note updated successfully');
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to update note:', error);
        throw error;
    }
}

/**
 * Deletes a note from Anki
 * @param {number} noteId - ID of the note to delete
 * @returns {Promise<void>}
 */
export async function deleteNote(noteId) {
    console.log('[AnkiService] Deleting note:', noteId);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteNotes',
                version: 6,
                params: {
                    notes: [noteId]
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Note deleted successfully');
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to delete note:', error);
        throw error;
    }
}

/**
 * Gets a note from Anki
 * @param {number} noteId - ID of the note to get
 * @returns {Promise<Object>} Note data
 */
export async function getNote(noteId) {
    console.log('[AnkiService] Getting note:', noteId);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'notesInfo',
                version: 6,
                params: {
                    notes: [noteId]
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved note:', data.result[0]);
        return data.result[0];
    } catch (error) {
        console.error('[AnkiService] Failed to get note:', error);
        throw error;
    }
}

/**
 * Gets the list of notes in a deck
 * @param {string} deckName - Name of the deck
 * @returns {Promise<Object[]>} List of notes
 */
export async function getDeckNotes(deckName) {
    console.log('[AnkiService] Getting notes for deck:', deckName);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findNotes',
                version: 6,
                params: {
                    query: `deck:"${deckName}"`
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved note IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get deck notes:', error);
        throw error;
    }
}

/**
 * Gets the list of cards in a deck
 * @param {string} deckName - Name of the deck
 * @returns {Promise<Object[]>} List of cards
 */
export async function getDeckCards(deckName) {
    console.log('[AnkiService] Getting cards for deck:', deckName);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query: `deck:"${deckName}"`
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved card IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get deck cards:', error);
        throw error;
    }
}

/**
 * Gets the list of cards for a note
 * @param {number} noteId - ID of the note
 * @returns {Promise<Object[]>} List of cards
 */
export async function getNoteCards(noteId) {
    console.log('[AnkiService] Getting cards for note:', noteId);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query: `nid:${noteId}`
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved card IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get note cards:', error);
        throw error;
    }
}

/**
 * Gets the list of cards for a model
 * @param {string} modelName - Name of the model
 * @returns {Promise<Object[]>} List of cards
 */
export async function getModelCards(modelName) {
    console.log('[AnkiService] Getting cards for model:', modelName);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query: `note:"${modelName}"`
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved card IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get model cards:', error);
        throw error;
    }
}

/**
 * Gets the list of cards for a tag
 * @param {string} tag - Tag to search for
 * @returns {Promise<Object[]>} List of cards
 */
export async function getTagCards(tag) {
    console.log('[AnkiService] Getting cards for tag:', tag);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query: `tag:"${tag}"`
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved card IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get tag cards:', error);
        throw error;
    }
}

/**
 * Gets the list of cards for a query
 * @param {string} query - Query to search for
 * @returns {Promise<Object[]>} List of cards
 */
export async function getQueryCards(query) {
    console.log('[AnkiService] Getting cards for query:', query);
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query
                }
            })
        });
        const data = await response.json();
        console.log('[AnkiService] Retrieved card IDs:', data.result);
        return data.result;
    } catch (error) {
        console.error('[AnkiService] Failed to get query cards:', error);
        throw error;
    }
}

// Log when Anki service is fully loaded
console.log('[AnkiService] Anki service loaded successfully'); 