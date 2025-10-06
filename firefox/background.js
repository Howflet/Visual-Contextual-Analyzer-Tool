/**
 * Cross-browser background script for VCA Tool.
 * Uses the browser.* namespace and async/await via the webextension-polyfill.
 */

// Listener for the extension icon click.
browser.action.onClicked.addListener(async (tab) => {
  try {
    // Check blacklist before injecting
    const res = await browser.storage.local.get('blacklist');
    const blacklist = res.blacklist || [];
    try {
      const url = new URL(tab.url || '');
      const host = url.hostname;
      const isBlacklisted = blacklist.some(b => host === b || host.endsWith('.' + b));
      if (isBlacklisted) {
        await browser.tabs.create({ url: browser.runtime.getURL('sensitive.html') });
        return;
      }
    } catch (e) {
      // proceed if parsing fails
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    console.error(`Failed to execute content script: ${err}`);
  }
});

// Main message listener.
browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.action === "capture") {
    const dataUrl = await browser.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" });
    const res = await browser.storage.local.get('resultsTarget');
    const target = res.resultsTarget || 'tab';
    if (target === 'window') {
      const newWindow = await browser.windows.create({ url: 'results.html', type: 'popup' });
      // Wait for the tab to be ready then send message
      setTimeout(() => {
        const newTab = newWindow.tabs && newWindow.tabs[0];
        if (newTab) {
          browser.tabs.sendMessage(newTab.id, {
            action: "displayResults",
            imageDataUrl: dataUrl,
            captureBox: request.captureBox
          });
        }
      }, 1000);
    } else {
      const newTab = await browser.tabs.create({ url: 'results.html' });
      setTimeout(() => {
        browser.tabs.sendMessage(newTab.id, {
          action: "displayResults",
          imageDataUrl: dataUrl,
          captureBox: request.captureBox
        });
      }, 1000);
    }

  } else if (request.action === "callGemini") {
    return await callGeminiAPI(request.imageDataUrl);
  }
});

/**
 * Calls the Google Gemini API. Now returns a Promise.
 * @param {string} imageDataUrl - The base64 encoded image data URL.
 * @returns {Promise<object>} A promise that resolves with the API response.
 */
async function callGeminiAPI(imageDataUrl) {
  const apiRes = await browser.storage.local.get('apiKey');
  const apiKey = apiRes.apiKey;
  if (!apiKey) return { error: "API key not found. Please set it in the extension options." };

  const base64ImageData = imageDataUrl.split(',')[1];

  // Get selected prompt if any
  const res = await browser.storage.local.get(['selectedPrompt', 'prompts']);
  const selectedName = res.selectedPrompt;
  const prompts = res.prompts || [];
  const selected = prompts.find(p => p.name === selectedName);
  const promptText = selected ? selected.text : "Describe this product briefly. Provide price info and links to buy it";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    "contents": [{
      "parts": [
        { "text": promptText },
        { "inline_data": { "mime_type": "image/png", "data": base64ImageData } }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts) {
      return { text: data.candidates[0].content.parts[0].text };
    } else {
      const errorMessage = data.error?.message || "No content returned from API. May be a safety block.";
      return { error: errorMessage };
    }
  } catch (error) {
    console.error("Gemini API fetch error:", error);
    return { error: "Failed to fetch from the Gemini API. See the background console for details." };
  }
}