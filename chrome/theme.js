// Small theme helper for non-options pages (Chrome)
const themeToggle = document.getElementById('themeToggle');
const moonSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>';
const sunSvg = '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

// Apply stored theme on load
document.addEventListener('DOMContentLoaded', () => {
    try {
        chrome.storage.local.get('theme', (res) => {
            const theme = res.theme || 'dark';
            document.body.setAttribute('data-theme', theme);
            if (themeToggle) {
                themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'false' : 'true');
                themeToggle.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
            }
        });
    } catch (e) {
        // quietly ignore if storage isn't available
    }
});

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        try { chrome.storage.local.set({ theme: next }); } catch (e) {}
        themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'false' : 'true');
        themeToggle.innerHTML = next === 'dark' ? moonSvg : sunSvg;
    });
}
