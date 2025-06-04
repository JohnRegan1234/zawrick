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

const SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT = `You are an expert Anki cloze deletion creator. Your goal is to process the provided text selection and convert it into a single string formatted for Anki cloze cards. The input text may contain simple inline HTML formatting (like <b>, <i>, <u>, <span>, <a>) which you should attempt to preserve around the text content.

Please adhere to the following rules:

1.  **Identify Key Information:** For each new concept or distinct piece of information in the text, use a new cloze index (e.g., \`{{c1::concept one}}\`, then \`{{c2::another concept}}\`, \`{{c3::a third detail}}\`, etc.). Always start with \`{{c1::...}}\` for the first piece of clozed information.

2.  **Group Related Items:** If several items clearly belong to the same category or are very closely related (like a list of examples), group them into a single cloze.
    * Use the format: \`{{cN::item A, item B, item C::xNUMBER_OF_ITEMS}}\`.
    * For example: "Primary colors include \`{{c1::red, yellow, blue::x3}}\`."
    * Only use the \`::xNUMBER_OF_ITEMS\` suffix when you are deliberately grouping multiple listed answers within a single cloze. Do not use it for single concepts.

3.  **Context is Crucial:** The un-occluded part of the sentence MUST provide enough context for the user to reasonably determine what the clozed information refers to.

4.  **Explicit Subject/Condition:** If the clozed content refers to a specific condition, subject, or proper noun (e.g., "Photosynthesis" or "Alzheimer's disease"), ensure this subject is explicitly mentioned in the non-occluded part of the sentence to avoid ambiguity.

5.  **Output Formatting:**
    * The output must be ONLY the processed text containing the cloze deletions.
    * PRESERVE simple inline HTML tags like <b>, <i>, <u>, <span>, <a> around text content where they exist.
    * When clozing text that has HTML formatting, include the HTML tags INSIDE the cloze deletion: \`{{c1::<b>formatted text</b>}}\`.
    * Do NOT cloze the HTML tags themselves, only the text content they contain.
    * Do NOT add any markdown like horizontal rules/lines or bold formatting with asterisks.
    * Do NOT number the output as if it were a list of cards (e.g., avoid "1:", "2:"). The output should be a single continuous string.
    * Avoid block-level HTML elements like <div>, <p>, <h1>, etc. in your output.

6.  **Consistency:** Try to maintain consistent formatting if similar concepts or structures appear multiple times within the provided text selection.

7.  **Valid Cloze Indexing:** Each cloze index (e.g., \`{{c1::}}\`, \`{{c2::}}\`) should generally appear only once. The exception is if you are using advanced Anki cloze features where a single \`cN\` can hide multiple separate parts of a sentence, but for simplicity, prioritize unique indices for distinct pieces of information unless a specific grouping (as in rule #2) is intended.

**Examples of Properly Formatted Output:**

* Input: "Foods high in iron include <b>red meat</b>, <i>liver/kidney</i>, and <u>oily fish</u>."
    Desired output: "Foods high in iron include \`{{c1::<b>red meat</b>, <i>liver/kidney</i>, <u>oily fish</u>::x3}}\`."

* Input: "At birth, a term newborn has iron stores of approximately <b>250 mg</b>, with <i>75%</i> in the blood and <i>25%</i> in ferritin/haemosiderin/tissues."
    Desired output: "At birth, a term newborn has iron stores of approximately \`{{c1::<b>250 mg</b>}}\`, with \`{{c2::<i>75%</i>}}\` in the blood and \`{{c3::<i>25%</i>}}\` in ferritin/haemosiderin/tissues."`;

// ── State ───────────────────────────────────────────────────────────────────
let syncScheduled      = false;
let cachedPendingClips = [];

// ── Helpers ────────────────────────────────────────────────────────────────
function notify(tabId, status, message) {
  if (typeof tabId !== 'number' || tabId < 0) {
    console.error('[Background][notify] Invalid tabId received:', tabId);
    return;
  }

  console.log('[Background][notify] Sending notification to tab:', tabId, {status, message});

  chrome.tabs.sendMessage(tabId, { status, message }, async (response) => {
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message;
      
      if (errorMessage.includes('The message port closed before a response was received')) {
        console.warn('[Background][notify] Message port closed - this is expected for notifications');
        return;
      }
      
      if (errorMessage.includes('Receiving end does not exist')) {
        console.log('[Background][notify] Content script missing, attempting injection');
        try {
          await injectContentScriptAndWait(tabId);
          // Retry notification
          chrome.tabs.sendMessage(tabId, { status, message });
        } catch (err) {
          console.error('[Background][notify] Failed to inject content script:', err.message);
        }
        return;
      }
      
      console.error('[Background][notify] Unhandled error:', errorMessage);
    }
  });
}

function getSelectionHtml(tabId) {
  if (typeof tabId !== 'number' || tabId < 0) {
    console.error('[Background][getSelectionHtml] Invalid tabId:', tabId);
    return Promise.resolve({ html: "", error: "Invalid tabId" });
  }

  return new Promise(async (resolve) => {
    // Try direct message first
    chrome.tabs.sendMessage(tabId, { action: "getSelectionHtml" }, async (response) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message;
        
        if (errorMessage.includes('Receiving end does not exist')) {
          try {
            await injectContentScriptAndWait(tabId);
            // Retry after injection
            chrome.tabs.sendMessage(tabId, { action: "getSelectionHtml" }, (retryResponse) => {
              if (chrome.runtime.lastError) {
                resolve({ html: "", error: chrome.runtime.lastError.message });
              } else {
                resolve(retryResponse || { html: "", error: "No response data" });
              }
            });
          } catch (err) {
            resolve({ html: "", error: err.message });
          }
        } else {
          resolve({ html: "", error: errorMessage });
        }
      } else {
        resolve(response || { html: "", error: "No response data" });
      }
    });
  });
}

// ── Template Selection Logic ──────────────────────────────────────────────
function getPromptTemplate(settings) {
  console.log('[Background][getPromptTemplate] Selecting template for:', settings.selectedPrompt);
  
  // System prompts
  if (settings.selectedPrompt === 'system-default-basic') {
    return {
      template: SYSTEM_DEFAULT_BASIC_PROMPT_TEXT,
      id: 'system-default-basic',
      label: 'System Default - Basic Cards'
    };
  }
  
  if (settings.selectedPrompt === 'system-default-cloze') {
    // For cloze system prompt, use basic template for front generation
    return {
      template: SYSTEM_DEFAULT_BASIC_PROMPT_TEXT,
      id: 'system-default-basic',
      label: 'System Default - Basic Cards'
    };
  }
  
  // User prompts
  const userPrompts = Array.isArray(settings.prompts) ? settings.prompts : [];
  const userSelectedProfile = userPrompts.find(p => p.id === settings.selectedPrompt);
  
  if (userSelectedProfile && userSelectedProfile.template) {
    return {
      template: userSelectedProfile.template,
      id: userSelectedProfile.id,
      label: userSelectedProfile.label
    };
  }
  
  // Fallback to first user prompt if it exists and has a template
  if (userPrompts.length > 0 && userPrompts[0].template) {
    console.warn('[Background][getPromptTemplate] Selected prompt not found, using first user prompt');
    return {
      template: userPrompts[0].template,
      id: userPrompts[0].id,
      label: userPrompts[0].label
    };
  }
  
  // Ultimate fallback
  console.warn('[Background][getPromptTemplate] No valid prompts found, using system default');
  return {
    template: SYSTEM_DEFAULT_BASIC_PROMPT_TEXT,
    id: 'system-default-basic',
    label: 'System Default - Basic Cards'
  };
}

// ── Improved Script Injection ─────────────────────────────────────────────
async function injectContentScriptAndWait(tabId, maxRetries = 3) {
  const tab = await new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(tab);
      }
    });
  });

  if (!tab || !tab.url || tab.discarded) {
    throw new Error('Tab invalid, missing URL, or discarded');
  }

  const isRestrictedUrl = tab.url.startsWith('chrome://') ||
                         tab.url.startsWith('about:') ||
                         tab.url.startsWith('moz-extension://') ||
                         tab.url.startsWith('chrome-extension://') ||
                         tab.url.startsWith('edge://') ||
                         tab.url.startsWith('opera://') ||
                         tab.url === 'about:blank';

  if (isRestrictedUrl) {
    throw new Error('Cannot inject content script on restricted page');
  }

  // Inject the script
  await new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['contentScript.js']
    }, (injectionResult) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!injectionResult || injectionResult.length === 0) {
        reject(new Error('Content script injection returned no results'));
      } else {
        resolve();
      }
    });
  });

  // Wait for script to be ready by checking if it responds
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Progressive delay
    
    const isReady = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        resolve(!chrome.runtime.lastError && response?.ready);
      });
    });

    if (isReady) {
      return;
    }
  }

  throw new Error(`Content script not ready after ${maxRetries} attempts`);
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
      // Construct extraContentForCloze from queued clip data
      let extraContentForCloze = "";
      if (/cloze/i.test(clip.modelName)) {
        // Combine image and source from the queued clip
        if (clip.imageHtml) {
          extraContentForCloze += clip.imageHtml;
          if (clip.pageUrl) {
            extraContentForCloze += "<br><hr><br>"; // Add separator between image and source
          }
        }
        if (clip.pageUrl) {
          // Generate source link HTML for cloze Extra field
          const sourceHtml = generateBackWithSource("", clip.pageTitle || "", clip.pageUrl);
          extraContentForCloze += sourceHtml;
        }
      }
      
      await addToAnki(clip.front, clip.backHtml, clip.deckName, clip.modelName, extraContentForCloze);
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
  console.log('[Background][handleAction] Triggered for tab:', tab?.id);
  
  const settings = await getSettings();
  
  // Get selection content
  const selectionResult = await getSelectionHtml(tab.id);
  if (selectionResult.error || !selectionResult.html) {
    notify(tab.id, "error", "Could not get selected text. Please try again.");
    return;
  }
  
  const selectionContent = selectionResult.html;
  const pageTitle = tab?.title || "Unknown Page";
  const pageUrl = tab?.url || "";
  const isCloze = /cloze/i.test(settings.modelName);

  // Extract image for cloze notes
  let imageHtmlForExtra = "";
  if (isCloze && selectionContent && /<img[^>]+>/i.test(selectionContent)) {
    const imgMatch = selectionContent.match(/<img[^>]+>/i);
    if (imgMatch) {
      imageHtmlForExtra = imgMatch[0];
    }
  }

  // Extract text content
  let rawText;
  try {
    rawText = stripHtml(selectionContent);
  } catch (e) {
    console.warn('[Background][handleAction] stripHtml failed:', e);
    rawText = selectionContent;
  }

  if (!rawText.trim()) {
    notify(tab.id, "error", "No text selected. Please select some text first.");
    return;
  }

  // Get prompt template using centralized logic
  const promptInfo = getPromptTemplate(settings);

  // Build back HTML
  let backHtml;
  let clozeText = null;
  
  if (isCloze && settings.gptEnabled) {
    try {
      const effectiveClozeGuidance = settings.clozeGuide || SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT;
      const clozed = await generateClozeWithRetry(
        selectionContent, // Pass original HTML content instead of rawText
        effectiveClozeGuidance,
        pageTitle,
        pageUrl,
        settings.openaiKey,
        settings.gptModel
      );
      clozeText = clozed;
      backHtml = generateBackWithSource(clozed, pageTitle, pageUrl, { noSource: true });
    } catch (err) {
      console.warn("Cloze GPT failed:", err);
      backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl, { noSource: true });
    }
  } else {
    backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl);
  }

  const ankiOnline = await checkAnkiAvailability();
  const deckList = await fetchDeckNames();

  // For cloze cards without GPT, show manual input
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
      rawText,
      pageTitle,
      pageUrl,
      imageHtmlForExtra,
      selectionContent
    );
    return;
  }

  // Generate front text
  let front = "";
  let gptFailed = false;

  if (settings.gptEnabled && isValidOpenAiKey(settings.openaiKey)) {
    try {
      front = await generateFrontWithRetry(selectionContent, {
        pageTitle,
        pageUrl,
        openaiKey: settings.openaiKey,
        gptModel: settings.gptModel,
        _resolvedTemplateString: promptInfo.template
      });

      // Store history on success
      if (front && front.trim()) {
        await storePromptHistory({
          timestamp: Date.now(),
          promptId: promptInfo.id,
          promptLabel: promptInfo.label,
          promptTemplate: promptInfo.template,
          generatedFront: front,
          sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
          pageTitle,
          pageUrl,
          modelName: settings.modelName,
          deckName: settings.deckName,
          generatedClozeText: isCloze ? clozeText : undefined
        });
      }
    } catch (err) {
      console.error('[Background][handleAction] Front generation failed:', err);
      gptFailed = true;
      front = "";
    }
  }

  // Determine if manual input is needed
  const needsManualInput = !settings.gptEnabled || gptFailed || settings.alwaysConfirm || !front.trim();

  if (needsManualInput) {
    sendFrontInputRequest(
      tab.id,
      backHtml,
      gptFailed ? "GPT failed – please supply front text manually." :
        settings.alwaysConfirm ? (isCloze ? "Review and edit the cloze text if needed." : "Review and edit the generated question.") :
        "Please provide a question for the front of this card.",
      gptFailed ? "OpenAI API error occurred" : null,
      settings.deckName,
      deckList,
      ankiOnline,
      settings.modelName,
      isCloze ? clozeText : front, // Use clozeText for cloze cards, front for basic cards
      pageTitle,
      pageUrl,
      imageHtmlForExtra,
      selectionContent
    );
    return;
  }

  // Auto-save
  await saveToAnkiOrQueue(isCloze ? backHtml : front, backHtml, settings, tab.id, pageTitle, pageUrl, imageHtmlForExtra);
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

// A new helper function to check for PDF URLs
function isPdfUrl(url) {
    if (!url) return false;
    return (
        url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/') || // Chrome's native PDF viewer
        url.endsWith('.pdf') ||
        url.startsWith('edge://pdf/') || // Edge's PDF viewer
        (url.startsWith('blob:') && url.includes('.pdf')) ||
        url.startsWith('resource://pdf.js/')
    );
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
    if (typeof tabId === 'number' && tabId >= 0) {
      notify(tabId, "success", "Card saved to Anki!");
    } else {
      console.log('[Background][saveToAnkiOrQueue] Skipping in-page notification for "Card saved to Anki!" due to invalid/null tabId (expected for PDF/options page flow). System notification should cover this.');
    }
  } catch (err) {
    if (err instanceof TypeError) {
      await queueClip({ front, backHtml, ...settings, pageTitle, pageUrl, imageHtml });
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
                               modelName, frontHtml = "", pageTitle = "", pageUrl = "", imageHtml = "", originalSelectionHtml = "") {
  const messagePayload = {
    action: "manualFront",
    backHtml: backHtml, // Pass the fully-formatted card back for previewing
    helper,
    error: err,
    deckName,
    deckList,
    ankiOnline,
    modelName,
    frontHtml,
    pageTitle,
    pageUrl,
    imageHtml,
    originalSelectionHtml
  };
  console.log('[Background][sendFrontInputRequest] Attempting to send request to tab:', tabId, 'Payload:', messagePayload);

  chrome.tabs.sendMessage(tabId, messagePayload, response => {
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message;
      if (errorMessage.includes('The message port closed before a response was received')) {
        console.warn('[Background][sendFrontInputRequest] Info: Message port closed for "manualFront" to tab:', tabId, '. This is often expected as the content script shows UI and sends a new message on user action. Error details:', errorMessage);
      } else if (errorMessage.includes('Receiving end does not exist')) {
        console.warn('[Background][sendFrontInputRequest] Missing content script for "manualFront" request to tab:', tabId, '. Attempting injection.');
        injectContentScriptAndWait(tabId)
          .then(() => {
            chrome.tabs.sendMessage(tabId, messagePayload, (retryResponse) => {
              if (chrome.runtime.lastError) {
                console.error('[Background][sendFrontInputRequest] Retry after injection also failed:', chrome.runtime.lastError.message);
              } else {
                console.log('[Background][sendFrontInputRequest] "manualFront" successfully sent after injection to tab:', tabId);
              }
            });
          })
          .catch((injectionError) => {
            console.error('[Background][sendFrontInputRequest] Script injection failed for tab:', tabId, 'Error:', injectionError);
          });
      } else {
        console.error('[Background][sendFrontInputRequest] Unhandled error for "manualFront" to tab:', tabId, 'Error:', errorMessage);
      }
    } else {
      console.log('[Background][sendFrontInputRequest] "manualFront" request dispatched to tab:', tabId, 'Optional response:', response);
    }
  });
}

// Store prompt history entry
async function storePromptHistory(entry) {
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
    console.error("[Background][storePromptHistory] FAILED to store prompt history. Error:", err, "Attempted entry data:", JSON.stringify(entry, null, 2));
  }
}

// ── PDF Review Queue Management ───────────────────────────────────────────
async function getPendingPdfCards() {
  try {
    const { pendingReviewPdfCards = [] } = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
    return Array.isArray(pendingReviewPdfCards) ? pendingReviewPdfCards : [];
  } catch (err) {
    console.error('[Background][getPendingPdfCards] Failed to get PDF cards:', err);
    return [];
  }
}

async function removePdfCard(cardId) {
  try {
    const storage = await chrome.storage.local.get({ pendingReviewPdfCards: [] });
    const reviewArr = Array.isArray(storage.pendingReviewPdfCards) ? storage.pendingReviewPdfCards : [];
    const filteredArr = reviewArr.filter(card => card.id !== cardId);
    await chrome.storage.local.set({ pendingReviewPdfCards: filteredArr });
    return true;
  } catch (err) {
    console.error('[Background][removePdfCard] Failed to remove PDF card:', err);
    return false;
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
  console.log('[ContextMenu] Context menu clicked. Raw Info Object:', JSON.stringify(info, null, 2));
  console.log('[ContextMenu] Raw Tab Object:', JSON.stringify(tab, null, 2));

  if (info.menuItemId !== COMMAND_SAVE_TO_ANKI) {
    return;
  }

  // Correctly route based on the tab's URL
  if (isPdfUrl(tab.url)) {
    console.log('[ContextMenu Router] PDF URL detected. Routing to handlePdfSelection.');
    // This is a PDF, so we must use info.selectionText and the PDF handler
    if (info.selectionText && info.selectionText.trim() !== "") {
      await handlePdfSelection(info, tab);
    } else {
      console.warn('[ContextMenu Router] PDF detected, but no selection text found in `info` object.');
    }
  } else {
    console.log('[ContextMenu Router] Standard webpage detected. Routing to handleAction.');
    // This is a normal webpage, use the standard handler
    await handleAction(tab, info);
  }
});

// PDF/context menu workaround handler
async function handlePdfSelection(info, tab) {
  console.log('[handlePdfSelection] Processing PDF selection');

  let pageTitle = tab?.title || "PDF Document";
  let pageUrl = info?.frameUrl || tab?.url || info?.pageUrl || "";
  if (pageUrl.startsWith('chrome-extension://')) {
    pageTitle = tab?.title || "Viewed PDF";
    pageUrl = "";
  }

  const settings = await getSettings();
  const promptInfo = getPromptTemplate(settings); // Use centralized logic

  const isCloze = /cloze/i.test(settings.modelName);
  const rawText = info.selectionText;

  // Extract image for cloze notes (unlikely in PDFs but for completeness)
  let imageHtmlForExtra = "";
  if (isCloze && info.selectionText && /<img[^>]+>/i.test(info.selectionText)) {
    const imgMatch = info.selectionText.match(/<img[^>]+>/i);
    if (imgMatch) {
      imageHtmlForExtra = imgMatch[0];
    }
  }

  let backHtml = generateBackWithSource(`<p>${rawText}</p>`, pageTitle, pageUrl, { noSource: !pageUrl });
  let clozeText = null;

  // Handle cloze generation
  if (isCloze && settings.gptEnabled) {
    try {
      const effectiveClozeGuidance = settings.clozeGuide || SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT;
      const clozed = await generateClozeWithRetry(
        rawText, // For PDFs, info.selectionText is already plain text
        effectiveClozeGuidance,
        pageTitle,
        pageUrl,
        settings.openaiKey,
        settings.gptModel
      );
      clozeText = clozed;
      backHtml = generateBackWithSource(clozed, pageTitle, pageUrl, { noSource: true });
    } catch (err) {
      console.error("[handlePdfSelection] GPT Cloze generation failed:", err);
      chrome.notifications.create('pdf_cloze_gpt_error', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Zawrick PDF Error',
        message: 'GPT Cloze generation failed: ' + err.message + '. Falling back to raw text.'
      });
    }
  }

  // Handle front generation
  let front = "";
  let gptFailed = false;

  if (!isCloze && settings.gptEnabled && isValidOpenAiKey(settings.openaiKey)) {
    try {
      front = await generateFrontWithRetry(rawText, {
        pageTitle,
        pageUrl,
        openaiKey: settings.openaiKey,
        gptModel: settings.gptModel,
        _resolvedTemplateString: promptInfo.template
      });

      // Store history on success
      if (front && front.trim()) {
        await storePromptHistory({
          timestamp: Date.now(),
          promptId: promptInfo.id,
          promptLabel: promptInfo.label,
          promptTemplate: promptInfo.template,
          generatedFront: front,
          sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
          pageTitle,
          pageUrl,
          modelName: settings.modelName,
          deckName: settings.deckName
        });
      }
    } catch (err) {
      console.error('[handlePdfSelection] GPT front generation failed:', err);
      gptFailed = true;
      front = "";
    }
  } else if (isCloze && settings.gptEnabled && clozeText) {
    // Store cloze history
    await storePromptHistory({
      timestamp: Date.now(),
      promptId: promptInfo.id,
      promptLabel: promptInfo.label,
      promptTemplate: SYSTEM_DEFAULT_CLOZE_GUIDANCE_TEXT,
      generatedFront: "",
      generatedClozeText: clozeText,
      sourceText: rawText.substring(0, 200) + (rawText.length > 200 ? '...' : ''),
      pageTitle,
      pageUrl,
      modelName: settings.modelName,
      deckName: settings.deckName
    });
  }

  // Determine if manual review is needed
  const needsManualReview = !settings.gptEnabled || gptFailed || settings.alwaysConfirm ||
    (isCloze && !settings.gptEnabled) || (!isCloze && !front.trim() && settings.gptEnabled);

  if (needsManualReview) {
    // Add to PDF review queue
    const cardObj = {
      id: crypto?.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now()),
      timestamp: Date.now(),
      sourceText: rawText,
      generatedFront: front || "",
      generatedClozeText: isCloze ? backHtml : "",
      originalPageTitle: pageTitle,
      originalPageUrl: pageUrl,
      originalDeckName: settings.deckName,
      originalModelName: settings.modelName,
      isCloze: !!isCloze,
      imageHtml: imageHtmlForExtra // Include image in PDF review queue
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

  // Auto-save
  try {
    await saveToAnkiOrQueue(isCloze ? backHtml : front, backHtml, settings, null, pageTitle, pageUrl, imageHtmlForExtra);
    chrome.notifications.create('pdf_autosave_processed_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Zawrick: PDF Card Processed',
      message: 'Card from PDF selection has been processed successfully.'
    });
  } catch (err) {
    chrome.notifications.create('pdf_autosave_error_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Zawrick: PDF Auto-Save Error',
      message: 'Failed to process card from PDF: ' + err.message
    });
  }
}

// ── Message Listeners ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background][onMessage] Received message:', message.action, 'from sender:', sender);

  // Handler for PDF card finalization
  if (message.action === "saveFinalizedPdfCard") {
    (async () => {
        try {
            console.log('[Background][onMessage][saveFinalizedPdfCard] Processing card:', message.cardData);
            
            // Extract imageHtml from the card data if it exists
            const imageHtml = message.cardData.imageHtml || "";
            const pageTitle = message.cardData.pageTitle || 'PDF Review';
            const pageUrl = message.cardData.pageUrl || '';
            
            await saveToAnkiOrQueue(
                message.cardData.front,
                message.cardData.backHtml,
                { deckName: message.cardData.deckName, modelName: message.cardData.modelName },
                null, // tabId
                pageTitle,
                pageUrl,
                imageHtml
            );
            console.log('[Background][onMessage][saveFinalizedPdfCard] saveToAnkiOrQueue completed.');

            chrome.notifications.create('finalized_pdf_card_saved_' + Date.now(), {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Zawrick: Reviewed Card Processed',
                message: 'The reviewed card has been sent to Anki (or your pending queue).'
            });

            sendResponse({ success: true });
        } catch (err) {
            console.error('[Background][onMessage][saveFinalizedPdfCard] Error processing card:', err);
            chrome.notifications.create('finalized_pdf_card_error_' + Date.now(), {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Zawrick: Save Error',
                message: 'Failed to process reviewed card: ' + (err.message || "Unknown background error")
            });
            sendResponse({ success: false, error: err.message || 'Unknown error in background processing' });
        }
    })();
    return true;
  }

  // Handler for manual save from content script
  if (message.action === "manualSave") {
    console.log('[Background][onMessage][manualSave] Received message. Data:', message);
    (async () => {
      try {
        const deckName = message.deckName || "Default";
        const modelName = message.modelName || "Basic";
        const front = message.front || "";
        const back = message.back || "";
        
        const settings = {
          deckName: deckName,
          modelName: modelName
        };

        console.log('[Background][onMessage][manualSave] Calling saveToAnkiOrQueue with:', {
          front,
          back,
          settings,
          tabId: sender.tab?.id,
          pageTitle: message.pageTitle,
          pageUrl: message.pageUrl,
          imageHtml: message.imageHtml
        });

        await saveToAnkiOrQueue(front, back, settings, sender.tab?.id, message.pageTitle, message.pageUrl, message.imageHtml);
        sendResponse({ success: true });
      } catch (err) {
        console.error('[Background][onMessage][manualSave] Error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Handler for getting PDF review cards
  if (message.action === "getPendingPdfCards") {
    (async () => {
      try {
        const cards = await getPendingPdfCards();
        sendResponse({ success: true, cards });
      } catch (err) {
        console.error('[Background][onMessage][getPendingPdfCards] Error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Handler for removing PDF card
  if (message.action === "removePdfCard") {
    (async () => {
      try {
        const success = await removePdfCard(message.cardId);
        sendResponse({ success });
      } catch (err) {
        console.error('[Background][onMessage][removePdfCard] Error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Handler for getting selection HTML
  if (message.action === "getSelectionHtml") {
    // This should be handled by content script, not background
    console.warn('[Background][onMessage] getSelectionHtml should not reach background script');
    sendResponse({ html: "", error: "Invalid routing - this should be handled by content script" });
    return false;
  }

  // Unknown action
  console.warn('[Background][onMessage] Unknown action:', message.action);
  sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  return false;
});

