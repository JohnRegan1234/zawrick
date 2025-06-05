console.log('[ContentScript] Loaded and running on:', window.location.href);

// Toast state object for live reference sharing
const toastState = {
    toastEl: null,
    toastHideTimeout: null
};

// Message listener function
const messageListener = (msg, sender, sendResponse) => {
    console.log('[ContentScript] Message received:', msg, 'Sender:', sender);

    // 1) Copy the selected text as HTML
    if (msg.action === "getSelectionHtml") {
        let html = "";
        const sel = window.getSelection();
        if (sel?.rangeCount) {
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
        }
        sendResponse({ html });
        return true;
    }    // 2) Prompt user for card front when GPT is disabled
    if (msg.action === "manualFront") {
        console.log('[ContentScript] "manualFront" action received. Preparing to display UI.');

        console.log('[ContentScript] DOM check - document exists:', !!document);
        console.log('[ContentScript] DOM check - document.body exists:', !!document.body);
        console.log('[ContentScript] DOM check - createElement function exists:', typeof document.createElement);
        console.log('[ContentScript] DOM check - appendChild function exists:', typeof document.body.appendChild);

        // 1) Create overlay
        const isCloze = /cloze/i.test(msg.modelName);
        const overlay = document.createElement("div");
        console.log('[ContentScript] Created overlay element:', !!overlay);
        
        overlay.id = "manual-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
        });
        console.log('[ContentScript] Set overlay styles and ID');
        
        overlay.addEventListener("click", e => {
            if (e.target === overlay) overlay.remove();
        });

        // 2) Create dialog box
        const box = document.createElement("div");
        console.log('[ContentScript] Created box element:', !!box);
        
        box.id = "manual-box";
        Object.assign(box.style, {
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: isCloze ? "800px" : "600px", // Wider for cloze cards
            width: "90%",
            maxHeight: "85vh",
            overflow: "auto",
            position: "relative",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        });

        // 3) Error HTML (if any)
        let errorHtml = "";
        if (msg.error) {
            errorHtml = `
            <div id="manual-error" style="background: #fee2e2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              ⚠️ GPT generation failed.<br>
              <code style="background: rgba(185,28,28,0.1); padding: 2px 6px; border-radius: 4px;">${msg.error}</code><br>
              <span style="font-size:1.05em; font-weight:500; margin-top:8px; display:block;">💡 You can still create the card manually below.</span>
            </div>
          `;
        }

        // 4) Determine dialog heading based on context
        const hasGeneratedContent = msg.frontHtml && msg.frontHtml.trim();
        const dialogHeading = isCloze 
            ? (hasGeneratedContent ? "Review Generated Cloze Card" : "Create Cloze Card")
            : (hasGeneratedContent ? "Review Generated Question" : "Create Flashcard Question");

        // 5) Deck select — enabled only if msg.ankiOnline===true
        const deckName = msg.deckName || "Default";
        const deckDisabled = msg.ankiOnline ? "" : "disabled";
        const deckHelp = msg.ankiOnline
            ? ""
            : `<span style="font-size:12px; color:#6b7280; margin-top:6px; display:block;">
                🟠 Deck can only be changed when Anki is connected
            </span>`;

        // Use the full list if available, otherwise show just the saved deck
        const options = (msg.deckList && msg.deckList.length)
            ? msg.deckList
            : [deckName];

        const deckSelectHtml = `
            <div style="margin-bottom: 16px;">
              <label style="display:block; font-weight:500; margin-bottom:4px; color:#374151;">Deck</label>
              <select id="manual-deck" ${deckDisabled} style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; background:#fff;">
                ${options.map(d =>
            `<option value="${d}"${d === deckName ? " selected" : ""}>${d}</option>`
        ).join("")}
              </select>
              ${deckHelp}
            </div>
          `;

        // 6) Build the appropriate interface based on card type
        let contentHtml = "";
        
        if (isCloze) {
            // Redesigned cloze interface with editable area and preview
            const clozeContent = msg.frontHtml || msg.originalSelectionHtml || "";
            contentHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <!-- Editable Area -->
                    <div>
                        <label for="manual-back-input" style="display:block; font-weight:500; margin-bottom:8px; color:#374151;">
                            Edit Cloze Text
                        </label>
                        <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">
                            Add {{c1::deletions}}, {{c2::more deletions}}, etc.
                        </div>
                        <textarea id="manual-back-input" 
                                  style="width:100%; height:200px; padding:12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; font-family:monospace; resize:vertical; line-height:1.5;"
                                  placeholder="Enter your cloze text with {{c1::deletions}}...">${clozeContent}</textarea>
                    </div>
                    
                    <!-- Preview Area -->
                    <div>
                        <label style="display:block; font-weight:500; margin-bottom:8px; color:#374151;">
                            Preview (Card Back)
                        </label>
                        <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">
                            This is how your card will appear in Anki
                        </div>
                        <div id="manual-back-preview" 
                             style="width:100%; height:200px; padding:12px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb; overflow-y:auto; font-size:14px; line-height:1.5;">
                            ${msg.backHtml || clozeContent}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Standard interface for basic cards
            contentHtml = `
                <div style="margin-bottom: 20px;">
                    <label for="manual-front-input" style="display:block; font-weight:500; margin-bottom:8px; color:#374151;">
                        Question for the front:
                    </label>
                    <textarea id="manual-front-input"
                              style="width:100%; height:80px; padding:12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; resize:vertical;"
                              placeholder="Type your question here…">${msg.frontHtml || ""}</textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display:block; font-weight:500; margin-bottom:8px; color:#ff6600;">Back of the card (preview):</label>
                    <div style="border-top: 2px solid #ff6600; padding-top: 12px;">
                        <div style="padding:12px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb; max-height:200px; overflow-y:auto;">
                            ${msg.backHtml}
                        </div>
                    </div>
                </div>
            `;
        }

        // 7) Build complete dialog HTML
        box.innerHTML = `
            ${errorHtml}
            <h2 style="margin:0 0 20px; font-size:20px; color:#1f2937; font-weight:600;">${dialogHeading}</h2>
            ${deckSelectHtml}
            ${contentHtml}
            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px;">
                <button id="manual-cancel-btn" style="padding:10px 20px; border:1px solid #d1d5db; background:#fff; color:#374151; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500;">
                    Cancel
                </button>
                <button id="manual-save-btn" style="padding:10px 20px; border:none; background:#ff6600; color:#fff; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">
                    Save to Anki
                </button>
            </div>        `;
        
        console.log('[ContentScript] About to append box to overlay');
        overlay.appendChild(box);
        console.log('[ContentScript] Successfully appended box to overlay');
        
        console.log('[ContentScript] About to append overlay to document.body');
        console.log('[ContentScript] Current body children count before append:', document.body.children.length);
        
        try {
            document.body.appendChild(overlay);
            console.log('[ContentScript] Successfully appended overlay to document.body');
            console.log('[ContentScript] Body children count after append:', document.body.children.length);
            console.log('[ContentScript] Overlay element in body:', !!document.getElementById('manual-overlay'));
        } catch (error) {
            console.log('[ContentScript] ERROR appending to body:', error);
        }

        // 8) Set up real-time preview updates for cloze cards
        if (isCloze) {
            const textArea = box.querySelector("#manual-back-input");
            const preview = box.querySelector("#manual-back-preview");
            
            if (textArea && preview) {
                textArea.addEventListener("input", () => {
                    // Update preview with current textarea content
                    preview.innerHTML = textArea.value || "<em style='color:#9ca3af;'>Preview will appear here as you type...</em>";
                });
            }
        }

        // 9) Save validation and handler
        const frontInput = box.querySelector("#manual-front-input");
        const backInput = box.querySelector("#manual-back-input");
        const saveBtn = box.querySelector("#manual-save-btn");
        const cancelBtn = box.querySelector("#manual-cancel-btn");
        
        function toggleSave() {
            const hasContent = isCloze ? 
                (backInput && backInput.value.trim().length > 0) :
                (frontInput && frontInput.value.trim().length > 0);
            if (saveBtn) {
                saveBtn.disabled = !hasContent;
                saveBtn.style.opacity = hasContent ? "1" : "0.6";
            }
        }
        
        if (frontInput) frontInput.addEventListener("input", toggleSave);
        if (backInput) backInput.addEventListener("input", toggleSave);
        toggleSave(); // Initial check

        // 10) Event handlers
        if (cancelBtn) {
            cancelBtn.onclick = () => overlay.remove();
        }

        if (saveBtn) {
            saveBtn.onclick = () => {
                const question = frontInput ? frontInput.value.trim() : "";
                const clozeContent = backInput ? backInput.value.trim() : "";
                
                if (isCloze && !clozeContent) return;
                if (!isCloze && !question) return;

                const selectedDeck = box.querySelector("#manual-deck").value;
                const finalBackContent = isCloze ? clozeContent : msg.backHtml;
                
                chrome.runtime.sendMessage({
                    action   : "manualSave",
                    front    : isCloze ? clozeContent : question, // For cloze, front and back are the same
                    backHtml : finalBackContent,
                    deckName : selectedDeck,
                    modelName: msg.modelName,
                    pageTitle: msg.pageTitle,
                    pageUrl  : msg.pageUrl,
                    imageHtml: msg.imageHtml
                });
                overlay.remove();
            };
        }

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

// Register the message listener
chrome.runtime.onMessage.addListener(messageListener);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        messageListener,
        toastState
    };
}