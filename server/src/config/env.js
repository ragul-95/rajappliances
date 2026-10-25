import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    CLIENT_ORIGIN: z.string().min(1, 'CLIENT_ORIGIN is required'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_ADMIN_SECRET: z.string().min(1, 'JWT_ADMIN_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    COOKIE_SECURE: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),
    ADMIN_EMAIL: z.string().optional().default(''),
    ADMIN_PASSWORD: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.JWT_SECRET === data.JWT_ADMIN_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ADMIN_SECRET'],
        message: 'JWT_ADMIN_SECRET and JWT_SECRET must be different',
      });
    }

    const minLength = data.NODE_ENV === 'production' ? 32 : 16;
    if (data.JWT_SECRET.length < minLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: `JWT_SECRET must be at least ${minLength} characters long`,
      });
    }
    if (data.JWT_ADMIN_SECRET.length < minLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ADMIN_SECRET'],
        message: `JWT_ADMIN_SECRET must be at least ${minLength} characters long`,
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.') || 'env'}: ${issue.message}`);
  });
  console.error('\nPlease check your .env file before starting the server.\n');
  process.exit(1);
}

export const env = parsed.data;
export default env;
