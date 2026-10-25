import mongoose from 'mongoose';
import { CATEGORIES, BADGES, IMAGE_ANGLES } from '../constants.js';

const imageSchema = new mongoose.Schema(
  {
    angle: {
      type: String,
      enum: IMAGE_ANGLES,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const sizeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: 'Invalid category: {VALUE}',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    brand: {
      type: String,
      trim: true,
      default: '',
      maxlength: [60, 'Brand cannot exceed 60 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be greater than 0'],
    },
    originalPrice: {
      type: Number,
      validate: {
        validator: function (val) {
          if (val === undefined || val === null) return true;
          return val >= this.price;
        },
        message: 'Original price (M.R.P.) must be greater than or equal to price',
      },
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviews: {
      type: Number,
      default: 0,
      min: [0, 'Reviews cannot be negative'],
    },
    hasSizes: {
      type: Boolean,
      default: false,
    },
    sizes: {
      type: [sizeSchema],
      default: [],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    badges: {
      type: [
        {
          type: String,
          enum: {
            values: BADGES,
            message: 'Invalid badge: {VALUE}',
          },
        },
      ],
      default: [],
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: function (imgs) {
          if (!Array.isArray(imgs) || imgs.length === 0) return false;
          // Must have at least 'front'
          const angles = imgs.map((i) => i.angle);
          if (!angles.includes('front')) return false;
          // Max one per angle
          return new Set(angles).size === angles.length;
        },
        message: 'Images must include a front photo and have at most one photo per angle',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret, options) => {
        if (!options?.includePublicId && Array.isArray(ret.images)) {
          ret.images = ret.images.map(({ publicId, ...img }) => img);
        }
        return ret;
      },
    },
  }
);

productSchema.index({ name: 'text', brand: 'text', description: 'text' });

export const Product = mongoose.model('Product', productSchema);
export default Product;
