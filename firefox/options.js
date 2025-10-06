const saveButton = document.getElementById('save');
const apiKeyInput = document.getElementById('apiKey');
const statusDiv = document.getElementById('status');
const blacklistInput = document.getElementById('blacklistInput');
const addBlacklistBtn = document.getElementById('addBlacklist');
const blacklistList = document.getElementById('blacklistList');

const promptNameInput = document.getElementById('promptName');
const promptTextInput = document.getElementById('promptText');
const savePromptBtn = document.getElementById('savePrompt');
const savedPromptsSelect = document.getElementById('savedPrompts');
const deletePromptBtn = document.getElementById('deletePrompt');
const setDefaultPromptBtn = document.getElementById('setDefaultPrompt');
const cancelEditBtn = document.getElementById('cancelEdit');
const resultsTargetSelect = document.getElementById('resultsTarget');
const themeToggle = document.getElementById('themeToggle');

// SVG icons for crisp toggle visuals (top-level so handlers can access them)
const moonSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>';
const sunSvg = '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

// Load the saved key when the page opens
document.addEventListener('DOMContentLoaded', () => {
    browser.storage.local.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });
    // Load blacklist and prompts
    browser.storage.local.get(['blacklist', 'prompts', 'selectedPrompt']).then((res) => {
        const blacklist = res.blacklist || [];
        const prompts = res.prompts || [];
        const selected = res.selectedPrompt || '';
        const resultsTarget = res.resultsTarget || 'tab';
        if (resultsTargetSelect) resultsTargetSelect.value = resultsTarget;
        renderBlacklist(blacklist);
        renderPrompts(prompts, selected);
    });
});

// Save the key
saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        browser.storage.local.set({ apiKey: apiKey }, () => {
            statusDiv.textContent = 'API key saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
        });
    } else {
        statusDiv.textContent = 'Please enter a valid API key.';
    }
});

// --- Blacklist management ---
function renderBlacklist(list) {
    blacklistList.innerHTML = '';
    list.forEach((host, idx) => {
        const li = document.createElement('li');
        li.className = 'blacklist-item';
        const span = document.createElement('span');
        span.className = 'host-name';
        span.textContent = host;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', async () => {
            list.splice(idx, 1);
            await browser.storage.local.set({ blacklist: list });
            renderBlacklist(list);
        });
        li.appendChild(span);
        li.appendChild(removeBtn);
        blacklistList.appendChild(li);
    });
}

addBlacklistBtn.addEventListener('click', async () => {
    const host = (blacklistInput.value || '').trim();
    if (!host) return;
    const res = await browser.storage.local.get('blacklist');
    const list = res.blacklist || [];
    if (!list.includes(host)) {
        list.push(host);
        await browser.storage.local.set({ blacklist: list });
        renderBlacklist(list);
        blacklistInput.value = '';
    }
});

// --- Prompts management ---
let editingPromptName = '';

function renderPrompts(prompts, selected) {
    savedPromptsSelect.innerHTML = '';
    prompts.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name + (p.name === selected ? ' (default)' : '');
        savedPromptsSelect.appendChild(opt);
    });
    // If we were editing a prompt that got removed, clear edit state
    if (editingPromptName && !prompts.find(x => x.name === editingPromptName)) {
        clearEditState();
    }
}

savePromptBtn.addEventListener('click', async () => {
    const name = (promptNameInput.value || '').trim();
    const text = (promptTextInput.value || '').trim();
    if (!name || !text) {
        statusDiv.textContent = 'Please provide both a name and prompt text.';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
        return;
    }
    // Load existing prompts to allow rename/update logic
    const res = await browser.storage.local.get('prompts');
    const prompts = res.prompts || [];
    // If editing, replace the original entry; handle rename collisions
    if (editingPromptName) {
        // If name changed to an existing prompt (that's not the one we're editing), block
        if (name !== editingPromptName && prompts.find(p => p.name === name)) {
            statusDiv.textContent = 'A prompt with that name already exists.';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
            return;
        }
        const idx = prompts.findIndex(p => p.name === editingPromptName);
        if (idx >= 0) {
            prompts[idx] = { name, text };
        } else {
            // fallback: push if original missing
            prompts.push({ name, text });
        }
        editingPromptName = '';
    } else {
        // Not editing: ensure no duplicate names
        if (prompts.find(p => p.name === name)) {
            statusDiv.textContent = 'A prompt with that name already exists.';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
            return;
        }
        prompts.push({ name, text });
    }

    await browser.storage.local.set({ prompts });
    renderPrompts(prompts, '');
    clearEditState();
    statusDiv.textContent = 'Prompt saved.';
    setTimeout(() => { statusDiv.textContent = ''; }, 1500);
});

deletePromptBtn.addEventListener('click', async () => {
    const name = savedPromptsSelect.value;
    if (!name) return;
    const res = await browser.storage.local.get(['prompts', 'selectedPrompt']);
    const prompts = res.prompts || [];
    const filtered = prompts.filter(p => p.name !== name);
    const selected = res.selectedPrompt === name ? '' : res.selectedPrompt;
    await browser.storage.local.set({ prompts: filtered, selectedPrompt: selected });
    renderPrompts(filtered, selected);
});

setDefaultPromptBtn.addEventListener('click', async () => {
    const name = savedPromptsSelect.value;
    if (!name) return;
    await browser.storage.local.set({ selectedPrompt: name });
    const res = await browser.storage.local.get('prompts');
    renderPrompts(res.prompts || [], name);
});

savedPromptsSelect.addEventListener('change', async () => {
    const name = savedPromptsSelect.value;
    if (!name) return;
    const res = await browser.storage.local.get('prompts');
    const p = (res.prompts || []).find(x => x.name === name);
    if (p) {
        // Enter edit mode for this prompt
        promptNameInput.value = p.name;
        promptTextInput.value = p.text;
        editingPromptName = p.name;
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
        savePromptBtn.textContent = 'Update Prompt';
    }
});

cancelEditBtn && cancelEditBtn.addEventListener('click', () => {
    clearEditState();
});

function clearEditState() {
    editingPromptName = '';
    promptNameInput.value = '';
    promptTextInput.value = '';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    savePromptBtn.textContent = 'Save Prompt';
}

// Save results target preference
if (resultsTargetSelect) {
    resultsTargetSelect.addEventListener('change', async () => {
        const val = resultsTargetSelect.value;
        await browser.storage.local.set({ resultsTarget: val });
    });
}

// Initialize collapsible instructions accessibility
document.addEventListener('DOMContentLoaded', () => {
    const details = document.getElementById('apiKeyInstructions');
    if (!details) return;
    details.setAttribute('aria-expanded', details.open ? 'true' : 'false');
    details.addEventListener('toggle', () => {
        details.setAttribute('aria-expanded', details.open ? 'true' : 'false');
    });
    // Load and apply theme
    browser.storage.local.get('theme').then(res => {
        const theme = res.theme || 'dark';
        document.body.setAttribute('data-theme', theme);
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'false' : 'true');
            themeToggle.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
        }
    });
});

// (themeSelect removed) no-op placeholder removed to avoid ReferenceError

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        browser.storage.local.set({ theme: next });
    themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'false' : 'true');
    themeToggle.innerHTML = next === 'dark' ? moonSvg : sunSvg;
    });
}