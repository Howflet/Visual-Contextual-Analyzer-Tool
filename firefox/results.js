browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "displayResults") {
        const { imageDataUrl, captureBox } = request;
        const canvas = document.getElementById('imageCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Adjust coordinates for device pixel ratio
            const dpr = captureBox.devicePixelRatio;
            const cropX = captureBox.x * dpr;
            const cropY = captureBox.y * dpr;
            const cropWidth = captureBox.width * dpr;
            const cropHeight = captureBox.height * dpr;

            // Set canvas size to the cropped image size
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // Draw the cropped portion of the screenshot onto the canvas
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            // Get the cropped image data from canvas to send to Gemini
            const croppedImageDataUrl = canvas.toDataURL('image/png');

            // Call background script to make the API call
            browser.runtime.sendMessage({ action: "callGemini", imageDataUrl: croppedImageDataUrl }, (response) => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                
                const analysisEl = document.getElementById('analysisText');
                if (response.error) {
                    analysisEl.innerText = `Error: ${response.error}`;
                } else {
                    analysisEl.innerHTML = '';
                    analysisEl.appendChild(linkify(response.text));
                }
            });
        };
        img.src = imageDataUrl;
    }
});

// Convert plain text URLs into clickable link elements in a safe way
function linkify(text) {
    const urlRegex = /((https?:\/\/|www\.)[\w\-@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[\w\-@:%_\+.~#?&//=;]*))/gi;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        const idx = match.index;
        if (idx > lastIndex) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
        }
        let url = match[0];
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        const a = document.createElement('a');
        a.href = url;
        a.textContent = match[0];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        frag.appendChild(a);
        lastIndex = urlRegex.lastIndex;
    }
    if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    return frag;
}

// Open extension options from results page
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('openSettings');
    if (btn) {
        btn.addEventListener('click', () => {
            if (browser.runtime.openOptionsPage) {
                browser.runtime.openOptionsPage();
            } else {
                browser.tabs.create({ url: 'options.html' });
            }
        });
    }
});