import type BetterSqlite3 from 'better-sqlite3';
import { hashPassword } from '../auth/password';
import { PERMISSIONS, ROLE_DEFINITIONS } from '../rbac';

type DB = BetterSqlite3.Database;

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Seedwel@2026';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
function dateAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}
function dateAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function seedDatabase(db: DB): void {
  const run = (sql: string, params: unknown[] = []) => db.prepare(sql).run(...(params as any[]));
  const one = <T = any>(sql: string, params: unknown[] = []) => db.prepare(sql).get(...(params as any[])) as T;

  const seed = db.transaction(() => {
    /* ------------------------------------------------------------- settings */
    const settings: [string, string][] = [
      ['company_name', 'Seedwel Investment Limited'],
      ['company_legal_name', 'Seedwel Investment Limited'],
      ['company_tagline', 'Building Businesses. Creating Opportunities. Driving Growth.'],
      ['company_short_description', 'Seedwel Investment Limited is a Zambian company focused on business development, digital solutions, talent opportunities and practical services that help individuals and businesses grow.'],
      ['company_registration_year', '2025'],
      ['company_country', 'Zambia'],
      ['company_city', 'Lusaka'],
      ['company_address', 'Lusaka, Zambia'],
      ['company_hours', 'Monday – Friday, 08:30 – 17:00 CAT'],
      ['site_url', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'],
      ['contact_email', 'info@seedwelinvest.example'],
      ['contact_phone', '+260 000 000 000'],
      ['contact_phone_alt', '+260 000 000 001'],
      ['contact_whatsapp', '+260 000 000 000'],
      ['contact_map_url', ''],
      ['social_facebook', ''],
      ['social_x', ''],
      ['social_linkedin', ''],
      ['social_instagram', ''],
      ['social_tiktok', ''],
      ['seo_title_suffix', 'Seedwel Investment Limited'],
      ['seo_default_description', 'Seedwel Investment Limited is a Zambian company delivering digital solutions, branding, business support, talent and education services that help businesses and people grow.'],
      ['og_image', '/images/hero-office.jpg'],
      ['footer_note', 'Seedwel Investment Limited is a company registered in Zambia. Registration details can be verified through the Patents and Companies Registration Agency (PACRA).'],
      ['legal_investment_disclaimer', 'Nothing on this website is an offer of securities to the public. Where an activity would constitute a regulated financial service, it is published only after the appropriate legal and licensing review. You can verify licensed market participants through the Securities and Exchange Commission of Zambia.'],
      ['legal_registration_note', 'Registered in Zambia in 2025. Company registration can be verified using the PACRA online business search facility.'],
      ['demo_content', '1'],
      ['maintenance_mode', '0'],
      ['allow_public_registration', '1'],
    ];
    for (const [k, v] of settings) run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, v]);

    /* --------------------------------------------- roles & permissions seed */
    for (const p of PERMISSIONS) {
      run('INSERT OR REPLACE INTO permissions (key, label, description, category) VALUES (?, ?, ?, ?)', [
        p.key,
        p.label,
        p.description,
        p.category,
      ]);
    }
    for (const r of ROLE_DEFINITIONS) {
      run('INSERT OR REPLACE INTO roles (key, name, description, level) VALUES (?, ?, ?, ?)', [
        r.key,
        r.name,
        r.description,
        r.level,
      ]);
      for (const perm of r.permissions) {
        run('INSERT OR REPLACE INTO role_permissions (role_key, permission) VALUES (?, ?)', [r.key, perm]);
      }
    }

    /* --------------------------------------------------------- departments */
    const departments = [
      ['Digital Solutions', 'Websites, web applications, e-commerce and business technology.'],
      ['Branding & Creative', 'Identity, design and marketing materials.'],
      ['Business Support', 'Research, business development, marketing and administrative support.'],
      ['Talent & Recruitment', 'Sourcing, screening and placing people into real roles.'],
      ['Education & Skills', 'Computer, digital, business and professional skills development.'],
      ['Operations & Administration', 'Finance, administration and internal operations.'],
    ];
    for (const [name, description] of departments) {
      run('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description]);
    }
    const deptId = (name: string) => one<{ id: number }>('SELECT id FROM departments WHERE name = ?', [name]).id;

    /* ---------------------------------------------------------------- users */
    const pwHash = hashPassword(DEMO_PASSWORD);
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@seedwelinvest.example').toLowerCase();
    const adminPw = hashPassword(process.env.ADMIN_PASSWORD || 'ChangeMe!2026');

    const people: Array<[string, string, string, string, string, string, string, string]> = [
      // email, first, last, role, job title, department, phone, status
      [adminEmail, process.env.ADMIN_FIRST_NAME || 'Seedwell', process.env.ADMIN_LAST_NAME || 'Masuku', 'super_admin', 'Founder & Managing Director', 'Operations & Administration', '+260 970 000 001', 'active'],
      ['zacheus.simbaya@seedwelinvest.example', 'Zacheus', 'Simbaya', 'director', 'Co-Director', 'Operations & Administration', '+260 970 000 002', 'active'],
      ['mutinta.banda@seedwelinvest.example', 'Mutinta', 'Banda', 'hr', 'HR & Recruitment Lead', 'Talent & Recruitment', '+260 970 000 003', 'active'],
      ['grace.mwale@seedwelinvest.example', 'Grace', 'Mwale', 'virtual_assistant', 'Virtual Assistant & Task Manager', 'Operations & Administration', '+260 970 000 004', 'active'],
      ['brian.chanda@seedwelinvest.example', 'Brian', 'Chanda', 'manager', 'Operations Manager', 'Digital Solutions', '+260 970 000 005', 'active'],
      ['loveness.phiri@seedwelinvest.example', 'Loveness', 'Phiri', 'cold_caller', 'Cold Caller', 'Business Support', '+260 970 000 006', 'active'],
      ['emmanuel.zulu@seedwelinvest.example', 'Emmanuel', 'Zulu', 'cold_caller', 'Cold Caller', 'Business Support', '+260 970 000 007', 'active'],
      ['nchimunya.katebe@seedwelinvest.example', 'Nchimunya', 'Katebe', 'marketing', 'Marketing Officer', 'Branding & Creative', '+260 970 000 008', 'active'],
      ['chipo.sakala@seedwelinvest.example', 'Chipo', 'Sakala', 'business_development', 'Business Development Officer', 'Business Support', '+260 970 000 009', 'active'],
      ['thandiwe.mbewe@seedwelinvest.example', 'Thandiwe', 'Mbewe', 'staff', 'Administrative Assistant', 'Operations & Administration', '+260 970 000 010', 'active'],
      ['joseph.hampongo@seedwelinvest.example', 'Joseph', 'Hampongo', 'staff', 'Web Developer', 'Digital Solutions', '+260 970 000 011', 'active'],
      ['client@example.com', 'Mwaka', 'Chileshe', 'client', 'Owner', '', '+260 970 000 012', 'active'],
      ['musonda.peter@example.com', 'Peter', 'Musonda', 'applicant', 'Applicant', '', '+260 970 000 013', 'active'],
    ];

    let n = 0;
    for (const [email, first, last, role, title, dept, phone, status] of people) {
      n += 1;
      const isAdmin = email === adminEmail;
      run(
        `INSERT INTO users (uuid, email, email_verified_at, password_hash, first_name, last_name, phone, role_key,
          department_id, job_title, status, country, location, employment_type, joined_at, last_login_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Zambia', 'Lusaka', 'Full-time', ?, ?, ?, ?)`,
        [
          `usr_${(1000 + n).toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          email,
          daysAgo(40 - n),
          isAdmin ? adminPw : pwHash,
          first,
          last,
          phone,
          role,
          dept ? deptId(dept) : null,
          title,
          status,
          daysAgo(120 - n * 3),
          daysAgo(n % 5),
          daysAgo(150 - n * 4),
          daysAgo(150 - n * 4),
        ],
      );
    }
    const userId = (email: string) => one<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]).id;
    const adminId = userId(adminEmail);
    const hrId = userId('mutinta.banda@seedwelinvest.example');
    const vaId = userId('grace.mwale@seedwelinvest.example');
    const managerId = userId('brian.chanda@seedwelinvest.example');

    // Reporting lines
    run("UPDATE users SET manager_id = ? WHERE role_key = 'director'", [adminId]);
    run('UPDATE users SET manager_id = ? WHERE id IN (?, ?, ?)', [managerId, userId('loveness.phiri@seedwelinvest.example'), userId('emmanuel.zulu@seedwelinvest.example'), userId('thandiwe.mbewe@seedwelinvest.example')]);

    /* ------------------------------------------------------------ leadership */
    run(
      `INSERT INTO leadership (name, title, short_bio, bio, message, responsibilities, focus, email, image_path, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        'Seedwell Khayalethu Masuku',
        'Founder',
        'Founder of Seedwel Investment Limited, building practical business, digital and employment opportunities in Zambia.',
        'Seedwell Khayalethu Masuku is the Founder of Seedwel Investment Limited. He started the company with a simple conviction: that Zambian businesses and Zambian talent are held back less by ambition than by access — access to the right digital tools, the right support and the right opportunities.\n\nHis work focuses on turning that conviction into operating businesses: helping companies build a credible digital presence, putting practical support around founders and small teams, and creating real roles for people who are ready to work.\n\nSeedwel leads the company on strategy, partnerships and the standards the business holds itself to. He is hands-on in the early life of the company: meeting clients, shaping service delivery and building the team that will carry the work forward.',
        'We registered Seedwel Investment Limited in 2025 because we could see a gap that was not being served properly: small and growing organisations in Zambia need practical, affordable help to look credible, operate digitally and find good people — and a lot of capable people need a fair route into work that lets them grow.\n\nOur commitment is to do the ordinary things properly. We answer when we are called. We scope work honestly. We deliver what we agreed, on the date we agreed, and we say so early when something has changed.\n\nIf you are a business looking for a partner who will treat your work as carefully as our own, or you are looking for an opportunity to build a career, we would be glad to talk with you.',
        'Company strategy and direction\nClient and partner relationships\nService quality and delivery standards\nTeam growth and leadership\nFinancial discipline and governance',
        'Strategy, partnerships and delivery standards',
        'founder@seedwelinvest.example',
        null,
      ],
    );
    run(
      `INSERT INTO leadership (name, title, short_bio, bio, message, responsibilities, focus, email, image_path, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 2)`,
      [
        'Zacheus Simbaya',
        'Co-Director',
        'Co-Director of Seedwel Investment Limited, responsible for operations, business development and partnership delivery.',
        'Zacheus Simbaya is Co-Director of Seedwel Investment Limited. He works alongside the Founder to turn the company\'s plans into operating reality: building the relationships, processes and delivery capacity that clients experience.\n\nHis focus is on business development and operations — understanding what an organisation actually needs, shaping an offer that makes sense for its stage of growth, and making sure the team has what it needs to deliver it well.\n\nZacheus brings a practical, measured approach to the company\'s work, and is closely involved in the partnerships and projects that extend what Seedwel can offer to businesses and to the people it employs.',
        '',
        'Business development and partnerships\nOperational planning and resourcing\nClient onboarding and service delivery oversight\nRecruitment and team coordination\nRisk, compliance and reporting discipline',
        'Operations, business development and partnerships',
        'codirector@seedwelinvest.example',
        null,
      ],
    );

    /* ---------------------------------------------------------------- content */
    const blocks: Array<[string, string, string, string, string, string, any]> = [
      // key, page, title, subtitle, body, image, extra
      [
        'home.hero',
        'home',
        'Building Businesses. Creating Opportunities. Driving Growth.',
        'Seedwel Investment Limited is a Zambian company focused on business development, digital solutions, talent opportunities and practical services that help individuals and businesses grow.',
        '',
        '/images/hero-office.jpg',
        {
          eyebrow: 'Seedwel Investment Limited · Zambia · Est. 2025',
          primary_label: 'Explore Our Services',
          primary_href: '/services',
          secondary_label: 'Work With Us',
          secondary_href: '/request-a-service',
          tertiary_label: 'View Careers',
          tertiary_href: '/careers',
        },
      ],
      [
        'home.intro',
        'home',
        'A Zambian company built around practical work',
        'Who we are',
        'Seedwel Investment Limited was registered in Zambia in 2025. We work with businesses, organisations and individuals who need three things done properly: a credible digital presence, reliable day-to-day business support, and access to people who can do the work.\n\nWe are structured as operating divisions rather than a list of promises. Each division delivers defined services with clear scope, clear pricing and a named person responsible for the work.',
        '/images/about-team.jpg',
        {},
      ],
      [
        'home.what_we_do',
        'home',
        'What we do',
        'Four divisions, one operating company',
        'We deliver digital work, brand work and business support, and we recruit and place people into roles where they can do their best work.',
        '',
        {},
      ],
      [
        'home.services',
        'home',
        'Services',
        'Practical services, delivered properly',
        'Every service has a defined scope, a clear process and a named person responsible for delivery.',
        '',
        {},
      ],
      [
        'home.why',
        'home',
        'Why choose Seedwel',
        'What working with us is like',
        'We are early in our journey, which means every client and every person we engage matters to us. We compete on reliability and on the quality of the work, not on noise.',
        '',
        {
          items: [
            { title: 'We answer', body: 'Enquiries get a real response from a named person, usually within one working day.' },
            { title: 'Clear scope', body: 'You receive a written scope, a price and a date before any work starts.' },
            { title: 'Zambian context', body: 'Our advice and pricing reflect how business actually works here, including mobile-first customers.' },
            { title: 'One accountable team', body: 'The person who scopes your work stays involved through delivery.' },
            { title: 'Documented process', body: 'Requests, tasks, approvals and files all live in one place you can see.' },
            { title: 'People who grow', body: 'Our team is trained through our own skills programme, so standards improve over time.' },
          ],
        },
      ],
      [
        'home.process',
        'home',
        'How we work',
        'A simple, transparent process',
        'From first enquiry to final handover.',
        '',
        {
          items: [
            { title: 'Tell us what you need', body: 'Send a service request or book a call. We listen before we propose anything.' },
            { title: 'We scope and quote', body: 'You receive a written scope, a fixed price and a realistic delivery date.' },
            { title: 'We build and report', body: 'Work is tracked in your project workspace with milestones you can see.' },
            { title: 'You review and approve', body: 'You review deliverables and request changes before sign-off.' },
            { title: 'Handover and support', body: 'You own the work completely, with documentation and optional maintenance.' },
          ],
        },
      ],
      [
        'home.stats',
        'home',
        'The company in numbers',
        'Measured, not exaggerated',
        '',
        '',
        {
          items: [
            { value: '2025', label: 'Year registered in Zambia' },
            { value: '6', label: 'Operating divisions' },
            { value: '15', label: 'Services delivered' },
            { value: '2', label: 'Positions open now' },
          ],
        },
      ],
      [
        'home.opportunities',
        'home',
        'Business opportunities',
        'Ways to work with us',
        'Partnerships, projects and business opportunities currently open.',
        '/images/opportunities.jpg',
        {},
      ],
      [
        'home.careers',
        'home',
        'Careers',
        'Build a career here',
        'We hire for attitude and train for skill. Current vacancies are listed below and updated by our HR team.',
        '/images/service-talent.jpg',
        {},
      ],
      [
        'home.projects',
        'home',
        'Selected work',
        'Projects we have delivered',
        'A small selection of recent client work across digital, brand and business support.',
        '',
        {},
      ],
      [
        'home.testimonials',
        'home',
        'What our clients say',
        'Feedback from the people we work with',
        '',
        '',
        {},
      ],
      [
        'home.leadership',
        'home',
        'Leadership',
        'Led by people who do the work',
        '',
        '',
        {},
      ],
      [
        'home.cta',
        'home',
        'Let’s build something practical',
        'Tell us what you need and we will come back with a clear scope, a price and a date.',
        '',
        '/images/contact.jpg',
        { primary_label: 'Request a Service', primary_href: '/request-a-service', secondary_label: 'Talk to us', secondary_href: '/contact' },
      ],
      [
        'about.who_we_are',
        'about',
        'Who we are',
        'A Zambian operating company, not a holding shell',
        'Seedwel Investment Limited is a company registered in Zambia in 2025. We describe ourselves as an operating company because that is what we do: we run services, we employ people and we deliver work.\n\nOur activities sit in four practical areas — digital solutions, branding and creative work, business support and development, and talent and recruitment — supported by a skills development programme that trains the people who deliver the work and opens routes into employment for people outside the company.',
        '/images/about-team.jpg',
        {},
      ],
      [
        'about.story',
        'about',
        'Our story',
        'Registered in 2025, built deliberately',
        'Seedwel Investment Limited was registered in Zambia in 2025 and is developing its activities steadily and deliberately.\n\nWe started from what we could see around us: capable businesses that could not get reliable digital work done, and capable people locked out of work because they had no route in and no place to build a track record. Both problems are practical, so we built practical answers — service divisions that businesses can buy from, and roles that people can grow into.\n\nWe are growing one project, one client and one person at a time, and we publish only what we can actually deliver.',
        '',
        {},
      ],
      [
        'about.mission',
        'about',
        'Our mission',
        '',
        'To create practical business, digital and employment opportunities that contribute to sustainable growth.',
        '',
        {},
      ],
      [
        'about.vision',
        'about',
        'Our vision',
        '',
        'To become a trusted Zambian company delivering innovative solutions and creating meaningful opportunities for businesses and people.',
        '',
        {},
      ],
      [
        'about.values',
        'about',
        'Our values',
        'What we hold ourselves to',
        '',
        '',
        {
          items: [
            { title: 'Integrity', body: 'We say what we will do, and we do what we said.' },
            { title: 'Innovation', body: 'We look for better ways before we accept the usual way.' },
            { title: 'Professionalism', body: 'Clear communication, documented work and respect for other people’s time.' },
            { title: 'Accountability', body: 'Every piece of work has a named owner and a visible record.' },
            { title: 'Growth', body: 'For our clients, for our people and for the company.' },
            { title: 'Collaboration', body: 'We work with clients and partners rather than around them.' },
            { title: 'Service', body: 'Useful, responsive support — before, during and after delivery.' },
            { title: 'Opportunity', body: 'We create routes in for people who are ready to work and learn.' },
          ],
        },
      ],
      [
        'what-we-do.intro',
        'what-we-do',
        'What we do',
        'Practical services for businesses, and real routes into work for people',
        'Seedwel Investment Limited operates six divisions. Some are client-facing services, some exist to support the people who deliver them — together they form the operating company.',
        '/images/hero-office.jpg',
        {},
      ],
      [
        'what-we-do.divisions',
        'what-we-do',
        'Our divisions',
        '',
        '',
        '',
        {
          items: [
            { title: 'Digital Solutions', icon: 'MonitorSmartphone', body: 'Websites, web applications, e-commerce, company profiles and the maintenance that keeps them working.', image: '/images/service-digital.jpg' },
            { title: 'Branding & Creative', icon: 'Palette', body: 'Identity, print and digital design that makes a business look as credible as it is.', image: '/images/service-branding.jpg' },
            { title: 'Business Support & Development', icon: 'LineChart', body: 'Research, business development, marketing, customer support and administrative capacity.', image: '/images/service-business.jpg' },
            { title: 'Talent & Recruitment', icon: 'Users', body: 'Sourcing, screening and placing people into roles, and supporting them once they are in.', image: '/images/service-talent.jpg' },
            { title: 'Education & Skills', icon: 'GraduationCap', body: 'Computer, digital, business and professional skills that make people employable.', image: '/images/education.jpg' },
            { title: 'Business & Investment Opportunities', icon: 'Handshake', body: 'Partnerships, projects and opportunity information, published with the right safeguards.', image: '/images/opportunities.jpg' },
          ],
        },
      ],
      [
        'services.intro',
        'services',
        'Our services',
        'Defined scope, clear pricing, documented delivery',
        'Choose a service to see what it includes, how we deliver it and what you receive. Not sure which you need? Send a request and we will help you scope it.',
        '/images/service-digital.jpg',
        {},
      ],
      [
        'careers.intro',
        'careers',
        'Careers at Seedwel',
        'We hire for attitude and train for skill',
        'Below are the positions currently open. We read every application, and we reply to everyone we shortlist. If nothing fits today, you can still send us your CV for future roles.',
        '/images/service-talent.jpg',
        {},
      ],
      [
        'opportunities.intro',
        'opportunities',
        'Business & investment opportunities',
        'Partnerships, projects and opportunity information',
        'This page lists opportunities we are actively discussing with partners, businesses and investors. Each listing states clearly what it is: a business opportunity, a partnership, a project, or information about investment.\n\nNothing on this page is an offer of securities to the public. Where an activity would require a licence, it is published only after the appropriate legal and regulatory review.',
        '/images/opportunities.jpg',
        {},
      ],
      [
        'projects.intro',
        'projects',
        'Selected work',
        'A record of what we have delivered',
        'Every project below was scoped, delivered and handed over by the Seedwel team.',
        '/images/hero-office.jpg',
        {},
      ],
      [
        'education.intro',
        'education',
        'Education & skills development',
        'Practical skills that lead to work',
        'Our programmes focus on the skills that make someone immediately useful in a modern workplace — and on the confidence to use them.',
        '/images/education.jpg',
        {},
      ],
      [
        'contact.intro',
        'contact',
        'Contact Seedwel Investment Limited',
        'Talk to a person, not a form',
        'Send us a message and a named member of the team will respond, usually within one working day.',
        '/images/contact.jpg',
        {},
      ],
    ];

    for (const [key, page, title, subtitle, body, image, extra] of blocks) {
      run(
        `INSERT INTO content_blocks (key, page, title, subtitle, body, extra, image_path, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [key, page, title, subtitle, body, JSON.stringify(extra ?? {}), image || null, adminId, daysAgo(5)],
      );
    }

    /* -------------------------------------------------------------- services */
    type ServiceSeed = [string, string, string, string, string, string, string[], string[], string, string];
    const services: ServiceSeed[] = [
      [
        'Website Development',
        'digital',
        'Professional responsive websites designed to help businesses establish a strong digital presence.',
        'We design and build websites that load quickly on mobile networks, are easy to update, and make a business look as credible as it is. Every build includes a mobile-first layout, on-page SEO, analytics and a short handover session so your team can manage content without calling us.',
        '/images/service-digital.jpg',
        'From ZMW 3,500',
        ['Looks credible on any phone, tablet or laptop', 'Fast loading on Zambian mobile networks', 'Editable content — no developer needed for everyday changes', 'Search-engine friendly structure from day one', 'Analytics so you can see what is working'],
        ['Discovery call and requirements', 'Sitemap, content plan and design direction', 'Design of key pages for approval', 'Build, content loading and mobile testing', 'Review, revisions and launch', 'Handover, training and 30 days of support'],
        'Fully responsive website\nContent management setup\nOn-page SEO\nAnalytics installation\nHandover documentation\n30 days post-launch support',
        'Globe',
      ],
      [
        'Web Applications',
        'digital',
        'Custom web applications that replace spreadsheets, paper forms and manual processes.',
        'When a business outgrows spreadsheets and WhatsApp, a small internal web application is usually the cheapest real solution. We build booking systems, client portals, internal dashboards, inventory tools and approval workflows that run in a browser and are hosted securely.',
        '/images/service-digital.jpg',
        'Scoped per project',
        ['Processes that stop depending on one person’s memory', 'Fewer errors from manual data entry', 'Information available to the right people instantly', 'Grows with the business instead of being replaced'],
        ['Process mapping workshop', 'Functional specification and screens', 'Build in short reviewable stages', 'User testing with your team', 'Deployment and training', 'Support and iteration'],
        'Working application\nSource code ownership\nDeployment and hosting setup\nUser training\nSupport period',
        'AppWindow',
      ],
      [
        'E-commerce Platforms',
        'digital',
        'Online stores that take orders and payments securely.',
        'We build online stores with product catalogues, cart, checkout and payment integrations suited to the Zambian market, including mobile money where supported. We also set up order management so your team can fulfil without confusion.',
        '/images/service-digital.jpg',
        'From ZMW 6,500',
        ['Sell beyond your physical location', 'Mobile money and card payment options', 'Order and stock management in one place', 'Product pages designed to convert'],
        ['Product and logistics review', 'Store design and checkout flow', 'Catalogue setup and payment integration', 'Test orders and staff training', 'Launch and post-launch monitoring'],
        'Online store\nPayment integration\nProduct catalogue setup\nOrder workflow documentation\nTeam training',
        'ShoppingCart',
      ],
      [
        'Company Profiles',
        'digital',
        'Professional company profile documents and web profiles that win tenders and clients.',
        'A company profile is often the first serious test of your credibility. We write and design profiles that explain what you do, what you have delivered and how to engage you — in a format that works as a PDF, a printed document and a web page.',
        '/images/service-branding.jpg',
        'From ZMW 1,800',
        ['A credible answer to "send us your company profile"', 'Consistent with your brand', 'Tender-ready structure and content', 'Editable for future updates'],
        ['Information gathering session', 'Draft structure and content', 'Design and layout', 'Review rounds', 'Final PDF, print and web versions'],
        'Profile document (PDF)\nPrint-ready file\nWeb version\nEditable source file',
        'FileText',
      ],
      [
        'Landing Pages',
        'digital',
        'Focused single pages built to convert a specific campaign or offer.',
        'When you are running a campaign, a full website is often the wrong tool. We design and build single-purpose landing pages with one clear action, tracking and fast load times, ready to connect to your advertising.',
        '/images/service-digital.jpg',
        'From ZMW 1,200',
        ['One clear action for the visitor', 'Loads fast on mobile', 'Measurable conversion tracking', 'Live quickly — usually within days'],
        ['Offer and audience definition', 'Copy and layout', 'Build and tracking setup', 'Launch and optimisation'],
        'Landing page\nConversion tracking\nCopy and design source\nOne optimisation round',
        'Target',
      ],
      [
        'Website Maintenance & Support',
        'digital',
        'Keep your website secure, backed up, updated and improving.',
        'A website that is never maintained quietly becomes a liability. Our maintenance plans cover updates, backups, security monitoring, uptime checks, content edits and a monthly report — with a response time you can hold us to.',
        '/images/service-digital.jpg',
        'From ZMW 600 / month',
        ['Security updates applied before problems happen', 'Backups you can actually restore', 'Small content changes without a new project', 'One monthly report instead of surprises'],
        ['Site audit and access setup', 'Backup and monitoring configuration', 'Scheduled monthly maintenance', 'Change requests handled within the plan', 'Quarterly review call'],
        'Monthly maintenance\nBackups\nSecurity monitoring\nContent edits (plan dependent)\nMonthly report',
        'ShieldCheck',
      ],
      [
        'Digital Transformation Consulting',
        'digital',
        'Practical advice on which digital tools are worth your money — and which are not.',
        'Most businesses do not need more software; they need the right few tools used properly. We review how your business works today, identify where digital tools genuinely save time or win customers, and give you a staged plan with honest costings.',
        '/images/service-business.jpg',
        'Scoped per engagement',
        ['A plan you can actually afford to execute', 'No vendor lock-in or commission-driven advice', 'Prioritised by impact, not by novelty', 'Your team understands why each step matters'],
        ['Current-state review', 'Opportunity mapping and costing', 'Staged roadmap', 'Tool selection support', 'Implementation checkpoints'],
        'Assessment report\nStaged roadmap with costs\nTool recommendations\nImplementation support',
        'Compass',
      ],
      [
        'Logo Design & Brand Identity',
        'branding',
        'A logo and identity system your business can use consistently everywhere.',
        'We design marks that survive real use — on a shopfront, on a WhatsApp profile image, on a letterhead and on a phone screen — and deliver them with the files, colours and typography rules that keep them consistent.',
        '/images/service-branding.jpg',
        'From ZMW 1,500',
        ['A mark that works at every size', 'Clear colour and type rules', 'Files for print, web and social media', 'Consistency across everything you publish'],
        ['Brand questionnaire and references', 'Concept directions', 'Refinement of chosen direction', 'Identity system and guidelines', 'File delivery and brand handover'],
        'Logo suite (print, web, social)\nColour and typography specification\nBasic brand guidelines\nSource files',
        'Palette',
      ],
      [
        'Business Cards & Print Materials',
        'branding',
        'Business cards, letterheads, invoices, posters and flyers designed properly.',
        'Print still matters in Zambia. We design cards, letterheads, compliment slips, posters, flyers, banners and signage, and supply print-ready files alongside guidance on paper and finish so the result matches the design.',
        '/images/service-branding.jpg',
        'From ZMW 450',
        ['Print-ready files your printer can use immediately', 'Consistent with your brand', 'Advice on paper and finish', 'Reusable templates for future items'],
        ['Brief and quantities', 'Design concepts', 'Refinement', 'Print-ready artwork', 'Print supervision (optional)'],
        'Print-ready artwork\nEditable templates\nPrint specification sheet',
        'Printer',
      ],
      [
        'Social Media Graphics',
        'branding',
        'Consistent, on-brand visuals for your social channels.',
        'We produce post templates, story sets, cover images, announcement graphics and campaign creatives so your channels look deliberate rather than improvised — sized correctly for each platform.',
        '/images/service-branding.jpg',
        'From ZMW 700 / month',
        ['Templates your team can reuse', 'Correct sizes for every platform', 'Consistent visual identity', 'Faster turnaround on campaigns'],
        ['Channel and tone review', 'Template design', 'Approval', 'Template handover and training', 'Optional monthly content pack'],
        'Editable templates\nSized exports for each platform\nBrand-consistent graphics pack',
        'Image',
      ],
      [
        'Digital Advertising Creatives',
        'branding',
        'Ad creatives and copy built to be tested, not admired.',
        'We design and write advertising creatives for Meta, Google, TikTok and LinkedIn, producing several variations so you can test what actually works, with sizes and formats matched to each platform.',
        '/images/service-branding.jpg',
        'From ZMW 900',
        ['Multiple variations for testing', 'Platform-correct formats', 'Copy written for your audience', 'Consistent with the wider brand'],
        ['Campaign objective and audience', 'Creative directions', 'Production of variations', 'Delivery with naming conventions', 'Performance review and iteration'],
        'Ad creative set\nCopy variations\nPlatform-ready exports\nTesting recommendations',
        'Megaphone',
      ],
      [
        'Business & Market Research',
        'business',
        'Evidence before investment — research you can make decisions on.',
        'We carry out desk and field research: competitor reviews, customer interviews, pricing studies, location assessments and feasibility checks, delivered as a clear report with the implications stated plainly.',
        '/images/service-business.jpg',
        'Scoped per study',
        ['Decisions based on evidence rather than assumption', 'Local interviews and verification', 'Findings summarised for busy owners', 'Clear recommendation, not just data'],
        ['Research questions and scope', 'Desk research', 'Field work and interviews', 'Analysis', 'Report and recommendations presentation'],
        'Research report\nData appendices\nRecommendations\nPresentation session',
        'Search',
      ],
      [
        'Digital Marketing',
        'business',
        'Search, social and email marketing managed against measurable targets.',
        'We plan and run digital marketing that is measured properly: search visibility, paid campaigns with sensible budgets, email and WhatsApp communication, and content that earns attention over time. You get a monthly report with plain-English results.',
        '/images/service-business.jpg',
        'From ZMW 2,000 / month',
        ['A plan tied to business outcomes', 'Budgets spent against targets, not guesses', 'Monthly reporting you can read', 'No long lock-in contracts'],
        ['Goals, audience and budget', 'Channel plan', 'Campaign build and tracking', 'Launch and optimisation', 'Monthly review and report'],
        'Marketing plan\nCampaign setup\nTracking and reporting\nMonthly review',
        'TrendingUp',
      ],
      [
        'Customer Support Solutions',
        'business',
        'Trained people and simple systems to handle customer enquiries properly.',
        'We set up and staff customer support: shared inbox and WhatsApp channels, scripts and knowledge base, escalation rules and reporting — using trained agents who answer quickly and in the right tone.',
        '/images/service-talent.jpg',
        'Scoped per team',
        ['Faster responses for your customers', 'Documented answers to recurring questions', 'Escalation that does not depend on luck', 'Reports on volumes and response times'],
        ['Channel and volume assessment', 'Scripts and knowledge base', 'Agent briefing and setup', 'Go live with supervision', 'Weekly reporting and improvement'],
        'Support setup\nScripts and knowledge base\nTrained agents\nWeekly performance report',
        'Headset',
      ],
      [
        'Virtual Assistance & Administrative Support',
        'business',
        'Reliable remote support for the work that fills your day.',
        'Our virtual assistants handle inbox and diary management, data entry, document preparation, follow-ups, supplier chasing, research and reporting — supervised, with a daily or weekly report on what was done.',
        '/images/service-talent.jpg',
        'From ZMW 2,800 / month',
        ['Hours back for the work only you can do', 'A named assistant who learns your business', 'Documented daily activity', 'Cover arrangements built in'],
        ['Task and access review', 'Assistant selection', 'Ways of working and reporting rhythm', 'Supervised delivery', 'Monthly review'],
        'Dedicated assistant\nDocumented ways of working\nWeekly activity report\nSupervision and quality checks',
        'UserCheck',
      ],
      [
        'Talent Sourcing & Recruitment Support',
        'talent',
        'Find, screen and place people who can actually do the job.',
        'We source candidates, screen them against your real requirements, coordinate interviews and support onboarding. Our own skills programme means we can also train people into a role when the perfect hire does not exist yet.',
        '/images/service-talent.jpg',
        'Scoped per role',
        ['Shortlists of people who were actually screened', 'Practical skills testing, not just CV reading', 'Interview scheduling handled for you', 'Onboarding support after the offer'],
        ['Role definition and scorecard', 'Sourcing and advertising', 'Screening and skills testing', 'Shortlist and interview coordination', 'Offer support and onboarding'],
        'Role scorecard\nShortlist with screening notes\nInterview coordination\nOnboarding support',
        'UsersRound',
      ],
    ];

    services.forEach(([name, division, summary, description, image, price, benefits, process, deliverables, icon], i) => {
      const slug = name
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      run(
        `INSERT INTO services (slug, name, division, icon, summary, description, benefits, process, deliverables, image_path,
          starting_price, is_featured, is_published, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          slug,
          name,
          division,
          icon,
          summary,
          description,
          benefits.join('\n'),
          process.join('\n'),
          deliverables,
          image,
          price,
          i < 6 ? 1 : 0,
          (i + 1) * 10,
          daysAgo(60),
          daysAgo(3),
        ],
      );
    });
    const serviceId = (slug: string) => one<{ id: number }>('SELECT id FROM services WHERE slug = ?', [slug]).id;

    /* ------------------------------------------------------------------ jobs */
    run(
      `INSERT INTO jobs (slug, title, department, employment_type, location, remote_status, salary_min, salary_max,
        salary_currency, salary_visible, positions, summary, description, responsibilities, requirements, skills,
        deadline, status, is_featured, created_by, created_at, updated_at)
       VALUES ('cold-caller', 'Cold Caller', 'Business Support', 'Full-time', 'Lusaka, Zambia', 'On-site', 2500, 4500, 'ZMW', 1, 3,
        ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?, ?)`,
      [
        'Make outbound calls to business leads, qualify interest and book appointments for our sales and business development team.',
        'Seedwel Investment Limited is recruiting Cold Callers to support our business development work. You will call businesses from a provided list, introduce our services clearly, qualify whether there is a genuine need, and book appointments for a senior member of the team to follow up.\n\nThis is a structured role with a script, a daily call target and coaching. It suits someone who is comfortable on the phone, resilient, and able to stay professional when the answer is no. Full training is provided before you start calling.',
        'Make outbound calls to businesses from a provided, qualified list\nIntroduce Seedwel services accurately and confidently\nAsk structured qualifying questions and record the answers\nBook appointments and confirm them with prospects\nKeep accurate call notes in the CRM or task system\nMeet a daily call and appointment target\nReport daily activity to your team leader\nFollow up on warm leads by phone, email or WhatsApp',
        'Minimum Grade 12 certificate (school certificate)\nClear, confident spoken English; any local language is an advantage\nComfortable speaking with business owners and decision makers\nBasic computer skills — email, spreadsheets, web browsing\nReliable internet or ability to work from our Lusaka office\nAble to work to daily targets without constant supervision\nPrevious call centre, sales or customer service experience is an advantage but not required',
        'Confident telephone manner\nActive listening\nAccurate written recording\nPersistence and resilience\nBasic computer literacy\nPunctuality and reliability',
        dateAhead(21),
        hrId,
        daysAgo(12),
        daysAgo(2),
      ],
    );
    run(
      `INSERT INTO jobs (slug, title, department, employment_type, location, remote_status, salary_min, salary_max,
        salary_currency, salary_visible, positions, summary, description, responsibilities, requirements, skills,
        deadline, status, is_featured, created_by, created_at, updated_at)
       VALUES ('virtual-assistant', 'Virtual Assistant', 'Operations & Administration', 'Full-time', 'Lusaka, Zambia', 'Hybrid', 3200, 5200, 'ZMW', 1, 2,
        ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?, ?)`,
      [
        'Provide remote administrative, coordination and reporting support to our clients and internal teams.',
        'Seedwel Investment Limited is recruiting Virtual Assistants to support clients and internal teams with the work that fills their day: inbox and diary management, document preparation, research, data entry, follow-ups and reporting.\n\nThe role is supervised and structured. You will be assigned to one or two clients at a time, use our task system for every piece of work, and submit a daily activity summary. Virtual Assistants who perform well can grow into task manager responsibilities, coordinating the work of others.',
        'Manage inboxes, calendars and appointments for assigned clients\nPrepare documents, reports and presentations\nCarry out internet and market research and summarise findings\nEnter and maintain data accurately in spreadsheets and systems\nFollow up with suppliers, clients and colleagues by email, phone and WhatsApp\nMaintain a daily and weekly activity report\nEscalate anything you cannot resolve within the agreed time\nProtect client confidentiality at all times',
        'Minimum Grade 12 certificate; a diploma or degree is an advantage\nExcellent written English and clear professional communication\nStrong computer skills — email, word processing, spreadsheets, video calls\nAble to work independently and meet deadlines\nReliable laptop and internet connection for hybrid work\nHigh attention to detail\nPrevious administrative or customer-facing experience is an advantage',
        'Written and verbal communication\nOrganisation and time management\nDocument preparation\nSpreadsheet and email proficiency\nDiscretion and confidentiality\nReliability under deadline',
        dateAhead(14),
        hrId,
        daysAgo(9),
        daysAgo(1),
      ],
    );
    const jobId = (slug: string) => one<{ id: number }>('SELECT id FROM jobs WHERE slug = ?', [slug]).id;
    const coldCallerJob = jobId('cold-caller');
    const vaJob = jobId('virtual-assistant');

    /* ---------------------------------------------------------- applications */
    const applicants: Array<[string, string, string, string, string, string, string, string, string, number, string, number]> = [
      ['Peter', 'Musonda', 'musonda.peter@example.com', '+260 977 111 222', 'Lusaka', 'Certificate in Information Technology', '1 year', 'Telephone communication, data entry, customer service', 'I am comfortable speaking with business owners and I enjoy targets. I have worked in a small call centre and I would like to grow into a sales role with a company that trains its people.', 1, 'shortlisted', 4],
      ['Natasha', 'Mwila', 'natasha.mwila@example.com', '+260 966 222 333', 'Lusaka', 'Grade 12 Certificate', '2 years', 'Customer care, WhatsApp business, record keeping', 'I have two years of customer service experience in retail and I am confident on the phone. I am looking for a role where my daily work is measured and I can improve.', 1, 'under_review', 3],
      ['Kelvin', 'Mumba', 'kelvin.mumba@example.com', '+260 955 333 444', 'Ndola', 'Diploma in Business Administration', '3 years', 'Sales, cold calling, CRM, reporting', 'I have worked in field sales and telesales for three years and consistently exceeded my appointment targets. I would like to bring that discipline to a growing Zambian company.', 1, 'interview', 4],
      ['Mirriam', 'Bwalya', 'mirriam.bwalya@example.com', '+260 977 444 555', 'Lusaka', 'BA in Communication', '4 years', 'Executive support, writing, scheduling, research', 'I have supported two busy managers and I am used to handling confidential information and tight deadlines. I am looking for a role where organisation and writing matter.', 2, 'shortlisted', 5],
      ['Chileshe', 'Kunda', 'chileshe.kunda@example.com', '+260 966 555 666', 'Kitwe', 'Diploma in Secretarial Studies', '2 years', 'Typing, minute taking, filing, spreadsheets', 'I am reliable, fast and accurate with documents. I want to work with a company that will let me grow into coordination work.', 2, 'new', 0],
      ['Aaron', 'Sichone', 'aaron.sichone@example.com', '+260 955 666 777', 'Lusaka', 'Grade 12 Certificate', '0 years', 'Computer literacy, social media, willingness to learn', 'I completed a computer skills course and I am looking for my first formal role. I am punctual, I follow instructions well and I am eager to learn from experienced people.', 2, 'approved', 3],
      ['Brenda', 'Nakamba', 'brenda.nakamba@example.com', '+260 977 777 888', 'Lusaka', 'Certificate in Office Management', '5 years', 'Administration, invoicing, supplier follow up', 'I have run a small office on my own for two years. I am comfortable taking responsibility and reporting without being chased.', 2, 'rejected', 0],
    ];

    applicants.forEach(([first, last, email, phone, location, education, experience, skills, cover, job, status, rating], i) => {
      run(
        `INSERT INTO applications (reference, job_id, first_name, last_name, email, phone, country, location, education,
          experience, skills, cover_letter, portfolio_url, cv_path, additional_info, consent, status, rating, notes,
          source, assigned_to, reviewed_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Zambia', ?, ?, ?, ?, ?, '', NULL, '', 1, ?, ?, '', 'website', ?, ?, ?, ?)`,
        [
          `APP-${(2481 + i * 7).toString(36).toUpperCase()}`,
          job === 1 ? coldCallerJob : vaJob,
          first,
          last,
          email,
          phone,
          location,
          education,
          experience,
          skills,
          cover,
          status,
          rating,
          hrId,
          ['new'].includes(status) ? null : hrId,
          daysAgo(14 - i),
          daysAgo(6 - Math.min(5, i)),
        ],
      );
    });
    run('UPDATE applications SET user_id = ? WHERE email = ?', [userId('musonda.peter@example.com'), 'musonda.peter@example.com']);

    // Application history events
    const appRows = db.prepare('SELECT id, status, first_name, last_name FROM applications ORDER BY id').all() as Array<{
      id: number;
      status: string;
      first_name: string;
      last_name: string;
    }>;
    const stageFlow = ['new', 'under_review', 'shortlisted', 'interview', 'approved'];
    for (const app of appRows) {
      const reached = stageFlow.indexOf(app.status);
      const stages = reached >= 0 ? stageFlow.slice(0, reached + 1) : ['new'];
      stages.forEach((stage, idx) => {
        run(
          `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id, actor_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            app.id,
            idx === 0 ? '' : stages[idx - 1],
            stage,
            idx === 0 ? 'Application submitted through the website.' : 'Moved by HR after review.',
            hrId,
            'Mutinta Banda',
            daysAgo(14 - idx * 2),
          ],
        );
      });
    }
    run('UPDATE jobs SET applicant_count = (SELECT COUNT(*) FROM applications WHERE job_id = jobs.id)');

    /* ---------------------------------------------------------------- clients */
    const clientSeed: Array<[string, string, string, string, string, string, string]> = [
      ['Mwaka Retail Group', 'Mwaka Chileshe', 'mwaka@retailgroup.example.com', '+260 966 100 200', 'Retail', 'active', 'Repeat client. Website, e-commerce and monthly maintenance.'],
      ['Kabwe Agri Services', 'Felix Nkole', 'info@kabweagri.example.com', '+260 955 200 300', 'Agriculture', 'active', 'Brand identity and company profile completed. Discussing e-commerce.'],
      ['Northmead Clinic', 'Dr. Lombe Chanda', 'admin@northmeadclinic.example.com', '+260 977 300 400', 'Healthcare', 'active', 'Website and appointment booking application.'],
      ['ZamLearn Training', 'Israel Mwape', 'hello@zamlearn.example.com', '+260 966 400 500', 'Education', 'prospect', 'Interested in a learning portal. Scoping in progress.'],
      ['Mwamba Logistics', 'Sarah Tembo', 'sarah@mwambalogistics.example.com', '+260 955 500 600', 'Transport & Logistics', 'active', 'Company profile and quote request system.'],
    ];
    for (const [company, contact, email, phone, industry, status, notes] of clientSeed) {
      run(
        `INSERT INTO clients (user_id, company_name, contact_name, email, phone, industry, country, status, notes, owner_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Zambia', ?, ?, ?, ?)`,
        [
          company === 'Mwaka Retail Group' ? userId('client@example.com') : null,
          company,
          contact,
          email,
          phone,
          industry,
          status,
          notes,
          userId('chipo.sakala@seedwelinvest.example'),
          daysAgo(90),
        ],
      );
    }
    const clientId = (name: string) => one<{ id: number }>('SELECT id FROM clients WHERE company_name = ?', [name]).id;

    /* ------------------------------------------------------- service requests */
    const requests: Array<[number, string, string, string, string, string, string, string, string, number | null]> = [
      [serviceId('website-development'), 'Felix Nkole', 'Kabwe Agri Services', 'info@kabweagri.example.com', '+260 955 200 300', 'ZMW 6,000 – 10,000', dateAhead(30), 'We need a website for our agri-input business with product pages and a quote request form. Mobile is critical because most of our customers use phones.', 'completed', managerId],
      [serviceId('e-commerce-platforms'), 'Mwaka Chileshe', 'Mwaka Retail Group', 'mwaka@retailgroup.example.com', '+260 966 100 200', 'ZMW 12,000 – 18,000', dateAhead(45), 'Online store for clothing with mobile money checkout and stock management. We already have product photography.', 'in_progress', managerId],
      [serviceId('logo-design-and-brand-identity'), 'Sarah Tembo', 'Mwamba Logistics', 'sarah@mwambalogistics.example.com', '+260 955 500 600', 'ZMW 2,000 – 4,000', dateAhead(20), 'New logo and brand identity for a transport company. Needs to work on trucks, uniforms and documents.', 'review', vaId],
      [serviceId('digital-marketing'), 'Dr. Lombe Chanda', 'Northmead Clinic', 'admin@northmeadclinic.example.com', '+260 977 300 400', 'ZMW 3,000 / month', dateAhead(15), 'Ongoing social media and search marketing for a clinic. Compliance with health advertising rules is important.', 'assigned', userId('chipo.sakala@seedwelinvest.example')],
      [serviceId('virtual-assistance-and-administrative-support'), 'Israel Mwape', 'ZamLearn Training', 'hello@zamlearn.example.com', '+260 966 400 500', 'ZMW 3,000 – 4,000', dateAhead(10), 'We need a virtual assistant two days a week for inbox, scheduling and learner follow-up.', 'new', null],
      [serviceId('web-applications'), 'Grace Soko', 'Soko Accounting', 'grace@sokoaccounting.example.com', '+260 966 700 800', 'Not sure yet', dateAhead(60), 'A client portal where customers can upload documents and see the status of their returns.', 'reviewing', null],
      [serviceId('business-and-market-research'), 'Peter Nyirenda', 'Nyirenda Investments', 'peter@nyirenda.example.com', '+260 955 900 100', 'ZMW 8,000 – 12,000', dateAhead(40), 'Market assessment before opening a second branch in Kitwe. Customer interviews and competitor pricing.', 'new', null],
    ];

    requests.forEach(([sid, name, company, email, phone, budget, deadline, description, status, assigned], i) => {
      run(
        `INSERT INTO service_requests (reference, service_id, name, company, email, phone, budget, deadline, description,
          status, assigned_to, client_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `REQ-${(1300 + i * 11).toString(36).toUpperCase()}`,
          sid,
          name,
          company,
          email,
          phone,
          budget,
          deadline,
          description,
          status,
          assigned,
          company === 'Kabwe Agri Services' ? clientId('Kabwe Agri Services') : company === 'Mwaka Retail Group' ? clientId('Mwaka Retail Group') : company === 'Mwamba Logistics' ? clientId('Mwamba Logistics') : company === 'Northmead Clinic' ? clientId('Northmead Clinic') : company === 'ZamLearn Training' ? clientId('ZamLearn Training') : null,
          daysAgo(25 - i * 2),
          daysAgo(4 - Math.min(3, i)),
        ],
      );
    });

    /* --------------------------------------------------------------- projects */
    const projects: Array<[string, string, string, string, string, string, string, string, string, string, number, string, string, number, number]> = [];
    const projectSeed: Array<[string, string, string, string, string, string, string, string, string, string, number, string, string, number, number]> = [
      [
        'Mwaka Retail Group — Online Store',
        'Retail client, Lusaka',
        'A complete e-commerce build for a growing clothing retailer: catalogue, mobile money checkout, order management and staff training.',
        'Mwaka Retail Group sells through one shop and social media. We built an online store with a clean catalogue, mobile-first checkout with mobile money and card payments, and an order workflow the shop team can run from a phone.',
        'E-commerce Development\nUI/UX Design\nPayment Integration\nTeam Training',
        'Next.js, TypeScript, SQLite, Flutterwave',
        'Sales channels expanded beyond the physical shop\nOrders processed in one place instead of WhatsApp\nStaff able to manage products without a developer',
        '/images/service-digital.jpg',
        'https://example.com',
        'active',
        70,
        dateAgo(40),
        dateAhead(15),
        1,
        1,
      ],
      [
        'Northmead Clinic — Website & Booking',
        'Healthcare client, Lusaka',
        'A calm, fast website with an online appointment booking application that reduced phone congestion at reception.',
        'The clinic was handling every appointment by phone, which tied up reception and lost bookings after hours. We delivered a website with clear service information and a booking application that confirms appointments automatically and gives staff a daily schedule view.',
        'Website Development\nWeb Application\nContent Writing\nSEO',
        'Next.js, TypeScript, SQLite',
        'Fewer missed appointment calls\nPatients can book outside opening hours\nService information consistent across channels',
        '/images/hero-office.jpg',
        '',
        'completed',
        100,
        dateAgo(95),
        dateAgo(20),
        1,
        1,
      ],
      [
        'Kabwe Agri Services — Brand Identity',
        'Agriculture client, Kabwe',
        'A full identity refresh: logo, colour system, signage, vehicle livery and print materials.',
        'Kabwe Agri Services supplies inputs to smallholder farmers and needed to look as established as it is. We delivered a mark that reads at roadside scale, a colour system, signage, livery and a set of print materials the team can reuse.',
        'Brand Identity\nPrint Design\nSignage Design',
        'Adobe Illustrator, InDesign',
        'Consistent identity across shopfront, vehicles and documents\nPrint-ready templates the client reuses',
        '/images/service-branding.jpg',
        '',
        'completed',
        100,
        dateAgo(120),
        dateAgo(70),
        1,
        1,
      ],
      [
        'Mwamba Logistics — Company Profile',
        'Transport & logistics client, Lusaka',
        'A tender-ready company profile covering capability, fleet, safety record and contact routes.',
        'The client kept losing tender opportunities on documentation. We produced a profile that presents capability, fleet, compliance and past work in a structure procurement teams recognise, delivered as a PDF, a printed document and a web page.',
        'Company Profile\nCopywriting\nDocument Design',
        'InDesign, Illustrator',
        'Profile accepted as part of two tender submissions\nOne document used for print, email and web',
        '/images/service-business.jpg',
        '',
        'completed',
        100,
        dateAgo(150),
        dateAgo(130),
        1,
        0,
      ],
      [
        'ZamLearn — Digital Skills Portal',
        'Education partner, Lusaka',
        'A learning portal for short digital skills courses with enrolment, progress tracking and certificates.',
        'An education partner needed to run short courses online without paying international platform fees. We built a lightweight portal with course pages, enrolment, progress tracking and certificate generation.',
        'Web Application\nUX Design\nContent Structure',
        'Next.js, TypeScript, SQLite',
        'Courses delivered online at a fraction of previous cost\nLearner progress visible to instructors',
        '/images/education.jpg',
        '',
        'planning',
        25,
        dateAgo(10),
        dateAhead(60),
        1,
        1,
      ],
      [
        'Seedwel Cold Calling Programme',
        'Internal programme',
        'An internal lead generation programme with scripts, targets, quality monitoring and daily reporting.',
        'We built an internal outbound programme to support business development: call scripts, a qualified contact list, daily targets, call quality monitoring and a daily report that shows activity and appointments booked.',
        'Process Design\nTraining\nQuality Monitoring\nReporting',
        'Internal task platform, call reporting',
        'Consistent daily outreach activity\nAppointments traceable to specific calls and callers',
        '/images/service-talent.jpg',
        '',
        'active',
        55,
        dateAgo(30),
        dateAhead(45),
        1,
        0,
      ],
    ];
    for (const [name, client, summary, description, servicesList, tech, results, cover, link, status, progress, start, deadline, published, featured] of projectSeed) {
      const slug = name
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[—–]/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      run(
        `INSERT INTO projects (slug, name, client_label, summary, description, services, technologies, results, cover_image,
          link, status, progress, start_date, deadline, owner_id, is_published, is_featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slug,
          name,
          client,
          summary,
          description,
          servicesList,
          tech,
          results,
          cover,
          link,
          status,
          progress,
          start,
          deadline,
          managerId,
          published,
          featured,
          start,
          daysAgo(3),
        ],
      );
    }
    const projectId = (slug: string) => one<{ id: number }>('SELECT id FROM projects WHERE slug = ?', [slug]).id;

    // Project members
    for (const [slug, emails] of [
      ['mwaka-retail-group-online-store', ['brian.chanda@seedwelinvest.example', 'joseph.hampongo@seedwelinvest.example', 'nchimunya.katebe@seedwelinvest.example']],
      ['northmead-clinic-website-and-booking', ['brian.chanda@seedwelinvest.example', 'joseph.hampongo@seedwelinvest.example']],
      ['kabwe-agri-services-brand-identity', ['nchimunya.katebe@seedwelinvest.example', 'grace.mwale@seedwelinvest.example']],
      ['zamlearn-digital-skills-portal', ['brian.chanda@seedwelinvest.example', 'joseph.hampongo@seedwelinvest.example']],
      ['seedwel-cold-calling-programme', ['loveness.phiri@seedwelinvest.example', 'emmanuel.zulu@seedwelinvest.example', 'grace.mwale@seedwelinvest.example']],
    ] as Array<[string, string[]]>) {
      for (const email of emails) {
        run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId(slug), userId(email), 'member']);
      }
    }

    /* ------------------------------------------------------------------ tasks */
    const mkTask = (
      title: string,
      description: string,
      status: string,
      priority: string,
      creator: number,
      assignees: number[],
      dueOffset: number,
      dept: string,
      projectSlug: string | null,
      ageDays: number,
    ): number => {
      const info = run(
        `INSERT INTO tasks (reference, title, description, instructions, status, priority, created_by, department_id,
          project_id, start_date, due_date, completed_at, approved_at, approved_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TSK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          title,
          description,
          'Follow the brief, keep the file naming convention, and submit your work through this task when you are done.',
          status,
          priority,
          creator,
          deptId(dept),
          projectSlug ? projectId(projectSlug) : null,
          daysAgo(ageDays),
          dueOffset === null ? null : daysAhead(dueOffset),
          ['approved', 'completed'].includes(status) ? daysAgo(1) : null,
          status === 'approved' ? daysAgo(1) : null,
          status === 'approved' ? creator : null,
          daysAgo(ageDays),
          daysAgo(Math.max(0, ageDays - 2)),
        ],
      );
      const id = Number(info.lastInsertRowid);
      for (const uid of assignees) run('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [id, uid]);
      return id;
    };

    const t1 = mkTask('Build product catalogue pages', 'Create the product listing and detail pages for the Mwaka online store, including filters by category and size.', 'in_progress', 'high', managerId, [userId('joseph.hampongo@seedwelinvest.example')], 3, 'Digital Solutions', 'mwaka-retail-group-online-store', 8);
    const t2 = mkTask('Integrate mobile money checkout', 'Connect the mobile money provider in test mode, verify callbacks, and document the production switch-over steps.', 'submitted', 'urgent', managerId, [userId('joseph.hampongo@seedwelinvest.example')], -1, 'Digital Solutions', 'mwaka-retail-group-online-store', 12);
    const t3 = mkTask('Daily call campaign — Lusaka retail list', 'Work the 120-contact retail list. Target: 60 dials, 12 conversations, 3 qualified appointments. Log every outcome.', 'on_it', 'high', vaId, [userId('loveness.phiri@seedwelinvest.example'), userId('emmanuel.zulu@seedwelinvest.example')], 0, 'Business Support', 'seedwel-cold-calling-programme', 1);
    const t4 = mkTask('Design brand board for Mwamba Logistics', 'Produce the final brand board: logo variations, colour palette, typography and usage rules.', 'changes_required', 'medium', vaId, [userId('nchimunya.katebe@seedwelinvest.example')], 2, 'Branding & Creative', null, 6);
    const t5 = mkTask('Write company profile draft — ZamLearn', 'Draft the profile content: background, programmes, delivery model and contact section, ready for design.', 'pending', 'medium', vaId, [userId('thandiwe.mbewe@seedwelinvest.example')], 5, 'Business Support', null, 1);
    const t6 = mkTask('Prepare weekly client report', 'Compile the weekly activity report for all active clients: work completed, work in progress and next steps.', 'approved', 'medium', managerId, [userId('grace.mwale@seedwelinvest.example')], -2, 'Operations & Administration', null, 9);
    const t7 = mkTask('Update website service descriptions', 'Refresh the service descriptions on the website with the new pricing bands and process steps.', 'pending', 'low', adminId, [userId('nchimunya.katebe@seedwelinvest.example')], 7, 'Branding & Creative', null, 0);
    const t8 = mkTask('Shortlist candidates for Virtual Assistant role', 'Screen the applications received this week and produce a shortlist of five candidates with notes.', 'in_progress', 'high', hrId, [userId('mutinta.banda@seedwelinvest.example')], 1, 'Talent & Recruitment', null, 4);
    const t9 = mkTask('Confirm clinic booking data migration', 'Export the existing appointment spreadsheet, clean the records and confirm the migration checklist before import.', 'blocked', 'high', managerId, [userId('joseph.hampongo@seedwelinvest.example')], -3, 'Digital Solutions', 'northmead-clinic-website-and-booking', 15);
    const t10 = mkTask('Publish February announcements', 'Draft and publish the internal announcement on new client onboarding steps.', 'overdue', 'low', vaId, [userId('grace.mwale@seedwelinvest.example')], -5, 'Operations & Administration', null, 20);

    // Checklists, comments, submissions
    run('INSERT INTO task_checklist (task_id, label, is_done, sort_order) VALUES (?, ?, 1, 1), (?, ?, 1, 2), (?, ?, 0, 3), (?, ?, 0, 4)',
      [t1, 'Category filters working', t1, 'Product images optimised', t1, 'Empty state designed', t1, 'Mobile layout tested']);
    run('INSERT INTO task_checklist (task_id, label, is_done, sort_order) VALUES (?, ?, 1, 1), (?, ?, 1, 2), (?, ?, 0, 3)',
      [t3, 'Call list loaded', t3, 'Script reviewed', t3, 'Appointments confirmed in writing']);

    run(
      `INSERT INTO task_comments (task_id, user_id, body, kind, created_at) VALUES
       (?, ?, ?, 'comment', ?), (?, ?, ?, 'comment', ?), (?, ?, ?, 'change_request', ?), (?, ?, ?, 'approval', ?)`,
      [
        t2,
        userId('joseph.hampongo@seedwelinvest.example'),
        'Test callbacks are working. Awaiting production credentials from the client before final verification.',
        daysAgo(2),
        t1,
        managerId,
        'Please use the optimised product images from the media library — the originals are far too large for mobile.',
        daysAgo(3),
        t4,
        vaId,
        'Good direction. Please increase the contrast on the secondary palette and add the livery example before resubmission.',
        daysAgo(1),
        t6,
        managerId,
        'Report is clear and complete. Approved — please send to clients.',
        daysAgo(1),
      ],
    );

    run(
      `INSERT INTO task_submissions (task_id, user_id, notes, status, review_notes, reviewed_by, reviewed_at, created_at)
       VALUES (?, ?, ?, 'pending', '', NULL, NULL, ?), (?, ?, ?, 'changes_required', ?, ?, ?, ?), (?, ?, ?, 'approved', ?, ?, ?, ?)`,
      [
        t2,
        userId('joseph.hampongo@seedwelinvest.example'),
        'Integration complete in test mode. Screenshots and the callback log are attached, plus the production switch-over checklist.',
        daysAgo(1),
        t4,
        userId('nchimunya.katebe@seedwelinvest.example'),
        'First brand board draft with logo variations and palette.',
        'Increase contrast on secondary colours; add vehicle livery example.',
        vaId,
        daysAgo(1),
        daysAgo(2),
        t6,
        userId('grace.mwale@seedwelinvest.example'),
        'Weekly report compiled for all active clients with status and next steps.',
        'Clear and complete.',
        managerId,
        daysAgo(1),
        daysAgo(1),
      ],
    );

    /* ---------------------------------------------------------- opportunities */
    run(
      `INSERT INTO opportunities (slug, title, category, summary, description, location, industry, status, requirements,
        investment_range, closing_date, contact_name, contact_email, contact_phone, is_regulated, disclaimer, is_featured,
        created_by, created_at, updated_at)
       VALUES ('cold-calling-partnership', 'Cold Calling & Lead Generation Partnership', 'partnership', ?, ?, 'Lusaka, Zambia', 'Business services', 'published', ?, '', ?, 'Operations Desk', 'partnerships@seedwelinvest.example', '+260 970 000 000', 0, ?, 1, ?, ?, ?)`,
      [
        'We are looking for a small call team or an individual with calling capacity to work on defined lead generation campaigns on a results basis.',
        'Seedwel runs outbound campaigns for its own services and for clients. We are open to working with an established caller or a small team who can work a provided list using our scripts and reporting format.\n\nThis is a commercial services partnership on agreed per-campaign terms, not an investment product and not an offer of employment. Terms, targets and payment are set out in a written agreement before any work begins.',
        'Demonstrable outbound calling experience\nReliable internet connection and a quiet working space\nAbility to work to agreed daily activity targets\nWillingness to follow our call script and reporting format\nProfessional, respectful communication with prospects',
        dateAhead(60),
        'This is a services partnership. It is not an offer of securities, a collective investment scheme or a guarantee of income.',
        adminId,
        daysAgo(20),
        daysAgo(5),
      ],
    );
    run(
      `INSERT INTO opportunities (slug, title, category, summary, description, location, industry, status, requirements,
        investment_range, closing_date, contact_name, contact_email, contact_phone, is_regulated, disclaimer, is_featured,
        created_by, created_at, updated_at)
       VALUES ('ecommerce-for-zambian-smes', 'E-commerce Enablement for Zambian SMEs', 'business_opportunity', ?, ?, 'Nationwide, Zambia', 'Retail & wholesale', 'published', ?, 'ZMW 5,000 – 20,000 (project cost)', ?, 'Business Development Desk', 'opportunities@seedwelinvest.example', '+260 970 000 001', 0, ?, 1, ?, ?, ?)`,
      [
        'A structured package for retail and wholesale businesses that want to start selling online without building an in-house technical team.',
        'Many Zambian businesses can sell more but are limited to walk-in trade and social media messages. This programme bundles a store build, payment setup, product photography guidance, staff training and three months of support into one fixed-scope project.\n\nCosts are quoted per project. This is a paid service engagement, not an investment scheme: you pay for work delivered, and no return is promised or implied.',
        'An existing product range and the ability to fulfil orders\nBasic business registration documentation\nA named person who can make decisions\nWillingness to provide product information and images',
        dateAhead(90),
        'This is a commercial service engagement with a quoted project fee. It is not an investment product and no financial return is promised.',
        adminId,
        daysAgo(15),
        daysAgo(4),
      ],
    );
    run(
      `INSERT INTO opportunities (slug, title, category, summary, description, location, industry, status, requirements,
        investment_range, closing_date, contact_name, contact_email, contact_phone, is_regulated, disclaimer, is_featured,
        created_by, created_at, updated_at)
       VALUES ('skills-training-partnership', 'Digital Skills Training Partnership', 'project', ?, ?, 'Lusaka & Copperbelt, Zambia', 'Education', 'published', ?, '', ?, 'Education Desk', 'skills@seedwelinvest.example', '+260 970 000 002', 0, '', 0, ?, ?, ?)`,
      [
        'We are partnering with training providers, employers and funders to run practical digital and business skills programmes.',
        'Our Education & Skills division runs short, practical programmes in computer skills, digital skills, entrepreneurship and online work. We are open to partnering with organisations that have facilities, learners or funding.\n\nThis is a collaboration opportunity, not a funding request and not an investment offer. Roles, costs and outcomes are agreed in writing before a cohort starts.',
        'A venue or online delivery capacity for cohorts\nAbility to recruit or nominate learners\nCommitment to agreed attendance and assessment standards\nClear allocation of responsibilities between partners',
        dateAhead(75),
        adminId,
        daysAgo(10),
        daysAgo(3),
      ],
    );
    run(
      `INSERT INTO opportunities (slug, title, category, summary, description, location, industry, status, requirements,
        investment_range, closing_date, contact_name, contact_email, contact_phone, is_regulated, disclaimer, is_featured,
        created_by, created_at, updated_at)
       VALUES ('investment-information', 'Investment Information — How We Engage', 'investment_information', ?, ?, 'Zambia', 'Multiple', 'published', ?, '', NULL, 'Office of the Founder', 'info@seedwelinvest.example', '+260 970 000 000', 0, ?, 0, ?, ?, ?)`,
      [
        'Information about how Seedwel Investment Limited evaluates business and investment discussions — and the safeguards that apply.',
        'We receive enquiries from people and organisations interested in supporting or partnering on specific projects. This page explains how we handle them.\n\nNothing on this website is an offer of securities to the public, an invitation to invest, or a solicitation of funds. We do not publish investment products online. Where a proposal would constitute a regulated activity under Zambian law, it is reviewed with qualified legal and regulatory advisers before any material is published or any funds are accepted.\n\nYou can verify licensed market participants through the Securities and Exchange Commission of Zambia, and verify company registration through the Patents and Companies Registration Agency (PACRA). We encourage every prospective partner to do both before engaging with any company, including ours.\n\nIf you would like to discuss a specific, legitimate project, contact us with written details and we will tell you honestly whether it is something we can take forward.',
        'Written details of the proposal or project\nClear identification of the person or entity making contact\nWillingness to proceed through documented due diligence',
        'This page provides general information only and is not an offer of securities, an invitation to invest, or financial advice.',
        adminId,
        daysAgo(30),
        daysAgo(6),
      ],
    );

    /* ------------------------------------------------------------- education */
    const courses: Array<[string, string, string, string, string[], string, string, string, number]> = [
      ['Computer Skills Foundation', 'Computer skills', 'Practical computer literacy for people who need to work confidently with a machine and the internet.', 'A hands-on foundation course covering operating systems, file management, word processing, spreadsheets, email, safe internet use and basic troubleshooting. Designed for beginners and for people who taught themselves and want to close the gaps.', ['Navigate a computer and manage files confidently', 'Produce professional documents and simple spreadsheets', 'Use email and video conferencing professionally', 'Understand online safety and password hygiene', 'Troubleshoot common everyday problems'], '4 weeks · 2 sessions per week', 'Beginner', 'Blended', 1],
      ['Digital Marketing Fundamentals', 'Digital skills', 'How to attract and keep customers using channels that can be measured.', 'Covers audience definition, content planning, social media management, search basics, simple paid campaigns, WhatsApp for business, and how to read a report without being misled by vanity metrics.', ['Plan a monthly content calendar', 'Run and measure a small paid campaign', 'Set up and manage business social profiles', 'Read a basic analytics report', 'Use WhatsApp Business professionally'], '6 weeks · 2 sessions per week', 'Beginner to intermediate', 'Blended', 2],
      ['Online Work Skills', 'Online work skills', 'How to find, win and keep remote and online work as a professional.', 'A practical programme on remote work: profiles and CVs that get read, finding legitimate opportunities, proposals and pricing, communication with international clients, time management, invoicing and staying safe from common online work scams.', ['Present skills credibly in a CV and profile', 'Identify legitimate online opportunities', 'Write a clear proposal and quote a fair price', 'Manage deadlines and communication remotely', 'Invoice and get paid'], '5 weeks · 2 sessions per week', 'Intermediate', 'Online', 3],
      ['Entrepreneurship & Business Planning', 'Entrepreneurship', 'Turning an idea into a business that can be explained to a bank, a partner or a customer.', 'Covers validating an idea, understanding customers and costs, pricing, basic bookkeeping, registration and compliance in Zambia, writing a one-page business plan, and presenting it clearly.', ['Validate an idea before spending money', 'Work out real costs and a workable price', 'Keep simple, accurate records', 'Complete a one-page business plan', 'Understand registration and tax basics'], '6 weeks · 2 sessions per week', 'Beginner', 'Blended', 4],
      ['Practical Mathematics for Business', 'Mathematics', 'The maths an owner or manager actually uses: margins, pricing, cash flow and break-even.', 'No abstract theory. This course works through the calculations that decide whether a business survives — gross margin, mark-up, break-even, cash flow forecasting, unit economics and reading a simple management account.', ['Calculate margin, mark-up and break-even', 'Build a simple cash flow forecast', 'Price a product or service with confidence', 'Read basic management figures', 'Spot when numbers do not add up'], '4 weeks · 2 sessions per week', 'Beginner', 'Blended', 5],
      ['Professional Development & Workplace Skills', 'Professional development', 'The behaviours that get people promoted: communication, reliability and judgement.', 'Covers written and verbal communication, meeting discipline, working with feedback, managing a workload, confidentiality and professional conduct — including what good looks like in a remote or hybrid team.', ['Write clear, professional messages', 'Run and contribute to effective meetings', 'Receive and act on feedback', 'Prioritise a workload independently', 'Handle confidential information responsibly'], '3 weeks · 1 session per week', 'All levels', 'Blended', 6],
    ];
    for (const [title, category, summary, description, outcomes, duration, level, mode, order] of courses) {
      run(
        `INSERT INTO courses (slug, title, category, summary, description, outcomes, duration, level, mode, image_path,
          is_published, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          title.toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'),
          title,
          category,
          summary,
          description,
          outcomes.join('\n'),
          duration,
          level,
          mode,
          category === 'Computer skills' || category === 'Online work skills' ? '/images/education.jpg' : '/images/about-team.jpg',
          order * 10,
          daysAgo(25),
        ],
      );
    }

    /* ----------------------------------------------------------- testimonials */
    const testimonials: Array<[string, string, string, string, number]> = [
      ['Mwaka Chileshe', 'Owner', 'Retail business, Lusaka', 'We needed an online store and we had been burned before by people who disappeared after the deposit. Seedwel scoped everything in writing, delivered in stages we could see, and the shop team can now add products themselves.', 5],
      ['Dr. Lombe Chanda', 'Practice Manager', 'Private clinic, Lusaka', 'The booking system has genuinely changed our mornings. Reception is not tied to the phone and patients can book after hours. They also understood that medical advertising has rules.', 5],
      ['Felix Nkole', 'Director', 'Agri-input supplier, Kabwe', 'The brand work made us look like the company we already were. The mark reads on the side of a truck and the templates have saved us money on every document since.', 5],
      ['Sarah Tembo', 'Operations Lead', 'Logistics company, Lusaka', 'The company profile was thorough and honest. They asked the right questions about our fleet and compliance instead of writing vague marketing language.', 4],
      ['Israel Mwape', 'Programme Coordinator', 'Training provider, Lusaka', 'Working with the skills team has been straightforward. Communication is clear, deadlines hold, and the learners get practical material they can use immediately.', 5],
    ];
    for (const [name, role, company, quote, rating] of testimonials) {
      run(
        'INSERT INTO testimonials (name, role, company, quote, rating, is_published, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [name, role, company, quote, rating, Math.floor(Math.random() * 50), daysAgo(40)],
      );
    }

    /* ------------------------------------------------------------------- faqs */
    const faqs: Array<[string, string, string]> = [
      ['What exactly does Seedwel Investment Limited do?', 'We are an operating company registered in Zambia. We deliver digital solutions (websites, web applications, e-commerce), branding and creative work, business support and development services, and we recruit and place people into real roles. We also run a practical education and skills programme.', 'General'],
      ['How do I request a service?', 'Use the Request a Service page and tell us what you need, your indicative budget and your deadline. You will receive a written scope, a price and a delivery date before any work begins.', 'Services'],
      ['How much does a website cost?', 'Business websites start from ZMW 3,500 and e-commerce projects from ZMW 6,500. The exact price depends on scope, content and integrations. We always quote in writing before starting.', 'Services'],
      ['How do I apply for a job?', 'Open the vacancy on the Careers page and click Apply Now. You will need your contact details, education and experience, a CV and a short cover letter. We read every application and reply to everyone we shortlist.', 'Careers'],
      ['Do I need previous experience to apply?', 'It depends on the role. Cold Caller and Virtual Assistant roles list specific requirements, and we provide training before you start. Where a role requires experience, it is stated clearly in the vacancy.', 'Careers'],
      ['Is everything on the Opportunities page an investment product?', 'No. Each listing states what it is: a business opportunity, a partnership, a project, or investment information. Nothing on this website is an offer of securities to the public or an invitation to invest.', 'Opportunities'],
      ['How can I verify that Seedwel is a registered company?', 'Seedwel Investment Limited was registered in Zambia in 2025. Companies registered in Zambia can be verified through the Patents and Companies Registration Agency (PACRA) business search facility, and licensed market participants through the Securities and Exchange Commission of Zambia.', 'Company'],
      ['Where are you based and do you work with clients outside Lusaka?', 'We are based in Lusaka and work with clients across Zambia and remotely. Most of our work can be delivered without travel, and we travel for discovery and training where it adds value.', 'Company'],
      ['How do you handle my personal information when I apply?', 'Application data is used only for recruitment. CVs are stored with access controls and are visible only to authorised recruitment staff. See our Privacy Policy and Application Privacy Notice for the detail.', 'Privacy'],
      ['Can I work with Seedwel as a partner rather than a client?', 'Yes. We work with callers, designers, developers and training providers on defined engagements. Contact us with what you do and we will tell you honestly whether there is a fit.', 'General'],
    ];
    faqs.forEach(([question, answer, category], i) => {
      run('INSERT INTO faqs (question, answer, category, is_published, sort_order) VALUES (?, ?, ?, 1, ?)', [question, answer, category, (i + 1) * 10]);
    });

    /* --------------------------------------------------------- announcements */
    run(
      `INSERT INTO announcements (title, body, audience, priority, is_published, author_id, published_at, created_at) VALUES
       (?, ?, 'all', 'important', 1, ?, ?, ?),
       (?, ?, 'staff', 'normal', 1, ?, ?, ?),
       (?, ?, 'all', 'normal', 1, ?, ?, ?)`,
      [
        'New client onboarding steps',
        'From this week every new client request is logged as a service request before any work is quoted. This gives us one place to track scope, approvals and files. Please route enquiries through the service request form rather than personal messages.',
        adminId,
        daysAgo(3),
        daysAgo(3),
        'Daily reporting reminder',
        'Please submit your daily activity summary before 17:00. If you are blocked on something, mark the task as Blocked and comment with what you need — do not wait silently until the deadline.',
        vaId,
        daysAgo(1),
        daysAgo(1),
        'Skills programme enrolment open',
        'Enrolment is open for the next Computer Skills Foundation and Digital Marketing Fundamentals cohorts. Staff may nominate themselves; speak to your manager or the HR desk.',
        hrId,
        daysAgo(6),
        daysAgo(6),
      ],
    );

    /* ----------------------------------------------------------------- media */
    const mediaFiles: Array<[string, string, string, string]> = [
      ['hero-office.jpg', '/images/hero-office.jpg', 'Office', 'Seedwel team collaborating in a modern Lusaka office'],
      ['about-team.jpg', '/images/about-team.jpg', 'Team', 'Seedwel team reviewing plans in a meeting room'],
      ['service-digital.jpg', '/images/service-digital.jpg', 'Services', 'Website and web application development'],
      ['service-branding.jpg', '/images/service-branding.jpg', 'Services', 'Branding and creative design workspace'],
      ['service-business.jpg', '/images/service-business.jpg', 'Services', 'Business and market research session'],
      ['service-talent.jpg', '/images/service-talent.jpg', 'Services', 'Customer support and talent desk'],
      ['education.jpg', '/images/education.jpg', 'Education', 'Digital skills training in progress'],
      ['opportunities.jpg', '/images/opportunities.jpg', 'Opportunities', 'Partners concluding an agreement'],
      ['contact.jpg', '/images/contact.jpg', 'Company', 'Seedwel office reception area'],
      ['seedwel.png', '/seedwel.png', 'Brand', 'Seedwel Investment Limited logo'],
    ];
    for (const [name, p, folder, alt] of mediaFiles) {
      run('INSERT INTO media (name, path, mime, size, alt, folder, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
        name,
        p,
        'image/jpeg',
        0,
        alt,
        folder,
        adminId,
        daysAgo(50),
      ]);
    }

    /* ------------------------------------------------------------- documents */
    run(
      `INSERT INTO documents (name, description, category, stored_name, mime, size, owner_id, uploader_id, related_type,
        related_id, visibility, allowed_roles, is_sensitive, created_at) VALUES
       (?, ?, 'company_document', 'seedwel-company-profile.pdf', 'application/pdf', 284000, ?, ?, 'company', 0, 'internal', '', 0, ?),
       (?, ?, 'company_document', 'seedwel-service-price-list.pdf', 'application/pdf', 96000, ?, ?, 'company', 0, 'role', 'super_admin,administrator,director,manager', 0, ?),
       (?, ?, 'contract', 'mwaka-retail-website-contract.pdf', 'application/pdf', 172000, ?, ?, 'project', ?, 'role', 'super_admin,administrator,director,manager', 0, ?),
       (?, ?, 'cv', 'musonda-peter-cv.pdf', 'application/pdf', 88000, ?, ?, 'application', 1, 'role', 'hr,administrator,super_admin,director,manager', 1, ?),
       (?, ?, 'staff_document', 'grace-mwale-contract.pdf', 'application/pdf', 145000, ?, ?, 'user', ?, 'role', 'hr,administrator,super_admin,director', 1, ?)`,
      [
        'Seedwel company profile 2026',
        'Public company profile: what we do, divisions and contact routes.',
        adminId,
        adminId,
        daysAgo(60),
        'Service price list (internal)',
        'Standard rates used when scoping client work.',
        adminId,
        adminId,
        daysAgo(45),
        'Mwaka Retail Group — website contract',
        'Signed contract covering scope, deliverables and payment schedule.',
        adminId,
        adminId,
        projectId('mwaka-retail-group-online-store'),
        daysAgo(40),
        'Peter Musonda — CV',
        'CV submitted with the Cold Caller application.',
        userId('musonda.peter@example.com'),
        userId('musonda.peter@example.com'),
        daysAgo(12),
        'Grace Mwale — employment contract',
        'Employment contract and confidentiality undertaking.',
        vaId,
        hrId,
        vaId,
        daysAgo(200),
      ],
    );

    /* -------------------------------------------------------------- messaging */
    run(
      `INSERT INTO conversations (subject, kind, project_id, created_by, last_message_at, created_at)
       VALUES (?, 'project', ?, ?, ?, ?), (?, 'direct', NULL, ?, ?, ?)`,
      [
        'Mwaka online store — launch readiness',
        projectId('mwaka-retail-group-online-store'),
        managerId,
        daysAgo(1),
        daysAgo(6),
        'Weekly check-in',
        vaId,
        daysAgo(0),
        daysAgo(10),
      ],
    );
    const convIds = (db.prepare('SELECT id FROM conversations ORDER BY id').all() as Array<{ id: number }>).map((r) => r.id);
    run(
      'INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, NULL), (?, ?, NULL), (?, ?, NULL), (?, ?, NULL)',
      [convIds[0], managerId, convIds[0], userId('joseph.hampongo@seedwelinvest.example'), convIds[1], vaId, convIds[1], userId('loveness.phiri@seedwelinvest.example')],
    );
    run(
      `INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES
       (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
      [
        convIds[0],
        managerId,
        'Where are we on the checkout testing? The client wants a launch date we can commit to.',
        daysAgo(2),
        convIds[0],
        userId('joseph.hampongo@seedwelinvest.example'),
        'Callbacks verified in test mode. I am waiting on production credentials, then I can give you a firm date.',
        daysAgo(1),
        convIds[1],
        vaId,
        'How did yesterday’s call list go? Send me the outcome summary before end of day.',
        daysAgo(1),
        convIds[1],
        userId('loveness.phiri@seedwelinvest.example'),
        'Done — 62 dials, 11 conversations, 2 appointments booked for Thursday. Notes are in the task.',
        daysAgo(0),
      ],
    );

    /* ---------------------------------------------------------- notifications */
    const notify = (userIdTo: number, type: string, title: string, body: string, href: string, days: number, read = false) => {
      run(
        'INSERT INTO notifications (user_id, type, title, body, href, actor_id, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userIdTo, type, title, body, href, null, read ? daysAgo(days) : null, daysAgo(days)],
      );
    };
    notify(managerId, 'task_submitted', 'Work submitted for review', 'Joseph Hampongo submitted “Integrate mobile money checkout”.', `/dashboard/tasks/${t2}`, 1);
    notify(managerId, 'task_submitted', 'Work submitted for review', 'Nchimunya Katebe submitted “Design brand board for Mwamba Logistics”.', `/dashboard/tasks/${t4}`, 2);
    notify(vaId, 'task_overdue', 'Task overdue', '“Publish February announcements” passed its deadline.', `/dashboard/tasks/${t10}`, 5);
    notify(userId('joseph.hampongo@seedwelinvest.example'), 'task_assigned', 'New task assigned', 'You were assigned “Build product catalogue pages”.', `/dashboard/tasks/${t1}`, 8, true);
    notify(userId('loveness.phiri@seedwelinvest.example'), 'task_assigned', 'New task assigned', 'You were assigned the Lusaka retail call campaign.', `/dashboard/tasks/${t3}`, 1);
    notify(userId('nchimunya.katebe@seedwelinvest.example'), 'changes_requested', 'Changes requested', 'Grace Mwale requested changes on the Mwamba brand board.', `/dashboard/tasks/${t4}`, 1);
    notify(hrId, 'application_new', 'New application received', 'Chileshe Kunda applied for the Virtual Assistant role.', '/dashboard/recruitment', 3);
    notify(hrId, 'application_new', 'New application received', 'Aaron Sichone applied for the Virtual Assistant role.', '/dashboard/recruitment', 6, true);
    notify(adminId, 'service_request', 'New service request', 'ZamLearn Training requested virtual assistance support.', '/dashboard/service-requests', 2);
    notify(adminId, 'service_request', 'New service request', 'Nyirenda Investments requested market research.', '/dashboard/service-requests', 1);
    notify(userId('musonda.peter@example.com'), 'application_status', 'Application update', 'Your application for Cold Caller is now under review.', '/dashboard/my-applications', 4, true);

    /* -------------------------------------------------------------- audit log */
    run(
      `INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, entity_label, field, previous_value, new_value, ip, user_agent, created_at)
       VALUES (?, 'Seedwell Masuku', 'job.published', 'job', ?, 'Cold Caller', 'status', 'draft', 'published', '127.0.0.1', 'seed', ?),
              (?, 'Mutinta Banda', 'application.status_changed', 'application', 1, 'Peter Musonda', 'status', 'new', 'shortlisted', '127.0.0.1', 'seed', ?),
              (?, 'Grace Mwale', 'task.requested_changes', 'task', ?, 'Design brand board for Mwamba Logistics', 'status', 'submitted', 'changes_required', '127.0.0.1', 'seed', ?),
              (?, 'Seedwell Masuku', 'user.role_changed', 'user', ?, 'Joseph Hampongo', 'role_key', 'staff', 'staff', '127.0.0.1', 'seed', ?)`,
      [adminId, coldCallerJob, daysAgo(12), hrId, daysAgo(10), vaId, t4, daysAgo(1), adminId, userId('joseph.hampongo@seedwelinvest.example'), daysAgo(30)],
    );
  });

  seed();
}
