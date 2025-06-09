/**
 * @fileoverview Application state management
 */

// Log when app state module is loaded
console.log('[AppState] Loading app state module');

import { get, set } from './storage.js';
import { DEFAULT_PROFILE } from './constants.js';

/**
 * Error types for app state operations
 * @enum {string}
 */
const AppStateErrorType = {
    STORAGE: 'STORAGE_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    PROFILE: 'PROFILE_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Gets the current profile ID
 * @returns {Promise<string>} Profile ID
 */
export async function getCurrentProfile() {
    console.log('[AppState] Getting current profile');
    const startTime = performance.now();
    try {
        const profile = await get('currentProfile') || DEFAULT_PROFILE;
        const endTime = performance.now();
        console.log('[AppState] Retrieved current profile:', {
            profile,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return profile;
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to get current profile:', {
            error: error.message,
            type: AppStateErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Sets the current profile ID
 * @param {string} profileId - Profile ID to set
 * @returns {Promise<void>}
 */
export async function setCurrentProfile(profileId) {
    console.log('[AppState] Setting current profile:', { profileId });
    const startTime = performance.now();
    try {
        if (!profileId) {
            throw new Error('Profile ID is required');
        }
        await set('currentProfile', profileId);
        const endTime = performance.now();
        console.log('[AppState] Current profile set successfully:', {
            profileId,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to set current profile:', {
            error: error.message,
            type: AppStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets the list of profiles
 * @returns {Promise<Array<{id: string, name: string}>>} List of profiles
 */
export async function getProfiles() {
    console.log('[AppState] Getting profiles list');
    const startTime = performance.now();
    try {
        const profiles = await get('profiles') || [];
        const endTime = performance.now();
        console.log('[AppState] Retrieved profiles:', {
            count: profiles.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return profiles;
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to get profiles:', {
            error: error.message,
            type: AppStateErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Adds a new profile
 * @param {string} name - Profile name
 * @returns {Promise<string>} New profile ID
 */
export async function addProfile(name) {
    console.log('[AppState] Adding new profile:', { name });
    const startTime = performance.now();
    try {
        if (!name) {
            throw new Error('Profile name is required');
        }

        const profiles = await getProfiles();
        const newProfile = {
            id: crypto.randomUUID(),
            name
        };

        await set('profiles', [...profiles, newProfile]);
        const endTime = performance.now();
        console.log('[AppState] Profile added successfully:', {
            profileId: newProfile.id,
            name,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return newProfile.id;
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to add profile:', {
            error: error.message,
            type: AppStateErrorType.PROFILE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Removes a profile
 * @param {string} profileId - Profile ID to remove
 * @returns {Promise<void>}
 */
export async function removeProfile(profileId) {
    console.log('[AppState] Removing profile:', { profileId });
    const startTime = performance.now();
    try {
        if (!profileId) {
            throw new Error('Profile ID is required');
        }

        const profiles = await getProfiles();
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        
        if (updatedProfiles.length === profiles.length) {
            throw new Error('Profile not found');
        }

        await set('profiles', updatedProfiles);
        const endTime = performance.now();
        console.log('[AppState] Profile removed successfully:', {
            profileId,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to remove profile:', {
            error: error.message,
            type: AppStateErrorType.PROFILE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Gets the list of prompts for a profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<Array<{id: string, name: string, prompt: string}>>} List of prompts
 */
export async function getPrompts(profileId) {
    console.log('[AppState] Getting prompts for profile:', { profileId });
    const startTime = performance.now();
    try {
        if (!profileId) {
            throw new Error('Profile ID is required');
        }

        const prompts = await get(`prompts_${profileId}`) || [];
        const endTime = performance.now();
        console.log('[AppState] Retrieved prompts:', {
            profileId,
            count: prompts.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return prompts;
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to get prompts:', {
            error: error.message,
            type: AppStateErrorType.STORAGE,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Adds a new prompt to a profile
 * @param {string} profileId - Profile ID
 * @param {string} name - Prompt name
 * @param {string} prompt - Prompt text
 * @returns {Promise<string>} New prompt ID
 */
export async function addPrompt(profileId, name, prompt) {
    console.log('[AppState] Adding new prompt:', { profileId, name });
    const startTime = performance.now();
    try {
        if (!profileId || !name || !prompt) {
            throw new Error('Profile ID, name, and prompt are required');
        }

        const prompts = await getPrompts(profileId);
        const newPrompt = {
            id: crypto.randomUUID(),
            name,
            prompt
        };

        await set(`prompts_${profileId}`, [...prompts, newPrompt]);
        const endTime = performance.now();
        console.log('[AppState] Prompt added successfully:', {
            profileId,
            promptId: newPrompt.id,
            name,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return newPrompt.id;
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to add prompt:', {
            error: error.message,
            type: AppStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

/**
 * Removes a prompt from a profile
 * @param {string} profileId - Profile ID
 * @param {string} promptId - Prompt ID to remove
 * @returns {Promise<void>}
 */
export async function removePrompt(profileId, promptId) {
    console.log('[AppState] Removing prompt:', { profileId, promptId });
    const startTime = performance.now();
    try {
        if (!profileId || !promptId) {
            throw new Error('Profile ID and prompt ID are required');
        }

        const prompts = await getPrompts(profileId);
        const updatedPrompts = prompts.filter(p => p.id !== promptId);
        
        if (updatedPrompts.length === prompts.length) {
            throw new Error('Prompt not found');
        }

        await set(`prompts_${profileId}`, updatedPrompts);
        const endTime = performance.now();
        console.log('[AppState] Prompt removed successfully:', {
            profileId,
            promptId,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
    } catch (error) {
        const endTime = performance.now();
        console.error('[AppState] Failed to remove prompt:', {
            error: error.message,
            type: AppStateErrorType.VALIDATION,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        throw error;
    }
}

// Log when app state module is fully loaded
console.log('[AppState] App state module loaded successfully'); 