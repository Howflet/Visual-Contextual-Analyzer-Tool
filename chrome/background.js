// Listener for the extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check blacklist before injecting
  chrome.storage.local.get(['blacklist'], (res) => {
    const blacklist = res.blacklist || [];
    try {
      const url = new URL(tab.url || '');
      const host = url.hostname;
      const isBlacklisted = blacklist.some(b => host === b || host.endsWith('.' + b));
      if (isBlacklisted) {
        // Show a small popup page telling the user
        chrome.tabs.create({ url: 'sensitive.html' });
        return;
      }
    } catch (e) {
      // If URL parsing fails, proceed to inject
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  });
});

// Listener for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "capture") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      // Open results page in the user's preferred target (tab or window)
      chrome.storage.local.get(['resultsTarget'], (res) => {
        const target = res.resultsTarget || 'tab';
        if (target === 'window') {
          chrome.windows.create({ url: 'results.html', type: 'popup' }, (newWindow) => {
            // Wait a bit for the new window's tab to be ready
            setTimeout(() => {
              const newTab = newWindow.tabs && newWindow.tabs[0];
              if (newTab) {
                chrome.tabs.sendMessage(newTab.id, {
                  action: "displayResults",
                  imageDataUrl: dataUrl,
                  captureBox: request.captureBox
                });
              }
            }, 1000);
          });
        } else {
          chrome.tabs.create({ url: 'results.html' }, (newTab) => {
            setTimeout(() => {
              chrome.tabs.sendMessage(newTab.id, {
                action: "displayResults",
                imageDataUrl: dataUrl,
                captureBox: request.captureBox
              });
            }, 1000); // Wait for tab to be ready
          });
        }
      });
    });
  } else if (request.action === "callGemini") {
      callGeminiAPI(request.imageDataUrl, (response) => {
          sendResponse(response);
      });
      return true; // Indicates an asynchronous response
  }
});


async function callGeminiAPI(imageDataUrl, callback) {
    chrome.storage.local.get(['apiKey'], async (result) => {
        const apiKey = result.apiKey;
        if (!apiKey) {
            callback({ error: "API key not found. Please set it in the extension options." });
            return;
        }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Remove the data URL prefix
    const base64ImageData = imageDataUrl.split(',')[1];

    // Use selected prompt if present
    chrome.storage.local.get(['selectedPrompt', 'prompts'], async (res) => {
      const selectedName = res.selectedPrompt;
      const prompts = res.prompts || [];
      const selected = prompts.find(p => p.name === selectedName);
      const promptText = selected ? selected.text : "Describe this product briefly. Provide price info and links to buy it";

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
            if (data.candidates && data.candidates.length > 0) {
                 const text = data.candidates[0].content.parts[0].text;
                 callback({ text: text });
            } else {
                 callback({ error: data.error ? data.error.message : "No content returned from API." });
            }
        } catch (error) {
            callback({ error: "Failed to fetch from Gemini API. Check console for details." });
        }
    });
    });
}