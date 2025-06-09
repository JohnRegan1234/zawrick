/**
 * @fileoverview Model selector component for GPT model selection
 */

import { getAvailableModels } from '../services/openai-service.js';

export class ModelSelector {
    constructor() {
        this.modelSelect = document.getElementById('gpt-model-select');
        this.modelDisplay = document.getElementById('gpt-model-display');
        this.initialized = false;
    }

    /**
     * Initialize the model selector
     * @param {Object} appState - The application state instance
     */
    init(appState) {
        if (!this.modelSelect || this.initialized) return;

        this.appState = appState;
        
        // Set initial value
        this.modelSelect.value = appState.state.gptModel || 'gpt-3.5-turbo';
        
        // Handle model changes
        this.modelSelect.onchange = () => {
            this.appState.updateGptSettings({ gptModel: this.modelSelect.value });
            this.updateModelDisplay();
        };

        // Initial display update
        this.updateModelDisplay();
        
        this.initialized = true;
    }

    /**
     * Update the model display text
     */
    updateModelDisplay() {
        if (!this.modelDisplay) return;
        const selectedModel = this.modelSelect ? this.modelSelect.value : (this.appState.state.gptModel || 'gpt-3.5-turbo');
        this.modelDisplay.textContent = `Model: ${selectedModel}`;
    }

    /**
     * Fetch and update available models
     * @returns {Promise<void>}
     */
    async updateAvailableModels() {
        if (!this.modelSelect || !this.appState) return;

        try {
            const availableModels = await getAvailableModels();
            if (availableModels.length > 0) {
                // Clear existing options
                this.modelSelect.innerHTML = '';
                
                // Add available models
                availableModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model.replace('gpt-', 'GPT-').replace(/-/g, ' ');
                    this.modelSelect.appendChild(option);
                });
                
                // Set current model if it exists in available models
                if (this.appState.state.gptModel && availableModels.includes(this.appState.state.gptModel)) {
                    this.modelSelect.value = this.appState.state.gptModel;
                }

                // Update display
                this.updateModelDisplay();
            }
        } catch (error) {
            console.error('[ModelSelector] Failed to fetch available models:', error);
        }
    }
} 