// options.js

document.addEventListener('DOMContentLoaded', async () => {
    // ----- Element references -----
    // Status bar
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    const refreshBtn = document.getElementById('refresh-status');

    // Pending cards
    const pendingCount = document.getElementById('pending-count');
    const pendingCards = document.querySelector('.pending-cards');

    // Anki section
    const deckSel = document.getElementById('anki-deck'); // .form-select
    const modelSel = document.getElementById('anki-note-type'); // .form-select
    const ankiSection = document.getElementById('anki-section');
    const ankiToggle = ankiSection?.querySelector('.section-toggle');
    const ankiBody = ankiSection?.querySelector('.section-body');

    // GPT section
    const gptSection = document.getElementById('gpt-section');
    const gptToggle = gptSection?.querySelector('.section-toggle');
    const gptBody = gptSection?.querySelector('.section-body');
    const enableGpt = document.getElementById('enable-gpt'); // hidden checkbox
    const gptToggleSwitch = enableGpt?.nextElementSibling; // .toggle-switch
    const alwaysConfirm = document.getElementById('always-confirm'); // hidden checkbox
    const alwaysConfirmToggleSwitch = alwaysConfirm?.nextElementSibling; // .toggle-switch
    const confirmGptEl = document.getElementById('confirm-gpt'); // hidden checkbox
    const confirmToggleSwitch = confirmGptEl?.nextElementSibling; // .toggle-switch

    // API Key
    const keyInput = document.getElementById('openai-key'); // .form-input
    const keyToggle = document.getElementById('toggle-password'); // .input-addon

    // Prompt template
    const tplBox = document.getElementById('gpt-prompt'); // .form-textarea

    // Prompt management
    const saveBtn = document.getElementById('save-prompt'); // .btn
    const addBtn = document.getElementById('add-prompt'); // .btn
    const delBtn = document.getElementById('del-prompt'); // .btn
    const testApiBtn = document.getElementById('test-api'); // .btn

    // Profile and prompt selection
    const promptSel = document.getElementById('prompt-select'); // .form-select
    const profileNameInput = document.getElementById('profile-name'); // .form-input

    // Notification
    const notification = document.getElementById('notification');

    // Reset
    const resetBtn = document.getElementById('reset-settings');

    // Help/status
    const statusHelp = document.getElementById('status-help');
    const promptLimitMsg = document.getElementById('prompt-limit-msg');

    // History section
    const historySection = document.getElementById('history-section');
    const historyToggle = historySection?.querySelector('.section-toggle');
    const historyBody = historySection?.querySelector('.section-body');
    const historyList = document.getElementById('history-list');
    const historyCount = document.getElementById('history-count');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // PDF Review section
    const pdfReviewSection = document.getElementById('pdf-review-section');
    const pdfReviewToggle = pdfReviewSection?.querySelector('.section-toggle');
    const pdfReviewBody = pdfReviewSection?.querySelector('.section-body');
    const clearPdfHistoryBtn = document.getElementById('clear-pdf-history');
    const refreshPdfReviewBtn = document.getElementById('refresh-pdf-review-list-btn');

    // Debug logging
    console.log('PDF Review elements:', { pdfReviewSection, pdfReviewToggle, pdfReviewBody });

    // Section toggle handlers - Make entire header clickable
    const ankiHeader = ankiSection?.querySelector('.section-header');
    if (ankiHeader && ankiBody && ankiToggle) {
        ankiHeader.onclick = () => {
            console.log('[options.js] Anki HEADER clicked, calling toggleSection.');
            toggleSection(ankiBody, ankiToggle);
        };
    }

    const gptHeader = gptSection?.querySelector('.section-header');
    if (gptHeader && gptBody && gptToggle) {
        gptHeader.onclick = () => {
            console.log('[options.js] GPT HEADER clicked, calling toggleSection.');
            toggleSection(gptBody, gptToggle);
        };
    }

    const historyHeader = historySection?.querySelector('.section-header');
    if (historyHeader && historyBody && historyToggle) {
        historyHeader.onclick = () => {
            console.log('[options.js] History HEADER clicked, calling toggleSection.');
            toggleSection(historyBody, historyToggle);
        };
    }

    const pdfReviewHeader = pdfReviewSection?.querySelector('.section-header');
    if (pdfReviewHeader && pdfReviewBody && pdfReviewToggle) {
        pdfReviewHeader.onclick = () => {
            console.log('[options.js] PDF Review HEADER clicked, calling toggleSection.');
            toggleSection(pdfReviewBody, pdfReviewToggle);
        };
    }

    // 1. give the popup a sane default
    const DEFAULT_PROFILE = {
      id      : 'basic-default',
      label   : 'Default Basic',
      template: `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.`
    };

    // System default prompts (read-only)
    const SYSTEM_PROMPTS = [
      {
        id: 'system-default-basic',
        label: '🔒 System Default - Basic Cards',
        template: `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.`,
        isSystem: true
      },
      {
        id: 'system-default-cloze',
        label: '🔒 System Default - Cloze Guidance',
        template: `You are an expert Anki cloze deletion creator. Your goal is to process the provided text selection and convert it into a single string formatted for Anki cloze cards. Please adhere to the following rules:

1.  **Identify Key Information:** For each new concept or distinct piece of information in the text, use a new cloze index (e.g., \`{{c1::concept one}}\`, then \`{{c2::another concept}}\`, \`{{c3::a third detail}}\`, etc.). Always start with \`{{c1::...}}\` for the first piece of clozed information.

2.  **Group Related Items:** If several items clearly belong to the same category or are very closely related (like a list of examples), group them into a single cloze.
    * Use the format: \`{{cN::item A, item B, item C::xNUMBER_OF_ITEMS}}\`.
    * For example: "Primary colors include \`{{c1::red, yellow, blue::x3}}\`."
    * Only use the \`::xNUMBER_OF_ITEMS\` suffix when you are deliberately grouping multiple listed answers within a single cloze. Do not use it for single concepts.

3.  **Context is Crucial:** The un-occluded part of the sentence MUST provide enough context for the user to reasonably determine what the clozed information refers to.

4.  **Explicit Subject/Condition:** If the clozed content refers to a specific condition, subject, or proper noun (e.g., "Photosynthesis" or "Alzheimer's disease"), ensure this subject is explicitly mentioned in the non-occluded part of the sentence to avoid ambiguity.

5.  **Output Formatting:**
    * The output must be ONLY the processed text containing the cloze deletions.
    * Do NOT use any bold text.
    * Do NOT add any markdown like horizontal rules/lines.
    * Do NOT number the output as if it were a list of cards (e.g., avoid "1:", "2:"). The output should be a single continuous string.

6.  **Consistency:** Try to maintain consistent formatting if similar concepts or structures appear multiple times within the provided text selection.

7.  **Valid Cloze Indexing:** Each cloze index (e.g., \`{{c1::}}\`, \`{{c2::}}\`) should generally appear only once. The exception is if you are using advanced Anki cloze features where a single \`cN\` can hide multiple separate parts of a sentence, but for simplicity, prioritize unique indices for distinct pieces of information unless a specific grouping (as in rule #2) is intended.

**Examples of Properly Formatted Output:**

* Input sentence: "Foods high in iron include red meat, liver/kidney, and oily fish."
    Desired output: "Foods high in iron include \`{{c1::red meat, liver/kidney, oily fish::x3}}\`."

* Input sentence: "At birth, a term newborn has iron stores of approximately 250 mg, with 75% in the blood and 25% in ferritin/haemosiderin/tissues."
    Desired output: "At birth, a term newborn has iron stores of approximately \`{{c1::250 mg}}\`, with \`{{c2::75%}}\` in the blood and \`{{c3::25%}}\` in ferritin/haemosiderin/tissues."`,
        isSystem: true
      }
    ];

    // ----- Defaults -----
    const DEFAULT_SETTINGS = {
        deckName   : 'Default',
        modelName  : 'Basic',
        gptEnabled : false,
        openaiKey  : '',
        confirmGpt : false,
        alwaysConfirm: true, // Default to always showing confirmation
        prompts    : [DEFAULT_PROFILE],
        selectedPrompt: 'basic-default'
    };

    // ----- Add Prompt Mode State Management -----
    let isInAddPromptMode = false;
    let previouslySelectedPromptId = null;

    function enterAddPromptMode() {
        // This function will only be called if the required elements exist
        const { prompts = [] } = window.currentSettings || {};
        if (prompts.length >= 5) {
            window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
            if (addBtn) addBtn.disabled = true;
            if (promptLimitMsg) promptLimitMsg.style.display = "block";
            return;
        }
        
        isInAddPromptMode = true;
        if (promptSel) previouslySelectedPromptId = promptSel.value; // Save current selection

        console.log('[DEBUG] Entering add prompt mode, saved selection:', previouslySelectedPromptId);

        // Update UI
        if (promptSel) promptSel.disabled = true;
        
        if (profileNameInput) {
            profileNameInput.value = '';
            profileNameInput.disabled = false;
            profileNameInput.placeholder = 'Enter new prompt name...';
            profileNameInput.focus();
        }

        if (tplBox) {
            tplBox.value = '';
            tplBox.disabled = false;
            tplBox.placeholder = 'Enter new prompt template...';
        }

        // Update buttons
        if (addBtn) {
            addBtn.textContent = 'Save New Prompt';
            addBtn.classList.remove('btn-secondary');
            addBtn.classList.add('btn-primary');
        }

        if (saveBtn) saveBtn.style.display = 'none'; // Hide original "Save Prompt"
        if (delBtn) {
            delBtn.textContent = 'Cancel Add';
            delBtn.classList.remove('btn-secondary');
            delBtn.classList.add('btn-secondary'); // Keep it secondary for cancel action
        }

        // Update section subtitle or add status indicator
        const gptSection = document.getElementById('gpt-section');
        const subtitle = gptSection?.querySelector('.section-subtitle');
        if (subtitle) {
            subtitle.innerHTML = 'Configure AI question generation<br><span style="color: var(--accent); font-weight: 600;">✏️ Creating new prompt...</span>';
        }
    }

    function exitAddPromptMode() {
        isInAddPromptMode = false;

        console.log('[DEBUG] Exiting add prompt mode, restoring selection:', previouslySelectedPromptId);

        // Restore UI
        if (promptSel) promptSel.disabled = false;
        
        if (profileNameInput) profileNameInput.placeholder = '';

        // Reset buttons
        if (addBtn) {
            addBtn.textContent = 'Add Prompt';
            addBtn.classList.remove('btn-primary');
            addBtn.classList.add('btn-secondary');
        }

        if (saveBtn) saveBtn.style.display = ''; // Show original "Save Prompt"
        if (delBtn) {
            delBtn.textContent = 'Delete Prompt';
            delBtn.classList.add('btn-secondary');
        }

        // Restore section subtitle
        const gptSection = document.getElementById('gpt-section');
        const subtitle = gptSection?.querySelector('.section-subtitle');
        if (subtitle) {
            subtitle.textContent = 'Configure AI question generation';
        }

        // Restore previous selection and reload its data
        if (previouslySelectedPromptId && promptSel) {
            promptSel.value = previouslySelectedPromptId;
            // Trigger the onchange to reload the selected prompt's details
            const changeEvent = new Event('change');
            promptSel.dispatchEvent(changeEvent);
        } else if (window.renderSelect) {
            window.renderSelect(); // Fallback to re-rendering if no previous selection
        }
    }

    // ----- Helpers -----
    function toggleGPTSection(on) {
        if (!gptBody) return;
        const inputs = gptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
        gptBody.style.opacity = on ? '1' : '0.5';
        inputs.forEach(el => {
            // Don't disable the enable GPT checkbox itself
            if (el.id === 'enable-gpt') return;
            el.disabled = !on;
        });
    }

    const uid = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback: RFC4122 version 4 compliant
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // ── AnkiConnect Helpers ──────────────────────────────────────────────
    async function fetchAnki(action, params = {}) {
        try {
            const res = await fetch('http://127.0.0.1:8765', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, version: 6, params })
            });
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.result;
        } catch (err) {
            console.error(`AnkiConnect action "${action}" failed:`, err);
            throw err;
        }
    }

    async function fetchDeckNames() {
        try {
            return await fetchAnki("deckNames");
        } catch (err) {
            console.warn('[Options][fetchDeckNames] Could not fetch deck names:', err);
            return [];
        }
    }

    async function fetchModelNames() {
        try {
            return await fetchAnki("modelNames");
        } catch (err) {
            console.warn('[Options][fetchModelNames] Could not fetch model names:', err);
            return ['Basic', 'Cloze']; // Fallback defaults
        }
    }

    // ----- OpenAI test -----
    async function testOpenAI(apiKey){
        try{
            const response = await fetch('https://api.openai.com/v1/models',{
                headers:{'Authorization':`Bearer ${apiKey}`}
            });
            return {success: response.ok, error: response.ok ? null : 'API error'};
        }catch(e){
            return {success:false,error:'Network error'};
        }
    }

    // ----- Storage helpers -----
    const loadSettings = ()=>new Promise(resolve=>{
        chrome.storage.local.get(DEFAULT_SETTINGS,resolve);
    });

    const saveSettings = s=>new Promise(resolve=>{
        chrome.storage.local.set(s,()=>{
            window.showUINotification('Settings saved');
            resolve();
        });
    });

    const updatePendingCards = async () => {
        const {pendingClips=[]} = await chrome.storage.local.get({pendingClips: []});
        if (pendingCount) {
            pendingCount.textContent = `${pendingClips.length}`;
        }
    };

    // ----- UI initialisation -----
    const initializeUI = async ()=>{
        const settings = await loadSettings();
        
        // Set global settings immediately - this is the single source of truth
        window.currentSettings = settings;

        // --- Fix malformed prompts: ensure every prompt has an id ---
        let needsFix = false;
        if (window.currentSettings.prompts) {
            window.currentSettings.prompts.forEach(p => {
                if (!p.id) {
                    p.id = uid();
                    needsFix = true;
                }
            });
        }
        
        // If any prompt was missing an id, update storage
        if (needsFix) {
            const prompts = window.currentSettings.prompts;
            let selectedPromptId = window.currentSettings.selectedPrompt;
            
            // If selectedPromptId is not present, set to first prompt's id
            if (!prompts.some(p => p.id === selectedPromptId)) {
                selectedPromptId = prompts[0]?.id;
            }
            
            window.currentSettings.prompts = prompts;
            window.currentSettings.selectedPrompt = selectedPromptId;
            await saveSettings({ prompts, selectedPrompt: selectedPromptId });
        }

        // Ensure storage isn't empty
        if (!window.currentSettings.prompts?.length) {
            window.currentSettings.prompts = [DEFAULT_PROFILE];
            window.currentSettings.selectedPrompt = DEFAULT_PROFILE.id;
            await saveSettings({ 
                prompts: window.currentSettings.prompts,
                selectedPrompt: window.currentSettings.selectedPrompt 
            });
        }

        // --- Functions that ALWAYS use window.currentSettings ---
        function renderSelect() {
            // ALWAYS get the latest prompts from window.currentSettings
            const { prompts = [DEFAULT_PROFILE], selectedPrompt: currentSelectedPromptId } = window.currentSettings;
            const localPrompts = Array.isArray(prompts) ? prompts : [DEFAULT_PROFILE];

            if (!promptSel) return; // Guard clause

            promptSel.innerHTML = ''; // Clear and rebuild the select

            // Add system prompts first (read-only)
            SYSTEM_PROMPTS.forEach(p => {
                const option = new Option(p.label, p.id);
                option.style.fontStyle = 'italic';
                option.style.color = '#6c757d';
                promptSel.add(option);
            });

            // Add separator if there are user prompts
            const userPromptsExist = localPrompts.some(p => !SYSTEM_PROMPTS.some(sp => sp.id === p.id));
            if (userPromptsExist) {
                const separator = new Option('── User Prompts ──', '', true, false);
                separator.disabled = true;
                separator.style.fontWeight = 'bold';
                separator.style.color = '#495057';
                promptSel.add(separator);
            }

            // Add user prompts (filter out any system prompts that might be in settings.prompts)
            localPrompts.filter(p => !SYSTEM_PROMPTS.some(sp => sp.id === p.id)).forEach(p => {
                if (p && p.id && p.label) {
                    promptSel.add(new Option(p.label, p.id));
                }
            });

            // Find current prompt to display
            let currentDisplayPrompt = SYSTEM_PROMPTS.find(p => p.id === currentSelectedPromptId) ||
                                     localPrompts.find(p => p.id === currentSelectedPromptId);

            if (!currentDisplayPrompt) { // Fallback if selected not found
                currentDisplayPrompt = localPrompts.find(p => !p.isSystem) || SYSTEM_PROMPTS[0];
                if (currentDisplayPrompt) {
                    // Update window.currentSettings to reflect the fallback
                    window.currentSettings.selectedPrompt = currentDisplayPrompt.id;
                }
            }

            if (currentDisplayPrompt) {
                promptSel.value = currentDisplayPrompt.id;
                
                // Update UI based on selection type
                const isSystemPrompt = SYSTEM_PROMPTS.some(p => p.id === currentDisplayPrompt.id);
                updateUIForPromptType(currentDisplayPrompt, isSystemPrompt);
            } else {
                console.warn("Could not determine current prompt to display in renderSelect");
            }

            // Cap at 5 user prompts (system prompts don't count) - use fresh data
            const userPromptsCount = localPrompts.filter(p => !SYSTEM_PROMPTS.some(sp => sp.id === p.id)).length;
            if (addBtn) {
                if (userPromptsCount >= 5) {
                    addBtn.disabled = true;
                    addBtn.classList.add('grey');
                    if (promptLimitMsg) promptLimitMsg.style.display = '';
                } else {
                    addBtn.disabled = false;
                    addBtn.classList.remove('grey');
                    if (promptLimitMsg) promptLimitMsg.style.display = 'none';
                }
            }
        }

        function updateUIForPromptType(current, isSystemPrompt) {
            if (isInAddPromptMode) {
                // If we are in add mode, don't overwrite the empty fields
                return; 
            }
            
            // Update template and name fields
            if (tplBox) tplBox.value = current?.template || '';
            if (profileNameInput) profileNameInput.value = current?.label || '';
            
            // Disable editing for system prompts
            if (tplBox) tplBox.disabled = isSystemPrompt;
            if (profileNameInput) profileNameInput.disabled = isSystemPrompt;
            if (saveBtn) saveBtn.disabled = isSystemPrompt;
            
            // REMOVED: The userPromptsCount <= 1 check that was preventing deletion of last user prompt
            if (delBtn) delBtn.disabled = isSystemPrompt;
            
            // Visual styling for read-only state
            if (isSystemPrompt) {
                if (tplBox) {
                    tplBox.style.backgroundColor = '#f8f9fa';
                    tplBox.style.color = '#6c757d';
                }
                if (profileNameInput) {
                    profileNameInput.style.backgroundColor = '#f8f9fa';
                    profileNameInput.style.color = '#6c757d';
                }
                
                // Add help text for system prompts
                if (tplBox) {
                    let helpText = tplBox.parentNode.querySelector('.system-prompt-help');
                    if (!helpText) {
                        helpText = document.createElement('div');
                        helpText.className = 'help-text system-prompt-help';
                        helpText.innerHTML = '🔒 This is a system default prompt and cannot be edited. You can create your own custom prompts using the "Add Prompt" button.';
                        tplBox.parentNode.appendChild(helpText);
                    }
                }
            } else {
                if (tplBox) {
                    tplBox.style.backgroundColor = '';
                    tplBox.style.color = '';
                }
                if (profileNameInput) {
                    profileNameInput.style.backgroundColor = '';
                    profileNameInput.style.color = '';
                }
                
                // Remove system prompt help text
                if (tplBox) {
                    const helpText = tplBox.parentNode.querySelector('.system-prompt-help');
                    if (helpText) helpText.remove();
                }
            }
            
            // Visual "current prompt" hint
            const sectionTitle = document.querySelector('#gpt-body > .section-title');
            if (sectionTitle) {
                const prefix = isSystemPrompt ? '🔒 ' : '';
                sectionTitle.textContent = `Current: ${prefix}${current?.label || 'Unknown'}`;
            }
        }

        // Initialize form elements with current settings data
        if (deckSel) deckSel.innerHTML  = `<option value="${window.currentSettings.deckName}">${window.currentSettings.deckName}</option>`;
        if (modelSel) modelSel.innerHTML = `<option value="${window.currentSettings.modelName}">${window.currentSettings.modelName}</option>`;

        if (deckSel) deckSel.value   = window.currentSettings.deckName;
        if (modelSel) modelSel.value  = window.currentSettings.modelName;
        
        // Initialize GPT toggle
        if (enableGpt) {
            enableGpt.checked = window.currentSettings.gptEnabled;
            toggleGPTSection(window.currentSettings.gptEnabled); // Set initial state
        }
        
        // Initialize always confirm toggle
        if (alwaysConfirm) {
            alwaysConfirm.checked = window.currentSettings.alwaysConfirm;
        }
        
        if (keyInput) keyInput.value  = window.currentSettings.openaiKey;
        
        // Initialize template box with current prompt
        if (tplBox) {
            const currentPrompt = window.currentSettings.prompts.find(p => p.id === window.currentSettings.selectedPrompt) || 
                                 window.currentSettings.prompts[0] || 
                                 DEFAULT_PROFILE;
            tplBox.value = currentPrompt.template || '';
        }
        
        // Initialize confirm GPT toggle
        if (confirmGptEl) {
            confirmGptEl.checked = window.currentSettings.confirmGpt;
        }

        // Initialize section states using the newly defined toggleSection
        console.log('[DEBUG][initializeUI] Initializing section states...');
        
        if (ankiBody && ankiToggle) {
            console.log('[DEBUG][initializeUI] Setting up Anki section...');
            toggleSection(ankiBody, ankiToggle, true); // Expand Anki
        } else {
            console.warn('[DEBUG][initializeUI] Anki section elements not found:', { ankiBody, ankiToggle });
        }
        
        if (gptBody && gptToggle) {
            console.log('[DEBUG][initializeUI] Setting up GPT section...');
            toggleSection(gptBody, gptToggle, true);   // Expand GPT
        } else {
            console.warn('[DEBUG][initializeUI] GPT section elements not found:', { gptBody, gptToggle });
        }
        
        if (historyBody && historyToggle) {
            console.log('[DEBUG][initializeUI] Setting up History section...');
            toggleSection(historyBody, historyToggle, false); // Collapse History by default
        } else {
            console.warn('[DEBUG][initializeUI] History section elements not found:', { historyBody, historyToggle });
        }
        
        if (pdfReviewBody && pdfReviewToggle) {
            console.log('[DEBUG][initializeUI] Setting up PDF Review section...');
            toggleSection(pdfReviewBody, pdfReviewToggle, false); // Collapse PDF Review by default
        } else {
            console.warn('[DEBUG][initializeUI] PDF Review section elements not found:', { pdfReviewBody, pdfReviewToggle });
        }

        await refreshAnkiStatus();
        await updatePendingCards();
        await refreshPromptHistory();
        // Ensure history is collapsed after refreshing
        if (historyBody && historyToggle) toggleSection(historyBody, historyToggle, false);

        // Change prompt selection handler - CRITICAL FIX
        if (promptSel) {
            promptSel.onchange = () => {
                if (isInAddPromptMode) {
                    console.log('[DEBUG] Dropdown changed while in add mode, exiting add mode');
                    exitAddPromptMode(); // This should restore previous selection, then onchange runs again
                    return; // exitAddPromptMode will trigger a change event that re-runs this
                }

                const newSelectedId = promptSel.value;
                
                // Update the selectedPrompt in global settings
                window.currentSettings.selectedPrompt = newSelectedId; 

                // CRITICAL: Get current prompts from window.currentSettings
                const { prompts: currentPromptsList = [] } = window.currentSettings;

                const isSystem = SYSTEM_PROMPTS.some(p => p.id === newSelectedId);
                let activePromptObject = isSystem 
                    ? SYSTEM_PROMPTS.find(p => p.id === newSelectedId)
                    : currentPromptsList.find(p => p.id === newSelectedId);

                if (activePromptObject) {
                    saveSettings({ selectedPrompt: newSelectedId }) // Only save the selected ID change
                        .then(() => {
                            updateUIForPromptType(activePromptObject, isSystem);
                        })
                        .catch(error => {
                            console.error("Error saving selected prompt or updating UI:", error);
                        });
                } else {
                    console.error("Selected prompt ID not found in onchange:", newSelectedId);
                    console.error("Available user prompts:", currentPromptsList.map(p => `${p.id}: ${p.label}`));
                    console.error("Available system prompts:", SYSTEM_PROMPTS.map(p => `${p.id}: ${p.label}`));
                    console.error("Looking for ID:", newSelectedId);
                }
            };
        }

        // Simple input field handling
        if (profileNameInput) {
            profileNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    profileNameInput.blur();
                }
            });
        }

        // Call renderSelect to initialize the UI
        renderSelect();

        // Expose functions to window scope for cross-function access
        window.saveSettings = saveSettings;
        window.renderSelect = renderSelect;
        window.refreshPromptHistory = refreshPromptHistory;
        window.renderPdfReviewList = renderPdfReviewList;
    };

    // ----- Helper function for unique labels -----
    function getUniquePromptLabel(baseLabel, existingPrompts, excludeId = null) {
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

    // ----- Section toggle functionality -----
    function toggleSection(body, toggle, initialExpandedState = null) {
        console.log('[DEBUG][toggleSection] Called with:', { 
            body: body?.id || body?.className, 
            toggle: toggle?.textContent, 
            initialExpandedState 
        });

        // body is .section-body
        // body.parentElement is .section-body-wrapper
        // body.parentElement.parentElement is .section (this is what we want to target)
        const sectionElement = body.parentElement?.parentElement; 

        console.log('[DEBUG][toggleSection] Element hierarchy:', {
            body: body?.tagName + (body?.id ? `#${body.id}` : '') + (body?.className ? `.${body.className}` : ''),
            wrapper: body?.parentElement?.tagName + (body?.parentElement?.className ? `.${body.parentElement.className}` : ''),
            section: sectionElement?.tagName + (sectionElement?.id ? `#${sectionElement.id}` : '') + (sectionElement?.className ? `.${sectionElement.className}` : '')
        });

        if (!sectionElement) {
            console.error('[DEBUG][toggleSection] Could not find section element for section body', body);
            return; 
        }

        let shouldBeExpanded;
        const currentlyCollapsed = sectionElement.classList.contains('collapsed');
        
        if (initialExpandedState !== null) {
            // This path is for initial setup from initializeUI
            shouldBeExpanded = initialExpandedState;
            console.log('[DEBUG][toggleSection] Initial setup. Current classList:', Array.from(sectionElement.classList), 'Setting expanded to:', shouldBeExpanded);
        } else {
            // This path is for user clicks - toggle the current state
            shouldBeExpanded = currentlyCollapsed; // If it's collapsed, we want to expand it. If not collapsed, we want to collapse it.
            console.log('[DEBUG][toggleSection] User click. Current classList:', Array.from(sectionElement.classList), 'Contains "collapsed":', currentlyCollapsed, 'Derived shouldBeExpanded:', shouldBeExpanded);
        }

        // Apply the class to the SECTION ELEMENT
        if (shouldBeExpanded) {
            sectionElement.classList.remove('collapsed');
            toggle.textContent = '▾'; // HTML's expanded icon
            console.log('[DEBUG][toggleSection] Section expanded, icon set to ▾');
        } else {
            sectionElement.classList.add('collapsed');
            toggle.textContent = '▸'; // Collapsed icon (right-pointing small triangle)
            console.log('[DEBUG][toggleSection] Section collapsed, icon set to ▸');
        }

        console.log('[DEBUG][toggleSection] Final classList for', sectionElement.id, ':', Array.from(sectionElement.classList));
    }

    // ----- Status and refresh functions -----
    async function refreshAnkiStatus() {
        if (!statusText) return;

        try {
            statusText.textContent = 'Connecting...';
            statusText.className = 'status-connecting';

            // Fetch all required data at once
            const [decks, models, settings] = await Promise.all([
                fetchDeckNames(),
                fetchModelNames(),
                loadSettings()
            ]);

            statusText.textContent = 'Connected ✓';
            statusText.className = 'status-connected';
            if (statusHelp) statusHelp.style.display = 'none'; // Hide error message on success

            // Populate the Decks dropdown
            if (deckSel) {
                deckSel.innerHTML = ''; // Clear old options
                decks.forEach(deck => deckSel.add(new Option(deck, deck)));
                deckSel.value = settings.deckName; // Set the saved value
            }

            // Populate the Models dropdown
            if (modelSel) {
                modelSel.innerHTML = ''; // Clear old options
                models.forEach(model => modelSel.add(new Option(model, model)));
                modelSel.value = settings.modelName; // Set the saved value
            }

        } catch (error) {
            statusText.textContent = 'Connection failed ✗';
            statusText.className = 'status-error';
            if (statusHelp) statusHelp.style.display = 'block'; // Show error message on failure
            console.error('Anki connection error:', error);
        }
    }

    async function refreshPromptHistory() {
        if (!historyList || !historyCount) return;

        try {
            const { promptHistory = [] } = await chrome.storage.local.get({ promptHistory: [] });

            historyCount.textContent = promptHistory.length;
            historyList.innerHTML = ''; // Clear previous entries

            if (promptHistory.length === 0) {
                historyList.innerHTML = '<div class="history-empty">No prompt history yet. Generated cards will appear here.</div>';
                return;
            }

            promptHistory.forEach(entry => {
                const item = document.createElement('div');
                item.className = 'history-item'; // Use a consistent class for styling

                // Determine which generated content to show
                const generatedContent = entry.generatedFront || entry.generatedClozeText || 'N/A';
                const sourceText = entry.sourceText || 'N/A';

                item.innerHTML = `
                    <div class="history-item-header">
                        <span>${new Date(entry.timestamp).toLocaleString()}</span>
                        <span class="history-item-details">${entry.deckName} | ${entry.modelName}</span>
                    </div>
                    <div class="history-item-body">
                        <div class="history-content-block">
                            <strong class="history-label">Source Text:</strong>
                            <div class="history-text-content">${sourceText}</div>
                        </div>
                        <div class="history-content-block">
                            <strong class="history-label">Generated Content:</strong>
                            <div class="history-text-content">${generatedContent}</div>
                        </div>
                    </div>
                `;
                historyList.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading prompt history:', error);
            historyList.innerHTML = '<div class="history-error">Error loading history.</div>';
        }
    }

    async function renderPdfReviewList() {
        const reviewList = document.getElementById('pdf-review-list');
        const reviewCount = document.getElementById('pdf-review-count');
        if (!reviewList || !reviewCount) return;

        const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
        reviewCount.textContent = `${pendingReviewPdfCards.length} cards for review`;
        reviewList.innerHTML = '';

        if (pendingReviewPdfCards.length === 0) {
            reviewList.innerHTML = '<div class="history-empty">No PDF cards are currently awaiting review.</div>';
            return;
        }

        const [deckNames, modelNames] = await Promise.all([fetchDeckNames(), fetchModelNames()]);

        pendingReviewPdfCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'review-card'; // New class for styling
            cardElement.dataset.cardId = card.id;

            const deckOptions = deckNames.map(d => `<option value="${d}" ${d === card.originalDeckName ? 'selected' : ''}>${d}</option>`).join('');
            const modelOptions = modelNames.map(m => `<option value="${m}" ${m === card.originalModelName ? 'selected' : ''}>${m}</option>`).join('');

            const contentInput = card.isCloze
                ? `<textarea class="form-textarea" rows="5">${card.generatedClozeText || card.sourceText}</textarea>`
                : `<input type="text" class="form-input" value="${card.generatedFront}" placeholder="Enter question front...">`;

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
                        <div class="source-text-preview">${card.sourceText}</div>
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
                <div class="review-card-footer">
                    <button class="btn btn-secondary remove-btn">Remove</button>
                    <button class="btn btn-primary save-btn">Save to Anki</button>
                </div>
            `;
            reviewList.appendChild(cardElement);
        });

        // Add event listeners for the new buttons and inputs
        reviewList.addEventListener('click', async (e) => {
            const cardElement = e.target.closest('.review-card');
            if (!cardElement) return;

            const cardId = cardElement.dataset.cardId;
            const cardData = pendingReviewPdfCards.find(c => c.id === cardId);

            if (e.target.classList.contains('remove-btn')) {
                const remainingCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
                await chrome.storage.local.set({ pendingReviewPdfCards: remainingCards });
                renderPdfReviewList(); // Re-render the list
                window.showUINotification('Card removed successfully', 'success');
            }

            if (e.target.classList.contains('save-btn')) {
                const front = cardData.isCloze ? cardElement.querySelector('textarea').value : cardElement.querySelector('input').value;
                const back = cardData.isCloze ? cardElement.querySelector('textarea').value : cardData.sourceText;
                const deck = cardElement.querySelector('.deck-select').value;
                const model = cardElement.querySelector('.model-select').value;

                chrome.runtime.sendMessage({
                    action: 'saveFinalizedPdfCard',
                    cardData: { 
                        front: front, 
                        backHtml: back, 
                        deckName: deck, 
                        modelName: model,
                        imageHtml: cardData.imageHtml || "", // Include imageHtml in the message
                        pageTitle: cardData.originalPageTitle || 'PDF Review',
                        pageUrl: cardData.originalPageUrl || ''
                    }
                }, async (response) => {
                    if (response && response.success) {
                        const remainingCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
                        await chrome.storage.local.set({ pendingReviewPdfCards: remainingCards });
                        renderPdfReviewList(); // Re-render the list
                        window.showUINotification('Card saved successfully!', 'success');
                    } else {
                        window.showUINotification(`Save failed: ${response?.error || 'Unknown error'}`, 'error');
                    }
                });
            }
        });
    }

    // Initialize the UI - This should ALWAYS run
    await initializeUI();

    // ----- Individual Event Listeners (Only attach if elements exist) -----
    
    // Prompt management buttons
    if (addBtn) {
        addBtn.onclick = () => {
            if (isInAddPromptMode) {
                // This button now acts as "Save New Prompt"
                const newLabel = profileNameInput?.value.trim() || '';
                const newTemplate = tplBox?.value.trim() || '';

                if (!newLabel) {
                    window.showUINotification('Prompt name required', 'error');
                    if (profileNameInput) profileNameInput.focus();
                    return;
                }
                if (!newTemplate) {
                    window.showUINotification('Prompt template required', 'error');
                    if (tplBox) tplBox.focus();
                    return;
                }

                const { prompts = [] } = window.currentSettings || {};
                const newId = uid();
                const uniqueLabel = getUniquePromptLabel(newLabel, prompts);

                const updatedPrompts = [...prompts, { id: newId, label: uniqueLabel, template: newTemplate }];
                
                // CRITICAL: Update window.currentSettings FIRST
                window.currentSettings.prompts = updatedPrompts;
                window.currentSettings.selectedPrompt = newId;
                
                // Save to storage
                saveSettings({ prompts: updatedPrompts, selectedPrompt: newId }).then(() => {
                    // Re-render the select dropdown with the new data
                    if (window.renderSelect) window.renderSelect();
                    window.showUINotification('New prompt saved!');
                    if (window.flashButtonGreen) window.flashButtonGreen(addBtn);
                    exitAddPromptMode(); // Revert UI
                });

            } else {
                // Enter "Add Mode"
                enterAddPromptMode();
            }
        };
    }

    if (saveBtn) {
        saveBtn.onclick = () => {
            if (isInAddPromptMode || (saveBtn && saveBtn.disabled)) return; 

            const currentSelectedId = promptSel?.value;
            const { prompts: currentPromptsArray = [] } = window.currentSettings; // Get current prompts
            const promptToEditIndex = currentPromptsArray.findIndex(p => p.id === currentSelectedId);

            if (promptToEditIndex !== -1 && !SYSTEM_PROMPTS.some(p => p.id === currentSelectedId)) {
                const promptToEdit = { ...currentPromptsArray[promptToEditIndex] }; // Work on a copy

                const newLabel = getUniquePromptLabel(profileNameInput?.value || '', currentPromptsArray, promptToEdit.id);
                promptToEdit.label = newLabel;
                promptToEdit.template = tplBox?.value.trim() || '';

                const updatedPrompts = [...currentPromptsArray];
                updatedPrompts[promptToEditIndex] = promptToEdit;

                // CRITICAL: Update window.currentSettings FIRST
                window.currentSettings.prompts = updatedPrompts;

                saveSettings({ prompts: updatedPrompts, selectedPrompt: currentSelectedId }).then(() => {
                    if (window.renderSelect) window.renderSelect(); // Re-render to reflect name change
                    window.showUINotification('Prompt updated!');
                    if (window.flashButtonGreen) window.flashButtonGreen(saveBtn);
                });
            } else {
                window.showUINotification('System prompts cannot be edited here, or prompt not found.', 'error');
            }
        };
    }

    if (delBtn) {
        delBtn.onclick = () => {
            if (isInAddPromptMode) {
                // This button now acts as "Cancel Add"
                exitAddPromptMode();
                window.showUINotification('Add prompt cancelled.');
            } else {
                // Original delete functionality
                const { prompts: currentPromptsArray = [] } = window.currentSettings;
                const selectedId = promptSel?.value;
                // Find the prompt object from either system or user prompts
                const currentPrompt = SYSTEM_PROMPTS.find(p => p.id === selectedId) || currentPromptsArray.find(p => p.id === selectedId);

                if (!currentPrompt) {
                    window.showUINotification('Please select a prompt to delete.', 'error');
                    return;
                }

                if (currentPrompt.isSystem) {
                    window.showUINotification('Cannot delete system prompts. Select a user prompt.', 'error');
                    return;
                }
                
                // At this point, 'currentPrompt' is a user prompt that can be deleted.
                if (confirm(`Are you sure you want to delete the prompt "${currentPrompt.label}"? This cannot be undone.`)) {
                    const updatedPrompts = currentPromptsArray.filter(p => p.id !== selectedId);
                    // Fallback to first remaining user prompt, then first system, then absolute default
                    const newSelectedPromptId = updatedPrompts.find(p => !SYSTEM_PROMPTS.some(sp => sp.id === p.id))?.id || SYSTEM_PROMPTS[0]?.id || DEFAULT_PROFILE.id;

                    // CRITICAL: Update window.currentSettings FIRST
                    window.currentSettings.prompts = updatedPrompts;
                    window.currentSettings.selectedPrompt = newSelectedPromptId;

                    saveSettings({ prompts: updatedPrompts, selectedPrompt: newSelectedPromptId }).then(() => {
                        if (window.renderSelect) window.renderSelect();
                        window.showUINotification('Prompt deleted');
                        if (window.flashButtonGreen) window.flashButtonGreen(delBtn);
                    });
                }
            }
        };
    }

    // Auto-save handlers for other form elements
    if (deckSel) {
        deckSel.onchange = () => {
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ deckName: deckSel.value });
        };
    }
    
    if (modelSel) {
        modelSel.onchange = () => {
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ modelName: modelSel.value });
        };
    }
    
    // Fix: Add missing event listener for GPT enable toggle
    if (enableGpt) {
        enableGpt.onchange = () => {
            const isEnabled = enableGpt.checked;
            toggleGPTSection(isEnabled); // Update UI state
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ gptEnabled: isEnabled }); // Persist to storage
        };
    }
    
    if (keyInput) {
        keyInput.onblur = () => {
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ openaiKey: keyInput.value });
        };
    }
    
    if (alwaysConfirm) {
        alwaysConfirm.onchange = () => {
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ alwaysConfirm: alwaysConfirm.checked });
        };
    }
    
    if (confirmGptEl) {
        confirmGptEl.onchange = () => {
            const saveSettings = window.saveSettings || (() => Promise.resolve());
            saveSettings({ confirmGpt: confirmGptEl.checked });
        };
    }

    // Clear history button handler (for prompt history)
    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = () => {
            if (confirm('Clear all prompt history? This cannot be undone.')) {
                chrome.storage.local.set({ promptHistory: [] }, () => {
                    if (window.refreshPromptHistory) window.refreshPromptHistory();
                    window.showUINotification('Prompt history cleared');
                    if (window.flashButtonGreen) window.flashButtonGreen(clearHistoryBtn);
                });
            }
        };
    }

    // Clear PDF history button handler (for PDF review cards)
    if (clearPdfHistoryBtn) {
        clearPdfHistoryBtn.onclick = () => {
            if (confirm('Clear all PDF review cards? This cannot be undone.')) {
                chrome.storage.local.set({ pendingReviewPdfCards: [] }, () => {
                    if (window.renderPdfReviewList) window.renderPdfReviewList();
                    window.showUINotification('PDF review cards cleared');
                    if (window.flashButtonGreen) window.flashButtonGreen(clearPdfHistoryBtn);
                });
            }
        };
    }

    // Refresh PDF review list button handler
    if (refreshPdfReviewBtn) {
        refreshPdfReviewBtn.onclick = () => {
            if (window.renderPdfReviewList) window.renderPdfReviewList();
            window.showUINotification('PDF review list refreshed');
            if (window.flashButtonGreen) window.flashButtonGreen(refreshPdfReviewBtn);
        };
    }

    // Update queueClip to store pageTitle and pageUrl
    async function queueClip(clip) {
        const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
        // clip now includes pageTitle and pageUrl
        pendingClips.push(clip);
        await chrome.storage.local.set({ pendingClips });
    }

    // Modify saveToAnkiOrQueue to accept pageTitle, pageUrl, and imageHtml
    async function saveToAnkiOrQueue(front, backHtml, settings, tabId, pageTitle = "", pageUrl = "", imageHtml = "") {
        try {
            let extraContentForCloze = "";
            if (/cloze/i.test(settings.modelName)) {
                // Construct extraContentForCloze with both image and source
                if (imageHtml) {
                    extraContentForCloze += imageHtml;
                    if (pageUrl) {
                        extraContentForCloze += "<br><hr><br>"; // Add separator between image and source
                    }
                }
                if (pageUrl) {
                    // Generate source link HTML for cloze Extra field
                    const sourceHtml = generateBackWithSource("", pageTitle, pageUrl);
                    extraContentForCloze += sourceHtml;
                }
            }
            
            await addToAnki(front, backHtml, settings.deckName, settings.modelName, extraContentForCloze);
            
            // ...existing code...
        } catch (err) {
            if (err instanceof TypeError) { // Anki offline
                await queueClip({ front, backHtml, ...settings, pageTitle, pageUrl, imageHtml });
                // ...existing code...
            }
            // ...existing code...
        }
    }

    // Update flushQueue to pass imageHtml
    const flushQueue = async () => {
        // ...existing code...
        
        for (const clip of pendingClips) {
            try {
                await saveToAnkiOrQueue(clip.front, clip.backHtml, clip, null, clip.pageTitle, clip.pageUrl, clip.imageHtml);
                // ...existing code...
            } catch (err) {
                // ...existing code...
            }
        }
        
        // ...existing code...
    };

    // Update handleAction calls to detect and extract images for cloze notes
    async function handleAction(action, tab) {
        // ...existing code...
        
        const pageTitle = tab.title || 'Untitled';
        const pageUrl = tab.url || '';
        
        // Extract image for cloze notes
        let imageHtmlForExtra = "";
        if (isCloze && selectionContent && /<img[^>]+>/i.test(selectionContent)) {
            const imgMatch = selectionContent.match(/<img[^>]+>/i);
            if (imgMatch) {
                imageHtmlForExtra = imgMatch[0];
            }
        }
        
        // ...existing code...
        
        if (settings.alwaysConfirm || settings.confirmGpt) {
            // ...existing code...
            await queueClip({ front, backHtml, ...settings, pageTitle, pageUrl, imageHtml: imageHtmlForExtra });
        } else {
            await saveToAnkiOrQueue(front, backHtml, settings, tab.id, pageTitle, pageUrl, imageHtmlForExtra);
        }
        
        // ...existing code...
    }

    // Update handlePdfSelection calls (though PDFs are unlikely to have img tags)
    async function handlePdfSelection(selection, tab) {
        // ...existing code...
        
        const pageTitle = tab.title || 'PDF Document';
        const pageUrl = tab.url || '';
        
        // Extract image for cloze notes (unlikely in PDFs but for completeness)
        let imageHtmlForExtra = "";
        if (isCloze && info.selectionText && /<img[^>]+>/i.test(info.selectionText)) {
            const imgMatch = info.selectionText.match(/<img[^>]+>/i);
            if (imgMatch) {
                imageHtmlForExtra = imgMatch[0];
            }
        }
        
        // ...existing code...
        
        if (settings.alwaysConfirm || settings.confirmGpt) {
            // ...existing code...
            await queueClip({ front, backHtml, ...settings, pageTitle, pageUrl, imageHtml: imageHtmlForExtra });
        } else {
            await saveToAnkiOrQueue(front, backHtml, settings, tab.id, pageTitle, pageUrl, imageHtmlForExtra);
        }
        
        // ...existing code...
    }

    // Update message listener for saveFinalizedPdfCard
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // ...existing code...
        
        if (message.action === 'saveFinalizedPdfCard') {
            const { front, backHtml, deckName, modelName } = message.cardData;
            const settings = { deckName, modelName };
            
            // For finalized PDF cards, use generic title and empty URL, no image
            saveToAnkiOrQueue(front, backHtml, settings, null, 'PDF Review', '', '')
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            
            return true; // Keep message channel open for async response
        }
        
        // ...existing code...
    });

    // Add show/hide API key toggle functionality
    if (keyToggle && keyInput) {
        keyToggle.addEventListener('click', () => {
            const isHidden = keyInput.type === 'password';
            keyInput.type = isHidden ? 'text' : 'password';
            keyToggle.setAttribute('aria-label', isHidden ? 'Hide API Key' : 'Show API Key');
        });
    }
});