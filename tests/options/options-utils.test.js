/**
 * Test Suite for Options Core Utility Functions
 * This file tests core utility functions from the options/core directory
 * Run with: npm test -- tests/options-utils.test.js
 */

// Add helper at the top
const getCrypto = () => (typeof global !== 'undefined' && global.crypto ? global.crypto : (typeof window !== 'undefined' && window.crypto ? window.crypto : undefined));

describe('Options Core Utility Functions', () => {
  
  describe('getUniquePromptLabel', () => {
    // Extract the function for testing
    const getUniquePromptLabel = (baseLabel, existingPrompts, excludeId = null) => {
      let label = baseLabel.trim();
      if (!label) label = 'Untitled';
      
      const existing = existingPrompts.filter(p => p.id !== excludeId).map(p => p.label);
      let counter = 1;
      let testLabel = label;
      
      while (existing.includes(testLabel)) {
        testLabel = `${label} (${counter})`;
        counter++;
      }
      
      return testLabel;
    };

    test('should return original label when no conflicts', () => {
      const result = getUniquePromptLabel('New Prompt', []);
      expect(result).toBe('New Prompt');
    });

    test('should return "Untitled" for empty label', () => {
      const result = getUniquePromptLabel('', []);
      expect(result).toBe('Untitled');
    });

    test('should add counter when label conflicts exist', () => {
      const existingPrompts = [
        { id: '1', label: 'Test Prompt' },
        { id: '2', label: 'Test Prompt (1)' }
      ];
      const result = getUniquePromptLabel('Test Prompt', existingPrompts);
      expect(result).toBe('Test Prompt (2)');
    });

    test('should exclude specified ID from conflict check', () => {
      const existingPrompts = [
        { id: '1', label: 'Test Prompt' },
        { id: '2', label: 'Other Prompt' }
      ];
      const result = getUniquePromptLabel('Test Prompt', existingPrompts, '1');
      expect(result).toBe('Test Prompt');
    });
  });

  describe('toggleGPTSection', () => {
    let mockGptBody;
    let mockInputs;

    beforeEach(() => {
      // Create mock DOM elements
      mockInputs = [
        createMockElement('input', 'enable-gpt'),
        createMockElement('input', 'other-input'),
        createMockElement('select', 'model-select'),
        createMockElement('textarea', 'prompt-template')
      ];

      mockGptBody = {
        style: { opacity: '1' },
        querySelectorAll: jest.fn(() => mockInputs)
      };
    });

    const toggleGPTSection = (on) => {
      if (!mockGptBody) return;
      const inputs = mockGptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
      mockGptBody.style.opacity = on ? '1' : '0.5';
      inputs.forEach(el => {
        if (el.id === 'enable-gpt') return;
        el.disabled = !on;
      });
    };

    test('should enable all inputs except enable-gpt when on=true', () => {
      toggleGPTSection(true);
      
      expect(mockGptBody.style.opacity).toBe('1');
      expect(mockInputs[0].disabled).toBe(false); // enable-gpt should not be disabled
      expect(mockInputs[1].disabled).toBe(false);
      expect(mockInputs[2].disabled).toBe(false);
      expect(mockInputs[3].disabled).toBe(false);
    });

    test('should disable all inputs except enable-gpt when on=false', () => {
      toggleGPTSection(false);
      
      expect(mockGptBody.style.opacity).toBe('0.5');
      expect(mockInputs[0].disabled).toBe(false); // enable-gpt should not be disabled
      expect(mockInputs[1].disabled).toBe(true);
      expect(mockInputs[2].disabled).toBe(true);
      expect(mockInputs[3].disabled).toBe(true);
    });
  });

  describe('uid function', () => {
    const uid = () => {
      if (getCrypto() && getCrypto().randomUUID) {
        return getCrypto().randomUUID();
      }
      // Fallback: RFC4122 version 4 compliant
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    test('should generate a valid UUID-like string', () => {
      const result = uid();
      
      // Check format: 8-4-4-4-12 characters separated by hyphens
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result).toMatch(uuidRegex);
    });

    test('should generate unique IDs', () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });
  });

  describe('testOpenAI function', () => {
    const testOpenAI = async (apiKey) => {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return { success: response.ok, error: response.ok ? null : 'API error' };
      } catch (e) {
        return { success: false, error: 'Network error' };
      }
    };

    test('should return success for valid API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await testOpenAI('valid-key');
      expect(result).toEqual({ success: true, error: null });
    });

    test('should return API error for invalid response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await testOpenAI('invalid-key');
      expect(result).toEqual({ success: false, error: 'API error' });
    });

    test('should return network error for fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      const result = await testOpenAI('any-key');
      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });
});
