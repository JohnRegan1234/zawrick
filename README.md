# Zawrick

A powerful browser extension that transforms web text into Anki flashcards with AI-powered question generation. Simply highlight any text on the web and instantly create high-quality flashcards for your studies.

## ✨ Features

* **Quick Capture**: Select text > right-click > "Save selection to Anki" or use `Ctrl+Shift+K` / `⌘+Shift+K`
* **AI-Powered Generation**: Uses OpenAI GPT to automatically generate intelligent questions from your selected text
* **System Default Prompts**: Built-in expert prompts for both basic cards and cloze deletions
* **Custom Prompt Library**: Create and manage up to 5 custom prompts tailored to your learning style
* **Smart Cloze Cards**: Advanced cloze deletion generation with proper indexing and context preservation
* **Rich Content Preservation**: Maintains all formatting, links, LaTeX, images, and other web content
* **Offline Queue**: Cards are saved locally when Anki is closed and automatically synced when available
* **Flexible Review**: Choose to always review AI-generated content before saving or auto-save for speed
* **Prompt History**: Track and review all your AI-generated cards with detailed prompt information
* **Multiple Note Types**: Supports Basic, Cloze, and custom Anki note models

## 🚀 Quick Start

1. **Install Requirements**:
   - Install [Anki](https://apps.ankiweb.net/)
   - Add the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on to Anki

2. **Setup Extension**:
   - Click the Zawrick icon in your browser toolbar
   - Configure your preferred Anki deck and note type
   - Optionally add your OpenAI API key for AI features

3. **Create Cards**:
   - Highlight any text on a webpage
   - Right-click and select "Save selection to Anki" or press `Ctrl+Shift+K` / `⌘+Shift+K`
   - Review the generated question (if enabled) and save to Anki

## ⚙️ Configuration

### Anki Settings
- **Deck Selection**: Choose your target Anki deck
- **Note Type**: Support for Basic, Cloze, and custom note models
- **Real-time Status**: See your Anki connection status at a glance

### AI Features (Optional)
- **GPT Integration**: Add your OpenAI API key for automatic question generation
- **System Prompts**: Two expertly crafted default prompts:
  - 🔒 **System Default - Basic Cards**: Generates focused questions testing key concepts
  - 🔒 **System Default - Cloze Guidance**: Creates intelligent cloze deletions with proper formatting
- **Custom Prompts**: Create up to 5 personalized prompts for specialized subjects
- **Template Variables**: Use `{{text}}`, `{{title}}`, and `{{url}}` in your custom prompts
- **Review Mode**: Choose to always review generated content or auto-save for speed

### Advanced Features
- **Prompt History**: Review all AI-generated cards with full prompt details
- **Offline Support**: Cards queue locally when Anki is unavailable
- **Keyboard Shortcut**: Customizable hotkey (default: `Ctrl+Shift+K` / `⌘+Shift+K`)

## 🎯 AI Prompt Examples

### Basic Card Generation
The system creates questions that test understanding of key concepts:
- **Input**: "Photosynthesis is the process by which plants convert sunlight into energy"
- **Generated**: "What is the process by which plants convert sunlight into energy?"

### Cloze Card Generation
Smart cloze deletions preserve context while testing specific knowledge:
- **Input**: "At birth, a term newborn has iron stores of approximately 250 mg, with 75% in the blood and 25% in tissues"
- **Generated**: "At birth, a term newborn has iron stores of approximately {{c1::250 mg}}, with {{c2::75%}} in the blood and {{c3::25%}} in tissues"

## 🛠️ Technical Details

- **Manifest V3**: Built for modern Chrome extensions
- **Offline-First**: Local storage with automatic sync
- **Rich HTML Support**: Preserves complex web content formatting
- **Error Handling**: Graceful fallbacks when services are unavailable
- **Privacy-Focused**: OpenAI API key stored locally, never transmitted to our servers

## 📋 Changelog

### v2.0
- Complete rewrite with Manifest V3 support
- Added system default prompts for instant productivity
- Implemented custom prompt library (up to 5 prompts)
- Enhanced cloze card generation with smart indexing
- Added comprehensive prompt history tracking
- Improved offline queue management
- Enhanced UI with better accessibility
- Added real-time Anki connection status

### v1.x
- Initial release with basic text-to-card functionality
- OpenAI integration for question generation
- Offline queue system

## 🎨 Credits

Extension icon designed by [Freepik](https://www.freepik.com).

---

**Zawrick** - Transform your web reading into effective learning with AI-powered flashcard generation.
