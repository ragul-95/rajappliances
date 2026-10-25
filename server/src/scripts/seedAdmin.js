import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';

async function seedAdmin() {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 12 characters long');
    process.exit(1);
  }

  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email });
    const passwordHash = await bcrypt.hash(password, 12);

    if (existingAdmin) {
      existingAdmin.passwordHash = passwordHash;
      await existingAdmin.save();
      console.log(`✅ Admin account already exists (${email}). Password has been updated.`);
    } else {
      await Admin.create({
        name: 'Administrator',
        email,
        passwordHash,
      });
      console.log(`✅ Admin account created successfully for: ${email}`);
    }
  } catch (err) {
    console.error('❌ Error seeding admin account:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seedAdmin();
