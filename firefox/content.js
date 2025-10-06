(function() {
    // Check if the script is already running
    if (document.body.classList.contains('gemini-vision-active')) {
        return;
    }
    document.body.classList.add('gemini-vision-active');

    // --- Create UI Elements ---
    const CROSSHAIR_COLOR = '#2519d1'; // custom crosshair color
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.cursor = 'none';
    overlay.style.zIndex = '2147483647';
    document.body.appendChild(overlay);

    // Crosshair element
    const crosshair = document.createElement('div');
    crosshair.style.position = 'fixed';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '2147483648';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '24px';
    crosshair.style.height = '24px';
    crosshair.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="0" x2="12" y2="9" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="12" y1="15" x2="12" y2="24" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="0" y1="12" x2="9" y2="12" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="15" y1="12" x2="24" y2="12" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="${CROSSHAIR_COLOR}"/></svg>`;
    document.body.appendChild(crosshair);

    let selectionBox = document.createElement('div');
    selectionBox.style.position = 'fixed';
    selectionBox.style.border = '2px dashed #fff';
    selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    selectionBox.style.zIndex = '2147483647';
    
    let startX, startY;
    let isSelecting = false;

    // --- Event Handlers ---
    
    function handleMouseDown(e) {
        // Stop YouTube or other sites from interfering
        e.stopImmediatePropagation();
        e.preventDefault();

        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        document.body.appendChild(selectionBox);
    }

    function handleMouseMove(e) {
        // update crosshair position always
        crosshair.style.left = e.clientX + 'px';
        crosshair.style.top = e.clientY + 'px';
        if (!isSelecting) return;
        e.stopImmediatePropagation();
        e.preventDefault();

        let currentX = e.clientX;
        let currentY = e.clientY;

        let width = Math.abs(currentX - startX);
        let height = Math.abs(currentY - startY);
        let newLeft = (currentX < startX) ? currentX : startX;
        let newTop = (currentY < startY) ? currentY : startY;

        selectionBox.style.left = newLeft + 'px';
        selectionBox.style.top = newTop + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
    }

    function handleMouseUp(e) {
        if (!isSelecting) return;
        isSelecting = false;
        
        e.stopImmediatePropagation();
        e.preventDefault();

        const rect = selectionBox.getBoundingClientRect();
        
        // Only trigger capture if the box has a meaningful size
        if (rect.width > 5 && rect.height > 5) {
            const message = { 
                action: "capture",
                captureBox: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            };
            
            if (typeof browser !== "undefined") {
                browser.runtime.sendMessage(message);
            } else {
                chrome.runtime.sendMessage(message);
            }
        }
        cleanup();
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }

    function cleanup() {
        // Remove all event listeners during the capture phase
        window.removeEventListener('mousedown', handleMouseDown, true);
        window.removeEventListener('mousemove', handleMouseMove, true);
        window.removeEventListener('mouseup', handleMouseUp, true);
        document.removeEventListener('keydown', handleKeyDown, true);

        // Remove UI elements
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        if (crosshair.parentNode) {
            crosshair.parentNode.removeChild(crosshair);
        }
        if (selectionBox.parentNode) {
            selectionBox.parentNode.removeChild(selectionBox);
        }
        document.body.classList.remove('gemini-vision-active');
    }

    // --- Attach Event Listeners ---
    // The 'true' argument tells the browser to listen during the CAPTURE phase,
    // which happens before the BUBBLE phase that YouTube is blocking.
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('keydown', handleKeyDown, true);
})();