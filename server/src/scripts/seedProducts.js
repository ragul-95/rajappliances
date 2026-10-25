import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import legacyProducts from './data/legacyProducts.js';

const BADGE_MAP = {
  'Best Seller': 'Best Seller',
  'New Release': 'New Arrival',
  'Top Rated': 'Trending',
  'Limited Stock': 'Limited Edition',
  'Deal of the Day': 'Trending',
};

export async function seedProducts() {
  try {
    await connectDB();

    console.log(`Starting product seeding from ${legacyProducts.length} legacy items...`);
    let createdCount = 0;
    let existingCount = 0;

    for (const p of legacyProducts) {
      const hasSizes = p.category === 'Fashion';
      const sizeLabels = ['S', 'M', 'L', 'XL'];
      const sizes = hasSizes
        ? sizeLabels.map((label, i) => ({
            label,
            stock: Math.floor(p.stock / sizeLabels.length) + (i === 0 ? p.stock % sizeLabels.length : 0),
          }))
        : [];

      const totalStock = hasSizes
        ? sizes.reduce((sum, s) => sum + s.stock, 0)
        : p.stock;

      const badges = p.badge && BADGE_MAP[p.badge] ? [BADGE_MAP[p.badge]] : [];

      const productData = {
        name: p.title,
        category: p.category,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice && p.originalPrice >= p.price ? p.originalPrice : undefined,
        brand: p.brand || '',
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        hasSizes,
        sizes,
        stock: totalStock,
        badges,
        images: [
          { angle: 'front', url: p.image, publicId: '' },
          { angle: 'back', url: `${p.image}&flip=h`, publicId: '' },
          { angle: 'left', url: `${p.image}&sat=-100`, publicId: '' },
          { angle: 'right', url: `${p.image}&bri=-30`, publicId: '' },
        ],
      };

      const existing = await Product.findOne({ name: p.title });
      if (existing) {
        if (!existing.images || existing.images.length < 4) {
          existing.images = productData.images;
          await existing.save();
        }
        existingCount++;
      } else {
        await Product.create(productData);
        createdCount++;
      }
    }

    const total = await Product.countDocuments();
    console.log(`✅ Product seeding finished: ${createdCount} created, ${existingCount} already existed. Total products in DB: ${total}`);
    return { createdCount, existingCount, total };
  } catch (err) {
    console.error('❌ Error seeding products:', err);
    throw err;
  } finally {
    await disconnectDB();
  }
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seedProducts.js')) {
  seedProducts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedProducts;
