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
  if (typeof tabId === "number" && tabId >= 0) {
    chrome.tabs.sendMessage(tabId, { status, message }, (response) => {
      // Handle any potential errors silently (tab might be closed)
      if (chrome.runtime.lastError) {
        console.log("Notification target tab unavailable:", chrome.runtime.lastError.message);
      }
    });
  } else {
    console.warn("Invalid tabId:", tabId);
  }
}
function getSelectionHtml(tabId) {
  return new Promise(res =>
    chrome.tabs.sendMessage(tabId, { action: "getSelectionHtml" },
      r => res(r?.html || "")));
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
  const pageTitle = tab?.title || info?.pageTitle || "Untitled";
  const pageUrl   = tab?.url   || info?.pageUrl   || "";

  const settings = await getSettings();
  if (!settings) { notify(tab.id, "error", "Settings unavailable."); return; }

  const rawHtml = await getSelectionHtml(tab.id);
  const isCloze = /cloze/i.test(settings.modelName);

  // always keep a clean text copy so cloze markers don't end up inside <a> tags
  const rawText = stripHtml(rawHtml);

  // Validate we have content to work with
  if (!rawText.trim()) {
    notify(tab.id, "error", "No text selected. Please select some text first.");
    return;
  }

  let backHtml;

  // ── 1.  Build back-side (insert clozes if model = Cloze) ────────────────
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
      console.log("Starting GPT generation with chosen template:", frontGenerationTemplate);
      
      front = await generateFrontWithRetry(rawHtml, {
        pageTitle,
        pageUrl,
        openaiKey: settings.openaiKey,
        gptModel: settings.gptModel,
        _resolvedTemplateString: frontGenerationTemplate
      });

      console.log("GPT generated front:", front);

      // Store prompt history entry only on success
      if (front && front.trim()) {
        await storePromptHistory({
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
        });
      }
    } catch (err) {
      console.error("Front generation failed:", err);
      gptFailed = true;
      front = ""; // Reset front to empty
    }
  }

  // ── Handle confirmation or manual input cases ─────────────────────────
  const needsManualInput = !settings.gptEnabled || gptFailed || settings.alwaysConfirm || !front.trim();

  if (needsManualInput) {
    const helper = gptFailed 
      ? "GPT failed – please supply front text manually."
      : settings.alwaysConfirm 
        ? (isCloze ? "Review and edit the cloze text if needed." : "Review and edit the generated question.")
        : "Please provide a question for the front of this card.";

    const error = gptFailed ? "OpenAI API error occurred" : null;

    sendFrontInputRequest(
      tab.id,
      backHtml,
      helper,
      error,
      settings.deckName,
      deckList,
      ankiOnline,
      settings.modelName,
      front // Pass the generated front (could be empty)
    );
    return;
  }

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
    notify(tabId, "success", "Card saved to Anki!");
  } catch (err) {
    if (err instanceof TypeError) {
      await queueClip({ front, backHtml, ...settings });
      notify(tabId, "success", "Anki offline – card saved locally");
    } else {
      notify(tabId, "error", `Save failed: ${err.message || "Unknown error"}`);
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
  chrome.tabs.sendMessage(tabId, {
    action: "manualFront",
    backHtml,
    helper,
    error: err,
    deckName,
    deckList,
    ankiOnline,
    modelName,
    frontHtml
  });
}

// Store prompt history entry
async function storePromptHistory(entry) {
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
    console.warn("Failed to store prompt history:", err);
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === COMMAND_SAVE_TO_ANKI) handleAction(tab, info);
});

chrome.commands.onCommand.addListener(cmd => {
  if (cmd === COMMAND_SAVE_TO_ANKI) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => tab?.id && handleAction(tab, {}));
  }
});

chrome.runtime.onMessage.addListener(
  async (msg, sender, sendResponse) => {
    if (msg.action !== "manualSave") return;

    const settings = {
      deckName : msg.deckName || "Default",
      modelName: msg.modelName || "Basic"
    };

    // Validate content before saving
    const isCloze = /cloze/i.test(settings.modelName);
    const front = msg.front || "";
    const backHtml = msg.backHtml || "";

    if (!front.trim() && !backHtml.trim()) {
      if (sender.tab?.id) {
        notify(sender.tab.id, "error", "Cannot save empty note. Please add content.");
      }
      sendResponse({ ok: false, error: "Empty content" });
      return;
    }

    try {
      await saveToAnkiOrQueue(front, backHtml, settings, sender.tab?.id ?? null);
      
      if (sender.tab?.id) {
        notify(sender.tab.id, "success", "Card created successfully!");
      }
    } catch (err) {
      if (sender.tab?.id) {
        notify(sender.tab.id, "error", `Failed to save card: ${err.message}`);
      }
    }

    sendResponse({ ok: true });
  }
);

// tiny helper → plain‑text version of the user’s highlight
function stripHtml(html) {
  // DOMParser is not available in service workers; use a regex fallback.
  // This is not perfect but works for simple highlights.
  return html
    ? html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : '';
}

// Test background.js
console.log("Service worker registered!");

