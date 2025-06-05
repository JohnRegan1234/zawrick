# Zawrick

**Zawrick** is a powerful browser extension that transforms web and PDF text into Anki flashcards with AI-powered question generation. Highlight text anywhere in your browser and instantly create high-quality flashcards for your studies.

---

## ✨ Features

- **Quick Capture**: Select text, right-click, and choose "Save selection to Anki" or use `Ctrl+Shift+K` / `⌘+Shift+K`.
- **AI-Powered Generation**: Uses OpenAI GPT to automatically generate intelligent questions from your selected text.
- **PDF Support**: Create cards from text in browser-based PDF viewers, with a dedicated review queue for PDF cards.
- **Custom Prompts**: Create and manage up to 5 custom prompts tailored to your learning style.
- **Smart Cloze Cards**: Advanced cloze deletion generation with proper indexing and context preservation.
- **Rich Content Preservation**: Maintains formatting, links, LaTeX, images, and more.
- **Offline Queue**: Cards are saved locally when Anki is closed and automatically synced when available.
- **Flexible Review**: Choose to always review AI-generated content before saving, or auto-save for speed.
- **Prompt History**: Track and review all your AI-generated cards with detailed prompt information.
- **Multiple Note Types**: Supports Basic, Cloze, and custom Anki note models.
- **Modern UI**: Custom dropdowns, collapsible help, accessible notifications, and more.
- **Template Variables**: Use `{{text}}`, `{{title}}`, and `{{url}}` in your prompts to customize AI-generated content.

---

## 🚀 Getting Started

### 1. Install Requirements

- [Anki](https://apps.ankiweb.net/)
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on for Anki

### 2. Add Zawrick to Your Browser

- Install from the Chrome Web Store or load as an unpacked extension.

### 3. Configure the Extension

- Click the Zawrick icon in your browser toolbar.
- Set your preferred Anki deck and note type using the searchable dropdowns.
- (Optional) Add your OpenAI API key for AI features.

### 4. Create Cards

- Highlight text on any webpage or PDF.
- Right-click and select **"Save selection to Anki"** or use the hotkey.
- Review the generated question (if enabled) and save to Anki.

---

## 📄 PDF Workflow

- **PDFs in Browser**: Select text in a PDF (e.g., Chrome's built-in PDF viewer), right-click, and save to Anki.
- **Review Queue**: If "Always review cards before saving" is enabled, or if generation fails, PDF cards appear in the **PDF Cards for Review** section in the options page.
- **Direct Save**: If review is disabled and generation succeeds, PDF cards are sent directly to Anki (or the offline queue).

---

## ⚙️ Configuration

- **Deck & Note Type**: Choose your Anki deck and note type with modern, searchable dropdowns.
- **OpenAI API Key**: Add your key for GPT-powered question generation.
- **Prompt Management**: Use built-in expert prompts or create your own.
- **Review Mode**: Toggle "Always review cards before saving" for manual confirmation.
- **Prompt History**: Review all AI-generated cards and their prompts.
- **Offline Support**: Cards queue locally if Anki is unavailable.
- **Status Indicator**: Visual indicator shows when Anki is connected and ready to receive cards.

---

## 📝 Hotkey Customization

- Change the "Save to Anki" hotkey at `chrome://extensions/shortcuts`.
- The default is `Ctrl+Shift+K` (Windows/Linux) or `⌘+Shift+K` (Mac).

---

## 🧠 AI Prompt Examples

**Basic Card Example:**
- Input: "Photosynthesis is the process by which plants convert sunlight into energy."
- Generated: "What is the process by which plants convert sunlight into energy?"

**Cloze Card Example:**
- Input: "At birth, a term newborn has iron stores of approximately 250 mg, with 75% in the blood and 25% in tissues."
- Generated: "At birth, a term newborn has iron stores of approximately {{c1::250 mg}}, with {{c2::75%}} in the blood and {{c3::25%}} in tissues."

---

## 🐞 Known Issues & Contributing

- See [issues](https://github.com/JohnRegan1234/zawrick/issues) for current bugs and planned improvements.
- Contributions and suggestions are welcome! Please open an issue or pull request.

---

## 🔮 Future Plans

- **Multi-language support** for prompts and UI.
- **Better PDF extraction** for more complex documents.
- **More AI models** and prompt customization options.
- **Sync with AnkiWeb** or other flashcard platforms.
- **Mobile browser support**.
- **Improved error reporting and diagnostics**.
- **User analytics dashboard** for card creation and review stats.
- **Community prompt sharing**.

---

## 📜 License

Licensed under the [Apache License 2.0](LICENSE.txt).

---

## 🧪 Testing Suite

Zawrick includes a comprehensive Jest test suite ensuring reliability and maintainability across all core features.

### Test Architecture

- **Framework**: Jest with jsdom environment for DOM testing
- **Coverage**: 171+ tests across 9 test suites
- **Environment**: Browser extension APIs fully mocked
- **Configuration**: Babel transpilation for ES6+ support
- **Timeout**: 10-second timeout for async operations

### Test Organization

#### **Background Script Tests** (`background-*.test.js`)
- **Message Handling** (`background-messaging.test.js`): Tests Chrome runtime messaging, tab communication, content script injection, and prompt history management
- **PDF Processing** (`background-pdf.test.js`): Tests PDF URL detection, queue management, badge updates, sync scheduling, and PDF review card workflows

#### **Content Script Tests** (`content-script*.test.js`)
- **Dialog Management** (`content-script.test.js`): Tests manual input dialogs, confirmation dialogs, cloze vs basic card interfaces, real-time preview updates, and accessibility features
- **Basic Functionality** (`content-script-simple.test.js`): Simplified tests for HTML selection extraction, toast notifications, deck selection, and input validation

#### **Options Page Tests** (`options-*.test.js`)
- **AnkiConnect Integration** (`options-anki.test.js`): Tests fetchAnki function, deck/model name retrieval, error handling, and status management
- **DOM Manipulation** (`options-dom.test.js`): Tests section toggling, UI state management, button interactions, PDF review list rendering, and notification system
- **Prompt Management** (`options-prompts.test.js`): Tests prompt creation/deletion, label uniqueness, add/edit modes, and system vs user prompt handling
- **Storage Operations** (`options-storage.test.js`): Tests settings persistence, pending card queues, prompt history, and PDF review card storage
- **Utility Functions** (`options-utils.test.js`): Tests unique ID generation, OpenAI API validation, and helper functions

### Test Coverage Analysis

Based on the latest coverage report:
- **Overall Statement Coverage**: ~18-57% (varies by file)
- **Branch Coverage**: ~17-53%
- **Function Coverage**: ~21-63%
- **Line Coverage**: ~19-57%

**Well-Tested Areas:**
- Chrome extension messaging and communication
- Content script dialog management and user interactions
- Options page DOM manipulation and form handling
- PDF processing and queue management
- Storage operations and data persistence
- Prompt management and validation
- AnkiConnect integration and error handling

**Areas Needing More Coverage:**
- ChatGPT provider API calls and retry logic
- Complex error scenarios and edge cases
- Full end-to-end workflows
- Browser-specific PDF viewer interactions

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:debug

# Run specific test pattern
npm run test:specific -- --testNamePattern="pattern"
```

### Test Environment Setup

The test suite uses a sophisticated mocking system:
- **Chrome APIs**: Complete chrome.* API mocking including storage, tabs, runtime, and contextMenus
- **DOM Environment**: jsdom for realistic DOM testing
- **Fetch Mocking**: Global fetch mocking for API calls
- **Storage Mocking**: Chrome storage.local mocking with realistic async behavior

### Mocking Strategy

**Chrome Extension APIs**:
```javascript
global.chrome = {
  storage: { local: { get: jest.fn(), set: jest.fn() } },
  tabs: { get: jest.fn(), query: jest.fn() },
  runtime: { sendMessage: jest.fn(), onMessage: { addListener: jest.fn() } },
  // ... comprehensive API mocking
}
```

**Content Script Testing**:
- Mock DOM manipulation and selection APIs
- Simulate user interactions (clicks, input changes)
- Test dialog creation and event handling

**Background Script Testing**:
- Mock tab communication and content script injection
- Test message routing and error handling
- Simulate various Chrome extension scenarios

### Test Limitations

**Current Gaps:**
1. **Integration Testing**: No full end-to-end tests across all components
2. **Browser Compatibility**: Tests don't cover browser-specific behaviors
3. **Real API Testing**: OpenAI and AnkiConnect APIs are mocked, not tested against real endpoints
4. **Performance Testing**: No load testing or performance benchmarks
5. **Visual Testing**: No screenshot or visual regression testing
6. **Accessibility Testing**: Limited automated accessibility validation

**Future Improvements Needed:**
- Add Playwright/Puppeteer for true browser extension testing
- Implement integration tests with real Anki and OpenAI API calls
- Add performance benchmarks for large card processing
- Include accessibility testing with tools like axe-core
- Add visual regression testing for UI components
- Test with various PDF viewers and website formats

### Test Data and Fixtures

Tests use realistic mock data including:
- Sample Anki decks and note types
- Realistic HTML content selections
- PDF card structures with metadata
- Chrome extension tab and message objects
- Various error scenarios and edge cases

---

## ⚙️ Technical Details

- **Manifest V3**: Modern Chrome extension architecture.
- **Offline-First**: Local storage with automatic sync.
- **Rich HTML Support**: Preserves complex web content formatting.
- **Error Handling**: Graceful fallbacks when services are unavailable.
- **Privacy-Focused**: OpenAI API key stored locally, never transmitted to third parties.
- **Codebase**: Written in modern JavaScript (ES2022+), modular, and easy to extend.
- **Testing**: Comprehensive Jest test suite with 171+ tests and Chrome API mocking.
- **Version**: Current version is 1.6 with enhanced prompt capabilities, improved PDF review, and notification system.

---

**Zawrick** – Transform your web reading into effective learning with AI-powered flashcard generation.
