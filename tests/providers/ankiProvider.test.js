// tests/providers/ankiProvider.test.js

import { addToAnki } from '../../ankiProvider.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('Anki Provider Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Basic Card Creation', () => {
    test('should create basic card successfully', async () => {
      const mockResponse = {
        result: 1234567890,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await addToAnki('What is JavaScript?', 'A programming language');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'Basic',
              fields: {
                Front: 'What is JavaScript?',
                Back: 'A programming language'
              },
              tags: ['Zawrick']
            }
          }
        })
      });

      expect(result).toBe(1234567890);
    });

    test('should create basic card with custom deck and model', async () => {
      const mockResponse = {
        result: 5555555555,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await addToAnki(
        'Front content', 
        'Back content', 
        'Custom Deck', 
        'Custom Model'
      );

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Custom Deck',
              modelName: 'Custom Model',
              fields: {
                Front: 'Front content',
                Back: 'Back content'
              },
              tags: ['Zawrick']
            }
          }
        })
      });

      expect(result).toBe(5555555555);
    });

    test('should handle parameter defaults', async () => {
      const mockResponse = {
        result: 9999999999,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await addToAnki('Valid front', 'Valid back');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'Basic',
              fields: {
                Front: 'Valid front',
                Back: 'Valid back'
              },
              tags: ['Zawrick']
            }
          }
        })
      });

      expect(result).toBe(9999999999);
    });
  });

  describe('Cloze Card Creation', () => {
    test('should create cloze card successfully', async () => {
      const mockResponse = {
        result: 9876543210,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const clozeText = 'The capital of {{c1::France}} is {{c2::Paris}}.';
      const result = await addToAnki('unused', clozeText, 'Default', 'Cloze');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'Cloze',
              fields: {
                Text: clozeText,
                Extra: ''
              },
              tags: ['Zawrick']
            }
          }
        })
      });

      expect(result).toBe(9876543210);
    });

    test('should handle case insensitive cloze model detection', async () => {
      const mockResponse = {
        result: 1111111111,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const clozeText = 'Test {{c1::content}}';
      await addToAnki('front', clozeText, 'Default', 'CLOZE');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'CLOZE',
              fields: {
                Text: clozeText,
                Extra: ''
              },
              tags: ['Zawrick']
            }
          }
        })
      });
    });

    test('should use front content if backHtml is empty for cloze', async () => {
      const mockResponse = {
        result: 2222222222,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const frontText = 'Front {{c1::cloze}} content';
      await addToAnki(frontText, '', 'Default', 'cloze');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'cloze',
              fields: {
                Text: frontText,
                Extra: ''
              },
              tags: ['Zawrick']
            }
          }
        })
      });
    });

    test('should include extra field content for cloze cards', async () => {
      const mockResponse = {
        result: 3333333333,
        error: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const clozeText = 'Test {{c1::content}}';
      const extraContent = 'Additional context information';
      
      await addToAnki('front', clozeText, 'Default', 'Cloze', extraContent);

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'Cloze',
              fields: {
                Text: clozeText,
                Extra: extraContent
              },
              tags: ['Zawrick']
            }
          }
        })
      });
    });
  });

  describe('Input Validation', () => {
    test('should reject empty basic card front content', async () => {
      await expect(addToAnki('', 'Back content')).rejects.toThrow(
        'Cannot create note: both front and back content required'
      );
    });

    test('should reject empty basic card back content', async () => {
      await expect(addToAnki('Front content', '')).rejects.toThrow(
        'Cannot create note: both front and back content required'
      );
    });

    test('should reject whitespace-only basic card content', async () => {
      await expect(addToAnki('   ', '   ')).rejects.toThrow(
        'Cannot create note: both front and back content required'
      );
    });

    test('should reject empty cloze content', async () => {
      await expect(addToAnki('', '', 'Default', 'Cloze')).rejects.toThrow(
        'Cannot create cloze note: no content provided'
      );
    });

    test('should reject whitespace-only cloze content', async () => {
      await expect(addToAnki('   ', '   ', 'Default', 'Cloze')).rejects.toThrow(
        'Cannot create cloze note: no content provided'
      );
    });

    test('should handle null and undefined values', async () => {
      await expect(addToAnki(null, undefined)).rejects.toThrow(
        'Cannot create note: both front and back content required'
      );
    });
  });

  describe('API Error Handling', () => {
    test('should handle Anki API errors', async () => {
      const mockErrorResponse = {
        result: null,
        error: 'Cannot add note: deck "NonExistent" not found'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      await expect(addToAnki('Front', 'Back', 'NonExistent')).rejects.toThrow(
        'Cannot add note: deck "NonExistent" not found'
      );
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(addToAnki('Front', 'Back')).rejects.toThrow('Network error');
    });

    test('should handle invalid JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(addToAnki('Front', 'Back')).rejects.toThrow('Invalid JSON');
    });

    test('should handle missing result field', async () => {
      const mockResponse = {
        error: null
        // Missing result field
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await addToAnki('Front', 'Back');
      expect(result).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle mixed case cloze model names', async () => {
      const mockResponse = { result: 123, error: null };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await addToAnki('test', 'Test {{c1::content}}', 'Default', 'ClOzE');

      const call = fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.params.note.fields).toHaveProperty('Text');
      expect(body.params.note.fields).toHaveProperty('Extra');
    });

    test('should handle very long content', async () => {
      const mockResponse = { result: 456, error: null };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const longContent = 'A'.repeat(10000);
      await addToAnki(longContent, longContent);

      expect(fetch).toHaveBeenCalled();
      const call = fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.params.note.fields.Front).toBe(longContent);
      expect(body.params.note.fields.Back).toBe(longContent);
    });

    test('should handle special characters in content', async () => {
      const mockResponse = { result: 789, error: null };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const specialContent = 'Content with émojis 🎉 and <b>HTML</b> & symbols!';
      await addToAnki(specialContent, specialContent);

      expect(fetch).toHaveBeenCalled();
      const call = fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.params.note.fields.Front).toBe(specialContent);
      expect(body.params.note.fields.Back).toBe(specialContent);
    });
  });
});
