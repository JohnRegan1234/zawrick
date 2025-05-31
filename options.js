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
    const clearHistoryBtn = document.getElementById('clear-history');

    // Fix prompt profile element references (ensure correct IDs in your HTML)
    const promptNameInput = document.getElementById('prompt-name'); // new input for naming profiles

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

    // Only attach listeners if all elements exist
    if (promptSel && tplBox && saveBtn && addBtn && delBtn && profileNameInput) {
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

        // ----- AnkiConnect -----
        async function fetchAnki(action, params={}) {
            const res = await fetch('http://127.0.0.1:8765', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action, version: 6, params})
            });
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.result;
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

            // --- Fix malformed prompts: ensure every prompt has an id ---
            let prompts = Array.isArray(settings.prompts) ? settings.prompts : [];
            let selectedPromptId = settings.selectedPrompt;

            let needsFix = false;
            prompts.forEach(p => {
                if (!p.id) {
                    p.id = uid();
                    needsFix = true;
                }
            });
            // If any prompt was missing an id, update storage and selectedPromptId
            if (needsFix) {
                // If selectedPromptId is not present, set to first prompt's id
                if (!prompts.some(p => p.id === selectedPromptId)) {
                    selectedPromptId = prompts[0]?.id;
                }
                await saveSettings({ prompts, selectedPrompt: selectedPromptId });
                settings.prompts = prompts;
                settings.selectedPrompt = selectedPromptId;
            }

            // Remove redeclaration of prompts and selectedPromptId here
            // let prompts = settings.prompts;
            // let selectedPromptId = settings.selectedPrompt;  // Always store as ID string

            // 3. after loadSettings(), ensure storage isn't empty
            if (!settings.prompts?.length) {
              await saveSettings({ prompts: [DEFAULT_PROFILE],
                                   selectedPrompt: DEFAULT_PROFILE.id });
              settings.prompts = [DEFAULT_PROFILE];
              settings.selectedPrompt = DEFAULT_PROFILE.id;
              prompts = settings.prompts;
              selectedPromptId = settings.selectedPrompt;
            }

            // --- Move renderSelect definition here ---
            let currentPromptId = null; // Track the currently displayed prompt (system or user)

            function renderSelect() {
              // Defensive: ensure prompts is always an array
              if (!Array.isArray(prompts)) prompts = [];
              if (!prompts.length) { prompts.push(DEFAULT_PROFILE); }
              
              // Clear and rebuild the select
              promptSel.innerHTML = '';
              
              // Add system prompts first (read-only)
              SYSTEM_PROMPTS.forEach(p => {
                const option = new Option(p.label, p.id);
                option.style.fontStyle = 'italic';
                option.style.color = '#6c757d';
                promptSel.add(option);
              });
              
              // Add separator if there are user prompts
              if (prompts.length > 0) {
                const separator = new Option('── User Prompts ──', '', true, false);
                separator.disabled = true;
                separator.style.fontWeight = 'bold';
                separator.style.color = '#495057';
                promptSel.add(separator);
              }
              
              // Add user prompts
              prompts.forEach(p => {
                if (p && p.id && p.label) {
                  promptSel.add(new Option(p.label, p.id));
                }
              });
              
              // Use currentPromptId if set, else selectedPromptId, else fallback
              let current = null;
              if (currentPromptId) {
                current = SYSTEM_PROMPTS.find(p => p.id === currentPromptId) ||
                          prompts.find(p => p.id === currentPromptId);
              }
              if (!current) {
                // FIX: Also allow DEFAULT_PROFILE (id: 'basic-default') to be selected as a valid prompt
                current = SYSTEM_PROMPTS.find(p => p.id === selectedPromptId) ||
                          prompts.find(p => p.id === selectedPromptId) ||
                          (selectedPromptId === DEFAULT_PROFILE.id ? DEFAULT_PROFILE : null) ||
                          prompts[0] ||
                          SYSTEM_PROMPTS[0];
                currentPromptId = current.id;
              }
              promptSel.value = current.id;
              
              // Update UI based on selection type
              // FIX: Treat DEFAULT_PROFILE as a user prompt (not system), so allow editing
              const isSystemPrompt = current.isSystem === true;
              updateUIForPromptType(current, isSystemPrompt);

              // Cap at 5 user prompts (system prompts don't count)
              if (prompts.length >= 5) {
                addBtn.disabled = true;
                addBtn.classList.add('grey');
                if (promptLimitMsg) promptLimitMsg.style.display = '';
              } else {
                addBtn.disabled = false;
                addBtn.classList.remove('grey');
                if (promptLimitMsg) promptLimitMsg.style.display = 'none';
              }
            }

            function updateUIForPromptType(current, isSystemPrompt) {
              // Update template and name fields
              tplBox.value = current?.template || '';
              profileNameInput.value = current.label;
              
              // Disable editing for system prompts
              tplBox.disabled = isSystemPrompt;
              profileNameInput.disabled = isSystemPrompt;
              saveBtn.disabled = isSystemPrompt;
              delBtn.disabled = isSystemPrompt || prompts.length <= 1;
              
              // Visual styling for read-only state
              if (isSystemPrompt) {
                tplBox.style.backgroundColor = '#f8f9fa';
                tplBox.style.color = '#6c757d';
                profileNameInput.style.backgroundColor = '#f8f9fa';
                profileNameInput.style.color = '#6c757d';
                
                // Add help text for system prompts
                let helpText = tplBox.parentNode.querySelector('.system-prompt-help');
                if (!helpText) {
                  helpText = document.createElement('div');
                  helpText.className = 'help-text system-prompt-help';
                  helpText.innerHTML = '🔒 This is a system default prompt and cannot be edited. You can create your own custom prompts using the "Add Prompt" button.';
                  tplBox.parentNode.appendChild(helpText);
                }
              } else {
                tplBox.style.backgroundColor = '';
                tplBox.style.color = '';
                profileNameInput.style.backgroundColor = '';
                profileNameInput.style.color = '';
                
                // Remove system prompt help text
                const helpText = tplBox.parentNode.querySelector('.system-prompt-help');
                if (helpText) helpText.remove();
              }
              
              // Visual "current prompt" hint
              const sectionTitle = document.querySelector('#gpt-body > .section-title');
              if (sectionTitle) {
                const prefix = isSystemPrompt ? '🔒 ' : '';
                sectionTitle.textContent = `Current: ${prefix}${current.label}`;
              }
            }
            // --- End move ---

            if (deckSel) deckSel.innerHTML  = `<option value="${settings.deckName}">${settings.deckName}</option>`;
            if (modelSel) modelSel.innerHTML = `<option value="${settings.modelName}">${settings.modelName}</option>`;

            if (deckSel) deckSel.value   = settings.deckName;
            if (modelSel) modelSel.value  = settings.modelName;
            
            // Initialize GPT toggle
            if (enableGpt) {
                enableGpt.checked = settings.gptEnabled;
                toggleGPTSection(settings.gptEnabled); // Set initial state
            }
            
            // Initialize always confirm toggle - no sync needed, checkbox handles state
            if (alwaysConfirm) {
                alwaysConfirm.checked = settings.alwaysConfirm;
            }
            
            if (keyInput) keyInput.value  = settings.openaiKey;
            if (tplBox) tplBox.value = (settings.prompts.find(p => p.id === settings.selectedPrompt) || settings.prompts[0])?.template || '';
            
            // Initialize confirm GPT toggle - no sync needed, checkbox handles state
            if (confirmGptEl) {
                confirmGptEl.checked = settings.confirmGpt;
            }

            // Initialize section states using the newly defined toggleSection
            if (ankiBody && ankiToggle) toggleSection(ankiBody, ankiToggle, true); // Expand Anki
            if (gptBody && gptToggle) toggleSection(gptBody, gptToggle, true);   // Expand GPT
            if (historyBody && historyToggle) toggleSection(historyBody, historyToggle, false); // Collapse History by default
            if (pdfReviewBody && pdfReviewToggle) toggleSection(pdfReviewBody, pdfReviewToggle, false); // Collapse PDF Review by default

            await refreshAnkiStatus();
            await updatePendingCards();
            await refreshPromptHistory();
            // Ensure history is collapsed after refreshing
            if (historyBody && historyToggle) toggleSection(historyBody, historyToggle, false);

            renderSelect();
            await renderPdfReviewList();

            // Change prompt selection handler:
            promptSel.onchange = () => {
              const newSelectedId = promptSel.value;

              // Update the module-level variables that track current state
              selectedPromptId = newSelectedId;
              currentPromptId = newSelectedId;

              const isSystem = SYSTEM_PROMPTS.some(p => p.id === newSelectedId);
              let activePromptObject = null;

              if (isSystem) {
                activePromptObject = SYSTEM_PROMPTS.find(p => p.id === newSelectedId);
              } else {
                activePromptObject = prompts.find(p => p.id === newSelectedId) ||
                                     (newSelectedId === DEFAULT_PROFILE.id ? DEFAULT_PROFILE : null);
              }

              if (activePromptObject) {
                // Persist the user's selection to storage
                saveSettings({ selectedPrompt: newSelectedId })
                  .then(() => {
                    // Update the UI fields (name, template, button states) based on the selection
                    updateUIForPromptType(activePromptObject, isSystem);
                    // The select dropdown's value is already visually updated by the user's action.
                    // No renderSelect() call here.
                  })
                  .catch(error => {
                    console.error("Error saving selected prompt or updating UI:", error);
                  });
              } else {
                console.error("Selected prompt ID not found:", newSelectedId);
                // Optionally, handle this error, e.g., by reverting to a default or showing a notification.
              }
            };

            // ----- State for staged prompt rename confirmation -----
            let isConfirmingRename = false;
            let originalProfileNameForCancel = null;
            // let cancelRenameBtnElement = null; // Will be added in a later stage

            // Save profile name changes on blur or Enter (only for user prompts)
            profileNameInput.addEventListener('change', () => {
                if (profileNameInput.disabled) return; // Skip if system prompt or already in confirmation

                // If a rename confirmation is already active from a previous change,
                // and the user edits the name again and blurs, we should probably
                // continue with the new value for confirmation, but not reset the whole UI yet.
                // For now, if isConfirmingRename is true, this event won't re-trigger the setup
                // until the current confirmation is resolved or cancelled.
                // A more advanced handling could update the target rename value.
                // For this stage, we'll keep it simple: if already confirming, this blur won't re-setup.

                const currentProfileId = promptSel.value;
                const profile = prompts.find(p => p.id === currentProfileId);
                const newName = profileNameInput.value.trim();

                if (profile && newName && newName !== profile.label) {
                    // Only set up for confirmation if not already in that state for THIS name change
                    if (!isConfirmingRename || originalProfileNameForCancel !== profile.label) {
                        isConfirmingRename = true;
                        originalProfileNameForCancel = profile.label; // Store the original name before edit
                        console.log(`[Options][Rename Stage 1] Rename confirmation initiated. Original: "${originalProfileNameForCancel}", New: "${newName}". Actual rename deferred.`);
                        // In future stages, UI changes for confirmation (button text, cancel button) will go here.
                        // The actual rename logic will be primarily in saveBtn.onclick when isConfirmingRename is true.
                    } else {
                        console.log(`[Options][Rename Stage 1] Name changed again while already confirming rename for "${originalProfileNameForCancel}". New target name is now "${newName}".`);
                    }
                } else if (profile && newName && newName === profile.label && isConfirmingRename && originalProfileNameForCancel === profile.label) {
                    // User changed name, then changed it back to original before confirming
                    console.log(`[Options][Rename Stage 1] Name reverted to original "${profile.label}" before confirmation. Resetting rename state.`);
                    isConfirmingRename = false;
                    originalProfileNameForCancel = null;
                    // In future stages, UI changes to revert confirmation UI would go here.
                }
            });

            profileNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    profileNameInput.blur();
                }
            });

            saveBtn.onclick = () => {
              if (saveBtn.disabled) return; // Skip if system prompt
              
              const p = prompts.find(p=>p.id===promptSel.value);
              if (p) {
                // Ensure unique label on save
                const newLabel = getUniquePromptLabel(profileNameInput.value, prompts, p.id);
                p.label = newLabel;
                p.template = tplBox.value.trim();
                saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                  renderSelect();
                  window.flashButtonGreen(saveBtn); // <<< ADD THIS LINE
                });
              }
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                addBtn.disabled = true;
                if (promptLimitMsg) promptLimitMsg.style.display = "block";
                return;
              }
              showPromptModal({
                mode: 'add',
                onSave: ({label, template}) => {
                  const id = uid();
                  const uniqueLabel = getUniquePromptLabel(label, prompts);
                  prompts.push({ id, label: uniqueLabel, template });
                  selectedPromptId = id;
                  saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    window.showUINotification('Prompt added');
                    window.flashButtonGreen(addBtn); // <<< ADD THIS LINE
                  });
                }
              });
            };

            // Remove prompt: select from dropdown, then confirm
            delBtn.onclick = () => {
              // Only allow removing user prompts (not system or default)
              const idx = prompts.findIndex(p => p.id === promptSel.value);
              if (idx === -1) {
                window.showUINotification('Select a user prompt to remove.', 'error');
                return;
              }
              const promptToRemove = prompts[idx];
              if (!confirm(`Are you sure you want to delete the prompt "${promptToRemove.label}"? This cannot be undone.`)) return;
              prompts.splice(idx, 1);
              const newId = prompts.length > 0 ? prompts[0].id : DEFAULT_PROFILE.id;
              selectedPromptId = newId;
              saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                renderSelect();
                if (promptLimitMsg) promptLimitMsg.style.display = "none";
                window.showUINotification('Prompt deleted');
                window.flashButtonGreen(delBtn); // <<< ADD THIS LINE
              });
            };

            // --- Prompt Modal UI ---
            let promptModal = null;
            function showPromptModal({mode = 'add', prompt = null, onSave = null}) {
              // Remove any existing modal
              if (promptModal) promptModal.remove();

              promptModal = document.createElement('div');
              promptModal.className = 'prompt-modal-backdrop';
              promptModal.innerHTML = `
                <div class="prompt-modal">
                  <div class="prompt-modal-header">
                    <span>${mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</span>
                    <button class="prompt-modal-close" title="Close">&times;</button>
                  </div>
                  <div class="prompt-modal-body">
                    <label>
                      <span>Prompt Name:</span>
                      <input type="text" class="prompt-modal-name" value="${prompt?.label || ''}" maxlength="60" />
                    </label>
                    <label>
                      <span>Prompt Template:</span>
                      <textarea class="prompt-modal-template" rows="6" maxlength="2000">${prompt?.template || ''}</textarea>
                    </label>
                  </div>
                  <div class="prompt-modal-footer">
                    <button class="btn btn-primary prompt-modal-save">${mode === 'add' ? 'Add Prompt' : 'Save Changes'}</button>
                    <button class="btn prompt-modal-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(promptModal);

              // Focus name input
              const nameInput = promptModal.querySelector('.prompt-modal-name');
              if (nameInput) nameInput.focus();

              // Close modal
              function closeModal() {
                if (promptModal) {
                  promptModal.remove();
                  promptModal = null;
                }
              }
              promptModal.querySelector('.prompt-modal-close').onclick = closeModal;
              promptModal.querySelector('.prompt-modal-cancel').onclick = closeModal;
              promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) closeModal();
              });

              // Save handler
              promptModal.querySelector('.prompt-modal-save').onclick = () => {
                const label = nameInput.value.trim();
                const template = promptModal.querySelector('.prompt-modal-template').value.trim();
                if (!label) {
                  window.showUINotification('Prompt name required', 'error');
                  nameInput.focus();
                  return;
                }
                if (!template) {
                  window.showUINotification('Prompt template required', 'error');
                  return;
                }
                if (onSave) onSave({label, template});
                closeModal();
              };
            }

            addBtn.onclick = () => {
              if (prompts.length >= 5) {
                window.showUINotification("Limit reached (5 user prompts). Delete one first.", 'error');
                add