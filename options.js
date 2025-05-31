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
              // FIX: Treat DEFAULT_PROFILE as a user prompt (not system)
              const isSystemPrompt = SYSTEM_PROMPTS.some(p => p.id === newSelectedId);
              currentPromptId = newSelectedId; // Always update the currently displayed prompt

              if (isSystemPrompt) {
                // For system prompts, just update UI but don't save to selectedPrompt
                const systemPrompt = SYSTEM_PROMPTS.find(p => p.id === newSelectedId);
                updateUIForPromptType(systemPrompt, true);
                renderSelect();
              } else {
                // For user prompts (including DEFAULT_PROFILE), update selectedPrompt and save
                selectedPromptId = newSelectedId;
                // Find in prompts or use DEFAULT_PROFILE if matches
                const userPrompt = prompts.find(p => p.id === selectedPromptId) ||
                                   (selectedPromptId === DEFAULT_PROFILE.id ? DEFAULT_PROFILE : null);
                saveSettings({ selectedPrompt: selectedPromptId }).then(() => {
                  updateUIForPromptType(userPrompt, false);
                  renderSelect();
                });
              }
            };

            // Save profile name changes on blur or Enter (only for user prompts)
            profileNameInput.addEventListener('change', () => {
                if (profileNameInput.disabled) return; // Skip if system prompt
                
                const p = prompts.find(p=>p.id===promptSel.value);
                if (p) {
                    if (confirm(`Rename "${p.label}" to "${profileNameInput.value}"?`)) {
                        p.label = profileNameInput.value.trim() || `Profile ${prompts.length}`;
                        saveSettings({ prompts }).then(renderSelect);
                    } else {
                        profileNameInput.value = p.label; // revert
                    }
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
                saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(renderSelect);
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
              });
            };

            tplBox.addEventListener('input', () => {
              if (tplBox.disabled) return; // Skip if system prompt
              
              const p = prompts.find(p => p.id === promptSel.value);
              if (p) {
                p.template = tplBox.value;
                saveSettings({ prompts });
              }
            });

            // Custom Select for Anki Decks and Note Types
    function setupCustomSelect(wrapperId, triggerId, selectedValueId, optionsId, originalSelectId, fetchFunction, saveSettingCallback, initialSettingValue) {
        const wrapper = document.getElementById(wrapperId);
        const trigger = document.getElementById(triggerId);
        const selectedValueDisplay = document.getElementById(selectedValueId);
        const optionsContainer = document.getElementById(optionsId);
        const originalSelect = document.getElementById(originalSelectId);

        if (!trigger || !selectedValueDisplay || !optionsContainer || !originalSelect) return;

        let currentOptions = [];
        let searchInput = null;

        // --- Add search input ---
        function renderSearchInput() {
            let searchDiv = optionsContainer.querySelector('.custom-select-search');
            if (!searchDiv) {
                searchDiv = document.createElement('div');
                searchDiv.className = 'custom-select-search';
                searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Type to search...';
                searchDiv.appendChild(searchInput);
                optionsContainer.prepend(searchDiv);

                searchInput.addEventListener('input', () => {
                    renderOptions(searchInput.value);
                });
            }
        }

        function renderOptions(filter = "") {
            // Remove all except the search input
            Array.from(optionsContainer.children).forEach(child => {
                if (!child.classList.contains('custom-select-search')) {
                    optionsContainer.removeChild(child);
                }
            });
            let filtered = currentOptions;
            if (filter && filter.trim()) {
                const f = filter.trim().toLowerCase();
                filtered = currentOptions.filter(opt => opt.toLowerCase().includes(f));
            }
            if (filtered.length === 0) {
                const noOpt = document.createElement('div');
                noOpt.className = 'custom-select-option disabled';
                noOpt.textContent = 'No options found';
                optionsContainer.appendChild(noOpt);
            } else {
                filtered.forEach(name => {
                    const optionElement = document.createElement('div');
                    optionElement.classList.add('custom-select-option');
                    optionElement.setAttribute('role', 'option');
                    optionElement.dataset.value = name;
                    optionElement.textContent = name;
                    optionElement.tabIndex = -1;
                    optionElement.addEventListener('click', () => {
                        selectOption(name, optionElement);
                    });
                    // Highlight selected
                    if (originalSelect.value === name) {
                        optionElement.classList.add('selected');
                    }
                    optionsContainer.appendChild(optionElement);
                });
            }
        }

        async function populateOptions() {
            try {
                const names = await fetchFunction();
                currentOptions = names;
                optionsContainer.innerHTML = '';
                renderSearchInput();
                renderOptions();
                // Set initial selected value
                const currentSavedValue = initialSettingValue || (names.length > 0 ? names[0] : 'Select...');
                selectOption(currentSavedValue, Array.from(optionsContainer.querySelectorAll('.custom-select-option')).find(opt => opt.dataset.value === currentSavedValue), false);
            } catch (error) {
                console.error('Error populating custom select:', error);
                optionsContainer.innerHTML = '<div class="custom-select-option error">Error loading options</div>';
                selectedValueDisplay.textContent = 'Error';
            }
        }

        function selectOption(value, optionElement, doSave = true) {
            selectedValueDisplay.textContent = value;
            if (originalSelect) {
                let opt = Array.from(originalSelect.options).find(o => o.value === value);
                if (!opt) {
                    opt = new Option(value, value);
                    originalSelect.add(opt);
                }
                originalSelect.value = value;
            }
            optionsContainer.querySelectorAll('.custom-select-option.selected').forEach(opt => opt.classList.remove('selected'));
            if (optionElement) {
                optionElement.classList.add('selected');
            }
            if (doSave) {
                saveSettingCallback(value);
            }
            closeDropdown();
        }

        function toggleDropdown() {
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                closeDropdown();
            } else {
                openDropdown();
            }
        }

        function openDropdown() {
            optionsContainer.style.display = 'block';
            trigger.setAttribute('aria-expanded', 'true');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                renderOptions();
            }
            const currentlySelected = selectedValueDisplay.textContent;
            const optionToHighlight = Array.from(optionsContainer.querySelectorAll('.custom-select-option')).find(opt => opt.dataset.value === currentlySelected);
            if (optionToHighlight) {
                optionToHighlight.scrollIntoView({ block: 'nearest' });
            }
        }

        function closeDropdown() {
            optionsContainer.style.display = 'none';
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', toggleDropdown);

        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                closeDropdown();
            }
        });

        // Allow typing directly on the trigger to search
        trigger.addEventListener('keydown', (e) => {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                openDropdown();
                if (searchInput) {
                    searchInput.value = e.key;
                    searchInput.focus();
                    searchInput.setSelectionRange(1, 1);
                    renderOptions(searchInput.value);
                }
                e.preventDefault();
            }
        });

        populateOptions();

        return { refresh: populateOptions, select: selectOption };
    }

    // For Anki Decks
    let ankiDeckCustomSelect, ankiNoteTypeCustomSelect;
    ankiDeckCustomSelect = setupCustomSelect(
        'anki-deck-custom-wrapper',
        'anki-deck-custom-trigger',
        'anki-deck-selected-value',
        'anki-deck-options',
        'anki-deck',
        async () => fetchAnki('deckNames'),
        (deckName) => saveSettings({ deckName: deckName }),
        settings.deckName
    );
    ankiNoteTypeCustomSelect = setupCustomSelect(
        'anki-note-type-custom-wrapper',
        'anki-note-type-custom-trigger',
        'anki-note-type-selected-value',
        'anki-note-type-options',
        'anki-note-type',
        async () => fetchAnki('modelNames'),
        (modelName) => saveSettings({ modelName: modelName }),
        settings.modelName
    );

    // in refreshAnkiStatus, after updating deckSel...
    if (ankiDeckCustomSelect && typeof ankiDeckCustomSelect.refresh === 'function') {
        await ankiDeckCustomSelect.refresh();
        ankiDeckCustomSelect.select(deckSel.value, null, false);
    }
    if (ankiNoteTypeCustomSelect && typeof ankiNoteTypeCustomSelect.refresh === 'function') {
        await ankiNoteTypeCustomSelect.refresh();
        ankiNoteTypeCustomSelect.select(modelSel.value, null, false);
    }

        };

        // ----- Anki status -----
        const refreshAnkiStatus = async ()=>{
            if (!statusBar || !statusText || !statusHelp || !deckSel || !modelSel || !ankiBody) return;
            try{
                window.updateUIConnectionStatus(true);
                statusHelp.style.display='none';

                const {deckName,modelName} = await loadSettings();

                const decks = await fetchAnki('deckNames');
                deckSel.innerHTML='';
                decks.forEach(d=>deckSel.add(new Option(d,d)));
                deckSel.value = decks.includes(deckName)?deckName:decks[0];
                if(deckSel.value!==deckName) await saveSettings({deckName:deckSel.value});

                const models = await fetchAnki('modelNames');
                modelSel.innerHTML='';
                models.forEach(m=>modelSel.add(new Option(m,m)));
                modelSel.value = models.includes(modelName)?modelName:models[0];
                if(modelSel.value!==modelName) await saveSettings({modelName:modelSel.value});

                // If no decks/models, disable dropdowns and show help
                if (!decks.length || !models.length) {
                    deckSel.disabled = true;
                    modelSel.disabled = true;
                    ankiBody.style.opacity = '0.6';
                    statusHelp.style.display = 'block';
                } else {
                    deckSel.disabled = false;
                    modelSel.disabled = false;
                    ankiBody.style.opacity = '1';
                }
                toggleSection(ankiBody, ankiToggle,true);
            }catch(err){
                window.updateUIConnectionStatus(false);
                if(err.message.includes('Failed to fetch')){
                    statusHelp.style.display='block';
                    deckSel.disabled=true;
                    modelSel.disabled=true;
                    ankiBody.style.opacity='0.6';
                    toggleSection(ankiBody, ankiToggle,false);
                }else{
                    console.error('Anki connection error:',err);
                    statusHelp.style.display='block';
                    deckSel.disabled=true;
                    modelSel.disabled=true;
                    ankiBody.style.opacity='0.6';
                    toggleSection(ankiBody, ankiToggle,false);
                }
            }
        };

        // ----- Prompt History -----
        const refreshPromptHistory = async () => {
          const { promptHistory = [] } = await chrome.storage.local.get({ promptHistory: [] });

          if (!historyList || !historyCount) return;

          historyCount.textContent = `${promptHistory.length} entries`;

          if (promptHistory.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No prompt history yet</div>';
            return;
          }

          historyList.innerHTML = promptHistory.map((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleString();
            const truncatedFront = entry.generatedFront?.length > 100
              ? entry.generatedFront.substring(0, 100) + '...'
              : entry.generatedFront;

            // Removed inline onclick from .history-entry-header
            return `
              <div class="history-entry">
                <div class="history-entry-header">
                  <div>
                    <div class="history-entry-title">${entry.promptLabel}</div>
                    <div class="history-entry-meta">${date} • ${entry.pageTitle}</div>
                  </div>
                  <span class="history-entry-toggle" id="history-toggle-${index}">▸</span>
                </div>
                <div class="history-entry-details" id="history-details-${index}">
                  <div class="history-detail-row">
                    <div class="history-detail-label">Generated Question:</div>
                    <div class="history-detail-content history-generated-front">${truncatedFront || 'No front text generated'}</div>
                  </div>
                  <div class="history-detail-row">
                    <div class="history-detail-label">Source Text:</div>
                    <div class="history-detail-content history-source-text">${entry.sourceText}</div>
                  </div>
                  <div class="history-detail-row">
                    <div class="history-detail-label">Page:</div>
                    <div class="history-detail-content">
                      <a href="${entry.pageUrl}" target="_blank" style="color: var(--accent);">${entry.pageTitle}</a>
                    </div>
                  </div>
                  <div class="history-detail-row">
                    <div class="history-detail-label">Deck/Model:</div>
                    <div class="history-detail-content">${entry.deckName} / ${entry.modelName}</div>
                  </div>
                  <div class="history-detail-row">
                    <div class="history-detail-label">Prompt Template:</div>
                    <div class="history-detail-content">
                      <div class="history-prompt-template">${entry.promptTemplate}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          // Add event listeners to all .history-entry-header elements
          const headers = historyList.querySelectorAll('.history-entry-header');
          headers.forEach(header => {
            header.addEventListener('click', function () {
              const entry = header.closest('.history-entry');
              if (!entry) return;
              const details = entry.querySelector('.history-details');
              if (!details) return;
              const toggleIcon = header.querySelector('.history-entry-toggle');
              details.classList.toggle('active');
              if (toggleIcon) {
                toggleIcon.classList.toggle('active');
              }
            });
          });
        };

        // Global function for toggling history entries
        window.toggleHistoryEntry = function(headerElem) {
          // Find the parent .history-entry
          const entry = headerElem.closest('.history-entry');
          if (!entry) return;

          // Find the details section inside this entry
          const details = entry.querySelector('.history-details');
          if (!details) return;

          // Use .history-entry-toggle for the icon
          const toggleIcon = headerElem.querySelector('.history-entry-toggle');

          // Toggle 'active' class on details and icon
          details.classList.toggle('active');
          if (toggleIcon) {
            toggleIcon.classList.toggle('active');
          }
        };

        // ----- Validation -----
        const validateApiKey = key => {
          // More permissive validation for modern OpenAI keys
          // Just check it starts with 'sk-' and has reasonable length
          return key.startsWith('sk-') && key.length > 20;
        };

        // Ensure unique prompt label (no duplicates)
        function getUniquePromptLabel(base, prompts, excludeId = null) {
          let label = base.trim();
          let suffix = 1;
          const taken = new Set(prompts.filter(p => p.id !== excludeId).map(p => p.label));
          while (taken.has(label)) {
            label = `${base.trim()} (${suffix++})`;
          }
          return label;
        }

        // ----- Event listeners -----
        // Replace refreshLink with refreshBtn
        if (refreshBtn) {
            refreshBtn.addEventListener('click', e => {
                e.preventDefault();
                refreshAnkiStatus();
            });
        }

        if (deckSel) {
            deckSel.addEventListener('change', () => {
                saveSettings({deckName: deckSel.value});
            });
        }

        if (modelSel) {
            modelSel.addEventListener('change', () => {
                saveSettings({modelName: modelSel.value});
            });
        }

        if (enableGpt) {
            // Handle checkbox change
            enableGpt.addEventListener('change', () => {
                toggleGPTSection(enableGpt.checked);
                saveSettings({gptEnabled: enableGpt.checked});
            });
        }

        if (alwaysConfirm) {
            // Handle checkbox change
            alwaysConfirm.addEventListener('change', () => {
                saveSettings({alwaysConfirm: alwaysConfirm.checked});
            });
        }

        if (confirmGptEl) {
            confirmGptEl.addEventListener('change', () => {
                saveSettings({confirmGpt: confirmGptEl.checked});
            });
        }

        if (keyInput) {
            keyInput.addEventListener('input', () => {
                const key = keyInput.value.trim();
                keyInput.classList.toggle('invalid', !validateApiKey(key));
                saveSettings({openaiKey: key});
            });
        }

        if (keyToggle) {
            keyToggle.addEventListener('click', () => {
                if (keyInput.type === 'password') {
                    keyInput.type = 'text';
                    keyToggle.textContent = '🙈';
                } else {
                    keyInput.type = 'password';
                    keyToggle.textContent = '👁️';
                }
            });
        }

        if (testApiBtn) {
            testApiBtn.addEventListener('click', async () => {
                const key = keyInput.value.trim();
                if (!validateApiKey(key)) {
                    window.showUINotification('Invalid API key format', 'error');
                    return;
                }
                testApiBtn.disabled = true;
                testApiBtn.textContent = 'Testing…';
                const {success, error} = await testOpenAI(key);
                if (success) {
                    window.showUINotification('API connection successful');
                } else {
                    window.showUINotification(error || 'API test failed', 'error');
                }
                testApiBtn.disabled = false;
                testApiBtn.textContent = 'Test';
            });
        }

        // --- Section toggling for all .section-header elements ---
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', function (e) {
                // Prevent toggling if the click was on a button or input inside the header
                if (e.target.closest('button, input, select, label, a')) return;
                const section = header.closest('.section');
                if (!section) return;
                const toggleIcon = header.querySelector('.section-toggle');
                const body = section.querySelector('.section-body');
                const collapsed = section.classList.toggle('collapsed');
                if (toggleIcon) toggleIcon.classList.toggle('active', !collapsed);
                if (body) {
                    // Optionally animate or set max-height, but class handles most
                    body.style.display = collapsed ? '' : '';
                }
            });
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset all settings?')) {
                    await chrome.storage.sync.clear();
                    await chrome.storage.local.clear();
                    location.reload();
                }
            });
        }

        // Inline Clear History Confirmation UI
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        const confirmClearHistoryArea = document.getElementById('confirm-clear-history-area');
        const clearHistoryActionArea = document.getElementById('clear-history-action-area');
        const confirmClearBtn = document.getElementById('confirm-clear-btn');
        const cancelClearBtn = document.getElementById('cancel-clear-btn');

        if (clearHistoryBtn && confirmClearHistoryArea && clearHistoryActionArea && confirmClearBtn && cancelClearBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                clearHistoryActionArea.style.display = 'none';
                confirmClearHistoryArea.style.display = 'flex';
            });

            cancelClearBtn.addEventListener('click', () => {
                confirmClearHistoryArea.style.display = 'none';
                clearHistoryActionArea.style.display = 'block';
            });

            confirmClearBtn.addEventListener('click', async () => {
                await chrome.storage.local.set({ promptHistory: [] });
                await refreshPromptHistory();
                window.showUINotification('Prompt history cleared');
                confirmClearHistoryArea.style.display = 'none';
                clearHistoryActionArea.style.display = 'block';
            });
        }

        // ----- Hotkey Customization -----
        // Remove all hotkey customization logic and UI references
        // (currentHotkeyDisplay, recordHotkeyBtn, resetHotkeyBtn, hotkeyInstructions, displayHotkeyPreference, etc.)

        // Initialize UI
        await initializeUI();
    }
});

// Helper function for section toggling
function toggleSection(body, toggle, expand) {
    if (!body || !toggle) return;
    const section = body.closest('.section');
    if (!section) return;
    
    if (expand) {
        section.classList.remove('collapsed');
        toggle.classList.add('active');
    } else {
        section.classList.add('collapsed');
        toggle.classList.remove('active');
    }
}

// ----- PDF Review Section Element References -----
const pdfReviewSection = document.getElementById('pdf-review-section');
const pdfReviewToggle = pdfReviewSection?.querySelector('.section-toggle');
const pdfReviewBody = pdfReviewSection?.querySelector('.section-body');
const pdfReviewCount = document.getElementById('pdf-review-count');
const pdfReviewList = document.getElementById('pdf-review-list');
const refreshPdfReviewListBtn = document.getElementById('refresh-pdf-review-list-btn');
const clearAllPdfReviewBtn = document.getElementById('clear-all-pdf-review-btn');

// ----- PDF Review List Rendering -----
let pdfReviewCardsCache = []; // Keep a local cache for event handlers

async function renderPdfReviewList() {
    console.log('[options.js] Rendering PDF review list...');
    try {
        const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
        const cards = Array.isArray(pendingReviewPdfCards) ? pendingReviewPdfCards : [];
        pdfReviewCardsCache = cards; // update cache
        if (pdfReviewCount) {
            pdfReviewCount.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'} for review`;
        }
        if (!pdfReviewList) return;
        if (cards.length === 0) {
            pdfReviewList.innerHTML = `<div style="text-align: center; color: var(--muted); padding: 20px;">No PDF cards awaiting review.</div>`;
            return;
        }
        pdfReviewList.innerHTML = cards.map(card => {
            const date = new Date(card.timestamp).toLocaleString();
            const snippet = card.generatedFront?.trim()
                ? card.generatedFront.substring(0, 100)
                : (card.sourceText?.substring(0, 100) || '');
            // Deck and Model are displayed as plain, non-editable text
            return `
            <div class="history-entry" data-card-id="${card.id}">
                <div class="history-entry-header">
                    <div>
                        <div class="history-entry-title">${card.originalPageTitle || 'Untitled PDF'}</div>
                        <div class="history-entry-meta">${date}</div>
                    </div>
                    <span class="history-entry-toggle">▸</span>
                </div>
                <div class="history-details" style="display:none;"></div>
                <div class="history-detail-row">
                    <div class="history-detail-label">Snippet:</div>
                    <div class="history-detail-content">${snippet || '<i>No preview</i>'}</div>
                </div>
                <div class="history-detail-row">
                    <div class="history-detail-label">Deck:</div>
                    <div class="history-detail-content"><span>${card.originalDeckName}</span></div>
                </div>
                <div class="history-detail-row">
                    <div class="history-detail-label">Model:</div>
                    <div class="history-detail-content"><span>${card.originalModelName}</span></div>
                </div>
                <div class="btn-row" style="margin-top: 10px;">
                    <button class="btn btn-secondary edit-pdf-card-btn" data-card-id="${card.id}">Edit/View</button>
                    <button class="btn btn-primary save-pdf-card-btn" data-card-id="${card.id}">Save to Anki</button>
                    <button class="btn btn-secondary error delete-pdf-card-btn" data-card-id="${card.id}">Delete</button>
                </div>
            </div>
            `;
        }).join('');
        console.log('[options.js] PDF review list rendered.');
    } catch (err) {
        console.error('[options.js] Error rendering PDF review list:', err);
        if (pdfReviewList) {
            pdfReviewList.innerHTML = `<div style="text-align: center; color: var(--error); padding: 20px;">Error loading PDF review cards.</div>`;
        }
    }
}

// Refresh PDF review list button
if (refreshPdfReviewListBtn) {
    refreshPdfReviewListBtn.addEventListener('click', () => {
        renderPdfReviewList();
    });
}

// Clear All PDF review cards button
if (clearAllPdfReviewBtn) {
    // Add confirmation UI like clear history
    let confirmClearPdfArea = null;
    let clearPdfActionArea = null;
    let confirmClearPdfBtn = null;
    let cancelClearPdfBtn = null;

    // Setup confirmation UI if not already present
    function setupPdfClearConfirmUI() {
        // Only set up once
        if (document.getElementById('confirm-clear-pdf-area')) return;

        // Create confirmation area
        confirmClearPdfArea = document.createElement('div');
        confirmClearPdfArea.id = 'confirm-clear-pdf-area';
        confirmClearPdfArea.style.display = 'none';
        confirmClearPdfArea.style.alignItems = 'center';
        confirmClearPdfArea.style.gap = '8px';

        const confirmMsg = document.createElement('span');
        confirmMsg.className = 'confirm-message';
        confirmMsg.textContent = 'Are you sure? This cannot be undone.';

        confirmClearPdfBtn = document.createElement('button');
        confirmClearPdfBtn.className = 'btn btn-primary error';
        confirmClearPdfBtn.textContent = 'Yes, Clear All';

        cancelClearPdfBtn = document.createElement('button');
        cancelClearPdfBtn.className = 'btn btn-secondary';
        cancelClearPdfBtn.textContent = 'Cancel';

        confirmClearPdfArea.appendChild(confirmMsg);
        confirmClearPdfArea.appendChild(confirmClearPdfBtn);
        confirmClearPdfArea.appendChild(cancelClearPdfBtn);

        // Insert after the action area
        clearPdfActionArea = clearAllPdfReviewBtn.parentNode;
        clearPdfActionArea.parentNode.insertBefore(confirmClearPdfArea, clearPdfActionArea.nextSibling);

        // Handlers
        cancelClearPdfBtn.addEventListener('click', () => {
            confirmClearPdfArea.style.display = 'none';
            clearPdfActionArea.style.display = '';
        });

        confirmClearPdfBtn.addEventListener('click', async () => {
            try {
                await chrome.storage.local.set({ pendingReviewPdfCards: [] });
                await renderPdfReviewList();
                window.showUINotification('All PDF review cards cleared.');
            } catch (err) {
                console.error('[PDF Review] Error clearing all PDF review cards:', err);
                window.showUINotification('Failed to clear PDF review cards.', 'error');
            }
            confirmClearPdfArea.style.display = 'none';
            clearPdfActionArea.style.display = '';
        });
    }

    setupPdfClearConfirmUI();

    clearAllPdfReviewBtn.addEventListener('click', () => {
        // Hide the action area, show confirmation
        if (!confirmClearPdfArea) setupPdfClearConfirmUI();
        clearPdfActionArea = clearAllPdfReviewBtn.parentNode;
        clearPdfActionArea.style.display = 'none';
        confirmClearPdfArea.style.display = 'flex';
    });
}

// Event delegation for PDF review card buttons
if (pdfReviewList) {
    pdfReviewList.addEventListener('click', async (e) => {
        const target = e.target;
        if (!target) return;
        const cardId = target.getAttribute('data-card-id');
        if (!cardId) return;

        // Find the card data from cache
        const card = pdfReviewCardsCache.find(c => c.id === cardId);
        if (!card) {
            console.warn('[options.js] Card not found in cache for ID:', cardId);
            return;
        }

        // Edit/View functionality with editing UI
        if (target.classList.contains('edit-pdf-card-btn')) {
            const entry = target.closest('.history-entry');
            if (!entry) return;
            const details = entry.querySelector('.history-details');
            if (!details) return;

            // If already editing, hide and reset
            if (details.getAttribute('data-editing') === 'true') {
                details.innerHTML = '';
                details.style.display = 'none';
                details.removeAttribute('data-editing');
                target.textContent = 'Edit/View';
                return;
            }

            // Build editing UI (Deck/Model as read-only text)
            const isCloze = !!card.isCloze;
            const frontVal = card.generatedFront || (isCloze ? '' : card.sourceText || '');
            const backVal = isCloze ? (card.generatedClozeText || '') : (card.sourceText || '');
            details.innerHTML = `
                <div style="margin-bottom:8px;">
                    <label><b>Front:</b>
                        <textarea class="pdf-edit-front" style="width:100%;min-height:60px;padding:6px;border-radius:4px;margin-top:4px;">${frontVal}</textarea>
                    </label>
                </div>
                <div style="margin-bottom:8px;">
                    <label><b>Back (${isCloze ? 'Cloze' : 'Basic'}):</b>
                        <textarea class="pdf-edit-back" style="width:100%;min-height:80px;padding:6px;border-radius:4px;margin-top:4px;">${backVal}</textarea>
                    </label>
                </div>
                <div style="margin-bottom:8px;">
                    <b>Deck:</b> <span>${card.originalDeckName}</span>
                    &nbsp;&nbsp;
                    <b>Model:</b> <span>${card.originalModelName}</span>
                </div>
                <div style="margin-bottom:8px;">
                    <b>Source:</b> ${card.originalPageTitle}
                    ${card.originalPageUrl ? `<br><a href="${card.originalPageUrl}" target="_blank">${card.originalPageUrl}</a>` : ''}
                </div>
                <div class="btn-row" style="margin-top:10px;">
                    <button class="btn btn-primary done-edit-pdf-card-btn" data-card-id="${card.id}">Done Editing</button>
                    <button class="btn btn-secondary cancel-edit-pdf-card-btn" data-card-id="${card.id}">Cancel Edit</button>
                </div>
            `;
            details.style.display = 'block';
            details.setAttribute('data-editing', 'true');
            target.textContent = 'Hide Details';

            // Done Editing handler
            details.querySelector('.done-edit-pdf-card-btn').onclick = async function(ev) {
                const cardId = this.getAttribute('data-card-id');
                const frontVal = details.querySelector('.pdf-edit-front')?.value || '';
                const backVal = details.querySelector('.pdf-edit-back')?.value || '';
                console.log('[PDF Review][Edit] Done Editing card ID:', cardId, 'New Front:', frontVal, 'New Back:', backVal);

                try {
                    const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
                    console.log('[PDF Review][Edit] Cards before update:', pendingReviewPdfCards.map(c => ({id: c.id, generatedFront: c.generatedFront, generatedClozeText: c.generatedClozeText, sourceText: c.sourceText})));
                    const idx = pendingReviewPdfCards.findIndex(c => c.id === cardId);
                    if (idx !== -1) {
                        const cardToEdit = pendingReviewPdfCards[idx];
                        console.log('[PDF Review][Edit] Found card to edit:', cardToEdit);
                        if (cardToEdit.isCloze) {
                            cardToEdit.generatedClozeText = backVal;
                            cardToEdit.generatedFront = frontVal;
                            console.log('[PDF Review][Edit] Updated Cloze card:', cardToEdit);
                        } else {
                            cardToEdit.generatedFront = frontVal;
                            cardToEdit.sourceText = backVal;
                            console.log('[PDF Review][Edit] Updated Basic card:', cardToEdit);
                        }
                        // Save updated array
                        await chrome.storage.local.set({ pendingReviewPdfCards });
                        console.log('[PDF Review][Edit] Saved updated pendingReviewPdfCards to storage.');
                        // Update local cache
                        pdfReviewCardsCache = pendingReviewPdfCards;
                        console.log('[PDF Review][Edit] Updated pdfReviewCardsCache.');
                    } else {
                        console.warn('[PDF Review][Edit] Card ID not found in pendingReviewPdfCards:', cardId);
                    }
                } catch (err) {
                    console.error('[PDF Review][Edit] Error saving edits for card ID:', cardId, err);
                    window.showUINotification('Failed to save edits locally.', 'error');
                    return;
                }

                details.style.display = 'none';
                details.removeAttribute('data-editing');
                target.textContent = 'Edit/View';
                await renderPdfReviewList();
                window.showUINotification('Edits staged locally. Click "Save to Anki" to send.');
            };

            // Cancel Edit handler
            details.querySelector('.cancel-edit-pdf-card-btn').onclick = function(ev) {
                details.innerHTML = '';
                details.style.display = 'none';
                details.removeAttribute('data-editing');
                target.textContent = 'Edit/View';
                console.log('[options.js] Cancelled editing PDF card ID:', cardId);
            };

            console.log('[options.js] Editing/Viewing PDF card ID:', cardId, card);
            return;
        }

        // Save to Anki functionality (uses edited values if present)
        if (target.classList.contains('save-pdf-card-btn')) {
            const cardId = target.getAttribute('data-card-id');
            // Always get the latest card object from the cache (should have edits if staged)
            const cardToSave = pdfReviewCardsCache.find(c => c.id === cardId);
            if (!cardToSave) {
                window.showUINotification("Card not found in review queue.", 'error');
                console.error('[PDF Review][Save] Card not found in cache for ID:', cardId);
                return;
            }

            let frontVal, backVal, deckVal, modelVal;
            if (cardToSave.isCloze) {
                frontVal = cardToSave.generatedFront || '';
                backVal = cardToSave.generatedClozeText || '';
            } else {
                frontVal = cardToSave.generatedFront || '';
                backVal = cardToSave.sourceText || '';
            }
            deckVal = cardToSave.originalDeckName;
            modelVal = cardToSave.originalModelName;

            const cardDataForSave = {
                front: frontVal,
                backHtml: backVal,
                deckName: deckVal,
                modelName: modelVal
            };

            console.log('[PDF Review][SaveOptimistic] Initiating save for card ID:', cardId, 'Data:', cardDataForSave);

            // Optimistic UI update: remove from storage and UI immediately
            (async () => {
                try {
                    const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
                    const updatedCards = pendingReviewPdfCards.filter(c => c.id !== cardId);
                    await chrome.storage.local.set({ pendingReviewPdfCards: updatedCards });
                    pdfReviewCardsCache = updatedCards;
                    console.log('[PDF Review][SaveOptimistic] Card removed from local storage and cache for card ID:', cardId);
                    await renderPdfReviewList();
                    window.showUINotification('Card sent for Anki processing. System notification will confirm outcome.');
                } catch (err) {
                    console.error('[PDF Review][SaveOptimistic] Error removing card from local storage for card ID:', cardId, err);
                    window.showUINotification('Failed to update review queue after sending card.', 'error');
                }
            })();

            // Send to background for actual processing (response is only for logging)
            chrome.runtime.sendMessage({ action: "saveFinalizedPdfCard", cardData: cardDataForSave }, (response) => {
                console.log('[PDF Review][SaveOptimistic][Callback] Received response from background for card ID:', cardId, 'Raw Response:', response, 'Last Error:', chrome.runtime.lastError);
                if (chrome.runtime.lastError) {
                    // Only show UI notification if the error is NOT the "port closed" error
                    if (chrome.runtime.lastError.message !== "The message port closed before a response was received.") {
                        window.showUINotification('Communication error with background: ' + chrome.runtime.lastError.message, 'error');
                    }
                    // Always log for debugging
                    console.error('[PDF Review][SaveOptimistic][Callback] Error from sendMessage. Card ID:', cardId, 'Error:', chrome.runtime.lastError.message);
                } else if (response && !response.success) {
                    console.error('[PDF Review][SaveOptimistic][Callback] Background reported failure. Card ID:', cardId, 'Response Error:', response.error);
                    window.showUINotification('Background reported an issue processing the card: ' + response.error, 'error');
                } else if (response && response.success) {
                    console.log('[PDF Review][SaveOptimistic][Callback] Background successfully processed card ID:', cardId);
                    // UI was already updated optimistically, so this is mostly for logging or any minor follow-up.
                }
            });
            return;
        }

        // Delete PDF review card with two-click confirmation
        if (target.classList.contains('delete-pdf-card-btn')) {
            // If already in confirm-delete state, proceed with deletion
            if (target.classList.contains('confirm-delete-active')) {
                console.log('[PDF Review][Delete] Confirming delete for card ID:', cardId);
                target.textContent = 'Delete';
                target.classList.remove('confirm-delete-active');
                target.removeAttribute('data-confirm-delete-timestamp');
                try {
                    const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
                    console.log('[PDF Review][Delete] Cards before filtering:', pendingReviewPdfCards.map(c => c.id));
                    const updatedCardsArray = pendingReviewPdfCards.filter(c => c.id !== cardId);
                    console.log('[PDF Review][Delete] Filtering out card ID:', cardId);
                    console.log('[PDF Review][Delete] Cards after filtering:', updatedCardsArray.map(c => c.id));
                    await chrome.storage.local.set({ pendingReviewPdfCards: updatedCardsArray });
                    console.log('[PDF Review][Delete] Storage updated after deletion.');
                    await renderPdfReviewList();
                    console.log('[PDF Review][Delete] List re-rendered after deletion.');
                    window.showUINotification('PDF review card deleted.');
                } catch (err) {
                    console.error('[PDF Review][Delete] Error deleting card ID:', cardId, err);
                    window.showUINotification('Failed to delete PDF review card.', 'error');
                }
                return;
            }

            // Reset any other confirm-delete-active buttons
            const allDeleteBtns = pdfReviewList.querySelectorAll('.delete-pdf-card-btn.confirm-delete-active');
            allDeleteBtns.forEach(btn => {
                if (btn !== target) {
                    btn.textContent = 'Delete';
                    btn.classList.remove('confirm-delete-active');
                    btn.removeAttribute('data-confirm-delete-timestamp');
                }
            });

            // Set this button to confirm-delete state
            target.textContent = 'Confirm Delete?';
            target.classList.add('confirm-delete-active');
            target.setAttribute('data-confirm-delete-timestamp', Date.now());
            console.log('[PDF Review][Delete] Staging delete for card ID:', cardId, 'Button text changed.');
            return;
        }

        // ...existing code...
    });

    // Global click handler to reset confirm-delete state if clicking outside delete buttons
    document.addEventListener('click', (event) => {
        // Only reset if click is outside any .delete-pdf-card-btn inside pdfReviewList
        if (!pdfReviewList.contains(event.target) || !event.target.classList.contains('delete-pdf-card-btn')) {
            const allDeleteBtns = pdfReviewList.querySelectorAll('.delete-pdf-card-btn.confirm-delete-active');
            allDeleteBtns.forEach(btn => {
                btn.textContent = 'Delete';
                btn.classList.remove('confirm-delete-active');
                btn.removeAttribute('data-confirm-delete-timestamp');
            });
            if (allDeleteBtns.length > 0) {
                console.log('[PDF Review][Delete] Clicked outside, resetting confirm-delete states.');
            }
        }
    });
}