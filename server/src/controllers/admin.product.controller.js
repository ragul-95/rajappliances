import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { uploadImageBuffer, deleteImageByPublicId } from '../config/cloudinary.js';
import { IMAGE_ANGLES, CATEGORIES, BADGES } from '../constants.js';

function parseJsonField(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function adminGetProducts(req, res, next) {
  try {
    const { search, category, badge } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (badge) {
      filter.badges = badge;
    }

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function adminGetProduct(req, res, next) {
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

export async function adminCreateProduct(req, res, next) {
  try {
    const {
      name,
      price,
      originalPrice,
      brand,
      category,
      description,
      hasSizes: hasSizesRaw,
      stock: stockRaw,
      sizes: sizesRaw,
      badges: badgesRaw,
    } = req.body;

    const hasSizes = String(hasSizesRaw) === 'true';
    const parsedSizes = parseJsonField(sizesRaw, []);
    const parsedBadges = parseJsonField(badgesRaw, []);

    // Validate images
    const files = req.files || {};
    if (!files.front || files.front.length === 0) {
      return next(
        new AppError('Front photo is required.', 400, [
          { field: 'image_front', message: 'Add the front photo.' },
        ])
      );
    }

    // Upload provided images to Cloudinary
    const images = [];
    for (const angle of IMAGE_ANGLES) {
      if (files[angle] && files[angle][0]) {
        const file = files[angle][0];
        const { url, publicId } = await uploadImageBuffer(file.buffer);
        images.push({ angle, url, publicId });
      }
    }

    const productData = {
      name: name?.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      brand: brand ? brand.trim() : '',
      category,
      description: description?.trim(),
      hasSizes,
      badges: Array.isArray(parsedBadges) ? parsedBadges : [],
      images,
    };

    if (hasSizes) {
      productData.sizes = Array.isArray(parsedSizes)
        ? parsedSizes.map((s) => ({ label: String(s.label).trim(), stock: Number(s.stock) }))
        : [];
      productData.stock = productData.sizes.reduce((sum, s) => sum + s.stock, 0);
    } else {
      productData.stock = Number(stockRaw) || 0;
      productData.sizes = [];
    }

    const product = await Product.create(productData);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Product not found.', 404));
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    const {
      name,
      price,
      originalPrice,
      brand,
      category,
      description,
      hasSizes: hasSizesRaw,
      stock: stockRaw,
      sizes: sizesRaw,
      badges: badgesRaw,
    } = req.body;

    const files = req.files || {};
    const updatedImages = [...product.images];

    // Handle image replacements
    for (const angle of IMAGE_ANGLES) {
      if (files[angle] && files[angle][0]) {
        const file = files[angle][0];

        // Delete old Cloudinary image for this angle if exists
        const existingIdx = updatedImages.findIndex((img) => img.angle === angle);
        if (existingIdx !== -1 && updatedImages[existingIdx].publicId) {
          await deleteImageByPublicId(updatedImages[existingIdx].publicId);
        }

        // Upload new image
        const { url, publicId } = await uploadImageBuffer(file.buffer);
        if (existingIdx !== -1) {
          updatedImages[existingIdx] = { angle, url, publicId };
        } else {
          updatedImages.push({ angle, url, publicId });
        }
      }
    }

    product.images = updatedImages;

    if (name !== undefined) product.name = name.trim();
    if (price !== undefined) product.price = Number(price);
    if (originalPrice !== undefined) {
      product.originalPrice = originalPrice ? Number(originalPrice) : undefined;
    }
    if (brand !== undefined) product.brand = brand.trim();
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description.trim();

    if (hasSizesRaw !== undefined) {
      product.hasSizes = String(hasSizesRaw) === 'true';
    }

    if (badgesRaw !== undefined) {
      product.badges = parseJsonField(badgesRaw, product.badges);
    }

    if (product.hasSizes) {
      if (sizesRaw !== undefined) {
        const parsedSizes = parseJsonField(sizesRaw, []);
        product.sizes = parsedSizes.map((s) => ({
          label: String(s.label).trim(),
          stock: Number(s.stock),
        }));
        product.stock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
      }
    } else {
      if (stockRaw !== undefined) {
        product.stock = Number(stockRaw);
        product.sizes = [];
      }
    }

    await product.save();
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Product not found.', 404));
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    // Delete all associated Cloudinary images
    for (const image of product.images) {
      if (image.publicId) {
        await deleteImageByPublicId(image.publicId);
      }
    }

    await Product.findByIdAndDelete(id);
    res.json({ ok: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
