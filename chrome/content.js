(function() {
    // Avoid injecting twice
    if (document.getElementById('vca-overlay')) return;

    // Customizable crosshair color (any valid CSS color)
    const CROSSHAIR_COLOR = '#2519d1'; // custom color

    const overlay = document.createElement('div');
    overlay.id = 'vca-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.cursor = 'none'; // hide native cursor so crosshair is visible
    overlay.style.zIndex = '999999';
    document.body.appendChild(overlay);

    // Create crosshair element
    const crosshair = document.createElement('div');
    crosshair.id = 'vca-crosshair';
    crosshair.style.position = 'fixed';
    crosshair.style.left = '50%';
    crosshair.style.top = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '1000001';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '24px';
    crosshair.style.height = '24px';
    crosshair.style.background = 'transparent';
    crosshair.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="0" x2="12" y2="9" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="12" y1="15" x2="12" y2="24" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="0" y1="12" x2="9" y2="12" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><line x1="15" y1="12" x2="24" y2="12" stroke="${CROSSHAIR_COLOR}" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="${CROSSHAIR_COLOR}"/></svg>`;
    document.body.appendChild(crosshair);

    let startX, startY, selectionBox;

    function updateCrosshairPosition(clientX, clientY) {
        if (!crosshair) return;
        crosshair.style.left = clientX + 'px';
        crosshair.style.top = clientY + 'px';
    }

    overlay.onmousedown = (e) => {
        startX = e.clientX;
        startY = e.clientY;
        selectionBox = document.createElement('div');
        selectionBox.style.position = 'fixed';
        selectionBox.style.border = '2px dashed #fff';
        selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.zIndex = '1000000';
        document.body.appendChild(selectionBox);

        overlay.onmousemove = (e) => {
            // update crosshair
            updateCrosshairPosition(e.clientX, e.clientY);

            let width = Math.abs(e.clientX - startX);
            let height = Math.abs(e.clientY - startY);
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            selectionBox.style.left = (e.clientX < startX ? e.clientX : startX) + 'px';
            selectionBox.style.top = (e.clientY < startY ? e.clientY : startY) + 'px';
        };

        overlay.onmouseup = (e) => {
            overlay.onmousemove = null;
            overlay.onmouseup = null;

            const rect = selectionBox.getBoundingClientRect();
            
            // Send coordinates to background to capture and process
            chrome.runtime.sendMessage({ 
                action: "capture",
                captureBox: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            });

            if (selectionBox && selectionBox.parentNode) document.body.removeChild(selectionBox);
            if (overlay && overlay.parentNode) document.body.removeChild(overlay);
            if (crosshair && crosshair.parentNode) document.body.removeChild(crosshair);
            window.removeEventListener('mousemove', pointerMoveListener, true);
        };
    };

    // Keep crosshair following pointer even when not selecting
    function pointerMoveListener(evt) {
        updateCrosshairPosition(evt.clientX, evt.clientY);
    }
    window.addEventListener('mousemove', pointerMoveListener, true);

    // Allow user to cancel by pressing Escape
    document.onkeydown = (e) => {
        if (e.key === 'Escape') {
            if (selectionBox && selectionBox.parentNode) document.body.removeChild(selectionBox);
            if (overlay && overlay.parentNode) document.body.removeChild(overlay);
            if (crosshair && crosshair.parentNode) document.body.removeChild(crosshair);
            document.onkeydown = null;
            window.removeEventListener('mousemove', pointerMoveListener, true);
        }
    };
})();