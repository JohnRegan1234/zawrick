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

- See [issues](https://github.com/zawrick/zawrick/issues) for current bugs and planned improvements.
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

## ⚙️ Technical Details

- **Manifest V3**: Modern Chrome extension architecture.
- **Offline-First**: Local storage with automatic sync.
- **Rich HTML Support**: Preserves complex web content formatting.
- **Error Handling**: Graceful fallbacks when services are unavailable.
- **Privacy-Focused**: OpenAI API key stored locally, never transmitted to third parties.
- **Codebase**: Written in modern JavaScript (ES2022+), modular, and easy to extend.

---

**Zawrick** – Transform your web reading into effective learning with AI-powered flashcard generation.
