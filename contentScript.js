let toastEl = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
        }
        sendResponse({ html });
        return true;
    }

    // 2) Prompt user for card front when GPT is disabled
    if (msg.action === "manualFront") {
        // 1) Create overlay
        const isCloze = /cloze/i.test(msg.modelName);
        const overlay = document.createElement("div");
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
        overlay.addEventListener("click", e => {
            if (e.target === overlay) overlay.remove();
        });

        // 2) Create dialog box
        const box = document.createElement("div");
        box.id = "manual-box";

        // 3) Error HTML (if any)
        let errorHtml = "";
        if (msg.error) {
            errorHtml = `
            <div id="manual-error" class="manual-error">
              ⚠️ GPT generation failed.<br>
              <code>${msg.error}</code><br>
              
              <span style="font-size:1.16em; font-weight:500">💡 You can still create the card manually below.</span>
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
            : `<span class="muted-text" style="font-size:12px; margin-top:6px;">
                🟠 Deck can only be changed when Anki is connected
            </span>`;

        // Use the full list if available, otherwise show just the saved deck
        const options = (msg.deckList && msg.deckList.length)
            ? msg.deckList
            : [deckName];

        const deckSelectHtml = `
            <label style="display:flex; flex-direction:column; margin-top:12px;">
              <span>Deck</span>
              <select id="manual-deck" ${deckDisabled}>
                ${options.map(d =>
            `<option value="${d}"${d === deckName ? " selected" : ""}>${d}</option>`
        ).join("")}
              </select>
              ${deckHelp}
            </label>
          `;

        // 6) Note model notice
        const modelNotice = isCloze ?
          `<div class="muted-text" style="font-size:12px;">
             ✨ Cloze card – edit the text below and add {{c1::…}} deletions
           </div>` : "";

        // 7) Build inner HTML
        box.innerHTML += `
        ${errorHtml}
        <h2 id="manual-heading" style="margin:0 0 8px;font-size:16px;">${dialogHeading}</h2>
        <div style="margin-bottom:12px">
            ${deckSelectHtml}
        </div>
        <label for="manual-front-input"
               style="display:${isCloze ? "none" : "block"}; font-size:12px; margin-bottom:4px;">
          Question for the front:
        </label>
        <textarea id="manual-front-input"
                  style="display:${isCloze ? "none" : "block"};width:100%;height:80px;padding:8px;font-size:14px;
                border:1px solid #ccc;border-radius:4px;resize:vertical;"
            placeholder="Type your question here…">${msg.frontHtml || ""}</textarea>

        ${isCloze ?
          `<label for="manual-back-input" class="muted-text" style="display:block;font-size:12px;margin-bottom:4px;">Cloze text (add {{c1::deletions}}):</label>
           <textarea id="manual-back-input" style="width:100%;height:120px;padding:8px;font-size:14px;border:1px solid #ccc;border-radius:4px;resize:vertical;">${msg.backHtml}</textarea>`
        :
          `<!-- Preview of the selected text -->
           <div id="manual-back-preview">
             <label class="preview-label" style="color:#ff6600"><b>Back of the card:</b></label>
             <hr>
             <div class="preview-content">${msg.backHtml}</div>
           </div>`}

        <div>
            ${modelNotice}
        </div>

        <div id="manual-button-row">
        <button id="manual-enable-gpt-btn" class="manual-button-secondary">
            <span style="font-size:1.1em"><b>Setup ChatGPT</b></span><br/>
            <span class="muted-text" style="font-size:12px; margin-top:4px;">
            to generate cards automatically!
            </span>
        </button>
        <button id="manual-save-btn" class="manual-button">
            <b>Save to Anki</b>
        </button>
        </div>
        `;

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        Object.assign(closeBtn.style, {
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "transparent",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            color: "#666"
        });
        closeBtn.onclick = () => overlay.remove();
        box.appendChild(closeBtn);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // 8) Enable Save validation
        const frontInput = box.querySelector("#manual-front-input");
        const saveBtn = box.querySelector("#manual-save-btn");
        function toggleSave() {
          const hasFront = isCloze ? true : frontInput.value.trim().length > 0;
          saveBtn.disabled = !hasFront;
          saveBtn.style.opacity = hasFront ? "1" : "0.6";
        }
        if (frontInput) {
            frontInput.addEventListener("input", toggleSave);
        }
        toggleSave(); // Initial check

        // 9) Save handler
        saveBtn.onclick = () => {
            const question = frontInput ? frontInput.value.trim() : "";
            if (!isCloze && !question) return;

            const selectedDeck = box.querySelector("#manual-deck").value;
            const backInput = isCloze ? box.querySelector("#manual-back-input").value : msg.backHtml;
            
            chrome.runtime.sendMessage({
                action   : "manualSave",
                front    : question,
                backHtml : backInput,
                deckName : selectedDeck,
                modelName: msg.modelName
            });
            overlay.remove();
        };

        // 10) Enable GPT handler
        box.querySelector("#manual-enable-gpt-btn").onclick = () => {
            chrome.runtime.sendMessage({ action: "openPopup" });
            overlay.remove();
        };

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
                <button id="confirm-save" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
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
        };

        // Close on overlay click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return;
    }

    // Toast notifications
    if (!msg.status) return;

    if (!toastEl) {
        toastEl = document.createElement("div");
        Object.assign(toastEl.style, {
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
        document.body.appendChild(toastEl);
    }

    toastEl.textContent = msg.message;
    toastEl.style.background =
        msg.status === "success" ? "rgba(40,167,69,0.9)" :
            msg.status === "error" ? "rgba(220,53,69,0.9)" :
                "rgba(23,162,184,0.9)";
    toastEl.style.opacity = "1";

    if (msg.status === "success") {
        setTimeout(() => {
            toastEl.style.opacity = "0";
            setTimeout(() => {
                toastEl.remove();
                toastEl = null;
            }, 300);
        }, 1500);
    }
});