/**
 * @fileoverview Application constants and configuration
 */

// Log when constants are loaded
console.log('[Constants] Loading application constants');

/**
 * System prompts for GPT
 * @type {Array<{id: string, label: string, prompt: string, description: string}>}
 */
export const SYSTEM_PROMPTS = [
    {
        id: 'default',
        label: 'Default',
        prompt: 'Create a question and answer based on the following text: {{text}}',
        description: 'Basic question and answer format'
    },
    {
        id: 'cloze',
        label: 'Cloze',
        prompt: 'Create a cloze deletion card based on the following text: {{text}}',
        description: 'Cloze deletion format'
    },
    {
        id: 'basic',
        label: 'Basic',
        prompt: 'Create a basic card with front and back based on the following text: {{text}}',
        description: 'Basic card format'
    }
];

console.log('[Constants] Loaded system prompts:', SYSTEM_PROMPTS.map(p => ({ id: p.id, label: p.label })));

/**
 * Default profile for new prompts
 * @type {{id: string, label: string, prompt: string, description: string}}
 */
export const DEFAULT_PROFILE = {
    id: 'default',
    label: 'Default',
    prompt: 'Create a question and answer based on the following text: {{text}}',
    description: 'Basic question and answer format'
};

console.log('[Constants] Loaded default profile:', { id: DEFAULT_PROFILE.id, label: DEFAULT_PROFILE.label });

/**
 * Maximum number of prompts allowed
 * @type {number}
 */
export const MAX_PROMPTS = 5;

console.log('[Constants] Loaded max prompts:', MAX_PROMPTS);

/**
 * Maximum length for prompt labels
 * @type {number}
 */
export const MAX_PROMPT_LABEL_LENGTH = 50;

console.log('[Constants] Loaded max prompt label length:', MAX_PROMPT_LABEL_LENGTH);

/**
 * Maximum length for prompt descriptions
 * @type {number}
 */
export const MAX_PROMPT_DESCRIPTION_LENGTH = 200;

console.log('[Constants] Loaded max prompt description length:', MAX_PROMPT_DESCRIPTION_LENGTH);

/**
 * Maximum length for prompt templates
 * @type {number}
 */
export const MAX_PROMPT_TEMPLATE_LENGTH = 1000;

console.log('[Constants] Loaded max prompt template length:', MAX_PROMPT_TEMPLATE_LENGTH);

/**
 * Default reading speed (words per minute)
 * @type {number}
 */
export const DEFAULT_READING_SPEED = 200;

console.log('[Constants] Loaded default reading speed:', DEFAULT_READING_SPEED);

/**
 * Default Anki deck name
 * @type {string}
 */
export const DEFAULT_DECK = 'Default';

console.log('[Constants] Loaded default deck:', DEFAULT_DECK);

/**
 * Default Anki model name
 * @type {string}
 */
export const DEFAULT_MODEL = 'Basic';

console.log('[Constants] Loaded default model:', DEFAULT_MODEL);

/**
 * Default OpenAI model
 * @type {string}
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';

console.log('[Constants] Loaded default OpenAI model:', DEFAULT_OPENAI_MODEL);

/**
 * Maximum number of history entries
 * @type {number}
 */
export const MAX_HISTORY_ENTRIES = 100;

console.log('[Constants] Loaded max history entries:', MAX_HISTORY_ENTRIES);

/**
 * Maximum number of pending cards
 * @type {number}
 */
export const MAX_PENDING_CARDS = 1000;

console.log('[Constants] Loaded max pending cards:', MAX_PENDING_CARDS);

/**
 * Maximum number of pending clips
 * @type {number}
 */
export const MAX_PENDING_CLIPS = 1000;

console.log('[Constants] Loaded max pending clips:', MAX_PENDING_CLIPS);

/**
 * Maximum number of pending PDF cards
 * @type {number}
 */
export const MAX_PENDING_PDF_CARDS = 1000;

console.log('[Constants] Loaded max pending PDF cards:', MAX_PENDING_PDF_CARDS);

/**
 * Maximum length for card front
 * @type {number}
 */
export const MAX_CARD_FRONT_LENGTH = 1000;

console.log('[Constants] Loaded max card front length:', MAX_CARD_FRONT_LENGTH);

/**
 * Maximum length for card back
 * @type {number}
 */
export const MAX_CARD_BACK_LENGTH = 1000;

console.log('[Constants] Loaded max card back length:', MAX_CARD_BACK_LENGTH);

/**
 * Maximum length for card tags
 * @type {number}
 */
export const MAX_CARD_TAGS_LENGTH = 100;

console.log('[Constants] Loaded max card tags length:', MAX_CARD_TAGS_LENGTH);

/**
 * Maximum length for card source URL
 * @type {number}
 */
export const MAX_CARD_SOURCE_URL_LENGTH = 1000;

console.log('[Constants] Loaded max card source URL length:', MAX_CARD_SOURCE_URL_LENGTH);

/**
 * Maximum length for card source title
 * @type {number}
 */
export const MAX_CARD_SOURCE_TITLE_LENGTH = 200;

console.log('[Constants] Loaded max card source title length:', MAX_CARD_SOURCE_TITLE_LENGTH);

/**
 * Maximum length for card source text
 * @type {number}
 */
export const MAX_CARD_SOURCE_TEXT_LENGTH = 10000;

console.log('[Constants] Loaded max card source text length:', MAX_CARD_SOURCE_TEXT_LENGTH);

/**
 * Maximum length for card source selection
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_LENGTH = 10000;

console.log('[Constants] Loaded max card source selection length:', MAX_CARD_SOURCE_SELECTION_LENGTH);

/**
 * Maximum length for card source selection range
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_LENGTH = 10000;

console.log('[Constants] Loaded max card source selection range length:', MAX_CARD_SOURCE_SELECTION_RANGE_LENGTH);

/**
 * Maximum length for card source selection range text
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_LENGTH = 10000;

console.log('[Constants] Loaded max card source selection range text length:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_LENGTH);

/**
 * Maximum length for card source selection range text word count
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_WORD_COUNT = 1000;

console.log('[Constants] Loaded max card source selection range text word count:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_WORD_COUNT);

/**
 * Maximum length for card source selection range text character count
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_CHARACTER_COUNT = 10000;

console.log('[Constants] Loaded max card source selection range text character count:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_CHARACTER_COUNT);

/**
 * Maximum length for card source selection range text line count
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_LINE_COUNT = 100;

console.log('[Constants] Loaded max card source selection range text line count:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_LINE_COUNT);

/**
 * Maximum length for card source selection range text paragraph count
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_PARAGRAPH_COUNT = 50;

console.log('[Constants] Loaded max card source selection range text paragraph count:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_PARAGRAPH_COUNT);

/**
 * Maximum length for card source selection range text sentence count
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_SENTENCE_COUNT = 100;

console.log('[Constants] Loaded max card source selection range text sentence count:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_SENTENCE_COUNT);

/**
 * Maximum length for card source selection range text reading time
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME = 10;

console.log('[Constants] Loaded max card source selection range text reading time:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME);

/**
 * Maximum length for card source selection range text reading time in seconds
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME_IN_SECONDS = 600;

console.log('[Constants] Loaded max card source selection range text reading time in seconds:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME_IN_SECONDS);

/**
 * Maximum length for card source selection range text reading time in milliseconds
 * @type {number}
 */
export const MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME_IN_MILLISECONDS = 600000;

console.log('[Constants] Loaded max card source selection range text reading time in milliseconds:', MAX_CARD_SOURCE_SELECTION_RANGE_TEXT_READING_TIME_IN_MILLISECONDS);

// Log when constants are fully loaded
console.log('[Constants] All constants loaded successfully'); 