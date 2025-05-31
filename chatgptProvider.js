// chatgptProvider.js

// -----------------------------------------------------------------------------
//  Single‑call generator
// -----------------------------------------------------------------------------

// Simplified generateFrontWithRetry - now expects pre-resolved template
export async function generateFrontWithRetry(text, settings) {
  console.log("generateFrontWithRetry now using pre-resolved template:", settings._resolvedTemplateString);
  
  if (!settings._resolvedTemplateString || typeof settings._resolvedTemplateString !== 'string') {
    throw new Error("No valid template string provided to generateFrontWithRetry.");
  }

  return generateFront(
    text,
    settings.pageTitle,
    settings.pageUrl,
    settings.openaiKey,
    settings.gptModel,
    settings._resolvedTemplateString
  );
}

// Update generateFront to robustly log and handle non-JSON responses
async function generateFront(text, pageTitle, pageUrl, openaiKey, gptModel, template) {
  if (!openaiKey || !openaiKey.trim() || !openaiKey.startsWith('sk-')) {
    throw new Error(
      "Valid OpenAI API key required – please enter your key in the options."
    );
  }

  // Populate the template with actual values
  const populatedPrompt = template
    .replace(/{{text}}/g, text)
    .replace(/{{title}}/g, pageTitle)
    .replace(/{{url}}/g, pageUrl);

  console.log("Populated prompt:", populatedPrompt);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: gptModel || "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are an expert Anki flash-card creator. Your task is to generate a clear and concise question for the front of a flashcard based on the provided text. Output ONLY the question text." 
        },
        // The populated template becomes the user's actual prompt content
        { role: "user", content: populatedPrompt },
      ],
      temperature: 0.7,
      max_tokens: 64,
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error('[chatgptProvider][generateFront] OpenAI API Error. Status:', res.status, 'Response Text (first 500 chars):', responseText.substring(0, 500));
    throw new Error(`OpenAI API Error (${res.status}): ${responseText.substring(0, 200)}...`);
  }

  try {
    const data = JSON.parse(responseText);
    console.log("[chatgptProvider][generateFront] OpenAI response data:", data);
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('[chatgptProvider][generateFront] OpenAI response JSON is missing expected structure. Data:', data, 'Original text:', responseText.substring(0, 500));
      throw new Error('OpenAI response JSON structure is invalid.');
    }
    return data.choices[0].message.content.trim();
  } catch (jsonParseError) {
    console.error('[chatgptProvider][generateFront] Failed to parse OpenAI response as JSON. Error:', jsonParseError);
    console.error('[chatgptProvider][generateFront] Original non-JSON response text from OpenAI (first 500 chars):', responseText.substring(0, 500));
    throw new Error('OpenAI returned a non-JSON response. Check background console for original text. Parse Error: ' + jsonParseError.message);
  }
}

// -----------------------------------------------------------------------------
//  Helper with retry (exponential back‑off)
// -----------------------------------------------------------------------------

// Named export for legacy imports
export { generateFront };

// ─────────────────────────────────────────────────────────────────────────────
//  CLOZE generator (wrap {{c1:: …}} {{c2:: …}} …) – re-uses the same    
//  retry/back-off helpers so it mirrors the generateFront* API.            
// ─────────────────────────────────────────────────────────────────────────────

async function generateCloze(
    text,
    guidance = "",
    pageTitle = "",
    pageUrl = "",
    openaiKey,
    gptModel
) {
    if (!openaiKey || !openaiKey.trim()) {
        throw new Error("OpenAI API key not found. Please configure it in settings.");
    }
    const effectiveGptModel = gptModel || "gpt-3.5-turbo";

    const system = [
      "You are an expert Anki CLOZE creator.",
      guidance ? `User guidance: ${guidance}` : "",
      "Return the **plain text** with one or more cloze deletions wrapped as {{cN::…}}. No HTML tags, no markdown, and no extra commentary.",
      "Example → 'Acetylcholine acts on {{c1::muscarinic}} and {{c2::nicotinic}} receptors.'"
    ].filter(Boolean).join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method : "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body   : JSON.stringify({
        model     : effectiveGptModel,
        temperature: 0.4,
        max_tokens : 512,
        messages  : [
          { role: "system", content: system },
          { role: "user",   content: `Insert clozes into this text taken from \"${pageTitle}\" (${pageUrl}):\n\n${text}` }
        ]
      })
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error('[chatgptProvider][generateCloze] OpenAI API Error. Status:', res.status, 'Response Text (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`OpenAI API Error (${res.status}): ${responseText.substring(0, 200)}...`);
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[chatgptProvider][generateCloze] OpenAI response data:", data);
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error('[chatgptProvider][generateCloze] OpenAI response JSON is missing expected structure. Data:', data, 'Original text:', responseText.substring(0, 500));
        throw new Error('OpenAI response JSON structure is invalid.');
      }
      return data.choices[0].message.content.trim();
    } catch (jsonParseError) {
      console.error('[chatgptProvider][generateCloze] Failed to parse OpenAI response as JSON. Error:', jsonParseError);
      console.error('[chatgptProvider][generateCloze] Original non-JSON response text from OpenAI (first 500 chars):', responseText.substring(0, 500));
      throw new Error('OpenAI returned a non-JSON response. Check background console for original text. Parse Error: ' + jsonParseError.message);
    }
}

// Update generateClozeWithRetry to pass openaiKey and gptModel
export async function generateClozeWithRetry(
    text,
    guidance = "",
    pageTitle = "",
    pageUrl = "",
    openaiKey,
    gptModel,
    retries = 3
) {
  let attempt = 0;
  while (true) {
    try {
      return await generateCloze(text, guidance, pageTitle, pageUrl, openaiKey, gptModel);
    }
    catch (err) {
      attempt += 1;
      const transient = err instanceof TypeError || err.message?.includes("timeout");
      if (attempt >= retries || !transient) throw err;
      await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
  }
}

// keep legacy default export list tidy
export { generateCloze };
