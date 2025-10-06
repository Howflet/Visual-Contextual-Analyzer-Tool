VCA Tool
========

VCA (Visual Contextual Analyzer) Tool is a browser extension for Chrome and Firefox that captures a region of a webpage and sends it to a Google Gemini vision model for analysis.


Features
--------
- Capture a selectable region of the page and send the image to a generative model.
- Save your API key in the extension options.
- Manage a blacklist of sites considered sensitive — clicking the extension on a blacklisted host opens a "Sensitive Page Detected" notice instead of capturing.
- Create, name, and save custom prompts. Set a default prompt that will be used when sending images for analysis.

Install (Developer / Unpacked)
-----------------------------
Chrome
1. Open chrome://extensions/
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `chrome/` folder from this repo.

Firefox
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on..." and select the `firefox/manifest.json` file.

Usage
-----
1. Open the extension options (via the browser extension menu) and set your API key.
2. (Optional) Add hostnames to the Blacklisted Sites list to prevent captures on sensitive domains.
3. (Optional) Create and save custom prompts; click "Set Default" to choose which prompt the extension will use by default.
4. Click the extension icon on a page. If the site is allowed, you'll be able to draw a selection box to capture. If the site is blacklisted, a notice will be shown.

Storage keys
------------
The extension stores data in browser local storage with these keys:
- `apiKey` — string
- `blacklist` — array of host strings (e.g., `example.com`)
- `prompts` — array of objects `{ name: string, text: string }`
- `selectedPrompt` — string (name of the default prompt)

Developer notes
---------------
- Chrome manifest: `chrome/manifest.json` (manifest v3)
- Firefox manifest: `firefox/manifest.json` (manifest v3 with webextension polyfill)
- Main scripts:
  - Background: `chrome/background.js`, `firefox/background.js`
  - Content: `chrome/content.js`, `firefox/content.js`
  - Options UI: `chrome/options.html/js`, `firefox/options.html/js`
  - Results UI: `chrome/results.html/js`, `firefox/results.html/js`

Notes & Next steps
------------------
- If you rename storage keys or change data formats, consider adding a migration routine in the background to preserve user data.
- The current blacklist matching is hostname-based with simple suffix matching (sub.example.com matches example.com).

Contact
-------

For further changes, tell me what you'd like updated next (README tweaks, packaging, automated tests, or data migration).
