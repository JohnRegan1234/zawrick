/**
 * @fileoverview Main entry point for options page
 */

// Import state management
import { appState } from './state/app-state.js';
import { uiState } from './state/ui-state.js';

// Import components
import { ankiSection } from './components/sections/AnkiSection.js';
import { promptManager } from './components/prompts/PromptManager.js';
import { ModelSelector } from './components/ModelSelector.js';

// Import services
import { testOpenAI } from './services/openai-service.js';
import { fetchAnki, fetchDeckNames, fetchModelNames } from './services/anki-service.js';
import { loadSettings, saveSettings } from './core/storage.js';
import { refreshPromptHistory, renderPdfReviewList } from './core/history-helpers.js';
import { toggleGPTSection, flashButtonGreen, showUINotification, updateUIConnectionStatus } from './core/ui-helpers.js';
import { Modal } from './ui/modal.js';
import { DEFAULT_SETTINGS } from './core/constants.js';

/**
 * Initialize the options page
 */
async function initialize() {
    try {
        // Initialize modal first
        if (!window.modal) {
            const modalInstance = new Modal();
            if (!modalInstance.modal) {
                console.error('[Options] Failed to initialize modal - required elements not found');
                return;
            }
            window.modal = modalInstance;
        }

        // Load initial settings
        const settings = await loadSettings();
        console.log('[Options] Debug loaded settings:', {
            openaiKey: settings.openaiKey ? `${settings.openaiKey.substring(0, 6)}...` : '(empty)',
            gptEnabled: settings.gptEnabled,
            deckName: settings.deckName
        });
        
        appState.initialize(settings);
        console.log('[Options] Debug app state after initialization:', {
            openaiKey: appState.state.openaiKey ? `${appState.state.openaiKey.substring(0, 6)}...` : '(empty)',
            gptEnabled: appState.state.gptEnabled,
            deckName: appState.state.deckName
        });

        // Initialize components with their DOM elements
        ankiSection.init({
            section: document.getElementById('anki-section'),
            deckSelect: document.getElementById('anki-deck'),
            modelSelect: document.getElementById('anki-note-type'),
            statusText: document.getElementById('status-text'),
            statusHelp: document.getElementById('status-help')
        });

        // Initialize refresh button
        const refreshButton = document.getElementById('refresh-status');
        if (refreshButton) {
            let isRefreshing = false;
            refreshButton.onclick = async () => {
                if (isRefreshing) return;
                
                isRefreshing = true;
                refreshButton.classList.add('spinning');
                
                try {
                    await ankiSection.refresh();
                } finally {
                    // Wait for animation to complete before removing the class
                    setTimeout(() => {
                        refreshButton.classList.remove('spinning');
                        isRefreshing = false;
                    }, 600); // Match the animation duration
                }
            };
        }

        promptManager.init({
            select: document.getElementById('prompt-select'),
            nameInput: document.getElementById('profile-name'),
            promptInput: document.getElementById('gpt-prompt'),
            saveButton: document.getElementById('save-prompt'),
            deleteButton: document.getElementById('del-prompt')
        });

        console.log('[Options] PromptManager initialized');

        // Initialize GPT section
        const enableGpt = document.getElementById('enable-gpt');
        const alwaysConfirm = document.getElementById('always-confirm');
        const gptSection = document.getElementById('gpt-section');
        const keyInput = document.getElementById('openai-key');
        const testKeyButton = document.getElementById('test-api');
        const togglePasswordButton = document.getElementById('toggle-password');
        
        // Initialize model selector
        const modelSelector = new ModelSelector();
        modelSelector.init(appState);
        
        console.log('[Options] Debug API key initialization:');
        console.log('[Options] keyInput element found:', !!keyInput);
        console.log('[Options] testKeyButton element found:', !!testKeyButton);
        console.log('[Options] togglePasswordButton element found:', !!togglePasswordButton);
        console.log('[Options] appState.state.openaiKey:', appState.state.openaiKey);
        
        if (enableGpt && gptSection) {
            enableGpt.checked = appState.state.gptEnabled;
            enableGpt.onchange = () => {
                appState.updateGptSettings({ gptEnabled: enableGpt.checked });
            };
        }

        if (alwaysConfirm) {
            alwaysConfirm.checked = appState.state.alwaysConfirm;
            alwaysConfirm.onchange = () => {
                appState.updateGptSettings({ alwaysConfirm: alwaysConfirm.checked });
            };
        }
        
        if (keyInput) {
            console.log('[Options] Setting keyInput.value to:', appState.state.openaiKey);
            console.log('[Options] keyInput before setting - type:', keyInput.type, 'value:', keyInput.value, 'placeholder:', keyInput.placeholder);
            keyInput.value = appState.state.openaiKey;
            console.log('[Options] keyInput.value after setting:', keyInput.value);
            console.log('[Options] keyInput after setting - type:', keyInput.type, 'value:', keyInput.value);
            
            // Force refresh the display
            keyInput.setAttribute('value', appState.state.openaiKey);
            console.log('[Options] After setAttribute - value attr:', keyInput.getAttribute('value'), 'input.value:', keyInput.value);
            
            // Additional workaround for password field display issues
            if (appState.state.openaiKey && keyInput.value !== appState.state.openaiKey) {
                console.log('[Options] Value assignment failed, trying workarounds...');
                
                // Method 1: Temporary type change
                const originalType = keyInput.type;
                keyInput.type = 'text';
                keyInput.value = appState.state.openaiKey;
                keyInput.type = originalType;
                console.log('[Options] After type toggle workaround:', keyInput.value);
                
                // Method 2: Focus and dispatch events
                keyInput.focus();
                keyInput.dispatchEvent(new Event('input', { bubbles: true }));
                keyInput.dispatchEvent(new Event('change', { bubbles: true }));
                keyInput.blur();
                console.log('[Options] After focus/events workaround:', keyInput.value);
            }
            
            keyInput.onblur = () => {
                console.log('[Options] API key onblur, new value:', keyInput.value);
                appState.updateGptSettings({ openaiKey: keyInput.value });
            };
        }
        
        if (togglePasswordButton && keyInput) {
            togglePasswordButton.onclick = () => {
                const isHidden = keyInput.type === 'password';
                keyInput.type = isHidden ? 'text' : 'password';
                togglePasswordButton.setAttribute('aria-label', isHidden ? 'Hide API Key' : 'Show API Key');
                console.log('[Options] Password visibility toggled, now:', keyInput.type);
            };
        }
        
        if (testKeyButton) {
            testKeyButton.onclick = async () => {
                console.log('[Options] Testing API key:', keyInput.value);
                const result = await testOpenAI(keyInput.value);
                if (result.success) {
                    appState.updateGptSettings({ openaiKey: keyInput.value });
                    
                    // Update available models when API key is validated
                    await modelSelector.updateAvailableModels();
                    
                    alert('API key is valid!');
                } else {
                    alert(result.error || 'Invalid API key');
                }
            };
        }

        // Add debug information display
        window.refreshDebugInfo = () => {
            const debugDiv = document.getElementById('debug-info');
            if (debugDiv) {
                const keyInput = document.getElementById('openai-key');
                const debugInfo = {
                    timestamp: new Date().toLocaleTimeString(),
                    appStateApiKey: appState.state.openaiKey ? `${appState.state.openaiKey.substring(0, 10)}...` : '(empty)',
                    inputElementFound: !!keyInput,
                    inputValue: keyInput ? (keyInput.value ? `${keyInput.value.substring(0, 10)}...` : '(empty)') : 'N/A',
                    inputType: keyInput ? keyInput.type : 'N/A',
                    inputValueLength: keyInput ? keyInput.value.length : 'N/A',
                    settingsInStorage: 'checking...'
                };
                
                debugDiv.innerHTML = `
                    <strong>Debug Status:</strong><br>
                    Time: ${debugInfo.timestamp}<br>
                    App State API Key: ${debugInfo.appStateApiKey}<br>
                    Input Element Found: ${debugInfo.inputElementFound}<br>
                    Input Value: ${debugInfo.inputValue}<br>
                    Input Type: ${debugInfo.inputType}<br>
                    Input Value Length: ${debugInfo.inputValueLength}<br>
                    <br>
                    <button onclick="document.getElementById('openai-key').type='text'" style="margin-right: 5px;">Show Password</button>
                    <button onclick="document.getElementById('openai-key').type='password'" style="margin-right: 5px;">Hide Password</button>
                    <button onclick="console.log('Input value:', document.getElementById('openai-key').value)" style="margin-right: 5px;">Log Value</button>
                `;
                
                // Also check storage directly
                if (chrome && chrome.storage) {
                    chrome.storage.local.get(['openaiKey'], (result) => {
                        debugDiv.innerHTML += `<br>Storage API Key: ${result.openaiKey ? `${result.openaiKey.substring(0, 10)}...` : '(empty)'}`;
                    });
                }
            }
        };
        
        // Add manual API key refresh function
        window.forceRefreshApiKey = async () => {
            console.log('[Options] Force refreshing API key...');
            const keyInput = document.getElementById('openai-key');
            if (keyInput) {
                // Clear current value
                keyInput.value = '';
                
                // Reload from storage
                const settings = await loadSettings();
                console.log('[Options] Reloaded settings:', settings);
                
                // Update app state
                appState.updateGptSettings({ openaiKey: settings.openaiKey });
                
                // Set the value with all workarounds
                keyInput.value = settings.openaiKey;
                keyInput.setAttribute('value', settings.openaiKey);
                
                // Try type toggle workaround
                const originalType = keyInput.type;
                keyInput.type = 'text';
                keyInput.value = settings.openaiKey;
                keyInput.type = originalType;
                
                console.log('[Options] Force refresh completed, value:', keyInput.value);
                window.refreshDebugInfo();
            }
        };
        
        // Initial debug info display
        setTimeout(() => {
            window.refreshDebugInfo();
        }, 100);

        // Initialize section toggles
        document.querySelectorAll('.section').forEach(section => {
            const sectionId = section.id.replace('-section', '');
            const header = section.querySelector('.section-header');
            const toggle = section.querySelector('.section-toggle');
            const body = section.querySelector('.section-body');
            if (!header || !toggle || !body) return;

            // Set initial state - start collapsed
            const isExpanded = uiState.isSectionExpanded(sectionId);
            toggle.textContent = isExpanded ? '▾' : '▸';
            section.classList.toggle('collapsed', !isExpanded);

            // Bind toggle handler to the entire header
            header.onclick = () => {
                uiState.toggleSection(sectionId);
                const newState = uiState.isSectionExpanded(sectionId);
                toggle.textContent = newState ? '▾' : '▸';
                section.classList.toggle('collapsed', !newState);
            };
        });

        // Initialize reset settings button
        const resetSettingsBtn = document.getElementById('reset-settings');
        if (resetSettingsBtn) {
            resetSettingsBtn.onclick = () => {
                window.modal.show(
                    'Reset Settings',
                    'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
                    async () => {
                        try {
                            // Reset to default settings
                            await chrome.storage.local.set(DEFAULT_SETTINGS);
                            // Reload the page to reflect changes
                            window.location.reload();
                        } catch (error) {
                            console.error('[Options] Failed to reset settings:', error);
                            showUINotification('Failed to reset settings. Please try again.', 'error');
                        }
                    }
                );
            };
        }

        // Initialize add prompt button
        const addPromptButton = document.getElementById('add-prompt');
        if (addPromptButton) {
            addPromptButton.onclick = () => promptManager.enterAddMode();
        }

        // Initialize history and PDF review sections
        await initializeHistorySection();
        await initializePdfReviewSection();

        // Ensure PDF review section starts collapsed
        const pdfReviewSection = document.getElementById('pdf-review-section');
        if (pdfReviewSection) {
            pdfReviewSection.classList.add('collapsed');
            const pdfToggle = pdfReviewSection.querySelector('.section-toggle');
            if (pdfToggle) {
                pdfToggle.textContent = '▸';
            }
        }

        // Initial refresh of components - do them sequentially to avoid race conditions
        console.log('[Options] Starting component refresh...');
        
        try {
            console.log('[Options] Refreshing ankiSection...');
            await ankiSection.refresh();
            console.log('[Options] ankiSection refresh completed');
        } catch (error) {
            console.error('[Options] ankiSection refresh failed:', error);
        }

        // Update pending cards display
        await updatePendingCards();
        
        // Note: promptManager will refresh itself after initialization is complete

        // Initialize PDF help button
        const pdfHelpBtn = document.getElementById('pdf-help-btn');
        const pdfHelpText = document.getElementById('pdf-help-text');
        if (pdfHelpBtn && pdfHelpText) {
            pdfHelpBtn.onclick = () => {
                const isHidden = pdfHelpText.style.display === 'none';
                pdfHelpText.style.display = isHidden ? 'block' : 'none';
                
                // Toggle icons
                const helpIcon = pdfHelpBtn.querySelector('.help-icon');
                const closeIcon = pdfHelpBtn.querySelector('.close-icon');
                helpIcon.style.display = isHidden ? 'none' : 'block';
                closeIcon.style.display = isHidden ? 'block' : 'none';
                
                pdfHelpBtn.setAttribute('aria-label', isHidden ? 'Hide PDF help information' : 'Show PDF help information');
            };
        }

    } catch (error) {
        console.error('[Options] Initialization failed:', error);
        alert('Failed to initialize options page. Please refresh.');
    }
}

/**
 * Initialize history section functionality
 */
async function initializeHistorySection() {
    // Initialize clear history button
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = () => {
            window.modal.show(
                'Clear Prompt History',
                'Are you sure you want to clear all prompt history? This action cannot be undone.',
                () => {
                    chrome.storage.local.set({ promptHistory: [] }, () => {
                        refreshPromptHistory();
                        showUINotification('Prompt history cleared');
                    });
                }
            );
        };
    }

    // Initial load of history
    await refreshPromptHistory();
}

/**
 * Initialize PDF review section functionality
 */
async function initializePdfReviewSection() {
    // Initialize clear PDF history button
    const clearPdfHistoryBtn = document.getElementById('clear-pdf-history');
    if (clearPdfHistoryBtn) {
        clearPdfHistoryBtn.onclick = () => {
            window.modal.show(
                'Clear PDF Review Cards',
                'Are you sure you want to clear all PDF review cards? This action cannot be undone.',
                () => {
                    chrome.storage.local.set({ pendingReviewPdfCards: [] }, () => {
                        renderPdfReviewList();
                        showUINotification('PDF review cards cleared');
                    });
                }
            );
        };
    }

    // Initialize refresh PDF review button
    const refreshPdfReviewBtn = document.getElementById('refresh-pdf-review-list-btn');
    if (refreshPdfReviewBtn) {
        let isRefreshing = false;
        refreshPdfReviewBtn.onclick = async () => {
            if (isRefreshing) return;
            
            isRefreshing = true;
            refreshPdfReviewBtn.classList.add('spinning');
            
            try {
                await renderPdfReviewList();
            } finally {
                setTimeout(() => {
                    refreshPdfReviewBtn.classList.remove('spinning');
                    isRefreshing = false;
                }, 600);
            }
        };
    }

    // Initial load of PDF review cards
    await renderPdfReviewList();
}

/**
 * Queue a clip for later processing
 */
async function queueClip(clip) {
    try {
        const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
        pendingClips.push(clip);
        await chrome.storage.local.set({ pendingClips });
        return true;
    } catch (error) {
        console.error('Failed to queue clip:', error);
        return false;
    }
}

/**
 * Update pending cards count
 */
async function updatePendingCards() {
    try {
        const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
        const pendingCount = document.getElementById('pending-count');
        const pendingCardsSection = document.querySelector('.pending-cards');
        
        if (pendingCount) {
            pendingCount.textContent = `${pendingClips.length}`;
        }
        
        if (pendingCardsSection) {
            pendingCardsSection.style.display = pendingClips.length > 0 ? 'block' : 'none';
        }
        
        return true;
    } catch (error) {
        console.error('Failed to update pending cards:', error);
        return false;
    }
}

/**
 * Generate a unique ID
 */
function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get unique prompt label
 */
function getUniquePromptLabel(baseLabel, excludeId = null) {
    const prompts = appState.get('prompts') || [];
    let label = baseLabel || 'Untitled';
    let counter = 1;
    
    while (prompts.some(p => p.id !== excludeId && p.label === label)) {
        label = `${baseLabel} (${counter})`;
        counter++;
    }
    
    return label;
}

/**
 * Refresh Anki connection status
 */
async function refreshAnkiStatus(fetchInjected, chromeInjected) {
    try {
        const statusText = document.getElementById('status-text');
        if (!statusText) {
            return;
        }
        
        await fetchAnki('deckNames', {}, fetchInjected);
        updateUIConnectionStatus(true);
    } catch (error) {
        updateUIConnectionStatus(false);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Export for testing - ES6 modules
export {
    initialize,
    ankiSection,
    promptManager,
    appState,
    uiState,
    loadSettings,
    saveSettings,
    refreshPromptHistory,
    renderPdfReviewList,
    queueClip,
    updatePendingCards,
    uid,
    getUniquePromptLabel,
    refreshAnkiStatus,
    fetchAnki,
    fetchDeckNames,
    fetchModelNames,
    testOpenAI,
    toggleGPTSection,
    flashButtonGreen,
    showUINotification,
    updateUIConnectionStatus
};

// CommonJS exports for testing compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initialize,
        ankiSection,
        promptManager,
        appState,
        uiState,
        loadSettings,
        saveSettings,
        refreshPromptHistory,
        renderPdfReviewList,
        queueClip,
        updatePendingCards,
        uid,
        getUniquePromptLabel,
        refreshAnkiStatus,
        fetchAnki,
        fetchDeckNames,
        fetchModelNames,
        testOpenAI,
        toggleGPTSection,
        flashButtonGreen,
        showUINotification,
        updateUIConnectionStatus
    };
} 