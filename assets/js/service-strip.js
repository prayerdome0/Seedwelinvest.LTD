(function () {
    'use strict';

    if (window.__seedwelServiceStripLoaded) return;
    window.__seedwelServiceStripLoaded = true;

    const services = [
        { title: 'Web Development', copy: 'Responsive websites built for speed and growth.', image: 'assets/images/seedwel-digital-craft.jpg', icon: 'code' },
        { title: 'Mobile Apps', copy: 'Useful mobile products and publishing support.', image: 'assets/images/seedwel-team-studio.jpg', icon: 'phone' },
        { title: 'Branding & Design', copy: 'Distinct identities and polished campaign creative.', image: 'assets/images/seedwel-launch-moment.jpg', icon: 'brush' },
        { title: 'Digital Marketing', copy: 'Search, content and campaigns focused on results.', image: 'assets/images/seedwel-strategy-session.jpg', icon: 'chart' },
        { title: 'Business Registration', copy: 'Practical PACRA, ZRA and compliance guidance.', image: 'assets/images/seedwel-business-advisory.jpg', icon: 'building' },
        { title: 'Customer Support', copy: 'Reliable client care and virtual assistance.', image: 'assets/images/seedwel-client-support.jpg', icon: 'headset' },
        { title: 'E-commerce', copy: 'Online stores, payments and product experiences.', image: 'assets/images/seedwel-process-poster.jpg', icon: 'cart' },
        { title: 'Business Strategy', copy: 'Clear planning for launches and sustainable growth.', image: 'assets/images/seedwel-showreel-poster.jpg', icon: 'spark' },
        { title: 'SEO & Content', copy: 'Stronger visibility with useful, search-ready content.', image: 'assets/images/seedwel-strategy-session.jpg', icon: 'search' },
        { title: 'Ongoing Maintenance', copy: 'Updates, security checks and dependable support.', image: 'assets/images/seedwel-digital-craft.jpg', icon: 'shield' }
    ];

    const icons = {
        code: '<path d="M8.7 16.6 3.1 11l5.6-5.6L7.3 4 0.3 11l7 7 1.4-1.4Zm6.6 0 1.4 1.4 7-7-7-7-1.4 1.4 5.6 5.6-5.6 5.6ZM10 21h2.1L14 1h-2.1L10 21Z"/>',
        phone: '<path d="M17 1H7a3 3 0 0 0-3 3v16a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3Zm1 17H6V5h12v13Zm-7 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"/>',
        brush: '<path d="M7.7 14.7c-1.8 0-3.2 1.4-3.2 3.2 0 .8-.5 1.5-1.3 1.8.9 1.1 2.3 1.8 3.8 1.8 2.3 0 4.2-1.6 4.7-3.7l-4-3.1ZM22.7 3.6 20.4 1.3a1 1 0 0 0-1.4 0L9.2 11.1l4.7 3.7 8.8-9.8a1 1 0 0 0 0-1.4Z"/>',
        chart: '<path d="M3 20h18v2H1V2h2v18Zm3-3H4v-5h2v5Zm5 0H8V7h3v10Zm5 0h-3V9h3v8Zm5 0h-3V4h3v13Z"/>',
        building: '<path d="M3 22V2h12v5h6v15h-2v-2h-4v2h-2V4H5v18H3Zm4-15h4V5H7v2Zm0 4h4V9H7v2Zm0 4h4v-2H7v2Zm8-4h4V9h-4v2Zm0 4h4v-2h-4v2Z"/>',
        headset: '<path d="M12 2a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h3v-8H5v-2a7 7 0 0 1 14 0v2h-4v8h3a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9Z"/>',
        cart: '<path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.3 6l.7 2h11.7l-2 5H8.3L5 4H1V2h5l.7 2H22l-4 11H7L3 4h2l1.3 2Z"/>',
        spark: '<path d="m12 1 2.2 6.8L21 10l-6.8 2.2L12 19l-2.2-6.8L3 10l6.8-2.2L12 1Zm8 14 1.1 3.4L24 19.5l-2.9 1.1L20 24l-1.1-3.4-2.9-1.1 2.9-1.1L20 15Z"/>',
        search: '<path d="M10.5 3a7.5 7.5 0 1 0 4.7 13.3l5.7 5.7 1.4-1.4-5.7-5.7A7.5 7.5 0 0 0 10.5 3Zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"/>',
        shield: '<path d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm-1.1 15.5-4-4 1.4-1.4 2.6 2.6 5.3-5.3 1.4 1.4-6.7 6.7Z"/>'
    };

    function serviceCard(service) {
        const link = document.createElement('a');
        link.className = 'seedwel-service-marquee__card';
        link.href = 'services.html';
        link.setAttribute('aria-label', service.title + ' — view service');

        const image = document.createElement('img');
        image.src = service.image;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';

        const copy = document.createElement('span');
        copy.className = 'seedwel-service-marquee__copy';
        copy.innerHTML = '<span class="seedwel-service-marquee__icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + icons[service.icon] + '</svg></span><strong></strong><span></span>';
        copy.querySelector('strong').textContent = service.title;
        copy.querySelector('span:last-child').textContent = service.copy;
        link.append(image, copy);
        return link;
    }

    function buildGroup(duplicate) {
        const group = document.createElement('div');
        group.className = 'seedwel-service-marquee__group';
        if (duplicate) group.setAttribute('aria-hidden', 'true');
        services.forEach(function (service) {
            const card = serviceCard(service);
            if (duplicate) card.tabIndex = -1;
            group.appendChild(card);
        });
        return group;
    }

    function mount() {
        if (document.querySelector('.seedwel-service-marquee')) return;

        if (!document.querySelector('link[data-seedwel-service-strip]')) {
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = 'assets/css/service-strip.css';
            style.dataset.seedwelServiceStrip = 'true';
            document.head.appendChild(style);
        }

        const section = document.createElement('section');
        section.className = 'seedwel-service-marquee';
        section.setAttribute('aria-labelledby', 'seedwelServiceMarqueeTitle');
        section.innerHTML = '<div class="seedwel-service-marquee__head"><div><p class="seedwel-service-marquee__eyebrow">Explore what we do</p><h2 id="seedwelServiceMarqueeTitle">Services brought to life.</h2></div><p class="seedwel-service-marquee__intro">From an early idea to launch and ongoing support, our specialists bring strategy, technology and client care together.</p><a class="seedwel-service-marquee__action" href="services.html">View every service <span aria-hidden="true">→</span></a></div><div class="seedwel-service-marquee__viewport"><div class="seedwel-service-marquee__track"></div></div>';
        const track = section.querySelector('.seedwel-service-marquee__track');
        track.append(buildGroup(false), buildGroup(true));

        const footer = document.querySelector('footer');
        if (footer) footer.parentNode.insertBefore(section, footer);
        else document.body.appendChild(section);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
})();
