/**
 * Preloader Logic
 * Ensures the preloader shows on first load and handles the fade-out.
 */

(function () {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    // Optional: Only show once per session
    const hasLoaded = sessionStorage.getItem('preloader_shown');

    // If you want it to play every time, comment out the if block below
    if (hasLoaded) {
        preloader.style.display = 'none';
        document.body.classList.remove('loading');
        return;
    }

    // Minimum time to show the animation (1.8s)
    const minTime = 1800;
    const startTime = Date.now();

    let isHiding = false;
    function hidePreloader() {
        if (isHiding) return;
        isHiding = true;

        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const delay = Math.max(0, minTime - elapsedTime);

        setTimeout(() => {
            preloader.classList.add('fade-out');
            document.body.classList.remove('loading');

            // Mark as shown in this session
            sessionStorage.setItem('preloader_shown', 'true');

            // Remove from DOM after transition
            setTimeout(() => {
                preloader.remove();
            }, 800); // Matches CSS transition duration
        }, delay);
    }

    // Hide preloader when window is fully loaded
    window.addEventListener('load', hidePreloader);

    // Also listen for dynamic component loading completion
    document.addEventListener('pageComponentsLoaded', hidePreloader);

    // Fallback in case loading takes too long (e.g., 6 seconds)
    setTimeout(hidePreloader, 6000);
})();
