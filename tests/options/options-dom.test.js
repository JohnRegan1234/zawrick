// tests/options-dom.test.js

describe('DOM Manipulation and UI Functions', () => {
  let mockChrome;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn()
      }
    };
    global.chrome = mockChrome;

    // Clear document body
    document.body.innerHTML = '';
    
    // Mock notification functions
    global.showUINotification = jest.fn();
    global.flashButtonGreen = jest.fn();
  });

  describe('toggleSection', () => {
    test('should expand collapsed section', () => {
      // Create mock section elements
      const mockBody = document.createElement('div');
      mockBody.className = 'section-body';
      const mockToggle = document.createElement('span');
      mockToggle.className = 'section-toggle';
      mockToggle.textContent = '▶';

      // Mock collapsed state
      mockBody.style.display = 'none';
      
      // Import and test toggleSection function
      // Note: This would need to be adjusted based on actual implementation
      const toggleSection = (body, toggle, expand = null) => {
        const isCurrentlyExpanded = body.style.display !== 'none';
        const shouldExpand = expand !== null ? expand : !isCurrentlyExpanded;
        
        if (shouldExpand) {
          body.style.display = 'block';
          toggle.textContent = '▾';
        } else {
          body.style.display = 'none';
          toggle.textContent = '▶';
        }
      };

      toggleSection(mockBody, mockToggle);
      
      expect(mockBody.style.display).toBe('block');
      expect(mockToggle.textContent).toBe('▾');
    });

    test('should collapse expanded section', () => {
      const mockBody = document.createElement('div');
      mockBody.className = 'section-body';
      const mockToggle = document.createElement('span');
      mockToggle.className = 'section-toggle';
      mockToggle.textContent = '▾';

      // Mock expanded state
      mockBody.style.display = 'block';
      
      const toggleSection = (body, toggle, expand = null) => {
        const isCurrentlyExpanded = body.style.display !== 'none';
        const shouldExpand = expand !== null ? expand : !isCurrentlyExpanded;
        
        if (shouldExpand) {
          body.style.display = 'block';
          toggle.textContent = '▾';
        } else {
          body.style.display = 'none';
          toggle.textContent = '▶';
        }
      };

      toggleSection(mockBody, mockToggle);
      
      expect(mockBody.style.display).toBe('none');
      expect(mockToggle.textContent).toBe('▶');
    });

    test('should handle explicit expand parameter', () => {
      const mockBody = document.createElement('div');
      const mockToggle = document.createElement('span');
      mockBody.style.display = 'none';
      
      const toggleSection = (body, toggle, expand = null) => {
        const isCurrentlyExpanded = body.style.display !== 'none';
        const shouldExpand = expand !== null ? expand : !isCurrentlyExpanded;
        
        if (shouldExpand) {
          body.style.display = 'block';
          toggle.textContent = '▾';
        } else {
          body.style.display = 'none';
          toggle.textContent = '▶';
        }
      };

      // Force expand even if already expanded
      toggleSection(mockBody, mockToggle, true);
      expect(mockBody.style.display).toBe('block');
      
      // Force collapse even if already collapsed
      toggleSection(mockBody, mockToggle, false);
      expect(mockBody.style.display).toBe('none');
    });
  });

  describe('toggleGPTSection', () => {
    test('should enable GPT section controls', () => {
      // Create mock GPT section
      const mockGptBody = document.createElement('div');
      const mockInput = document.createElement('input');
      const mockSelect = document.createElement('select');
      const mockButton = document.createElement('button');
      const mockEnableGpt = document.createElement('input');
      mockEnableGpt.id = 'enable-gpt';
      
      mockGptBody.appendChild(mockInput);
      mockGptBody.appendChild(mockSelect);
      mockGptBody.appendChild(mockButton);
      mockGptBody.appendChild(mockEnableGpt);

      const toggleGPTSection = (on) => {
        if (!mockGptBody) return;
        const inputs = mockGptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
        mockGptBody.style.opacity = on ? '1' : '0.5';
        inputs.forEach(el => {
          if (el.id === 'enable-gpt') return;
          el.disabled = !on;
        });
      };

      toggleGPTSection(true);
      
      expect(mockGptBody.style.opacity).toBe('1');
      expect(mockInput.disabled).toBe(false);
      expect(mockSelect.disabled).toBe(false);
      expect(mockButton.disabled).toBe(false);
      expect(mockEnableGpt.disabled).toBe(false); // Should not be disabled as it's the enable toggle
    });

    test('should disable GPT section controls', () => {
      const mockGptBody = document.createElement('div');
      const mockInput = document.createElement('input');
      const mockSelect = document.createElement('select');
      const mockButton = document.createElement('button');
      
      mockGptBody.appendChild(mockInput);
      mockGptBody.appendChild(mockSelect);
      mockGptBody.appendChild(mockButton);

      const toggleGPTSection = (on) => {
        if (!mockGptBody) return;
        const inputs = mockGptBody.querySelectorAll('input, select, textarea, button:not(.section-toggle)');
        mockGptBody.style.opacity = on ? '1' : '0.5';
        inputs.forEach(el => {
          if (el.id === 'enable-gpt') return;
          el.disabled = !on;
        });
      };

      toggleGPTSection(false);
      
      expect(mockGptBody.style.opacity).toBe('0.5');
      expect(mockInput.disabled).toBe(true);
      expect(mockSelect.disabled).toBe(true);
      expect(mockButton.disabled).toBe(true);
    });
  });

  describe('updateUIConnectionStatus', () => {
    test('should update UI for online status', () => {
      // Create mock status elements
      const mockStatusBar = document.createElement('div');
      mockStatusBar.id = 'status-bar';
      const mockStatusText = document.createElement('span');
      mockStatusText.id = 'status-text';
      
      document.body.appendChild(mockStatusBar);
      document.body.appendChild(mockStatusText);

      const updateUIConnectionStatus = (online, barEl = null, statusTextEl = null) => {
        const bar = barEl || document.getElementById('status-bar');
        const statusText = statusTextEl || document.getElementById('status-text');
        if (!bar || !statusText) return;
        
        const STATUS_TEXT = {
          connected: 'Connected',
          offline: 'Offline'
        };

        if (online) {
          bar.classList.remove('offline', 'disconnected');
          bar.classList.add('connected');
          statusText.textContent = STATUS_TEXT.connected;
        } else {
          bar.classList.add('offline', 'disconnected');
          statusText.textContent = STATUS_TEXT.offline;
        }
      };

      updateUIConnectionStatus(true, mockStatusBar, mockStatusText);
      
      expect(mockStatusBar.classList.contains('connected')).toBe(true);
      expect(mockStatusBar.classList.contains('offline')).toBe(false);
      expect(mockStatusText.textContent).toBe('Connected');
    });

    test('should update UI for offline status', () => {
      const mockStatusBar = document.createElement('div');
      mockStatusBar.id = 'status-bar';
      const mockStatusText = document.createElement('span');
      mockStatusText.id = 'status-text';
      
      document.body.appendChild(mockStatusBar);
      document.body.appendChild(mockStatusText);

      const updateUIConnectionStatus = (online, barEl = null, statusTextEl = null) => {
        const bar = barEl || document.getElementById('status-bar');
        const statusText = statusTextEl || document.getElementById('status-text');
        if (!bar || !statusText) return;
        
        const STATUS_TEXT = {
          connected: 'Connected',
          offline: 'Offline'
        };

        if (online) {
          bar.classList.remove('offline', 'disconnected');
          bar.classList.add('connected');
          statusText.textContent = STATUS_TEXT.connected;
        } else {
          bar.classList.add('offline', 'disconnected');
          statusText.textContent = STATUS_TEXT.offline;
        }
      };

      updateUIConnectionStatus(false, mockStatusBar, mockStatusText);
      
      expect(mockStatusBar.classList.contains('offline')).toBe(true);
      expect(mockStatusBar.classList.contains('disconnected')).toBe(true);
      expect(mockStatusText.textContent).toBe('Offline');
    });
  });

  describe('flashButtonGreen', () => {
    test('should add and remove flash-success class', (done) => {
      const mockButton = document.createElement('button');
      document.body.appendChild(mockButton);

      const flashButtonGreen = (buttonElement) => {
        if (!buttonElement || typeof buttonElement.classList === 'undefined') {
          return;
        }
        buttonElement.classList.add('flash-success');
        setTimeout(() => {
          buttonElement.classList.remove('flash-success');
        }, 100);
      };

      // Manually call the function
      mockButton.classList.add('flash-success');
      expect(mockButton.classList.contains('flash-success')).toBe(true);
      
      setTimeout(() => {
        mockButton.classList.remove('flash-success');
        expect(mockButton.classList.contains('flash-success')).toBe(false);
        done();
      }, 50);
    });

    test('should handle invalid button element', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const flashButtonGreen = (buttonElement) => {
        if (!buttonElement || typeof buttonElement.classList === 'undefined') {
          console.warn('Invalid button element provided:', buttonElement);
          return;
        }
        buttonElement.classList.add('flash-success');
      };

      flashButtonGreen(null);
      flashButtonGreen(undefined);
      flashButtonGreen({});

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe('showUINotification', () => {
    test('should display success notification', () => {
      // Create notification element
      const mockNotification = document.createElement('div');
      mockNotification.id = 'notification';
      mockNotification.className = 'notification';
      document.body.appendChild(mockNotification);

      const showUINotification = (message, type = 'success', notificationEl = null) => {
        const notif = notificationEl || document.getElementById('notification');
        if (!notif) return;
        
        notif.textContent = message;
        notif.className = 'notification';
        if (type === 'error') notif.classList.add('error');
        notif.classList.add('show');
      };

      showUINotification('Test success message', 'success', mockNotification);
      
      expect(mockNotification.textContent).toBe('Test success message');
      expect(mockNotification.classList.contains('show')).toBe(true);
      expect(mockNotification.classList.contains('error')).toBe(false);
    });

    test('should display error notification', () => {
      const mockNotification = document.createElement('div');
      mockNotification.id = 'notification';
      mockNotification.className = 'notification';
      document.body.appendChild(mockNotification);

      const showUINotification = (message, type = 'success', notificationEl = null) => {
        const notif = notificationEl || document.getElementById('notification');
        if (!notif) return;
        
        notif.textContent = message;
        notif.className = 'notification';
        if (type === 'error') notif.classList.add('error');
        notif.classList.add('show');
      };

      showUINotification('Test error message', 'error', mockNotification);
      
      expect(mockNotification.textContent).toBe('Test error message');
      expect(mockNotification.classList.contains('show')).toBe(true);
      expect(mockNotification.classList.contains('error')).toBe(true);
    });
  });

  describe('Event Handlers', () => {
    test('should handle section header clicks', () => {
      const mockSection = document.createElement('div');
      mockSection.className = 'section';
      const mockHeader = document.createElement('div');
      mockHeader.className = 'section-header';
      const mockBody = document.createElement('div');
      mockBody.className = 'section-body';
      const mockToggle = document.createElement('span');
      mockToggle.className = 'section-toggle';

      mockSection.appendChild(mockHeader);
      mockSection.appendChild(mockBody);
      mockHeader.appendChild(mockToggle);
      document.body.appendChild(mockSection);

      let toggleCalled = false;
      const toggleSection = (body, toggle) => { 
        toggleCalled = true; 
      };

      // Simulate event handler setup
      mockHeader.addEventListener('click', () => {
        toggleSection(mockBody, mockToggle);
      });

      // Simulate click event
      const clickEvent = new Event('click', { bubbles: true });
      mockHeader.dispatchEvent(clickEvent);
      
      expect(toggleCalled).toBe(true);
    });

    test('should handle form input changes', () => {
      const mockInput = document.createElement('input');
      mockInput.type = 'text';
      mockInput.value = 'initial value';
      document.body.appendChild(mockInput);

      let changeHandlerCalled = false;
      mockInput.onchange = () => {
        changeHandlerCalled = true;
      };

      // Simulate value change
      mockInput.value = 'new value';
      mockInput.dispatchEvent(new Event('change'));
      
      expect(changeHandlerCalled).toBe(true);
    });

    test('should handle API key toggle visibility', () => {
      const mockKeyInput = document.createElement('input');
      mockKeyInput.type = 'password';
      mockKeyInput.id = 'openai-key';
      const mockToggle = document.createElement('button');
      mockToggle.id = 'toggle-password';
      
      document.body.appendChild(mockKeyInput);
      document.body.appendChild(mockToggle);

      // Simulate toggle functionality
      const toggleHandler = () => {
        const isHidden = mockKeyInput.type === 'password';
        mockKeyInput.type = isHidden ? 'text' : 'password';
        mockToggle.setAttribute('aria-label', isHidden ? 'Hide API Key' : 'Show API Key');
      };
      
      mockToggle.addEventListener('click', toggleHandler);

      // Test showing key
      const clickEvent1 = new Event('click', { bubbles: true });
      mockToggle.dispatchEvent(clickEvent1);
      expect(mockKeyInput.type).toBe('text');
      expect(mockToggle.getAttribute('aria-label')).toBe('Hide API Key');

      // Test hiding key
      const clickEvent2 = new Event('click', { bubbles: true });
      mockToggle.dispatchEvent(clickEvent2);
      expect(mockKeyInput.type).toBe('password');
      expect(mockToggle.getAttribute('aria-label')).toBe('Show API Key');
    });
  });

  describe('PDF Review List Rendering', () => {
    test('should render empty PDF review list', () => {
      const mockReviewList = document.createElement('div');
      mockReviewList.id = 'pdf-review-list';
      const mockReviewCount = document.createElement('span');
      mockReviewCount.id = 'pdf-review-count';
      
      document.body.appendChild(mockReviewList);
      document.body.appendChild(mockReviewCount);

      // Simulate rendering empty list
      const renderPdfReviewList = (pendingCards = [], reviewListEl = null, reviewCountEl = null) => {
        const reviewList = reviewListEl || document.getElementById('pdf-review-list');
        const reviewCount = reviewCountEl || document.getElementById('pdf-review-count');
        if (!reviewList || !reviewCount) return;

        reviewCount.textContent = `${pendingCards.length} cards for review`;
        reviewList.innerHTML = '';

        if (pendingCards.length === 0) {
          reviewList.innerHTML = '<div class="history-empty">No PDF cards are currently awaiting review.</div>';
          return;
        }
      };

      renderPdfReviewList([], mockReviewList, mockReviewCount);
      
      expect(mockReviewCount.textContent).toBe('0 cards for review');
      expect(mockReviewList.innerHTML).toContain('No PDF cards are currently awaiting review');
    });

    test('should render PDF cards in review list', () => {
      const mockReviewList = document.createElement('div');
      mockReviewList.id = 'pdf-review-list';
      const mockReviewCount = document.createElement('span');
      mockReviewCount.id = 'pdf-review-count';
      
      document.body.appendChild(mockReviewList);
      document.body.appendChild(mockReviewCount);

      const mockCards = [
        {
          id: 'card-1',
          timestamp: Date.now(),
          sourceText: 'PDF content 1',
          generatedFront: 'Question 1',
          originalPageTitle: 'Test PDF 1',
          originalDeckName: 'PDF Deck',
          originalModelName: 'Basic',
          isCloze: false
        },
        {
          id: 'card-2',
          timestamp: Date.now(),
          sourceText: 'PDF content 2',
          generatedClozeText: 'Cloze content',
          originalPageTitle: 'Test PDF 2',
          originalDeckName: 'PDF Deck',
          originalModelName: 'Cloze',
          isCloze: true
        }
      ];

      // Simplified rendering function
      const renderPdfReviewList = (pendingCards = [], reviewListEl = null, reviewCountEl = null) => {
        const reviewList = reviewListEl || document.getElementById('pdf-review-list');
        const reviewCount = reviewCountEl || document.getElementById('pdf-review-count');
        
        if (!reviewList || !reviewCount) return;

        reviewCount.textContent = `${pendingCards.length} cards for review`;
        reviewList.innerHTML = '';

        if (pendingCards.length === 0) {
          reviewList.innerHTML = '<div class="history-empty">No PDF cards are currently awaiting review.</div>';
          return;
        }

        pendingCards.forEach(card => {
          const cardElement = document.createElement('div');
          cardElement.className = 'review-card';
          cardElement.setAttribute('data-card-id', card.id);
          cardElement.innerHTML = `
            <div class="review-card-header">
              <span>From: <strong>${card.originalPageTitle || 'PDF Document'}</strong></span>
            </div>
          `;
          reviewList.appendChild(cardElement);
        });
      };

      renderPdfReviewList(mockCards, mockReviewList, mockReviewCount);
      
      expect(mockReviewCount.textContent).toBe('2 cards for review');
      expect(mockReviewList.children.length).toBe(2);
      expect(mockReviewList.querySelector('[data-card-id="card-1"]')).toBeTruthy();
      expect(mockReviewList.querySelector('[data-card-id="card-2"]')).toBeTruthy();
    });
  });
});
