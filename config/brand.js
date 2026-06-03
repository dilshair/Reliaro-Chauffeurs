/* ═══════════════════════════════════════════════════════
   RELIARO CHAUFFEURS — Brand & Site Configuration
   Change anything here and it updates across the WHOLE site
   No need to hunt through multiple files
═══════════════════════════════════════════════════════ */

module.exports = {

  /* ── Brand ── */
  brand: {
    name:        'Reliaro Chauffeurs',
    shortName:   'Reliaro',
    tagline:     'Travel the way you deserve.',
    description: 'Premium chauffeur service across Melbourne and Victoria. Fixed prices, professional drivers, available 24/7.',
    phone:       '+61 400 000 000',
    phoneDisplay:'+61 400 000 000',
    email:       'bookings@reliarochauffeurs.com',
    abn:         'XX XXX XXX XXX',
    address:     'Melbourne, VIC, Australia',
    url:         'https://reliarochauffeurs.com',
  },

  /* ── Social Media ── */
  social: {
    instagram: 'https://instagram.com/reliarochauffeurs',
    facebook:  'https://facebook.com/reliarochauffeurs',
    linkedin:  'https://linkedin.com/company/reliarochauffeurs',
  },

  /* ── Navigation ── */
  nav: [
    { label: 'Our Services', href: '/services' },
    { label: 'For Business', href: '/business' },
    { label: 'About Us',     href: '/about' },
    { label: 'Contact',      href: '/contact' },
  ],

  /* ── Vehicle Classes ── */
  vehicles: [
    {
      id:          'business',
      name:        'Business Class',
      description: 'Mercedes E-Class or similar',
      features:    ['Up to 3 passengers', '2 large suitcases', 'Wi-Fi & USB charging', 'Complimentary water'],
      maxPax:      3,
      maxLuggage:  2,
      baseFare:    55,
      perKm:       2.40,
      perMin:      0.45,
      minFare:     85,
      hourlyRate:  120,
      kmPerHour:   30,
      extraKmRate: 2.40,
      popular:     false,
    },
    {
      id:          'first',
      name:        'First Class',
      description: 'Mercedes S-Class, BMW 7 Series & similar',
      features:    ['Up to 3 passengers', '3 large suitcases', 'Premium interior', 'Luxury amenities'],
      maxPax:      3,
      maxLuggage:  3,
      baseFare:    85,
      perKm:       3.60,
      perMin:      0.65,
      minFare:     130,
      hourlyRate:  180,
      kmPerHour:   30,
      extraKmRate: 3.60,
      popular:     true,
    },
    {
      id:          'suv',
      name:        'SUV / Van',
      description: 'Mercedes V-Class, Mercedes GLS, Audi Q7',
      features:    ['Up to 6 passengers', '4 large suitcases', 'Extra legroom', 'Wi-Fi & USB charging'],
      maxPax:      6,
      maxLuggage:  4,
      baseFare:    75,
      perKm:       3.00,
      perMin:      0.55,
      minFare:     110,
      hourlyRate:  150,
      kmPerHour:   30,
      extraKmRate: 3.00,
      popular:     false,
    },
    {
      id:          'sprinter',
      name:        'Mercedes Sprinter',
      description: 'Mercedes Sprinter or similar',
      features:    ['Up to 15 passengers', 'Large luggage capacity', 'Group transfers', 'Wi-Fi & USB charging'],
      maxPax:      15,
      maxLuggage:  10,
      baseFare:    120,
      perKm:       3.50,
      perMin:      0.70,
      minFare:     180,
      hourlyRate:  220,
      kmPerHour:   30,
      extraKmRate: 3.50,
      popular:     false,
    },
  ],

  /* ── Services ── */
  services: [
    {
      id:          'airport',
      name:        'Airport Transfers',
      slug:        'airport-transfers',
      icon:        'plane',
      shortDesc:   'Stress-free airport pickups and drop-offs with flight tracking and complimentary wait time.',
      fullDesc:    'Our professional chauffeurs track your flight in real time. Whether arriving or departing from Melbourne Airport (Tullamarine) or Avalon, we ensure you arrive on time, every time. Enjoy 60 minutes complimentary wait time and meet & greet service.',
      features:    ['Real-time flight tracking', '60 min complimentary wait', 'Meet & greet service', 'All terminals covered'],
      showOnHome:  true,
    },
    {
      id:          'events',
      name:        'Event Transfers',
      slug:        'event-transfers',
      icon:        'star',
      shortDesc:   'Arrive at your event in style. Concerts, galas, sporting events and more.',
      fullDesc:    'Make your entrance memorable. Whether it\'s a gala dinner, corporate event, sporting event or concert, our chauffeurs ensure you arrive refreshed and on time.',
      features:    ['On-time guaranteed', 'Return transfers available', 'All Melbourne venues', 'Red carpet service'],
      showOnHome:  true,
    },
    {
      id:          'hourly',
      name:        'Hourly Hire',
      slug:        'hourly-hire',
      icon:        'clock',
      shortDesc:   'A dedicated chauffeur at your disposal for as long as you need.',
      fullDesc:    'Reserve your personal chauffeur from 2 to 24 hours. Perfect for a full day of meetings, shopping, or a night out. 30km included per hour.',
      features:    ['Minimum 2 hours', '30 km included per hour', 'Multiple stops', 'Available 24/7'],
      showOnHome:  true,
    },
    {
      id:          'city-to-city',
      name:        'City to City',
      slug:        'city-to-city',
      icon:        'route',
      shortDesc:   'Long distance travel done in complete comfort. Melbourne to Sydney, Adelaide and beyond.',
      fullDesc:    'Turn long-distance journeys into time well spent. We cover Melbourne to Sydney, Adelaide, Canberra and all regional areas. Arrive refreshed, not stressed.',
      features:    ['Door to door service', 'Fixed prices', 'Melbourne & beyond', 'Comfortable long journeys'],
      showOnHome:  true,
    },
    {
      id:          'winery',
      name:        'Winery Tours',
      slug:        'winery-tours',
      icon:        'wine',
      shortDesc:   'Explore Victoria\'s finest wineries in the Yarra Valley and Mornington Peninsula.',
      fullDesc:    'Sit back and enjoy Victoria\'s world-class wine regions without worrying about driving. We cover Yarra Valley, Mornington Peninsula and beyond. Custom itineraries available.',
      features:    ['Yarra Valley & Mornington', 'Custom itineraries', 'Multiple winery stops', 'Safe designated driver'],
      showOnHome:  true,
    },
    {
      id:          'corporate',
      name:        'Corporate Travel',
      slug:        'corporate-travel',
      icon:        'briefcase',
      shortDesc:   'Reliable, professional travel for your business needs. Corporate accounts available.',
      fullDesc:    'Trusted by Melbourne\'s leading businesses. Discreet, punctual and impeccably presented chauffeurs for client transfers, executive travel and corporate events.',
      features:    ['Corporate accounts', 'Monthly invoicing', 'Dedicated support', 'Priority booking'],
      showOnHome:  true,
    },
    {
      id:          'limo',
      name:        'Limousine Service',
      slug:        'limousine-service',
      icon:        'car',
      shortDesc:   'The ultimate statement of luxury for your special occasion.',
      fullDesc:    'For those occasions that demand the very best. Our limousine service is perfect for weddings, proms, anniversaries and VIP events.',
      features:    ['Special occasions', 'Wedding packages', 'VIP service', 'Decorations available'],
      showOnHome:  false, /* Only shows on /services page */
    },
  ],

  /* ── Toll Routes (Melbourne) ── */
  tolls: [
    { match: ['airport','tullamarine','essendon'],                   name: 'CityLink (Airport)',  cost: 8.50  },
    { match: ['eastlink','ringwood','frankston','dandenong'],         name: 'EastLink',            cost: 10.50 },
    { match: ['westgate','west gate','werribee','geelong','altona'],  name: 'West Gate Tunnel',    cost: 7.00  },
    { match: ['citylink','burnley','domain'],                         name: 'CityLink (City)',     cost: 5.50  },
  ],

  /* ── Surcharges ── */
  surcharges: {
    afterHours: { label: 'After-hours (10pm–6am)', pct: 0.20, startHour: 22, endHour: 6  },
    peakHour:   { label: 'Peak hour',               pct: 0.10, morning: { start: 7, end: 9 }, evening: { start: 16, end: 19 } },
  },

  /* ── Business Page ── */
  businessTypes: [
    {
      id:       'corporations',
      name:     'Corporations',
      icon:     'building',
      desc:     'Streamlined travel management for your entire organisation. Centralised billing, reporting and dedicated account management.',
      features: ['Centralised billing', 'Monthly invoicing', 'Travel reporting', 'Dedicated account manager', 'Priority booking'],
    },
    {
      id:       'travel-agencies',
      name:     'Travel Agencies',
      icon:     'globe',
      desc:     'Partner with Reliaro to offer your clients premium ground transportation across Melbourne and Victoria.',
      features: ['Commission structure', 'White-label options', 'API integration', 'Dedicated support', 'Competitive rates'],
    },
    {
      id:       'strategic-partners',
      name:     'Strategic Partners',
      icon:     'handshake',
      desc:     'Hotels, airlines and event companies — let\'s build something together that benefits both our clients.',
      features: ['Co-branded service', 'Revenue sharing', 'Priority allocation', 'Custom integration', 'Joint marketing'],
    },
  ],

  /* ── Stats ── */
  stats: [
    { value: '500+',  label: 'Rides completed'  },
    { value: '5.0★',  label: 'Average rating'   },
    { value: '24/7',  label: 'Always available' },
    { value: '100%',  label: 'Fixed prices'     },
  ],

  /* ── Coverage Areas ── */
  coverage: [
    'Melbourne CBD', 'Melbourne Airport', 'Avalon Airport',
    'Mornington Peninsula', 'Yarra Valley', 'Geelong',
    'Ballarat', 'Bendigo', 'Phillip Island',
    'Sydney', 'Adelaide', 'Canberra',
    'All Regional Victoria', 'Interstate on request',
  ],

};
