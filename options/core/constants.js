/**
 * @fileoverview Constants and configuration values for the browser extension
 */

/**
 * Default profile configuration for new users
 * @type {Object}
 */
export const DEFAULT_PROFILE = {
    id: 'basic-default',
    label: 'Default Basic',
    template: `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.`
};

/**
 * System-provided prompt templates that cannot be modified
 * @type {Array<Object>}
 */
export const SYSTEM_PROMPTS = [
    {
        id: 'system-default-basic',
        label: '🔒 System Default - Basic Cards',
        template: `You are an expert Anki flash-card creator. Given an HTML snippet ({{text}}) that will appear on the back of a card from a page titled "{{title}}" ({{url}}), write ONE clear question for the front that tests the snippet's single most important idea. Output ONLY the question.`,
        isSystem: true
    },
    {
        id: 'system-default-cloze',
        label: '🔒 System Default - Cloze Guidance',
        template: `You are an expert Anki cloze deletion creator. Your goal is to process the provided text selection and convert it into a single string formatted for Anki cloze cards. The input text may contain simple inline HTML formatting (like <b>, <i>, <u>, <span>, <a>) which you should attempt to preserve around the text content.

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
    Desired output: "At birth, a term newborn has iron stores of approximately \`{{c1::<b>250 mg</b>}}\`, with \`{{c2::<i>75%</i>}}\` in the blood and \`{{c3::<i>25%</i>}}\` in ferritin/haemosiderin/tissues."`,
        isSystem: true
    }
];

/**
 * Default settings for new installations
 * @type {Object}
 */
export const DEFAULT_SETTINGS = {
    deckName: 'Default',
    modelName: 'Basic',
    gptEnabled: false,
    openaiKey: '',
    confirmGpt: false,
    alwaysConfirm: true,
    prompts: [DEFAULT_PROFILE],
    selectedPrompt: 'basic-default'
};

/**
 * AnkiConnect API endpoint
 * @type {string}
 */
export const ANKI_CONNECT_URL = 'http://localhost:8765';

/**
 * OpenAI API endpoint
 * @type {string}
 */
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Default GPT model to use
 * @type {string}
 */
export const DEFAULT_GPT_MODEL = 'gpt-3.5-turbo';

/**
 * Maximum number of history entries to display
 * @type {number}
 */
export const MAX_HISTORY_ENTRIES = 20;

/**
 * Maximum number of PDF review cards to display
 * @type {number}
 */
export const MAX_PDF_REVIEW_CARDS = 50; 