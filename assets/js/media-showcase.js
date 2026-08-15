(() => {
    'use strict';

    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    root.classList.add('seedwel-media-enhanced');

    const revealItems = [...document.querySelectorAll('.seedwel-media-reveal')];
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
    } else {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.13, rootMargin: '0px 0px -35px' });
        revealItems.forEach((item) => revealObserver.observe(item));
    }

    const videos = [...document.querySelectorAll('[data-seedwel-video]')];

    function setControlState(video) {
        const shell = video.closest('.seedwel-video-shell');
        const button = shell && shell.querySelector('[data-video-toggle]');
        if (!button) return;
        const paused = video.paused;
        const icon = button.querySelector('i');
        const label = button.querySelector('span');
        if (icon) icon.className = paused ? 'fas fa-play' : 'fas fa-pause';
        if (label) label.textContent = paused ? 'Play film' : 'Pause film';
        button.setAttribute('aria-label', paused ? 'Play company film' : 'Pause company film');
    }

    videos.forEach((video) => {
        video.muted = true;
        video.dataset.userPaused = reducedMotion.matches ? 'true' : 'false';
        if (reducedMotion.matches) video.pause();

        const shell = video.closest('.seedwel-video-shell');
        const button = shell && shell.querySelector('[data-video-toggle]');
        if (button) {
            button.addEventListener('click', () => {
                if (video.paused) {
                    video.dataset.userPaused = 'false';
                    video.play().catch(() => setControlState(video));
                } else {
                    video.dataset.userPaused = 'true';
                    video.pause();
                }
            });
        }

        video.addEventListener('play', () => setControlState(video));
        video.addEventListener('pause', () => setControlState(video));
        video.addEventListener('ended', () => setControlState(video));
        setControlState(video);
    });

    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
                    if (!reducedMotion.matches && video.dataset.userPaused !== 'true' && !document.hidden) {
                        video.play().catch(() => setControlState(video));
                    }
                } else if (!video.paused) {
                    video.pause();
                }
            });
        }, { threshold: [0, 0.25, 0.6] });
        videos.forEach((video) => videoObserver.observe(video));
    }

    document.addEventListener('visibilitychange', () => {
        videos.forEach((video) => {
            if (document.hidden) {
                if (!video.paused) video.pause();
                return;
            }
            const rect = video.getBoundingClientRect();
            const visible = rect.bottom > 0 && rect.top < window.innerHeight;
            if (visible && !reducedMotion.matches && video.dataset.userPaused !== 'true') {
                video.play().catch(() => setControlState(video));
            }
        });
    });

    reducedMotion.addEventListener?.('change', (event) => {
        videos.forEach((video) => {
            if (event.matches) {
                video.dataset.userPaused = 'true';
                video.pause();
            }
        });
    });
})();
