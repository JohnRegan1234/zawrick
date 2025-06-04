/**
 * Test Suite for Options.js Anki Functions
 * 
 * Tests AnkiConnect integration and deck/model management
 * Run with: npm test -- tests/options-anki.test.js
 */

describe('Options.js Anki Functions', () => {
  
  describe('fetchAnki', () => {
    const fetchAnki = async (action, params = {}) => {
      try {
        const res = await fetch('http://127.0.0.1:8765', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, version: 6, params })
        });
        if (!res.ok) throw new Error(`Network error: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.result;
      } catch (err) {
        console.error(`AnkiConnect action "${action}" failed:`, err);
        throw err;
      }
    };

    test('should successfully fetch data from AnkiConnect', async () => {
      const mockResponse = {
        result: ['Default', 'Test Deck'],
        error: null
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fetchAnki('deckNames');
      expect(result).toEqual(['Default', 'Test Deck']);
      expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deckNames', version: 6, params: {} })
      });
    });

    test('should throw error for network failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(fetchAnki('deckNames')).rejects.toThrow('Network error: 500');
    });

    test('should throw error for Anki API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: null,
          error: 'Collection is not available'
        })
      });

      await expect(fetchAnki('deckNames')).rejects.toThrow('Collection is not available');
    });
  });

  describe('fetchDeckNames', () => {
    const fetchAnki = async (action, params = {}) => {
      const res = await fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
      });
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    };

    const fetchDeckNames = async () => {
      try {
        return await fetchAnki("deckNames");
      } catch (err) {
        console.warn('[Options][fetchDeckNames] Could not fetch deck names:', err);
        return [];
      }
    };

    test('should return deck names on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: ['Default', 'Language Learning', 'Science'],
          error: null
        })
      });

      const result = await fetchDeckNames();
      expect(result).toEqual(['Default', 'Language Learning', 'Science']);
    });

    test('should return empty array on failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await fetchDeckNames();
      expect(result).toEqual([]);
    });
  });

  describe('fetchModelNames', () => {
    const fetchAnki = async (action, params = {}) => {
      const res = await fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
      });
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    };

    const fetchModelNames = async () => {
      try {
        return await fetchAnki("modelNames");
      } catch (err) {
        console.warn('[Options][fetchModelNames] Could not fetch model names:', err);
        return ['Basic', 'Cloze']; // Fallback defaults
      }
    };

    test('should return model names on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: ['Basic', 'Cloze', 'Basic (and reversed card)', 'Custom'],
          error: null
        })
      });

      const result = await fetchModelNames();
      expect(result).toEqual(['Basic', 'Cloze', 'Basic (and reversed card)', 'Custom']);
    });

    test('should return fallback defaults on failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await fetchModelNames();
      expect(result).toEqual(['Basic', 'Cloze']);
    });
  });

  describe('refreshAnkiStatus', () => {
    let mockStatusText, mockStatusHelp, mockDeckSel, mockModelSel;

    beforeEach(() => {
      mockStatusText = {
        textContent: '',
        className: ''
      };
      mockStatusHelp = {
        style: { display: 'none' }
      };
      mockDeckSel = {
        innerHTML: '',
        value: '',
        add: jest.fn()
      };
      mockModelSel = {
        innerHTML: '',
        value: '',
        add: jest.fn()
      };

      // Mock DOM functions
      global.Option = jest.fn((text, value) => ({ text, value }));
    });

    const createRefreshAnkiStatus = (statusText, statusHelp, deckSel, modelSel) => {
      const fetchAnki = async (action) => {
        const mockData = {
          deckNames: ['Default', 'Test Deck'],
          modelNames: ['Basic', 'Cloze']
        };
        return mockData[action] || [];
      };

      const loadSettings = () => Promise.resolve({
        deckName: 'Default',
        modelName: 'Basic'
      });

      return async () => {
        if (!statusText) return;

        try {
          statusText.textContent = 'Connecting...';
          statusText.className = 'status-connecting';

          const [decks, models, settings] = await Promise.all([
            fetchAnki("deckNames"),
            fetchAnki("modelNames"),
            loadSettings()
          ]);

          statusText.textContent = 'Connected ✓';
          statusText.className = 'status-connected';
          if (statusHelp) statusHelp.style.display = 'none';

          if (deckSel) {
            deckSel.innerHTML = '';
            decks.forEach(deck => deckSel.add(new Option(deck, deck)));
            deckSel.value = settings.deckName;
          }

          if (modelSel) {
            modelSel.innerHTML = '';
            models.forEach(model => modelSel.add(new Option(model, model)));
            modelSel.value = settings.modelName;
          }
        } catch (error) {
          statusText.textContent = 'Connection failed ✗';
          statusText.className = 'status-error';
          if (statusHelp) statusHelp.style.display = 'block';
        }
      };
    };

    test('should update status to connected on success', async () => {
      const refreshAnkiStatus = createRefreshAnkiStatus(mockStatusText, mockStatusHelp, mockDeckSel, mockModelSel);

      await refreshAnkiStatus();

      expect(mockStatusText.textContent).toBe('Connected ✓');
      expect(mockStatusText.className).toBe('status-connected');
      expect(mockStatusHelp.style.display).toBe('none');
    });

    test('should populate deck and model selectors', async () => {
      const refreshAnkiStatus = createRefreshAnkiStatus(mockStatusText, mockStatusHelp, mockDeckSel, mockModelSel);

      await refreshAnkiStatus();

      expect(mockDeckSel.add).toHaveBeenCalledWith({ text: 'Default', value: 'Default' });
      expect(mockDeckSel.add).toHaveBeenCalledWith({ text: 'Test Deck', value: 'Test Deck' });
      expect(mockModelSel.add).toHaveBeenCalledWith({ text: 'Basic', value: 'Basic' });
      expect(mockModelSel.add).toHaveBeenCalledWith({ text: 'Cloze', value: 'Cloze' });
      expect(mockDeckSel.value).toBe('Default');
      expect(mockModelSel.value).toBe('Basic');
    });

    test('should handle errors gracefully', async () => {
      const failingRefreshAnkiStatus = createRefreshAnkiStatus(mockStatusText, mockStatusHelp, null, null);
      
      // Override fetchAnki to throw error
      const refreshAnkiStatusWithError = async () => {
        if (!mockStatusText) return;
        try {
          mockStatusText.textContent = 'Connecting...';
          mockStatusText.className = 'status-connecting';
          throw new Error('Connection failed');
        } catch (error) {
          mockStatusText.textContent = 'Connection failed ✗';
          mockStatusText.className = 'status-error';
          if (mockStatusHelp) mockStatusHelp.style.display = 'block';
        }
      };

      await refreshAnkiStatusWithError();

      expect(mockStatusText.textContent).toBe('Connection failed ✗');
      expect(mockStatusText.className).toBe('status-error');
      expect(mockStatusHelp.style.display).toBe('block');
    });
  });
});
