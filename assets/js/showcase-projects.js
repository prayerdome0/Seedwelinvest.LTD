(function (global) {
    'use strict';

    var realProjects = [
        {
            projectId: 'proj-song-producer',
            name: 'Song Producer',
            slug: 'song-producer',
            type: 'website',
            liveUrl: 'https://song-producer.vercel.app/',
            category: 'Entertainment & Music',
            client: 'Audio Production Platform',
            description: 'A dynamic web platform for music producers and audio engineers to showcase beats, studio services, discography, and client bookings.',
            technologies: 'React, Next.js, Vercel, Audio API',
            image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Delivered an interactive beat showcase & booking workflow.',
            published: true,
            featured: true,
            order: 1,
            createdAt: 1787702400000,
            updatedAt: 1787702400000
        },
        {
            projectId: 'proj-saloon',
            name: 'Saloon',
            slug: 'saloon',
            type: 'website',
            liveUrl: 'https://saloon-fawn-pi.vercel.app/',
            category: 'Beauty & Wellness',
            client: 'Beauty Salon & Spa',
            description: 'Modern beauty salon and spa website featuring online appointment scheduling, service pricing menus, stylist portfolios, and customer reviews.',
            technologies: 'HTML5, CSS3, JavaScript, Responsive UI',
            image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Streamlined online bookings and appointment leads.',
            published: true,
            featured: true,
            order: 2,
            createdAt: 1787702399000,
            updatedAt: 1787702399000
        },
        {
            projectId: 'proj-logistics',
            name: 'Logistics',
            slug: 'logistics',
            type: 'website',
            liveUrl: 'https://logistics-two-mu.vercel.app/',
            category: 'Logistics & Transport',
            client: 'Freight & Express Cargo',
            description: 'Comprehensive transport and freight logistics portal with shipment tracking, rate calculator, fleet management showcase, and booking inquiries.',
            technologies: 'Next.js, Tailwind CSS, Vercel',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Automated quote inquiries and cargo tracking portal.',
            published: true,
            featured: true,
            order: 3,
            createdAt: 1787702398000,
            updatedAt: 1787702398000
        },
        {
            projectId: 'proj-real-estate',
            name: 'Real Estate',
            slug: 'real-estate',
            type: 'website',
            liveUrl: 'https://realestate-mu-ashen.vercel.app/',
            category: 'Real Estate',
            client: 'Property Agency',
            description: 'Feature-packed real estate web application featuring property search filters, interactive location maps, virtual tours, and agent contact flows.',
            technologies: 'React, JavaScript, CSS3, Vercel',
            image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'High conversion rate on property inquiry forms.',
            published: true,
            featured: true,
            order: 4,
            createdAt: 1787702397000,
            updatedAt: 1787702397000
        },
        {
            projectId: 'proj-auto-repair',
            name: 'Auto Repair',
            slug: 'auto-repair',
            type: 'website',
            liveUrl: 'https://autorepair-hazel.vercel.app/',
            category: 'Automotive',
            client: 'Auto Care Garage',
            description: 'Automotive repair and maintenance garage website with online service booking, emergency roadside request forms, and detailed service catalogs.',
            technologies: 'HTML5, CSS3, JavaScript, Web Forms',
            image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Increased direct workshop service bookings.',
            published: true,
            featured: false,
            order: 5,
            createdAt: 1787702396000,
            updatedAt: 1787702396000
        },
        {
            projectId: 'proj-drugstore',
            name: 'Drugstore',
            slug: 'drugstore',
            type: 'website',
            liveUrl: 'https://drugstore-sage.vercel.app/',
            category: 'Healthcare & Pharmacy',
            client: 'Pharmacy & Wellness',
            description: 'Online pharmacy and drugstore web application with prescription uploads, over-the-counter medicine catalog, and consultation booking.',
            technologies: 'React, Next.js, CSS Modules',
            image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Secure digital storefront for healthcare products.',
            published: true,
            featured: false,
            order: 6,
            createdAt: 1787702395000,
            updatedAt: 1787702395000
        },
        {
            projectId: 'proj-hotel',
            name: 'Hotel',
            slug: 'hotel',
            type: 'website',
            liveUrl: 'https://hotel-three-theta.vercel.app/',
            category: 'Hotels & Hospitality',
            client: 'Luxury Resort & Hotel',
            description: 'Luxury hotel and accommodation website with room reservations, amenity showcases, photo galleries, and guest review highlights.',
            technologies: 'HTML5, CSS3, JavaScript, Vercel',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Direct guest booking platform with zero commission.',
            published: true,
            featured: true,
            order: 7,
            createdAt: 1787702394000,
            updatedAt: 1787702394000
        },
        {
            projectId: 'proj-portfolio',
            name: 'Portfolio',
            slug: 'portfolio',
            type: 'website',
            liveUrl: 'https://portfolio-mu-black-23.vercel.app/',
            category: 'Professional Portfolios',
            client: 'Digital Creator',
            description: 'Sleek professional portfolio website designed for digital creators and consultants featuring interactive projects, resume, and contact section.',
            technologies: 'React, Next.js, Vercel',
            image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Professional personal branding web experience.',
            published: true,
            featured: false,
            order: 8,
            createdAt: 1787702393000,
            updatedAt: 1787702393000
        },
        {
            projectId: 'proj-restaurant',
            name: 'Restaurant',
            slug: 'restaurant',
            type: 'website',
            liveUrl: 'https://restaurant-plum-five.vercel.app/',
            category: 'Restaurants & Dining',
            client: 'Fine Dining Restaurant',
            description: 'Elegant restaurant website with digital food menu, table reservation system, chef specials, and direct online takeaway ordering.',
            technologies: 'HTML5, CSS3, JavaScript',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Increased table reservations and online food orders.',
            published: true,
            featured: true,
            order: 9,
            createdAt: 1787702392000,
            updatedAt: 1787702392000
        },
        {
            projectId: 'proj-barber',
            name: 'Barber',
            slug: 'barber',
            type: 'website',
            liveUrl: 'https://barber-flax-zeta.vercel.app/',
            category: 'Barber & Grooming',
            client: 'Grooming Lounge',
            description: 'Stylishly crafted barber shop website with online chair booking, haircut galleries, price list, and location directions.',
            technologies: 'HTML5, CSS3, JavaScript',
            image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Mobile-friendly chair booking and price showcase.',
            published: true,
            featured: false,
            order: 10,
            createdAt: 1787702391000,
            updatedAt: 1787702391000
        },
        {
            projectId: 'proj-blogger',
            name: 'Blogger',
            slug: 'blogger',
            type: 'website',
            liveUrl: 'https://blogger-opal-seven.vercel.app/',
            category: 'Blogging & Media',
            client: 'Digital Publishing',
            description: 'Modern blog and digital publishing platform with rich article layouts, category browsing, newsletter subscription, and search.',
            technologies: 'Next.js, Vercel, Tailwind CSS',
            image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Fast content publishing and reader engagement system.',
            published: true,
            featured: false,
            order: 11,
            createdAt: 1787702390000,
            updatedAt: 1787702390000
        },
        {
            projectId: 'proj-chomba-plumbing',
            name: 'Chomba Plumbing',
            slug: 'chomba-plumbing',
            type: 'website',
            liveUrl: 'https://chombaplumbing-com-mbll.vercel.app/',
            category: 'Plumbing & Trade Services',
            client: 'Plumbing Contractor',
            description: 'Professional plumbing and sanitation services website featuring emergency service callouts, project portfolio, customer quotes, and testimonials.',
            technologies: 'HTML5, CSS3, JavaScript, Vercel',
            image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Direct customer lead capture and instant quote requests.',
            published: true,
            featured: true,
            order: 12,
            createdAt: 1787702389000,
            updatedAt: 1787702389000
        },
        {
            projectId: 'design-brand-identity',
            name: 'Corporate Brand Identity & Logo Suite',
            slug: 'brand-identity-suite',
            type: 'design',
            liveUrl: '',
            category: 'Branding',
            client: 'Corporate Brand System',
            description: 'Complete corporate branding project including logo design, color palette specifications, typography guidelines, and brand mockup assets across print and digital media.',
            technologies: 'Adobe Illustrator, Photoshop, Figma',
            image: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Unified brand identity and logo guideline suite.',
            published: true,
            featured: true,
            order: 13,
            createdAt: 1787702388000,
            updatedAt: 1787702388000
        },
        {
            projectId: 'design-social-campaign',
            name: 'Social Media Graphic & Campaign Banners',
            slug: 'social-media-banners',
            type: 'design',
            liveUrl: '',
            category: 'Graphic Design',
            client: 'Digital Marketing Campaign',
            description: 'Vibrant social media post templates, ad banners, and promotional story graphics created for multi-channel digital marketing campaigns.',
            technologies: 'Photoshop, Canva Pro, Figma',
            image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1542744094-3a3172720249?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'High-converting social graphics and marketing assets.',
            published: true,
            featured: true,
            order: 14,
            createdAt: 1787702387000,
            updatedAt: 1787702387000
        },
        {
            projectId: 'design-app-ui',
            name: 'Fintech & Business App UI System',
            slug: 'app-ui-system',
            type: 'design',
            liveUrl: '',
            category: 'UI/UX Design',
            client: 'Mobile Banking Concept',
            description: 'Modern mobile user interface design system featuring custom component library, dashboard screens, transaction flows, and light/dark theme variants.',
            technologies: 'Figma, Adobe XD, Design Systems',
            image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Scalable UI components and interactive mobile screens.',
            published: true,
            featured: true,
            order: 15,
            createdAt: 1787702386000,
            updatedAt: 1787702386000
        },
        {
            projectId: 'design-event-posters',
            name: 'Event Posters & Exhibition Signage',
            slug: 'event-posters',
            type: 'design',
            liveUrl: '',
            category: 'Graphic Design',
            client: 'Event Management',
            description: 'High-resolution promotional posters, conference roll-up banners, and event stage backdrop designs tailored for corporate and entertainment events.',
            technologies: 'InDesign, Illustrator, Photoshop',
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Print-ready large format posters and banners.',
            published: true,
            featured: false,
            order: 16,
            createdAt: 1787702385000,
            updatedAt: 1787702385000
        },
        {
            projectId: 'design-product-packaging',
            name: 'Consumer Product Packaging & Labels',
            slug: 'product-packaging',
            type: 'design',
            liveUrl: '',
            category: 'Product Design',
            client: 'Cosmetics Brand',
            description: '3D packaging mockups, die-line templates, and luxury bottle label graphics created for retail products, cosmetics, and beverage brands.',
            technologies: 'Illustrator, 3D Mockups, Packaging Design',
            image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Retail-ready product packaging and label artwork.',
            published: true,
            featured: false,
            order: 17,
            createdAt: 1787702384000,
            updatedAt: 1787702384000
        },
        {
            projectId: 'design-stationery-kit',
            name: 'Corporate Print Stationery & Business Cards',
            slug: 'corporate-stationery',
            type: 'design',
            liveUrl: '',
            category: 'Graphic Design',
            client: 'Enterprise Suite',
            description: 'Print-ready corporate communication assets including double-sided business cards, executive letterheads, branded envelopes, and company brochures.',
            technologies: 'InDesign, Illustrator, Print Prep',
            image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80',
            gallery: [
                'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
            ],
            results: 'Executive stationery kit ready for high-grade offset printing.',
            published: true,
            featured: false,
            order: 18,
            createdAt: 1787702383000,
            updatedAt: 1787702383000
        }
    ];

    global.SeedwelInitialProjects = realProjects;
    global.SeedwelShowcaseProjects = realProjects;
})(window);
