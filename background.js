// background.js
import { addToAnki } from "./ankiProvider.js";
import { generateFrontWithRetry, generateClozeWithRetry } from "./chatgptProvider.js";

// ── Constants ──────────────────────────────────────────────────────────────
const COMMAND_SAVE_TO_ANKI = "save-to-anki";
const ALARM_SYNC           = "syncPending";
const SYNC_DELAY_MINUTES   = 1;           // minutes
const BADGE_COLOR_RED      = "#FF0000";
const BADGE_TEXT_COLOR_WHITE = "#FFFFFF";
const MAX_PROMPT_HISTORY = 50; // Limit history to prevent storage bloat
const BADGE_COLOR_DEFAULT = "#000"; // Default badge background color

// System default prompts
const SYSTEM_DEFAULT_BASIC_PROMPT_TEXT = `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.`;
const SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT = `You are an expert Anki cloze deletion creator. Your goal is to process the provided text selection and convert it into a single string formatted for Anki cloze cards. Please adhere to the following rules:

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
    Desired output: "At birth, a term newborn has iron stores of approximately \`{{c1::250 mg}}\`, with \`{{c2::75%}}\` in the blood and \`{{c3::25%}}\` in ferritin/haemosiderin/tissues."`;

// ── State ───────────────────────────────────────────────────────────────────
let syncScheduled      = false;
let cachedPendingClips = [];

// ── Helpers ────────────────────────────────────────────────────────────────
function notify(tabId, status, message) {
  if (typeof tabId !== 'number' || tabId < 0) {
    console.error('[Background][notify] Invalid tabId received:', tabId, 'Cannot send message:', {status, message});
    return;
  }

  console.log('[Background][notify] Attempting to send notification to tab:', tabId, 'Message:', {status, message});

  chrome.tabs.sendMessage(tabId, { status, message }, (response) => {
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message;
      if (errorMessage.includes('The message port closed before a response was received')) {
        // For status notifications, this is expected and not a critical failure.
        console.warn('[Background][notify] Info: Message port closed for status notification to tab:', tabId, '. This is usually expected as the content script displays the toast and does not send a reply. Error details:', errorMessage);
        // Do NOT attempt script injection/retry for this case.
      } else if (errorMessage.includes('Receiving end does not exist')) {
        // Content script is truly missing.
        console.error('[Background][notify] Critical Error: Content script (receiving end) does not exist on tab:', tabId, '. Cannot display notification. Error:', errorMessage);
        // Try to inject the content script if the tab allows it
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('[Background][notify] Cannot access tab info for:', tabId, chrome.runtime.lastError.message);
            return;
          }
          
          // Additional validation for tab state
          if (!tab || !tab.url) {
            console.warn('[Background][notify] Tab is invalid or has no URL:', tab);
            return;
          }

          // Check if tab is still active and not discarded
          if (tab.discarded) {
            console.warn('[Background][notify] Tab is discarded, cannot inject content script');
            return;
          }
          
          // Check if it's a regular webpage where we can inject scripts
          const isRestrictedUrl = tab.url.startsWith('chrome://') || 
                                 tab.url.startsWith('about:') || 
                                 tab.url.startsWith('moz-extension://') || 
                                 tab.url.startsWith('chrome-extension://') ||
                                 tab.url.startsWith('edge://') ||
                                 tab.url.startsWith('opera://') ||
                                 tab.url === 'about:blank';
                                 
          if (isRestrictedUrl) {
            console.warn('[Background][notify] Cannot inject content script on restricted page:', tab.url);
            return;
          }

          console.log('[Background][notify] Attempting to inject content script into accessible tab:', tabId);
          
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['contentScript.js']
          }, (injectionResult) => {
            if (chrome.runtime.lastError) {
              console.error('[Background][notify] Failed to inject content script:', chrome.runtime.lastError.message);
              // Don't retry further to avoid infinite loops
              return;
            }
            
            if (!injectionResult || injectionResult.length === 0) {
              console.warn('[Background][notify] Content script injection returned no results');
              return;
            }
            
            console.log('[Background][notify] Content script injected successfully, retrying notification after delay');
            
            // Retry the notification after a longer delay to ensure script is ready
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { status, message }, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('[Background][notify] Retry notification failed (giving up):', chrome.runtime.lastError.message);
                } else {
                  console.log('[Background][notify] Retry notification succeeded');
                }
              });
            }, 250); // Increased delay for script initialization
          });
        });
      } else {
        console.error('[Background][notify] Unhandled notification error:', errorMessage);
      }
    } else {
      console.log('[Background][notify] Notification sent successfully to tab:', tabId);
    }
  });
}

function getSelectionHtml(tabId) {
  if (typeof tabId !== 'number' || tabId < 0) {
    console.error('[Background][getSelectionHtml] Invalid tabId received:', tabId);
    return Promise.resolve({ html: "", error: "Invalid tabId" });
  }

  console.log('[Background][getSelectionHtml] Attempting to getSelectionHtml from tab:', tabId);

  // Helper to send the message, optionally as a retry
  function sendMessageToContentScript(retry = false) {
    return new Promise(res => {
      chrome.tabs.sendMessage(tabId, { action: "getSelectionHtml" }, (r) => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message;
          console.error('[Background][getSelectionHtml] Error getting selection from tab:', tabId, 'Error:', errorMessage);
          // Only attempt injection/retry once, and only if not already retried
          if (!retry && errorMessage.includes('Receiving end does not exist')) {
            console.warn('[Background][getSelectionHtml] Content script not present. Attempting injection and one retry.');
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError) {
                console.error('[Background][getSelectionHtml] Cannot access tab info for:', tabId, chrome.runtime.lastError.message);
                res({ html: "", error: chrome.runtime.lastError.message });
                return;
              }
              
              // Additional validation for tab state
              if (!tab || !tab.url) {
                console.warn('[Background][getSelectionHtml] Tab is invalid or has no URL:', tab);
                res({ html: "", error: "Tab invalid or missing URL" });
                return;
              }
              if (tab.discarded) {
                console.warn('[Background][getSelectionHtml] Tab is discarded, cannot inject content script');
                res({ html: "", error: "Tab discarded" });
                return;
              }
              const isRestrictedUrl = tab.url.startsWith('chrome://') ||
                                     tab.url.startsWith('about:') ||
                                     tab.url.startsWith('moz-extension://') ||
                                     tab.url.startsWith('chrome-extension://') ||
                                     tab.url.startsWith('edge://') ||
                                     tab.url.startsWith('opera://') ||
                                     tab.url === 'about:blank';
              if (isRestrictedUrl) {
                console.warn('[Background][getSelectionHtml] Cannot inject content script on restricted page:', tab.url);
                res({ html: "", error: "Restricted page, cannot inject content script" });
                return;
              }
              if (!chrome.scripting || !chrome.scripting.executeScript) {
                console.error('[Background][getSelectionHtml] chrome.scripting API not available. Cannot inject content script.');
                res({ html: "", error: "chrome.scripting API not available" });
                return;
              }
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['contentScript.js']
              }, (injectionResult) => {
                if (chrome.runtime.lastError) {
                  console.error('[Background][getSelectionHtml] Failed to inject content script:', chrome.runtime.lastError.message);
                  res({ html: "", error: chrome.runtime.lastError.message });
                  return;
                }
                if (!injectionResult || injectionResult.length === 0) {
                  console.warn('[Background][getSelectionHtml] Content script injection returned no results');
                  res({ html: "", error: "Content script injection returned no results" });
                  return;
                }
                console.log('[Background][getSelectionHtml] Content script injected, retrying getSelectionHtml after delay');
                setTimeout(() => {
                  // Retry once
                  sendMessageToContentScript(true).then(res);
                }, 250);
              });
            });
          } else {
            res({ html: "", error: errorMessage });
          }
        } else {
          console.log('[Background][getSelectionHtml] Received response from tab:', tabId, 'Response:', r);
          res(r || { html: "", error: "No response data" });
        }
      });
    });
  }

  return sendMessageToContentScript(false);
}

// ── Badge ──────────────────────────────────────────────────────────────────
function updateBadge() {
  const n = cachedPendingClips.length;
  chrome.action.setBadgeText({ text: n ? String(n) : "" });
  chrome.action.setTitle({ title: n ? `${n} pending clip${n > 1 ? "s" : ""}` : "Web Clipper → Anki" });

  const bg = n ? BADGE_COLOR_RED : BADGE_COLOR_DEFAULT;
  chrome.action.setBadgeBackgroundColor({ color: bg });
  chrome.action.setBadgeTextColor({ color: n ? BADGE_TEXT_COLOR_WHITE : "#000" });
}

// ── Queue / Sync ───────────────────────────────────────────────────────────
async function queueClip(clip) {
  const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
  const list = Array.isArray(pendingClips) ? pendingClips : [];
  list.push(clip);
  cachedPendingClips = list;
  await chrome.storage.local.set({ pendingClips: list });
  updateBadge();
  scheduleSync();
}

function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  chrome.alarms.create(ALARM_SYNC, { delayInMinutes: SYNC_DELAY_MINUTES });
}

async function flushQueue() {
  const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
  if (!pendingClips.length) return;

  const remaining = [];
  for (const clip of pendingClips) {
    try {
      await addToAnki(clip.front, clip.backHtml, clip.deckName, clip.modelName);
    } catch (err) {
      console.error("addToAnki failed for clip:", clip, "Error:", err);
      remaining.push(clip);
    }
  }
  cachedPendingClips = remaining;
  await chrome.storage.local.set({ pendingClips: remaining });
  updateBadge();
}

async function checkPendingClips() {
  const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
  cachedPendingClips = Array.isArray(pendingClips) ? pendingClips : [];
  if (cachedPendingClips.length) scheduleSync();
  updateBadge();
}

// ── Context-menu / Badge init ──────────────────────────────────────────────
function initBadge() {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
  chrome.action.setBadgeText({ text: "" });
}

function initContextMenu(platform) {
  // Determine the modifier key based on the operating system (⌘ for Mac, Ctrl for others)
  const mod = platform.os === "mac" ? "⌘" : "Ctrl";
  chrome.contextMenus.create({
    id: COMMAND_SAVE_TO_ANKI,
    title: `Save selection to Anki (${mod}+Shift+K)`,
    contexts: ["selection"]
  });
}

// ── Main action ────────────────────────────────────────────────────────────
async function handleAction(tab, info) {
  console.log('[Background][handleAction] Triggered.');
  console.log('[Background][handleAction] tab.url:', tab?.url, 'tab.id:', tab?.id);
  // Defensive: log tab object
  console.log('[Background][handleAction] tab object:', tab);
  // ...existing code...
  const settings = await getSettings();
  // Diagnostic: log settings
  console.log('[Background][handleAction] Settings loaded:', JSON.stringify(settings, null, 2));

  // ...existing code...

  // always keep a clean text copy so cloze markers don't end up inside <a> tags
  let rawText;
  try {
    rawText = stripHtml(selectionContent);
  } catch (e) {
    console.warn('[Background][handleAction] stripHtml failed, using fallback:', e);
    rawText = selectionContent;
  }

  // Validate we have content to work with
  if (!rawText.trim()) {
    console.warn(`[handleAction] No text content found. Raw HTML: "${selectionContent.substring(0, 100)}..."`);
    notify(tab.id, "error", "No text selected. Please select some text first.");
    return;
  }

  console.log(`[handleAction] Processing ${rawText.length} characters of text`);

  // ── 1.  Build back-side (insert clozes if model = Cloze) ────────────────
  let backHtml;
  let clozeText = null; // <-- Track cloze text for history
  if (isCloze && settings.gptEnabled) {
    try {
      const effectiveClozeGuidance = settings.clozeGuide || SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT;
      const clozed = await generateClozeWithRetry(
        rawText,
        effectiveClozeGuidance,
        pageTitle,
        pageUrl,
        settings.openaiKey,
        settings.gptModel
      );
      clozeText = clozed; // <-- Save for history
      backHtml = generateBackWithSource(clozed, pageTitle, pageUrl, { noSource: true });
    } catch (err) {
      console.warn("Cloze GPT failed, falling back to raw text:", err);
      backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl, { noSource: true });
    }
  } else {
    backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl);
  }

  const ankiOnline = await checkAnkiAvailability();
  const deckList   = await fetchDeckNames();

  // ── For cloze cards without GPT, always show manual input ──────────────
  if (isCloze && !settings.gptEnabled) {
    sendFrontInputRequest(
      tab.id,
      backHtml,
      "Wrap the hidden text in {{c1::…}} (c2, c3… for more).",
      null,
      settings.deckName,
      deckList,
      ankiOnline,
      settings.modelName,
      rawText
    );
    return;
  }

  // ── Determine template for basic card generation ──────────────────────
  let frontGenerationTemplate;
  let historyPromptId, historyPromptLabel;
  
  // Check if selectedPrompt is a system prompt
  if (settings.selectedPrompt === 'system-default-basic') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else if (settings.selectedPrompt === 'system-default-cloze') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT; // Use basic for front generation
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else {
    // Handle user prompts
    const userSelectedProfile = (settings.prompts || []).find(p => p.id === settings.selectedPrompt);
    
    if (userSelectedProfile) {
      frontGenerationTemplate = userSelectedProfile.template;
      historyPromptId = userSelectedProfile.id;
      historyPromptLabel = userSelectedProfile.label;
    } else if (settings.prompts && settings.prompts.length > 0) {
      // Fallback to first user prompt if selectedPrompt is invalid but prompts exist
      frontGenerationTemplate = settings.prompts[0].template;
      historyPromptId = settings.prompts[0].id;
      historyPromptLabel = settings.prompts[0].label;
    } else {
      // Ultimate fallback to system default
      frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
      historyPromptId = 'system-default-basic';
      historyPromptLabel = 'System Default - Basic Cards';
    }
  }

  let front = "";
  let gptFailed = false;

  // ── GPT Front Generation ──────────────────────────────────────────────
  if (settings.gptEnabled && isValidOpenAiKey(settings.openaiKey)) {
    try {
      console.log('[Background][handleAction] Calling generateFrontWithRetry...');
      front = await generateFrontWithRetry(selectionContent, {
        pageTitle,
        pageUrl,
        openaiKey: settings.openaiKey,
        gptModel: settings.gptModel,
        _resolvedTemplateString: frontGenerationTemplate
      });
      console.log('[Background][handleAction] GPT generated front:', front);

      // Store prompt history entry only on success
      console.log('[Background][handleAction] Pre-history check. Settings.gptEnabled:', settings.gptEnabled, 'isValidOpenAiKey:', isValidOpenAiKey(settings.openaiKey), 'Generated front (first 50 chars):', front?.substring(0,50), 'IsCloze:', isCloze, 'ClozeText (first 50 chars):', clozeText?.substring(0,50));
      console.log('[Background][handleAction] Condition (front && front.trim()) evaluates to:', (front && front.trim()));
      if (front && front.trim()) {
        // Diagnostic: log data being prepared for storePromptHistory
        const historyObj = {
          timestamp: Date.now(),
          promptId: historyPromptId,
          promptLabel: historyPromptLabel,
          promptTemplate: frontGenerationTemplate,
          generatedFront: front,
          sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
          pageTitle: pageTitle,
          pageUrl: pageUrl,
          modelName: settings.modelName,
          deckName: settings.deckName,
          generatedClozeText: isCloze ? clozeText : undefined
        };
        console.log('[Background][handleAction] CONDITIONS MET. Calling storePromptHistory for basic card. Data being prepared:', JSON.stringify(historyObj, null, 2));
        await storePromptHistory(historyObj);
      }
    } catch (err) {
      console.error('[Background][handleAction] Front generation failed:', err);
      gptFailed = true;
      front = "";
    }
  }

  // ── Handle confirmation or manual input cases ─────────────────────────
  const needsManualInput = !settings.gptEnabled || gptFailed || settings.alwaysConfirm || !front.trim();
  console.log('[Background][handleAction] needsManualInput:', needsManualInput, 
    '| gptEnabled:', settings.gptEnabled, 
    '| gptFailed:', gptFailed, 
    '| alwaysConfirm:', settings.alwaysConfirm, 
    '| front:', front);

  // --- PDF detection: Only treat as PDF if context menu selectionText is present and tab.url is a PDF ---
  // This ensures only PDF context menu triggers are treated as PDF, not normal web pages.
  const isPdf = (() => {
    // If info.selectionText exists and tab.url looks like a PDF viewer or ends with .pdf, treat as PDF
    if (info && typeof info.selectionText === 'string' && info.selectionText.trim()) {
      if (
        (tab?.url && (
          tab.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/') || // Chrome PDF Viewer
          tab.url.endsWith('.pdf') ||
          (tab.url.startsWith('blob:') && tab.url.includes('.pdf')) ||
          tab.url.startsWith('edge://pdf/') ||
          tab.url.startsWith('resource://pdf.js/')
        ))
      ) {
        return true;
      }
    }
    return false;
  })();

  // --- FIX: Only show manual dialog for non-PDF context menu triggers ---
  if (needsManualInput && !isPdf) {
    sendFrontInputRequest(
      tab.id,
      backHtml,
      gptFailed 
        ? "GPT failed – please supply front text manually."
        : settings.alwaysConfirm 
          ? (isCloze ? "Review and edit the cloze text if needed." : "Review and edit the generated question.")
          : "Please provide a question for the front of this card.",
      gptFailed ? "OpenAI API error occurred" : null,
      settings.deckName,
      deckList,
      ankiOnline,
      settings.modelName,
      front // Pass the generated front (could be empty)
    );
    return;
  }

  // --- If it's a PDF context menu, always go to PDF review queue, never show dialog ---
  if (needsManualInput && isPdf) {
    // --- PDF Review Queue Feature ---
    // (This block is only reached for PDF context menu triggers)
    const cardObj = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now()),
      timestamp: Date.now(),
      sourceText: rawText,
      generatedFront: front || "",
      generatedClozeText: isCloze ? backHtml : "",
      originalPageTitle: pageTitle,
      originalPageUrl: pageUrl,
      originalDeckName: settings.deckName,
      originalModelName: settings.modelName,
      isCloze: !!isCloze
    };

    try {
      const storage = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
      const reviewArr = Array.isArray(storage.pendingReviewPdfCards) ? storage.pendingReviewPdfCards : [];
      reviewArr.unshift(cardObj);
      await chrome.storage.local.set({ pendingReviewPdfCards: reviewArr });
      chrome.notifications.create('pdf_card_for_review_' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick: Card Ready for Review',
        message: 'A card created from a PDF has been added to your review queue in the extension options.'
      });
    } catch (err) {
      chrome.notifications.create('pdf_review_queue_error_' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick: PDF Review Queue Error',
        message: 'Failed to save PDF card for review: ' + err.message
      });
    }
    return;
  }

  console.log(`[handleAction] Auto-saving card with front: "${front.substring(0, 50)}..."`);
  // ── Auto-save (GPT worked and confirmation disabled) ──────────────────
  await saveToAnkiOrQueue(isCloze ? backHtml : front, backHtml, settings, tab.id);
}

// ── Anki helpers ───────────────────────────────────────────────────────────
async function fetchAnki(action, params = {}) {
  const res = await fetch("http://127.0.0.1:8765", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function isAnkiConnectAvailable() {
  try { const { result } = await fetchAnki("version"); return !!result; }
  catch { return false; }
}
const checkAnkiAvailability = isAnkiConnectAvailable;

async function fetchDeckNames() {
  try { const { result } = await fetchAnki("deckNames"); return Array.isArray(result) ? result : []; }
  catch { return []; }
}
// ── Misc helpers ───────────────────────────────────────────────────────────

// Validate OpenAI API key format
function isValidOpenAiKey(key) {
  // Modern OpenAI keys can be sk-proj-... or sk-... and are much longer
  // Just check basic format: starts with 'sk-' and is reasonable length
  const apiKeyPattern = /^sk-[A-Za-z0-9_-]{20,}$/;
  return typeof key === "string" && apiKeyPattern.test(key.trim());
}

// Add this helper if not already present
function stripHtml(html) {
  // Simple HTML tag stripper for fallback
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// ── Misc helpers ───────────────────────────────────────────────────────────
function generateBackWithSource(html, title, url, opts = {}) {
  // If opts.noSource is true, omit the source line (for cloze cards)
  if (opts.noSource) return html;
  return `
    ${html}
    <div style="padding:8px 0 0;text-align:right;font-size:12px;color:#888;">
      <br><hr>
      <a href="${url}" target="_blank" style="color:#888;text-decoration:none;">
        Source: ${title}
      </a>
    </div>`;
}

async function saveToAnkiOrQueue(front, backHtml, settings, tabId) {
  try {
    await addToAnki(front, backHtml, settings.deckName, settings.modelName);
    if (typeof tabId === 'number' && tabId >= 0) {
      notify(tabId, "success", "Card saved to Anki!");
    } else {
      console.log('[Background][saveToAnkiOrQueue] Skipping in-page notification for "Card saved to Anki!" due to invalid/null tabId (expected for PDF/options page flow). System notification should cover this.');
    }
  } catch (err) {
    if (err instanceof TypeError) {
      await queueClip({ front, backHtml, ...settings });
      if (typeof tabId === 'number' && tabId >= 0) {
        notify(tabId, "success", "Anki offline – card saved locally");
      } else {
        console.log('[Background][saveToAnkiOrQueue] Skipping in-page notification for "Anki offline – card saved locally" due to invalid/null tabId (expected for PDF/options page flow). System notification should cover this.');
      }
    } else {
      if (typeof tabId === 'number' && tabId >= 0) {
        notify(tabId, "error", `Save failed: ${err.message || "Unknown error"}`);
      } else {
        console.log('[Background][saveToAnkiOrQueue] Skipping in-page notification for save failure due to invalid/null tabId (expected for PDF/options page flow). System notification should cover this.');
      }
    }
  }
}

function getSettings() {
  return chrome.storage.local.get({
    deckName: "Default",
    modelName: "Basic",
    gptEnabled: false,
    gptModel: "gpt-3.5-turbo",
    openaiKey: "",
    confirmGpt: false,
    alwaysConfirm: true, // New setting: always show manual dialog
    gptPrompt: "You are an expert Anki flash-card creator.",
    prompts: [
      { id: 'basic-default',
        label: 'Default Basic',
        template: `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.` }
    ],
    selectedPrompt: 'basic-default' // Ensure default is string ID
  });
}

// stub – real UI lives in content script / popup
function sendFrontInputRequest(tabId, backHtml, helper, err,
                               deckName, deckList, ankiOnline,
                               modelName, frontHtml = "") {
  const messagePayload = {
    action: "manualFront",
    backHtml,
    helper,
    error: err,
    deckName,
    deckList,
    ankiOnline,
    modelName,
    frontHtml
  };
  console.log('[Background][sendFrontInputRequest] Attempting to send request to tab:', tabId, 'Payload:', messagePayload);

  chrome.tabs.sendMessage(tabId, messagePayload, response => {
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message;
      if (errorMessage.includes('The message port closed before a response was received')) {
        console.warn('[Background][sendFrontInputRequest] Info: Message port closed for "manualFront" to tab:', tabId, '. This is often expected as the content script shows UI and sends a new message on user action. Error details:', errorMessage);
      } else if (errorMessage.includes('Receiving end does not exist')) {
        // Log if this is a normal HTML page
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('[Background][sendFrontInputRequest] Cannot access tab for retry:', chrome.runtime.lastError.message);
            return;
          }
          console.error('[Background][sendFrontInputRequest] "Receiving end does not exist" for tab:', tabId, 'Tab URL:', tab.url);
          // ...existing retry/injection logic...
        });
      } else {
        console.error('[Background][sendFrontInputRequest] Unhandled messaging error for "manualFront" to tab:', tabId, 'Error:', errorMessage);
      }
    } else {
      console.log('[Background][sendFrontInputRequest] "manualFront" request dispatched to tab:', tabId, 'Optional response:', response);
    }
  });
}

// Store prompt history entry
async function storePromptHistory(entry) {
  // Diagnostic: log entry at start
  console.log('[Background][storePromptHistory] CALLED. Entry to be saved:', JSON.stringify(entry, null, 2));
  try {
    let { promptHistory = [] } = await chrome.storage.local.get({ promptHistory: [] });

    // Limit the size of the array during retrieval
    promptHistory = promptHistory.slice(0, MAX_PROMPT_HISTORY - 1);

    // Add new entry at the beginning
    promptHistory.unshift(entry);

    // Keep only the latest MAX_PROMPT_HISTORY entries
    if (promptHistory.length > MAX_PROMPT_HISTORY) {
      promptHistory.splice(MAX_PROMPT_HISTORY);
    }

    await chrome.storage.local.set({ promptHistory });
  } catch (err) {
    // Enhanced error logging
    console.error("[Background][storePromptHistory] FAILED to store prompt history. Error:", err, "Attempted entry data:", JSON.stringify(entry, null, 2));
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.getPlatformInfo(p => {
    initBadge();
    initContextMenu(p);
    checkPendingClips();
  });
  console.log("Extension installed");
});

chrome.runtime.onStartup.addListener(() => {
  syncScheduled = false;
  checkPendingClips();
});

chrome.alarms.onAlarm.addListener(a => {
  if (a.name === ALARM_SYNC) { syncScheduled = false; flushQueue(); }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Diagnostic logging for PDF/context menu debugging
  console.log('[ContextMenu PDF Check] Context menu clicked. Raw Info Object:', JSON.stringify(info, null, 2));
  console.log('[ContextMenu PDF Check] Raw Tab Object:', JSON.stringify(tab, null, 2));
  console.log('[ContextMenu PDF Check] info.menuItemId:', info?.menuItemId);
  console.log('[ContextMenu PDF Check] info.selectionText (THIS IS CRUCIAL):', info?.selectionText);
  console.log('[ContextMenu PDF Check] info.pageUrl (from info object):', info?.pageUrl);
  console.log('[ContextMenu PDF Check] info.frameUrl (if available):', info?.frameUrl);
  console.log('[ContextMenu PDF Check] info.linkUrl (if available, for context):', info?.linkUrl);
  console.log('[ContextMenu PDF Check] tab.id:', tab?.id);
  console.log('[ContextMenu PDF Check] tab.url (from tab object):', tab?.url);
  console.log('[ContextMenu PDF Check] tab.title (from tab object):', tab?.title);
  console.log('[ContextMenu PDF Check] tab.favIconUrl (if available):', tab?.favIconUrl);

  // PDF/context menu workaround: use info.selectionText directly if present
  if (info.menuItemId === COMMAND_SAVE_TO_ANKI && info.selectionText && info.selectionText.trim() !== "") {
    console.log('[ContextMenu PDF Path] Valid info.selectionText found, processing directly for command:', info.menuItemId);
    await handlePdfSelection(info, tab);
    return;
  }

  // Existing handler for other cases
  if (info.menuItemId === COMMAND_SAVE_TO_ANKI) {
    console.log('[ContextMenu Normal Path] No direct selectionText or different command, using handleAction for command:', info.menuItemId);
    handleAction(tab, info);
  }
});

// PDF/context menu workaround handler
async function handlePdfSelection(info, tab) {
  // 1. Entry logging
  console.log('[handlePdfSelection] Entry. info.selectionText (first 100 chars):', info.selectionText?.substring(0, 100));
  console.log('[handlePdfSelection] Tab object (raw):', JSON.stringify(tab, null, 2));
  console.log('[handlePdfSelection] Info object (raw):', JSON.stringify(info, null, 2));

  // 2. Get page info and log
  let pageTitle = tab?.title || "PDF Document";
  let pageUrl = info?.frameUrl || tab?.url || info?.pageUrl || "";
  if (pageUrl.startsWith('chrome-extension://')) {
    pageTitle = tab?.title || "Viewed PDF";
    pageUrl = "";
  }
  console.log('[handlePdfSelection] Determined Page Info - Title:', pageTitle, 'URL:', pageUrl);

  // 3. Load settings and log
  const settings = await getSettings();
  // Diagnostic: log settings
  console.log('[Background][handlePdfSelection] Settings loaded:', JSON.stringify(settings, null, 2));

  // --- Add robust logging before template selection logic ---
  console.log('[Background][handlePdfSelection] --- Determining frontGenerationTemplate ---');
  console.log('[Background][handlePdfSelection] Initial settings.selectedPrompt:', settings.selectedPrompt);
  console.log('[Background][handlePdfSelection] Initial settings.prompts:', JSON.stringify(settings.prompts, null, 2));

  let frontGenerationTemplate, historyPromptId, historyPromptLabel;

  if (settings.selectedPrompt === 'system-default-basic') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else if (settings.selectedPrompt === 'system-default-cloze') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else {
    const userSelectedProfile = (settings.prompts || []).find(p => p.id === settings.selectedPrompt);
    if (userSelectedProfile) {
      frontGenerationTemplate = userSelectedProfile.template;
      historyPromptId = userSelectedProfile.id;
      historyPromptLabel = userSelectedProfile.label;
    } else if (settings.prompts && settings.prompts.length > 0) {
      frontGenerationTemplate = settings.prompts[0].template;
      historyPromptId = settings.prompts[0].id;
      historyPromptLabel = settings.prompts[0].label;
    } else {
      frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
      historyPromptId = 'system-default-basic';
      historyPromptLabel = 'System Default - Basic Cards';
    }
  }

  // Log the state of frontGenerationTemplate AFTER the selection logic but BEFORE the safeguard
  console.log('[Background][handlePdfSelection] Value of frontGenerationTemplate BEFORE safeguard (first 100 chars):', frontGenerationTemplate ? `"${frontGenerationTemplate.substring(0,100)}..."` : String(frontGenerationTemplate));
  console.log('[Background][handlePdfSelection] Value of historyPromptId BEFORE safeguard:', historyPromptId);
  console.log('[Background][handlePdfSelection] Value of historyPromptLabel BEFORE safeguard:', historyPromptLabel);

  // CRITICAL SAFEGUARD:
  if (!frontGenerationTemplate || typeof frontGenerationTemplate !== 'string' || frontGenerationTemplate.trim() === "") {
      console.warn('[Background][handlePdfSelection] WARNING: frontGenerationTemplate was invalid or empty. Forcing to SYSTEM_DEFAULT_BASIC_PROMPT_TEXT. Original settings.selectedPrompt was:', settings.selectedPrompt);
      frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
      historyPromptId = 'system-default-basic';
      historyPromptLabel = 'System Default - Basic Cards';
      console.log('[Background][handlePdfSelection] Safeguard applied. New frontGenerationTemplate (first 100 chars):', frontGenerationTemplate?.substring(0, 100));
  }

  // 4. Build backHtml (Cloze or Basic)
  const isCloze = /cloze/i.test(settings.modelName);
  const rawText = info.selectionText;
  let backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl, { noSource: !pageUrl });
  let clozeText = null; // <-- Track cloze text for history

  if (isCloze && settings.gptEnabled) {
    console.log('[handlePdfSelection] Attempting GPT Cloze generation for PDF text.');
    try {
      const effectiveClozeGuidance = settings.clozeGuide || SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT;
      const clozed = await generateClozeWithRetry(
        rawText,
        effectiveClozeGuidance,
        pageTitle,
        pageUrl,
        settings.openaiKey,
        settings.gptModel
      );
      clozeText = clozed; // <-- Save for history
      console.log('[handlePdfSelection] GPT Cloze generation successful. Clozed text (first 100 chars):', clozed?.substring(0, 100));
      backHtml = generateBackWithSource(clozed, pageTitle, pageUrl, { noSource: true });
    } catch (err) {
      console.error("[handlePdfSelection] GPT Cloze generation failed:", err);
      chrome.notifications.create('pdf_cloze_gpt_error', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick PDF Error',
        message: 'GPT Cloze generation failed: ' + err.message + '. Falling back to raw text.'
      });
      backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl, { noSource: true });
    }
  }

  // 5. Front generation (Basic card and GPT enabled)
  let front = "";
  let gptFailed = false;

  if (settings.selectedPrompt === 'system-default-basic') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else if (settings.selectedPrompt === 'system-default-cloze') {
    frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
    historyPromptId = 'system-default-basic';
    historyPromptLabel = 'System Default - Basic Cards';
  } else {
    const userSelectedProfile = (settings.prompts || []).find(p => p.id === settings.selectedPrompt);
    if (userSelectedProfile) {
      frontGenerationTemplate = userSelectedProfile.template;
      historyPromptId = userSelectedProfile.id;
      historyPromptLabel = userSelectedProfile.label;
    } else if (settings.prompts && settings.prompts.length > 0) {
      frontGenerationTemplate = settings.prompts[0].template;
      historyPromptId = settings.prompts[0].id;
      historyPromptLabel = settings.prompts[0].label;
    } else {
      frontGenerationTemplate = SYSTEM_DEFAULT_BASIC_PROMPT_TEXT;
      historyPromptId = 'system-default-basic';
      historyPromptLabel = 'System Default - Basic Cards';
    }
  }

  if (!isCloze && settings.gptEnabled && isValidOpenAiKey(settings.openaiKey)) {
    // FINAL log before calling generateFrontWithRetry
    console.log("[Background][handlePdfSelection] FINAL check before generateFrontWithRetry. _resolvedTemplateString will be (first 100 chars):", frontGenerationTemplate?.substring(0, 100));
    try {
      front = await generateFrontWithRetry(rawText, {
        pageTitle,
        pageUrl,
        openaiKey: settings.openaiKey,
        gptModel: settings.gptModel,
        _resolvedTemplateString: frontGenerationTemplate // Always use the safeguarded value here
      });
      console.log('[Background][handlePdfSelection] GPT generated front:', front);

      // Store prompt history entry only on success
      console.log('[Background][handlePdfSelection][Basic] Pre-history check. Settings.gptEnabled:', settings.gptEnabled, 'isValidOpenAiKey:', isValidOpenAiKey(settings.openaiKey), 'Generated front (first 50 chars):', front?.substring(0,50));
      console.log('[Background][handlePdfSelection][Basic] Condition (front && front.trim()) evaluates to:', (front && front.trim()));
      if (front && front.trim()) {
        const historyObj = {
          timestamp: Date.now(),
          promptId: historyPromptId,
          promptLabel: historyPromptLabel,
          promptTemplate: frontGenerationTemplate,
          generatedFront: front,
          sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
          pageTitle: pageTitle,
          pageUrl: pageUrl,
          modelName: settings.modelName,
          deckName: settings.deckName
        };
        console.log('[Background][handlePdfSelection][Basic] CONDITIONS MET. Calling storePromptHistory for PDF basic card. Data being prepared:', JSON.stringify(historyObj, null, 2));
        await storePromptHistory(historyObj);
      }
      gptFailed = false;
    } catch (err) {
      // Diagnostic: log GPT failure and skip history
      console.error('[Background][handlePdfSelection][Basic] GPT front generation FAILED. History will NOT be saved for this attempt. Error:', err);
      gptFailed = true;
      front = "";
    }
  } else if (isCloze && settings.gptEnabled && clozeText) {
    // Diagnostic before storePromptHistory for cloze PDF
    const historyObj = {
      timestamp: Date.now(),
      promptId: historyPromptId,
      promptLabel: historyPromptLabel,
      promptTemplate: SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT,
      generatedFront: "", // No front for cloze, or could use rawText
      generatedClozeText: clozeText,
      sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
      pageTitle: pageTitle,
      pageUrl: pageUrl,
      modelName: settings.modelName,
      deckName: settings.deckName
    };
    console.log('[Background][handlePdfSelection][Cloze] CONDITIONS MET. Calling storePromptHistory for PDF cloze card. ClozeText (first 50 chars):', clozeText?.substring(0,50), 'Data being prepared:', JSON.stringify(historyObj, null, 2));
    await storePromptHistory(historyObj);
  }

  // 6. Determine if manual review is needed
  const needsManualReview =
    !settings.gptEnabled ||
    gptFailed ||
    settings.alwaysConfirm ||
    (isCloze && !settings.gptEnabled) ||
    (!isCloze && !front.trim() && settings.gptEnabled);

  // Log the values that contribute to needsManualReview
  console.log('[handlePdfSelection] Determining review status. Settings:', { gptEnabled: settings.gptEnabled, alwaysConfirm: settings.alwaysConfirm }, 'GPT Failed:', gptFailed, 'Is Cloze:', isCloze, 'Generated Front (trimmed):', front?.trim());
  console.log('[handlePdfSelection] Calculated needsManualReview:', needsManualReview);

  // --- PDF Review Queue Feature ---
  if (needsManualReview) {
    console.log('[handlePdfSelection] Path: Needs Manual Review for PDF card.');

    // Build card object for review queue
    const cardObj = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now()),
      timestamp: Date.now(),
      sourceText: rawText,
      generatedFront: front || "",
      generatedClozeText: isCloze ? backHtml : "",
      originalPageTitle: pageTitle,
      originalPageUrl: pageUrl,
      originalDeckName: settings.deckName,
      originalModelName: settings.modelName,
      isCloze: !!isCloze
    };

    try {
      const storage = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
      const reviewArr = Array.isArray(storage.pendingReviewPdfCards) ? storage.pendingReviewPdfCards : [];
      reviewArr.unshift(cardObj);
      await chrome.storage.local.set({ pendingReviewPdfCards: reviewArr });
      console.log('[handlePdfSelection] PDF card added to pendingReviewPdfCards. New queue length:', reviewArr.length);
      chrome.notifications.create('pdf_card_for_review_' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick: Card Ready for Review',
        message: 'A card created from a PDF has been added to your review queue in the extension options.'
      });
    } catch (err) {
      console.error('[handlePdfSelection] Failed to save PDF card to review queue:', err);
      chrome.notifications.create('pdf_review_queue_error_' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick: PDF Review Queue Error',
        message: 'Failed to save PDF card for review: ' + err.message
      });
    }
    console.log('[handlePdfSelection] Exit.');
    return;
  }

  // --- Auto-save path ---
  console.log('[handlePdfSelection] Path: Auto-Save Attempt for PDF card.');
  try {
    await saveToAnkiOrQueue(isCloze ? backHtml : front, backHtml, settings, null);
    console.log('[handlePdfSelection] Auto-save: Call to saveToAnkiOrQueue completed for PDF card.');
    chrome.notifications.create('pdf_autosave_processed_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Zawrick: PDF Card Processed',
      message: 'Card from PDF selection has been processed. Check Anki or your pending queue. (Background console has details)'
    });
  } catch (err) {
    console.error('[handlePdfSelection] Auto-save: Error during saveToAnkiOrQueue for PDF card:', err);
    chrome.notifications.create('pdf_autosave_error_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Zawrick: PDF Auto-Save Error',
      message: 'Failed to process card from PDF for auto-save: ' + err.message
    });
  }
  console.log('[handlePdfSelection] Exit.');
}

// ── Message Listeners ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveFinalizedPdfCard") {
    // Wrap in async IIFE to use await inside listener
    (async () => {
        try {
            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: Attempting to save/queue card:', message.cardData);
            await saveToAnkiOrQueue(
                message.cardData.front,
                message.cardData.backHtml,
                { deckName: message.cardData.deckName, modelName: message.cardData.modelName },
                null // tabId
            );
            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: saveToAnkiOrQueue completed.');

            const successNotificationId = 'finalized_pdf_card_saved_' + Date.now();
            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: Creating success system notification:', successNotificationId);
            chrome.notifications.create(successNotificationId, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Zawrick: Reviewed Card Processed',
                message: 'The reviewed card has been sent to Anki (or your pending queue).'
            });

            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: Sending SUCCESS response.');
            sendResponse({ success: true });
        } catch (err) {
            console.error('[Background][onMessage][saveFinalizedPdfCard] Async task: Error processing card:', err, 'Data was:', message.cardData);
            const errorNotificationId = 'finalized_pdf_card_error_' + Date.now();
            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: Creating error system notification:', errorNotificationId);
            chrome.notifications.create(errorNotificationId, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Zawrick: Save Error',
                message: 'Failed to process reviewed card: ' + (err.message || "Unknown background error")
            });
            console.log('[Background][onMessage][saveFinalizedPdfCard] Async task: Sending ERROR response.');
            sendResponse({ success: false, error: err.message || 'Unknown error in background processing' });
        }
    })(); // Call the async function

    console.log('[Background][onMessage][saveFinalizedPdfCard] Handler setup for async response. Returning true.');
    return true; // Essential: Synchronously return true to keep the message port open
  }

  // Handler for manualSave (if asynchronous and uses sendResponse)
  if (msg.action === "manualSave") {
    console.log('[Background][onMessage][manualSave] Received message. Data:', msg);
    (async () => {
      try {
        await saveToAnkiOrQueue(
          msg.front,
          msg.backHtml,
          { deckName: msg.deckName, modelName: msg.modelName },
          sender.tab ? sender.tab.id : null
        );
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Unknown error in background' });
      }
    })();
    console.log('[Background][onMessage][manualSave] Intending to respond asynchronously, returning true.');
    return true;
  }
  // ...existing code...
});

