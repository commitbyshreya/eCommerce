export const demoProducts = [
  {
    name: 'Cordless Drill',
    description: 'High-performance cordless drill with 2 batteries.',
    price: 89.99,
    category: 'Power Tools',
    brand: 'DeWalt',
    rating: 4.5,
    reviewsCount: 112,
    stock: 24,
    images: ['/assets/images/products/cordless-drill.jpg'],
    featured: true,
    tags: ['drill', 'cordless']
  },
  {
    name: 'Angle Grinder',
    description: 'Durable grinder for cutting and polishing.',
    price: 74.5,
    category: 'Power Tools',
    brand: 'Makita',
    rating: 4.2,
    reviewsCount: 58,
    stock: 18,
    images: ['/assets/images/products/angle-grinder.jpg'],
    featured: true,
    tags: ['grinder']
  },
  {
    name: 'Hammer',
    description: 'Balanced steel claw hammer with comfort grip.',
    price: 15.99,
    category: 'Hand Tools',
    brand: 'Bosch',
    rating: 4.8,
    reviewsCount: 210,
    stock: 45,
    images: ['/assets/images/products/hammer.jpg'],
    tags: ['hammer']
  },
  {
    name: 'Safety Goggles',
    description: 'Anti-fog protective goggles for workshop safety.',
    price: 12.49,
    category: 'Safety',
    brand: '3M',
    rating: 4.6,
    reviewsCount: 94,
    stock: 60,
    images: ['/assets/images/products/safety-goggles.jpg'],
    tags: ['safety']
  },
  {
    name: 'Adjustable Wrench',
    description: 'Rust-resistant adjustable wrench with metric markings.',
    price: 22.0,
    category: 'Hand Tools',
    brand: 'Milwaukee',
    rating: 4.4,
    reviewsCount: 133,
    stock: 33,
    images: ['/assets/images/products/adjustable-wrench.jpg'],
    tags: ['wrench']
  },
  {
    name: 'Contractor Saw',
    description: 'Reliable contractor table saw for job-site work.',
    price: 349.0,
    category: 'Power Tools',
    brand: 'Bosch',
    rating: 4.1,
    reviewsCount: 41,
    stock: 7,
    images: ['/assets/images/products/contractor-saw.jpg'],
    featured: true,
    tags: ['saw']
  }
];

export const demoUsers = [
  {
    name: 'Ava Martinez',
    email: 'ava@toolkart.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Noah Smith',
    email: 'noah@example.com',
    password: 'password123',
    role: 'customer'
  }
];

export const demoOrders = [
  {
    subtotal: 149.98,
    shipping: 0,
    tax: 13.5,
    total: 163.48,
    status: 'paid',
    items: [
      {
        name: 'Cordless Drill',
        price: 89.99,
        quantity: 1
      },
      {
        name: 'Hammer',
        price: 15.99,
        quantity: 2
      }
    ]
  }
];
