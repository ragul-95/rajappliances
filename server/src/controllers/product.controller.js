import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';

export async function getProducts(req, res, next) {
  try {
    const { search, category, minPrice, maxPrice, rating, sort, ids, limit } = req.query;
    const filter = {};

    // Filter by comma-separated IDs
    if (ids) {
      const idList = String(ids)
        .split(',')
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      filter._id = { $in: idList };
    }

    // Filter by search query
    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
      ];
    }

    // Filter by comma-separated categories
    if (category) {
      const categories = String(category)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Filter by minimum rating
    if (rating !== undefined && !isNaN(Number(rating))) {
      filter.rating = { $gte: Number(rating) };
    }

    // Sort order
    let sortOptions = { createdAt: -1 };
    if (sort === 'price-low') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-high') {
      sortOptions = { price: -1 };
    } else if (sort === 'rating') {
      sortOptions = { rating: -1, reviews: -1 };
    }

    let query = Product.find(filter).sort(sortOptions);

    if (limit && !isNaN(Number(limit))) {
      query = query.limit(Number(limit));
    }

    const products = await query;
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getHomeProducts(req, res, next) {
  try {
    // Mirroring mockApi.js logic:
    // deals: discount > 20% (originalPrice > price)
    // bestSellers: badge 'Best Seller' or reviews > 10000
    // recommended: top-rated / general selection

    const [deals, bestSellers, recommended] = await Promise.all([
      // Deals: products where (originalPrice - price) / originalPrice > 0.20
      Product.find({
        originalPrice: { $exists: true, $ne: null },
        $expr: {
          $gt: [
            { $divide: [{ $subtract: ['$originalPrice', '$price'] }, '$originalPrice'] },
            0.2,
          ],
        },
      })
        .limit(8),

      // Best sellers: badge 'Best Seller' or reviews > 10000
      Product.find({
        $or: [{ badges: 'Best Seller' }, { reviews: { $gt: 10000 } }],
      })
        .sort({ rating: -1, reviews: -1 })
        .limit(8),

      // Recommended: top rated / variety
      Product.find({})
        .sort({ rating: -1, createdAt: -1 })
        .limit(8),
    ]);

    res.json({
      deals,
      bestSellers,
      recommended,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Product not found.', 404));
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    res.json({ product });
  } catch (err) {
    next(err);
  }
}
