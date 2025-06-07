# Test Descriptions

This document provides an overview of the automated tests in this project, organized by the part of the extension they target.

## Background Script Tests (`tests/background/`)

These tests focus on the core background logic of the extension.

- **`background-action-manualsave.test.js`**: Tests the functionality related to manually saving content or cards from the background script.
- **`background-badge-queue.test.js`**: Focuses on the logic for managing the browser action badge, specifically how items are queued and displayed (e.g., count of pending items).
- **`background-context-lifecycle.test.js`**: Tests the lifecycle of background contexts, such as setup and teardown of listeners or services when the extension starts or stops.
- **`background-core.test.js`**: Covers fundamental background operations, likely including message handling, core state management, and interactions with browser APIs like `chrome.storage`.
- **`background-coverage.test.js`**: Appears to be a general test suite aiming for broad coverage of various background script functionalities.
- **`background-helper-functions.test.js`**: Tests utility or helper functions used within the background script.
- **`background-inject-content-script.test.js`**: Verifies the logic for programmatically injecting content scripts into web pages.
- **`background-message-error.test.js`**: Specifically tests how the background script handles errors in messages received from other parts of the extension.
- **`background-message-listener.test.js`**: Focuses on the setup and correct functioning of message listeners in the background script.
- **`background-messaging.test.js`**: Tests the general messaging system between the background script and other components (content scripts, options page).
- **`background-notify.test.js`**: Covers the functionality for creating and managing browser notifications from the background script.
- **`background-pdf.test.js`**: Tests functionalities related to processing or interacting with PDF files or URLs pointing to PDFs from the background.
- **`background-pdfurl-openai.test.js`**: Likely tests the integration between PDF URL processing and the OpenAI API, perhaps for summarizing or extracting information.
- **`background-prompt-template.test.js`**: Focuses on the management and application of prompt templates used in interactions, possibly with AI services.
- **`background-selection.test.js`**: Tests how the background script handles and processes text selections made by the user in web pages.
- **`content-script-injection.test.js`**: Verifies the mechanisms for injecting content scripts.
- **`message-handler-registration.test.js`**: Tests the registration and proper functioning of different message handlers within the background script.
- **`notification-selection.test.js`**: Tests interactions related to user selections made via notifications.
- **`pdf-handling.test.js`**: General tests for PDF handling capabilities within the background script.

## Content Script Tests (`tests/content-script/`)

These tests verify the functionality of scripts injected into web pages.

- **`content-script-advanced.test.js`**: Tests more complex interactions and features of the content script, possibly involving dynamic DOM manipulation or intricate user interactions.
- **`content-script-coverage-regression.test.js`**: Suggests a test suite aimed at ensuring fixes for previously identified coverage gaps or bugs in the content script remain effective.
- **`content-script-coverage.test.js`**: A general test suite for ensuring broad functionality coverage of the content script, including dialogs, user interactions, and DOM manipulations.
- **`content-script-ui-interaction.test.js`**: Comprehensive tests for UI and user interaction logic, including dialogs, input validation, and accessibility.
- **`content-script-init-and-messages.test.js`**: Focuses on initialization and message handling for the content script.
- **`content-script.test.js`**: General tests for the main content script file.
- **`content-script-realistic.test.js`**: Tests that run against more realistic or complex web page structures, or simulate real user scenarios more closely.

## End-to-End Tests (`tests/e2e/`)

These tests simulate full user workflows across different parts of the extension.

- **`options-ui.e2e.test.js`**: Conducts end-to-end tests specifically for the options page UI, verifying that interactions flow correctly from user input to visible changes and data storage.

## Options Page Tests (`tests/options/`)

These tests focus on the functionality and UI of the extension's options page.

- **`options-anki.test.js`**: Tests the integration with Anki, specifically settings and actions related to Anki on the options page.
- **`options-dom-events.test.js`**: Focuses on testing DOM event handling within the options page (e.g., button clicks, input changes).
- **`options-dom.test.js`**: Tests direct DOM manipulations and the structure of the options page. This includes verifying that UI elements for managing prompts and pending cards are rendered and updated correctly.
- **`options-integration.test.js`**: Tests the integration of various parts of the options page, such as how UI interactions lead to storage changes and vice-versa. This includes testing the pending cards and PDF review list functionalities.
- **`options-prompts.test.js`**: Specifically tests the CRUD (Create, Read, Update, Delete) operations for user and system prompts via the options page UI.
- **`options-storage.test.js`**: Focuses on how the options page interacts with `chrome.storage` to save and retrieve settings.
- **`options-ui.test.js`**: General UI tests for the options page, covering aspects like element visibility, state changes (e.g., button enabled/disabled), and general look and feel.
- **`options-utils.test.js`**: Tests utility or helper functions specifically used within the options page JavaScript.
- **`options.test.js`**: General tests for the main logic of the options page, including API key validation and overall settings management.

## Provider Tests (`tests/providers/`)

These tests focus on the integration with external services or APIs.

- **`ankiProvider.test.js`**: Tests the module responsible for interacting with an AnkiConnect instance or similar Anki integration.
- **`chatgptProvider.test.js`**: Tests the module responsible for making requests to and handling responses from the ChatGPT/OpenAI API.

## UI Component Tests (`tests/ui/`)

These tests focus on individual UI components that might be reused across the extension.

- **`modal.test.js`**: Tests the functionality of modal dialog components used in the extension, likely covering their creation, display, interaction, and dismissal. This would include tests for the manual card editing dialog.
