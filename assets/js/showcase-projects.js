(function (global) {
    'use strict';

    var categories = [
        ['Business Websites', 30, 'Professional company websites with clear service pages, lead forms and search-friendly content.'],
        ['E-commerce', 20, 'Online stores with product catalogues, checkout-ready layouts and conversion-focused pages.'],
        ['Real Estate', 15, 'Property listing platforms, agency websites and rental enquiry experiences.'],
        ['Logistics & Transport', 15, 'Fleet, courier and transport service websites with booking or quote flows.'],
        ['Restaurants & Food', 15, 'Menus, ordering prompts and brand-led food business websites.'],
        ['Salons & Beauty', 10, 'Beauty, wellness and salon websites with appointment-focused layouts.'],
        ['Healthcare & Dental', 15, 'Trust-focused clinic, pharmacy and dental practice websites.'],
        ['Education', 15, 'School, tutor and training centre websites with course content and enquiries.'],
        ['Construction', 10, 'Contractor and construction company sites with project galleries.'],
        ['Automotive', 10, 'Car sales, servicing and auto-care websites with enquiry journeys.'],
        ['Hotels & Tourism', 10, 'Accommodation and travel showcase websites with booking prompts.'],
        ['Fitness & Gyms', 10, 'Fitness brand websites with memberships, classes and trainer profiles.'],
        ['Professional Portfolios', 10, 'Personal brand, CV and portfolio websites for professionals.'],
        ['Agriculture & Farming', 10, 'Farm, agro-processing and supplier websites for local and export markets.'],
        ['Other Online Services', 5, 'Specialist service platforms, landing pages and digital operations portals.']
    ];

    var images = {
        'Business Websites': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
        'E-commerce': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
        'Real Estate': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80',
        'Logistics & Transport': 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=900&q=80',
        'Restaurants & Food': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
        'Salons & Beauty': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
        'Healthcare & Dental': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80',
        'Education': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
        'Construction': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
        'Automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
        'Hotels & Tourism': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
        'Fitness & Gyms': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
        'Professional Portfolios': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
        'Agriculture & Farming': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
        'Other Online Services': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80'
    };

    var markets = ['Zambia', 'Southern Africa', 'Global Remote', 'Kabwe Market', 'Lusaka Market', 'Chama Market', 'Africa Online'];
    var technologies = ['HTML', 'CSS', 'JavaScript', 'Firebase', 'Cloudinary', 'SEO', 'Responsive UI'];
    var services = ['Website design', 'Branding', 'Search optimisation', 'Lead capture', 'Content structure', 'Admin workflow'];

    function baseName(category) {
        return category.replace(/&/g, 'and').replace(/^Other\s+/, '').split(/\s+/)[0];
    }

    function makeProject(category, total, description, index, globalIndex) {
        var image = images[category];
        return {
            projectId: 'showcase-' + String(globalIndex).padStart(3, '0'),
            name: baseName(category) + ' Growth Platform ' + String(index).padStart(2, '0'),
            category: category,
            client: 'Showcase project example',
            description: description + ' This portfolio example demonstrates the structure, visuals and functionality Seedwel can prepare for businesses that need a credible online presence.',
            image: image,
            gallery: [image],
            liveUrl: '',
            results: 'Services: ' + services[globalIndex % services.length] + ', ' + services[(globalIndex + 2) % services.length] + '. Technologies: ' + technologies[globalIndex % technologies.length] + ', ' + technologies[(globalIndex + 3) % technologies.length] + '. Status: showcase-ready. Market: ' + markets[globalIndex % markets.length] + '.',
            published: true,
            showcase: true,
            updatedAt: 1787702400000 - globalIndex,
            collectionSize: total
        };
    }

    var projects = [];
    var globalIndex = 1;
    categories.forEach(function (entry) {
        for (var i = 1; i <= entry[1]; i += 1) {
            projects.push(makeProject(entry[0], entry[1], entry[2], i, globalIndex));
            globalIndex += 1;
        }
    });

    global.SeedwelShowcaseProjects = projects;
})(window);
