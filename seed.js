// SURURO NEPAL CRAFTS - Database Seed
// Populates database with sample Nepali crafts products

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sururo_db'
});

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with sample products...\n');

    // 1. Insert categories
    console.log('📦 Creating categories...');
    const categories = [
      { name: 'Buddhist Statues', description: 'Hand-carved Buddhist and Hindu deities' },
      { name: 'Thangka Paintings', description: 'Traditional Tibetan Buddhist religious paintings' },
      { name: 'Singing Bowls', description: 'Handcrafted metal singing bowls for meditation' },
      { name: 'Home Decor', description: 'Decorative items for home and office' },
      { name: 'Textiles', description: 'Traditional woven fabrics and carpets' },
      { name: 'Jewelry', description: 'Handmade silver and beaded jewelry' }
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [category.name, category.description]
      );
    }
    console.log('✅ Categories created\n');

    // 2. Get category IDs
    const categoriesResult = await pool.query('SELECT id, name FROM categories');
    const categoryMap = {};
    categoriesResult.rows.forEach(row => {
      categoryMap[row.name] = row.id;
    });

    // 3. Insert products
    console.log('📦 Creating products...');
    const products = [
      // Buddhist Statues
      {
        name: 'Buddha Statue - Meditation Pose',
        description: 'Hand-carved wooden Buddha in meditation pose. Detailed craftsmanship with natural finish.',
        category: 'Buddhist Statues',
        price: 89.99,
        stock: 15,
        image: 'https://via.placeholder.com/300?text=Buddha+Statue',
        material: 'Wood',
        size: '12 inches',
        artisan: 'Rajesh Kumar'
      },
      {
        name: 'Brass Ganesha Statue',
        description: 'Beautiful brass Ganesha idol. Perfect for home altar or decoration.',
        category: 'Buddhist Statues',
        price: 79.99,
        stock: 20,
        image: 'https://via.placeholder.com/300?text=Ganesha',
        material: 'Brass',
        size: '8 inches',
        artisan: 'Deepak Shrestha'
      },
      {
        name: 'Green Tara Stone Carving',
        description: 'Hand-carved stone Green Tara, the female Buddha of compassion.',
        category: 'Buddhist Statues',
        price: 129.99,
        stock: 8,
        image: 'https://via.placeholder.com/300?text=Green+Tara',
        material: 'Stone',
        size: '10 inches',
        artisan: 'Ashok Thapa'
      },
      {
        name: 'Laughing Buddha Figurine',
        description: 'Hand-painted wooden laughing Buddha. Brings joy and abundance.',
        category: 'Buddhist Statues',
        price: 59.99,
        stock: 25,
        image: 'https://via.placeholder.com/300?text=Laughing+Buddha',
        material: 'Wood',
        size: '6 inches',
        artisan: 'Prem Lama'
      },

      // Thangka Paintings
      {
        name: 'Manjushri Thangka Painting',
        description: 'Traditional hand-painted Thangka of Manjushri, the Buddha of wisdom.',
        category: 'Thangka Paintings',
        price: 199.99,
        stock: 5,
        image: 'https://via.placeholder.com/300?text=Manjushri+Thangka',
        material: 'Cotton Canvas & Natural Pigments',
        size: '12x16 inches',
        artisan: 'Karma Dorje'
      },
      {
        name: 'Medicine Buddha Thangka',
        description: 'Beautifully painted Medicine Buddha Thangka. Gold leaf details.',
        category: 'Thangka Paintings',
        price: 249.99,
        stock: 3,
        image: 'https://via.placeholder.com/300?text=Medicine+Buddha',
        material: 'Silk & Gold Leaf',
        size: '14x18 inches',
        artisan: 'Tenzin Ngyima'
      },
      {
        name: 'Avalokiteshvara Thangka',
        description: 'Hand-painted Thangka of Avalokiteshvara, the Buddha of Compassion.',
        category: 'Thangka Paintings',
        price: 179.99,
        stock: 7,
        image: 'https://via.placeholder.com/300?text=Avalokiteshvara',
        material: 'Cotton Canvas & Natural Pigments',
        size: '12x16 inches',
        artisan: 'Jigme Norbu'
      },

      // Singing Bowls
      {
        name: 'Tibetan Singing Bowl - 6 inches',
        description: 'Handcrafted brass singing bowl. Perfect for meditation and healing.',
        category: 'Singing Bowls',
        price: 59.99,
        stock: 30,
        image: 'https://via.placeholder.com/300?text=Singing+Bowl',
        material: 'Brass',
        size: '6 inches',
        artisan: 'Naresh Singh'
      },
      {
        name: 'Tibetan Singing Bowl - 8 inches',
        description: 'Larger hand-hammered singing bowl with deep resonant tones.',
        category: 'Singing Bowls',
        price: 89.99,
        stock: 18,
        image: 'https://via.placeholder.com/300?text=Large+Singing+Bowl',
        material: 'Brass',
        size: '8 inches',
        artisan: 'Vikram Thapa'
      },
      {
        name: 'Crystal Singing Bowl',
        description: 'Clear crystal singing bowl. Produces clear, high-frequency tones.',
        category: 'Singing Bowls',
        price: 149.99,
        stock: 10,
        image: 'https://via.placeholder.com/300?text=Crystal+Bowl',
        material: 'Crystal',
        size: '8 inches',
        artisan: 'Mohan Lama'
      },

      // Home Decor
      {
        name: 'Decorative Wall Hanging - Mandala',
        description: 'Hand-crafted wooden mandala wall hanging with intricate designs.',
        category: 'Home Decor',
        price: 49.99,
        stock: 40,
        image: 'https://via.placeholder.com/300?text=Mandala+Wall',
        material: 'Wood',
        size: '12x12 inches',
        artisan: 'Sanjay Rai'
      },
      {
        name: 'Metal Door Knocker - Lion Head',
        description: 'Traditional metal door knocker shaped like a lion head.',
        category: 'Home Decor',
        price: 34.99,
        stock: 50,
        image: 'https://via.placeholder.com/300?text=Lion+Knocker',
        material: 'Brass',
        size: '4 inches',
        artisan: 'Ramesh Gurung'
      },
      {
        name: 'Incense Holder - Brass',
        description: 'Decorative brass incense stick holder with intricate patterns.',
        category: 'Home Decor',
        price: 24.99,
        stock: 60,
        image: 'https://via.placeholder.com/300?text=Incense+Holder',
        material: 'Brass',
        size: '3x3 inches',
        artisan: 'Anita Sharma'
      },

      // Textiles
      {
        name: 'Kashmiri Wool Shawl',
        description: 'Hand-woven Kashmiri wool shawl with traditional patterns.',
        category: 'Textiles',
        price: 129.99,
        stock: 12,
        image: 'https://via.placeholder.com/300?text=Wool+Shawl',
        material: 'Wool',
        size: '70x200 cm',
        artisan: 'Fatima Khan'
      },
      {
        name: 'Traditional Bhoto (Vest)',
        description: 'Hand-embroidered traditional Nepali vest with gold thread work.',
        category: 'Textiles',
        price: 89.99,
        stock: 8,
        image: 'https://via.placeholder.com/300?text=Bhoto+Vest',
        material: 'Silk & Cotton',
        size: 'One Size',
        artisan: 'Lakshmi Tamang'
      },
      {
        name: 'Handwoven Carpet - 4x6 feet',
        description: 'Traditional handwoven wool carpet with traditional Nepali designs.',
        category: 'Textiles',
        price: 299.99,
        stock: 4,
        image: 'https://via.placeholder.com/300?text=Handwoven+Carpet',
        material: 'Wool',
        size: '4x6 feet',
        artisan: 'Kishor Limbu'
      },

      // Jewelry
      {
        name: 'Silver Bead Necklace',
        description: 'Hand-crafted silver bead necklace with traditional Nepali design.',
        category: 'Jewelry',
        price: 69.99,
        stock: 25,
        image: 'https://via.placeholder.com/300?text=Silver+Necklace',
        material: 'Silver',
        size: 'One Size',
        artisan: 'Suresh Maharjan'
      },
      {
        name: 'Turquoise & Coral Bracelet',
        description: 'Handmade bracelet with turquoise and coral beads in silver setting.',
        category: 'Jewelry',
        price: 59.99,
        stock: 35,
        image: 'https://via.placeholder.com/300?text=Turquoise+Bracelet',
        material: 'Silver, Turquoise, Coral',
        size: 'One Size',
        artisan: 'Devi Chettri'
      },
      {
        name: 'Silver Prayer Wheel Pendant',
        description: 'Ornate silver prayer wheel pendant. Handcrafted with fine details.',
        category: 'Jewelry',
        price: 79.99,
        stock: 20,
        image: 'https://via.placeholder.com/300?text=Prayer+Wheel',
        material: 'Silver',
        size: '1.5 inches',
        artisan: 'Mingma Sherpa'
      }
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (name, description, category_id, price, stock_quantity, image_url, material, size, artisan_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.name,
          product.description,
          categoryMap[product.category],
          product.price,
          product.stock,
          product.image,
          product.material,
          product.size,
          product.artisan
        ]
      );
    }
    console.log('✅ Products created\n');

    console.log('🎉 Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${categories.length} categories created`);
    console.log(`   - ${products.length} products created`);
    console.log('\n✨ Your website should now show products!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
