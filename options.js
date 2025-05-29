// options.js

document.addEventListener('DOMContentLoaded', () => {
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
        function showNotification(msg, isError=false){
            if (!notification) return;
            notification.textContent = msg;
            notification.classList.remove('show','error');
            void notification.offsetWidth; // restart animation
            if(isError) notification.classList.add('error');
            notification.classList.add('show');
            if(!isError){
                setTimeout(()=>notification.classList.remove('show','error'),2500);
            }
        }

        function toggleGPTSection(on) {
            if (!gptBody) return;
            const inputs = gptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
            gptBody.style.opacity = on ? '1' : '0.5';
            inputs.forEach(el => {
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
                showNotification('Settings saved');
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
              
              // Find current selection (system or user prompt)
              let current = SYSTEM_PROMPTS.find(p => p.id === selectedPromptId) || 
                           prompts.find(p => p.id === selectedPromptId) || 
                           prompts[0] || 
                           SYSTEM_PROMPTS[0];
              
              promptSel.value = current.id;
              
              // Update UI based on selection type
              const isSystemPrompt = current.isSystem || false;
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
                syncToggleSwitch(enableGpt, gptToggleSwitch);
                toggleGPTSection(settings.gptEnabled); // Set initial state
            }
            
            // Initialize always confirm toggle
            if (alwaysConfirm) {
                alwaysConfirm.checked = settings.alwaysConfirm;
                syncToggleSwitch(alwaysConfirm, alwaysConfirmToggleSwitch);
            }
            
            if (keyInput) keyInput.value  = settings.openaiKey;
            if (tplBox) tplBox.value = (settings.prompts.find(p => p.id === settings.selectedPrompt) || settings.prompts[0])?.template || '';
            if (confirmGptEl) confirmGptEl.checked = settings.confirmGpt;
            if (confirmGptEl && confirmToggleSwitch) syncToggleSwitch(confirmGptEl, confirmToggleSwitch);

            // Initialize section states using the newly defined toggleSection
            if (ankiBody && ankiToggle) toggleSection(ankiBody, ankiToggle, true); // Expand Anki
            if (gptBody && gptToggle) toggleSection(gptBody, gptToggle, true);   // Expand GPT
            if (historyBody && historyToggle) toggleSection(historyBody, historyToggle, false); // Collapse History by default

            await refreshAnkiStatus();
            await updatePendingCards();
            await refreshPromptHistory();
            // Ensure history is collapsed after refreshing
            if (historyBody && historyToggle) toggleSection(historyBody, historyToggle, false);

            renderSelect();

            // Change prompt selection handler:
            promptSel.onchange = () => {
              const newSelectedId = promptSel.value;
              const isSystemPrompt = SYSTEM_PROMPTS.some(p => p.id === newSelectedId);
              
              if (isSystemPrompt) {
                // For system prompts, just update UI but don't save to selectedPrompt
                const systemPrompt = SYSTEM_PROMPTS.find(p => p.id === newSelectedId);
                updateUIForPromptType(systemPrompt, true);
              } else {
                // For user prompts, update selectedPrompt and save
                selectedPromptId = newSelectedId;
                saveSettings({ selectedPrompt: selectedPromptId }).then(() => {
                  const userPrompt = prompts.find(p => p.id === selectedPromptId);
                  updateUIForPromptType(userPrompt, false);
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

            addBtn.onclick = () => {
                if (prompts.length >= 5) {
                    showNotification("Limit reached (5 user prompts). Delete one first.", true);
                    addBtn.disabled = true;
                    if (promptLimitMsg) promptLimitMsg.style.display = "block";
                    return;
                }
                const id = uid();
                const baseLabel = profileNameInput?.value?.trim() || `Profile`;
                const label = getUniquePromptLabel(baseLabel, prompts);
                const template = tplBox?.value?.trim() || '';
                prompts.push({ id, label, template });
                selectedPromptId = id; // Select the new prompt
                saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                });
            };

            delBtn.onclick = () => {
                if (delBtn.disabled) return; // Skip if system prompt or last user prompt
                
                const idx = prompts.findIndex(p=>p.id===promptSel.value);
                if (idx === -1) return; // Not a user prompt
                
                prompts.splice(idx,1);
                const newId = prompts.length > 0 ? prompts[0].id : SYSTEM_PROMPTS[0].id;
                selectedPromptId = prompts.length > 0 ? newId : 'basic-default';
                saveSettings({ prompts, selectedPrompt: selectedPromptId }).then(() => {
                    renderSelect();
                    if (promptLimitMsg) promptLimitMsg.style.display = "none";
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

        };

        // ----- Anki status -----
        const refreshAnkiStatus = async ()=>{
            if (!statusBar || !statusText || !statusHelp || !deckSel || !modelSel || !ankiBody) return;
            statusBar.className='status-bar';
            try{
                statusBar.classList.add('connected');
                statusText.textContent='Anki connected';
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
                    statusBar.classList.add('warning');
                    statusText.textContent = 'No decks or note types found in Anki';
                    statusHelp.style.display = 'block';
                } else {
                    deckSel.disabled = false;
                    modelSel.disabled = false;
                    ankiBody.style.opacity = '1';
                }
                toggleSection(ankiBody, ankiToggle,true);
            }catch(err){
                if(err.message.includes('Failed to fetch')){
                    statusBar.classList.add('disconnected');
                    statusText.textContent='Anki connection failed';
                    statusHelp.style.display='block';

                    deckSel.disabled=true;
                    modelSel.disabled=true;
                    ankiBody.style.opacity='0.6';
                    toggleSection(ankiBody, ankiToggle,false);
                }else{
                    console.error('Anki connection error:',err);
                    statusBar.classList.add('warning');
                    statusText.textContent=`Error: ${err.message}`;
                    // Also disable dropdowns and show help on any error
                    deckSel.disabled=true;
                    modelSel.disabled=true;
                    ankiBody.style.opacity='0.6';
                    statusHelp.style.display='block';
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

            return `
              <div class="history-entry">
                <div class="history-entry-header" onclick="toggleHistoryEntry(this)">
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

        if (enableGpt && gptToggleSwitch) {
            // Handle checkbox change
            enableGpt.addEventListener('change', () => {
                syncToggleSwitch(enableGpt, gptToggleSwitch);
                toggleGPTSection(enableGpt.checked);
                saveSettings({gptEnabled: enableGpt.checked});
            });

            // Handle visual switch click
            gptToggleSwitch.addEventListener('click', () => {
                enableGpt.checked = !enableGpt.checked;
                enableGpt.dispatchEvent(new Event('change')); // Trigger the change handler
            });
        }

        if (alwaysConfirm && alwaysConfirmToggleSwitch) {
            // Handle checkbox change
            alwaysConfirm.addEventListener('change', () => {
                syncToggleSwitch(alwaysConfirm, alwaysConfirmToggleSwitch);
                saveSettings({alwaysConfirm: alwaysConfirm.checked});
            });

            // Handle visual switch click
            alwaysConfirmToggleSwitch.addEventListener('click', () => {
                alwaysConfirm.checked = !alwaysConfirm.checked;
                alwaysConfirm.dispatchEvent(new Event('change')); // Trigger the change handler
            });
        }

        if (confirmGptEl) {
            confirmGptEl.addEventListener('change', () => {
                syncToggleSwitch(confirmGptEl, confirmToggleSwitch);
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
                    showNotification('Invalid API key format', true);
                    return;
                }
                testApiBtn.disabled = true;
                testApiBtn.textContent = 'Testing…';
                const {success, error} = await testOpenAI(key);
                if (success) {
                    showNotification('API connection successful');
                } else {
                    showNotification(error || 'API test failed', true);
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

        // Clear history button
        if (clearHistoryBtn) {
          clearHistoryBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all prompt history?')) {
              await chrome.storage.local.set({ promptHistory: [] });
              await refreshPromptHistory();
              showNotification('Prompt history cleared');
            }
          });
        }

        // *** CRITICAL FIX: Actually call initializeUI ***
        initializeUI();

    } else {
        console.error('Required elements not found. Check your HTML structure.');
        return;
    }
});

/**
 * Programmatically expands or collapses a UI section.
 * @param {HTMLElement} sectionBodyEl - The .section-body element.
 * @param {HTMLElement} sectionToggleIconEl - The .section-toggle icon element.
 * @param {boolean} isExpanded - True to expand the section, false to collapse it.
 */
function toggleSection(sectionBodyEl, sectionToggleIconEl, isExpanded) {
    if (!sectionBodyEl) {
        console.error("toggleSection: sectionBodyEl is null or undefined.");
        return;
    }
    const sectionEl = sectionBodyEl.closest('.section');
    if (!sectionEl) {
        console.error("toggleSection: Could not find parent .section for the provided body element:", sectionBodyEl);
        return;
    }

    if (isExpanded) {
        sectionEl.classList.remove('collapsed');
        if (sectionToggleIconEl) {
            sectionToggleIconEl.classList.add('active');
        }
    } else {
        sectionEl.classList.add('collapsed');
        if (sectionToggleIconEl) {
            sectionToggleIconEl.classList.remove('active');
        }
    }
    // The actual show/hide animation (e.g., max-height) is handled by CSS rules
    // based on the '.collapsed' class on 'sectionEl' and '.active' on 'sectionToggleIconEl'.
}

function syncToggleSwitch(checkboxEl, switchEl) {
    if (!checkboxEl || !switchEl) return;
    const container = switchEl.closest('.toggle-container');
    if (checkboxEl.checked) {
        switchEl.classList.add('active');
        if (container) container.classList.add('active');
    } else {
        switchEl.classList.remove('active');
        if (container) container.classList.remove('active');
    }
}

// Update history toggle logic to match .history-entry-toggle
window.toggleHistoryEntry = function(headerElem) {
  const entry = headerElem.closest('.history-entry');
  if (!entry) return;
  const details = entry.querySelector('.history-details');
  if (!details) return;
  // Use .history-entry-toggle for the icon
  const toggleIcon = headerElem.querySelector('.history-entry-toggle');
  details.classList.toggle('active');
  if (toggleIcon) {
    toggleIcon.classList.toggle('active');
  }
};

// Remove all inline <script> blocks from your HTML (options.html).
// Ensure only <script src="options.js"></script> and <script src="options_ui.js"></script> are used in your HTML.
// This will resolve the Content Security Policy (CSP) error about inline scripts.