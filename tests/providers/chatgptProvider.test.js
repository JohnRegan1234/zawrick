/**
 * Tests for chatgptProvider.js - OpenAI GPT integration
 * Tests the generation of flashcard content using OpenAI's API
 */

import { 
  generateFrontWithRetry, 
  generateFront, 
  generateClozeWithRetry, 
  generateCloze 
} from '../../chatgptProvider.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('ChatGPT Provider Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    // Reset console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  describe('generateFrontWithRetry', () => {
    const validSettings = {
      _resolvedTemplateString: 'Create a flashcard question for: {{text}} from {{title}} ({{url}})',
      pageTitle: 'Test Page',
      pageUrl: 'https://example.com',
      openaiKey: 'sk-test-key-123',
      gptModel: 'gpt-3.5-turbo'
    };

    test('should successfully generate front content with valid template', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'What is the main concept in this text?'
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateFrontWithRetry('Test text content', validSettings);
      
      expect(result).toBe('What is the main concept in this text?');
      expect(console.log).toHaveBeenCalledWith(
        'generateFrontWithRetry now using pre-resolved template:',
        validSettings._resolvedTemplateString
      );
    });

    test('should throw error when no template string provided', async () => {
      const invalidSettings = { ...validSettings };
      delete invalidSettings._resolvedTemplateString;

      await expect(generateFrontWithRetry('Test text', invalidSettings))
        .rejects.toThrow('No valid template string provided to generateFrontWithRetry.');
    });

    test('should throw error when template string is not a string', async () => {
      const invalidSettings = {
        ...validSettings,
        _resolvedTemplateString: 123
      };

      await expect(generateFrontWithRetry('Test text', invalidSettings))
        .rejects.toThrow('No valid template string provided to generateFrontWithRetry.');
    });

    test('should throw error when template string is null', async () => {
      const invalidSettings = {
        ...validSettings,
        _resolvedTemplateString: null
      };

      await expect(generateFrontWithRetry('Test text', invalidSettings))
        .rejects.toThrow('No valid template string provided to generateFrontWithRetry.');
    });
  });

  describe('generateFront', () => {
    const testParams = {
      text: 'Photosynthesis is the process by which plants convert light into energy.',
      pageTitle: 'Biology Basics',
      pageUrl: 'https://example.com/biology',
      openaiKey: 'sk-test-key-123',
      gptModel: 'gpt-3.5-turbo',
      template: 'Generate a question about: {{text}} from {{title}} ({{url}})'
    };

    test('should successfully call OpenAI API and return formatted response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'What is photosynthesis?'
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateFront(
        testParams.text,
        testParams.pageTitle, 
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        testParams.template
      );

      expect(result).toBe('What is photosynthesis?');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer sk-test-key-123',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should populate template with actual values', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test question' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateFront(
        testParams.text,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        testParams.template
      );

      expect(console.log).toHaveBeenCalledWith(
        'Populated prompt:',
        expect.stringContaining('Photosynthesis is the process')
      );
      expect(console.log).toHaveBeenCalledWith(
        'Populated prompt:',
        expect.stringContaining('Biology Basics')
      );
      expect(console.log).toHaveBeenCalledWith(
        'Populated prompt:',
        expect.stringContaining('https://example.com/biology')
      );
    });

    test('should use default model when gptModel is not provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test question' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateFront(
        testParams.text,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        null, // No model provided
        testParams.template
      );

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('gpt-3.5-turbo');
    });

    describe('API Key Validation', () => {
      test('should throw error for missing API key', async () => {
        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          '', // Empty key
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('Valid OpenAI API key required – please enter your key in the options.');
      });

      test('should throw error for whitespace-only API key', async () => {
        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          '   ', // Whitespace only
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('Valid OpenAI API key required – please enter your key in the options.');
      });

      test('should throw error for invalid API key format', async () => {
        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          'invalid-key', // Doesn't start with sk-
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('Valid OpenAI API key required – please enter your key in the options.');
      });

      test('should accept valid API key format', async () => {
        const mockResponse = {
          choices: [{ message: { content: 'Valid response' } }]
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        const result = await generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          'sk-valid-key-format',
          testParams.gptModel,
          testParams.template
        );

        expect(result).toBe('Valid response');
      });
    });

    describe('API Error Handling', () => {
      test('should handle HTTP error responses', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue('{"error": "Invalid API key"}')
        });

        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          testParams.openaiKey,
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('OpenAI API Error (401)');
      });

      test('should handle malformed JSON responses', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue('This is not JSON')
        });

        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          testParams.openaiKey,
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('OpenAI returned a non-JSON response');
      });

      test('should handle missing choices in response', async () => {
        const invalidResponse = {
          usage: { total_tokens: 10 }
          // Missing choices array
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify(invalidResponse))
        });

        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          testParams.openaiKey,
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('OpenAI response JSON structure is invalid');
      });

      test('should handle missing message content in response', async () => {
        const invalidResponse = {
          choices: [{
            message: {
              // Missing content
            }
          }]
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify(invalidResponse))
        });

        await expect(generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          testParams.openaiKey,
          testParams.gptModel,
          testParams.template
        )).rejects.toThrow('OpenAI response JSON structure is invalid');
      });
    });

    describe('Request Structure Validation', () => {
      test('should send correct request structure to OpenAI', async () => {
        const mockResponse = {
          choices: [{ message: { content: 'Test response' } }]
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        await generateFront(
          testParams.text,
          testParams.pageTitle,
          testParams.pageUrl,
          testParams.openaiKey,
          testParams.gptModel,
          testParams.template
        );

        const [url, options] = global.fetch.mock.calls[0];
        const requestBody = JSON.parse(options.body);

        expect(url).toBe('https://api.openai.com/v1/chat/completions');
        expect(requestBody).toEqual({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('expert Anki flash-card creator')
            },
            {
              role: 'user',
              content: expect.stringContaining('Photosynthesis is the process')
            }
          ],
          temperature: 0.7,
          max_tokens: 64
        });
      });
    });
  });

  describe('generateClozeWithRetry', () => {
    const testParams = {
      text: 'The capital of France is Paris.',
      guidance: 'Focus on geographical facts',
      pageTitle: 'Geography',
      pageUrl: 'https://example.com/geo',
      openaiKey: 'sk-test-key-123',
      gptModel: 'gpt-4',
      retries: 3
    };

    test('should successfully generate cloze with retry logic', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'The capital of {{c1::France}} is {{c2::Paris}}.'
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateClozeWithRetry(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        testParams.retries
      );

      expect(result).toBe('The capital of {{c1::France}} is {{c2::Paris}}.');
    });

    test('should use default values for optional parameters', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'The {{c1::capital}} of France is Paris.' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateClozeWithRetry(
        testParams.text,
        '', // Empty guidance
        '', // Empty title
        '', // Empty URL
        testParams.openaiKey,
        testParams.gptModel
        // No retries specified (should default to 3)
      );

      expect(result).toBe('The {{c1::capital}} of France is Paris.');
    });

    test('should retry on transient errors (TypeError)', async () => {
      // First call fails with TypeError, second succeeds
      global.fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify({
            choices: [{ message: { content: 'Success after retry' } }]
          }))
        });

      // Mock setTimeout to make test run faster
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      const result = await generateClozeWithRetry(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        2 // Only 2 retries for this test
      );

      expect(result).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should retry on timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.message = 'timeout occurred';

      global.fetch
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify({
            choices: [{ message: { content: 'Recovered from timeout' } }]
          }))
        });

      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      const result = await generateClozeWithRetry(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        2
      );

      expect(result).toBe('Recovered from timeout');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should not retry on non-transient errors', async () => {
      const nonTransientError = new Error('Invalid API key');

      global.fetch.mockRejectedValueOnce(nonTransientError);

      await expect(generateClozeWithRetry(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        3
      )).rejects.toThrow('Invalid API key');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should throw error after maximum retries exceeded', async () => {
      global.fetch.mockRejectedValue(new TypeError('Persistent network error'));
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      await expect(generateClozeWithRetry(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel,
        2 // Max 2 retries
      )).rejects.toThrow('Persistent network error');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateCloze', () => {
    const testParams = {
      text: 'Water freezes at 0 degrees Celsius.',
      guidance: 'Focus on temperature facts',
      pageTitle: 'Physics',
      pageUrl: 'https://example.com/physics',
      openaiKey: 'sk-test-key-456',
      gptModel: 'gpt-4'
    };

    test('should successfully generate cloze deletions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Water freezes at {{c1::0 degrees Celsius}}.'
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      );

      expect(result).toBe('Water freezes at {{c1::0 degrees Celsius}}.');
    });

    test('should use default model when not specified', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Generated cloze' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        null // No model specified
      );

      const [url, options] = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);
      expect(requestBody.model).toBe('gpt-3.5-turbo');
    });

    test('should construct proper system message with guidance', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test cloze' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      );

      const [url, options] = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);
      
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('expert Anki CLOZE creator');
      expect(requestBody.messages[0].content).toContain('Focus on temperature facts');
    });

    test('should construct proper system message without guidance', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test cloze' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateCloze(
        testParams.text,
        '', // No guidance
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      );

      const [url, options] = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);
      
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('expert Anki CLOZE creator');
      expect(requestBody.messages[0].content).not.toContain('User guidance:');
    });

    test('should throw error for missing API key', async () => {
      await expect(generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        '', // Empty API key
        testParams.gptModel
      )).rejects.toThrow('OpenAI API key not found. Please configure it in settings.');
    });

    test('should throw error for whitespace-only API key', async () => {
      await expect(generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        '   ', // Whitespace-only API key
        testParams.gptModel
      )).rejects.toThrow('OpenAI API key not found. Please configure it in settings.');
    });

    test('should handle API error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('{"error": "Rate limit exceeded"}')
      });

      await expect(generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      )).rejects.toThrow('OpenAI API Error (429)');
    });

    test('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('Invalid JSON response')
      });

      await expect(generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      )).rejects.toThrow('OpenAI returned a non-JSON response');
    });

    test('should validate request parameters sent to OpenAI', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      await generateCloze(
        testParams.text,
        testParams.guidance,
        testParams.pageTitle,
        testParams.pageUrl,
        testParams.openaiKey,
        testParams.gptModel
      );

      const [url, options] = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(options.headers['Authorization']).toBe('Bearer sk-test-key-456');
      expect(options.headers['Content-Type']).toBe('application/json');
      
      expect(requestBody).toEqual({
        model: 'gpt-4',
        temperature: 0.4,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert Anki CLOZE creator')
          },
          {
            role: 'user',
            content: expect.stringContaining('Water freezes at 0 degrees')
          }
        ]
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    test('should handle very long text input', async () => {
      const longText = 'A'.repeat(10000);
      const mockResponse = {
        choices: [{ message: { content: 'Generated question for long text' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const settings = {
        _resolvedTemplateString: 'Question: {{text}}',
        openaiKey: 'sk-test-key',
        gptModel: 'gpt-3.5-turbo'
      };

      const result = await generateFrontWithRetry(longText, settings);
      expect(result).toBe('Generated question for long text');
    });

    test('should handle special characters in input', async () => {
      const specialText = 'Special chars: àáâ ñ 中文 🌟 \'"`&<>';
      const mockResponse = {
        choices: [{ message: { content: 'Question about special characters' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const settings = {
        _resolvedTemplateString: 'Make question: {{text}}',
        openaiKey: 'sk-test-key',
        gptModel: 'gpt-3.5-turbo'
      };

      const result = await generateFrontWithRetry(specialText, settings);
      expect(result).toBe('Question about special characters');
    });

    test('should handle empty template replacements gracefully', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Generated question' } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await generateFront(
        'Test text',
        '', // Empty title
        '', // Empty URL
        'sk-test-key',
        'gpt-3.5-turbo',
        'Question about {{text}} from {{title}} at {{url}}'
      );

      expect(result).toBe('Generated question');
      expect(console.log).toHaveBeenCalledWith(
        'Populated prompt:',
        'Question about Test text from  at '
      );
    });
  });
});
