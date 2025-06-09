export async function addToAnki(front, backHtml, deckName = "Default", modelName = "Basic", extraFieldContent = "") {
    // Cloze notes use Text / Extra instead of Front / Back
    const isCloze = /cloze/i.test(modelName);
    
    let fields;
    if (isCloze) {
        // For cloze cards, the content should be in the Text field
        fields = { 
            Text: backHtml || front || "", 
            Extra: extraFieldContent || ""
        };
    } else {
        // For basic cards, both fields are required by Anki
        fields = { 
            Front: front || "", 
            Back: backHtml || "" // backHtml should already include source information from saveToAnkiOrQueue
        };
    }

    // Validate that we have meaningful content
    const frontContent = fields.Front?.trim() || "";
    const backContent = fields.Back?.trim() || "";
    const textContent = fields.Text?.trim() || "";
    
    if (isCloze) {
        if (!textContent) {
            throw new Error("Cannot create cloze note: no content provided");
        }
    } else {
        if (!frontContent || !backContent) {
            throw new Error("Cannot create note: both front and back content required");
        }
    }

    // --- Comprehensive Debug Logging ---
    const requestBody = {
        action: "addNote",
        version: 6,
        params: {
            note: {
                deckName: deckName,
                modelName: modelName,
                fields: fields,
                tags: ["Zawrick"]
            }
        }
    };
    console.log("[addToAnki] Called with:", {
        front,
        backHtml,
        deckName,
        modelName,
        extraFieldContent,
        isCloze,
        fields,
        requestBody
    });
    // --- End Debug Logging ---

    const response = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    console.log("[addToAnki] Response from AnkiConnect:", data);
    if (data.error) throw new Error(data.error);
    return data.result;
}