console.log('[ContentScript] Loaded and running on:', window.location.href);

// Toast state object for live reference sharing
const toastState = {
    toastEl: null,
    toastHideTimeout: null
};

// Message listener function
const messageListener = async (msg, sender, sendResponse) => {
    console.log('[ContentScript] Message received:', msg, 'Sender:', sender);

    // 0) Respond to ping for handshake with background script
    if (msg.action === "ping") {
        sendResponse({ ready: true });
        return true;
    }

    // 1) Copy the selected text as HTML
    if (msg.action === "getSelectionHtml") {
        let html = "";
        let error = null;
        try {
            const sel = window.getSelection();
            if (!sel) {
                error = "window.getSelection() returned null. This may happen on special pages or iframes.";
            } else if (!sel.rangeCount) {
                error = "No text is selected. Please select some text before using Zawrick.";
            } else {
                const container = document.createElement("div");
                for (let i = 0; i < sel.rangeCount; i++) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
                // If only a single wrapper div exists, unwrap its innerHTML for test consistency
                const unwrapMatch = html.match(/^<div[^>]*>([\s\S]*)<\/div>$/);
                if (unwrapMatch) {
                    html = unwrapMatch[1];
                }
                if (!html.trim()) {
                    error = "Selection is empty or not extractable. Try selecting visible text on the page.";
                }
            }
        } catch (e) {
            error = `Exception while extracting selection: ${e.message}`;
        }
        if (error) {
            console.warn('[Zawrick] getSelectionHtml error:', error);
        }
        sendResponse({ html, error });
        return true;
    }    // 2) Prompt user for card front when GPT is disabled
    if (msg.action === "manualFront") {
        console.log('[ContentScript] "manualFront" action received. Preparing to display UI.');
        const isCloze = /cloze/i.test(msg.modelName);
        let templateHtml = '';
        try {
            templateHtml = await fetch(chrome.runtime.getURL('ui/manual-dialogue.html')).then(r => r.text());
        } catch (err) {
            console.error('[Zawrick] Failed to load manual-dialogue.html:', err);
            showUINotification('Could not load manual card dialog. Please check extension files.', 'error');
            return;
        }
        const template = document.createElement('template');
        template.innerHTML = templateHtml;
        const overlay = template.content.cloneNode(true).querySelector('#manual-overlay');
        if (!overlay) {
            console.error('[Zawrick] manual-dialogue.html missing #manual-overlay');
            showUINotification('Manual card dialog template is missing overlay.', 'error');
            return;
        }
        const box = overlay.querySelector('#manual-box');
        if (!box) {
            console.error('[Zawrick] manual-dialogue.html missing #manual-box');
            showUINotification('Manual card dialog template is missing box.', 'error');
            return;
        }

        // 2) Set up error message if any
        const errorEl = box.querySelector('#manual-error');
        if (msg.error) {
            errorEl.classList.remove('hidden');
            errorEl.querySelector('code').textContent = msg.error;
        }

        // 3) Set dialog heading
        const hasGeneratedContent = msg.frontHtml && msg.frontHtml.trim();
        const dialogHeading = isCloze 
            ? (hasGeneratedContent ? "Review Generated Cloze Card" : "Create Cloze Card")
            : (hasGeneratedContent ? "Review Generated Question" : "Create Flashcard Question");
        box.querySelector('#manual-heading').textContent = dialogHeading;

        // 4) Set up deck selection
        const deckSelect = box.querySelector('#manual-deck');
        const deckHelp = box.querySelector('#deck-help');
        const deckName = msg.deckName || "Default";
        const options = (msg.deckList && msg.deckList.length) ? msg.deckList : [deckName];
        
        deckSelect.innerHTML = options.map(d => 
            `<option value="${d}"${d === deckName ? " selected" : ""}>${d}</option>`
        ).join("");
        
        if (!msg.ankiOnline) {
            deckSelect.disabled = true;
            deckHelp.classList.remove('hidden');
        }

        // 5) Set up content area based on card type
        const basicContent = box.querySelector('#basic-card-content');
        const clozeContent = box.querySelector('#cloze-card-content');
        
        if (isCloze) {
            clozeContent.classList.remove('hidden');
            const backInput = clozeContent.querySelector('#manual-back-input');
            const preview = clozeContent.querySelector('#manual-back-preview');
            const initialClozeText = msg.frontHtml || msg.originalSelectionHtml || "";
            
            backInput.value = initialClozeText;
            preview.innerHTML = msg.backHtml || initialClozeText;
            
            // Set up real-time preview
            backInput.addEventListener('input', () => {
                preview.innerHTML = backInput.value || "<em class='text-gray-400'>Preview will appear here as you type...</em>";
            });
        } else {
            basicContent.classList.remove('hidden');
            const frontInput = basicContent.querySelector('#manual-front-input');
            const preview = basicContent.querySelector('#manual-back-preview');
            
            frontInput.value = msg.frontHtml || "";
            preview.innerHTML = msg.backHtml || "";
        }

        // 6) Set up event handlers
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.remove();
        });

        const cancelBtn = box.querySelector('#manual-cancel-btn');
        const saveBtn = box.querySelector('#manual-save-btn');
        
        if (cancelBtn) {
            cancelBtn.onclick = () => overlay.remove();
        }

        if (saveBtn) {
            const frontInput = box.querySelector('#manual-front-input');
            const backInput = box.querySelector('#manual-back-input');
            
            function toggleSave() {
                const hasContent = isCloze ? 
                    (backInput && backInput.value.trim().length > 0) :
                    (frontInput && frontInput.value.trim().length > 0);
                saveBtn.disabled = !hasContent;
                saveBtn.classList.toggle('opacity-60', !hasContent);
            }
            
            if (frontInput) frontInput.addEventListener('input', toggleSave);
            if (backInput) backInput.addEventListener('input', toggleSave);
            toggleSave(); // Initial check

            saveBtn.onclick = () => {
                const question = frontInput ? frontInput.value.trim() : "";
                const clozeText = backInput ? backInput.value.trim() : "";
                
                if (isCloze && !clozeText) return;
                if (!isCloze && !question) return;

                const selectedDeck = deckSelect.value;
                const finalBackContent = isCloze ? clozeText : msg.backHtml;
                
                chrome.runtime.sendMessage({
                    action: 'manualSave',
                    front: isCloze ? clozeText : question,
                    backHtml: finalBackContent,
                    deckName: selectedDeck,
                    modelName: msg.modelName,
                    pageTitle: msg.pageTitle,
                    pageUrl: msg.pageUrl,
                    imageHtml: msg.imageHtml
                });
                overlay.remove();
            };
        }

        // 7) Add to document
        document.body.appendChild(overlay);
        return;
    }

    // 3) Show confirmation dialog before saving to Anki
    if (msg.action === "confirmCard") {
        console.log('Received confirmCard message:', msg);
        
        const overlay = document.createElement("div");
        overlay.id = "confirm-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
        });

        const box = document.createElement("div");
        box.id = "confirm-box";
        Object.assign(box.style, {
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
            position: "relative",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        });

        box.innerHTML = `
            <h3 style="margin: 0 0 16px; color: #333;">Confirm Anki Card</h3>
            
            <div style="margin-bottom: 16px;">
                <strong>Front:</strong>
                <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-top: 4px;">
                    ${msg.front || 'No front text'}
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>Back:</strong>
                <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-top: 4px; max-height: 200px; overflow-y: auto;">
                    ${msg.back || 'No back text'}
                </div>
            </div>
            
            <div style="margin-bottom: 20px; font-size: 14px; color: #666;">
                <strong>Deck:</strong> ${msg.deckName || 'Unknown'} | 
                <strong>Model:</strong> ${msg.modelName || 'Unknown'}
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="confirm-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button id="confirm-save" style="padding: 8px 16px; border: none, background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                    Save to Anki
                </button>
            </div>
        `;

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        Object.assign(closeBtn.style, {
            position: "absolute",
            top: "8px",
            right: "12px",
            background: "transparent",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#666"
        });
        closeBtn.onclick = () => overlay.remove();

        box.appendChild(closeBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Event handlers
        box.querySelector("#confirm-cancel").onclick = () => {
            overlay.remove();
        };

        box.querySelector("#confirm-save").onclick = () => {
            chrome.runtime.sendMessage({
                action: "confirmSave",
                cardData: {
                    front: msg.front,
                    back: msg.back,
                    deckName: msg.deckName,
                    modelName: msg.modelName
                }
            });
            overlay.remove();
        };        // Close on overlay click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return;
    }

    // Toast notifications
    if (!msg.status) return;

    if (toastState.toastHideTimeout) {
        clearTimeout(toastState.toastHideTimeout);
        toastState.toastHideTimeout = null;
    }

    if (!toastState.toastEl) {
        toastState.toastEl = document.createElement("div");
        toastState.toastEl.id = "zawrick-toast";
        Object.assign(toastState.toastEl.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "14px",
            borderRadius: "4px",
            zIndex: 9999,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            opacity: "0",
            transition: "opacity 0.3s ease"
        });
        document.body.appendChild(toastState.toastEl);
    }

    toastState.toastEl.textContent = msg.message;
    toastState.toastEl.style.background =
        msg.status === "success" ? "rgba(40,167,69,0.9)" :
        msg.status === "error" ? "rgba(220,53,69,0.9)" :
        "rgba(23,162,184,0.9)";
    toastState.toastEl.style.opacity = "1";

    if (msg.status === "success") {
        toastState.toastHideTimeout = setTimeout(() => {
            if (toastState.toastEl) {
                toastState.toastEl.style.opacity = "0";
                setTimeout(() => {
                    if (toastState.toastEl) {
                        toastState.toastEl.remove();
                        toastState.toastEl = null;
                    }
                    toastState.toastHideTimeout = null;
                }, 300);
            }
        }, 1500);
    }
};

// Helper for showing UI notifications from anywhere in the script
function showUINotification(message, type = '') {
    if (!toastState.toastEl) {
        toastState.toastEl = document.createElement('div');
        toastState.toastEl.id = 'zawrick-toast';
        Object.assign(toastState.toastEl.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "14px",
            borderRadius: "4px",
            zIndex: 9999,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            opacity: "0",
            transition: "opacity 0.3s ease"
        });
        document.body.appendChild(toastState.toastEl);
    }
    toastState.toastEl.textContent = message;
    toastState.toastEl.style.background =
        type === "error" ? "rgba(220,53,69,0.9)" :
        type === "success" ? "rgba(40,167,69,0.9)" :
        "rgba(23,162,184,0.9)";
    toastState.toastEl.style.opacity = "1";
    setTimeout(() => {
        if (toastState.toastEl) {
            toastState.toastEl.style.opacity = "0";
            setTimeout(() => {
                if (toastState.toastEl) {
                    toastState.toastEl.remove();
                    toastState.toastEl = null;
                }
            }, 300);
        }
    }, 2000);
}

// Register the message listener
chrome.runtime.onMessage.addListener(messageListener);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        messageListener,
        toastState
    };
}