// Shim: event.html references `js/event-detail.js` but the original file is `js/event-detai.js`.
// Do not change HTML; load the existing implementation.
(function () {
    const existing = document.querySelector('script[data-event-detail-shim="1"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'js/event-detai.js';
    script.addEventListener('load', () => {
        console.log('✅ Loaded js/event-detai.js via shim');
        try {
            if (typeof window.__loadEventDetails === 'function') {
                window.__loadEventDetails();
            }
        } catch (e) {
            console.error('❌ Error starting event details load:', e);
            alert(`Failed to start event loading: ${e?.message || e}`);
        }
    });
    script.addEventListener('error', () => {
        console.error('❌ Failed to load js/event-detai.js (check file name/path)');
        alert('Failed to load registration script (js/event-detai.js). Check console for details.');
    });
    script.setAttribute('data-event-detail-shim', '1');
    document.head.appendChild(script);

    // If nothing runs, fail fast with a helpful message
    setTimeout(() => {
        if (!window.__eventDetailLoaded) {
            alert('Registration script did not run. Check console + Network for missing `js/event-detail.js` / `js/event-detai.js`.');
        }
    }, 1500);
})();
