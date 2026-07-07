const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    // ===== Seed 33 ward officials (one per ward) =====
    for (let ward = 1; ward <= 33; ward++) {
      const email = `ward${ward}official@nagarikaawaz.gov.np`;
      const existing = await User.findOne({ email });

      if (existing) {
        console.log(`Ward ${ward} official already exists, skipping.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(`ward${ward}pass123`, 10);

      await User.create({
        fullName: `Ward ${ward} Official`,
        email,
        phone: `98000000${String(ward).padStart(2, '0')}`,
        ward,
        password: hashedPassword,
        role: 'ward_official',
        isVerified: true
      });

      console.log(`Created ward ${ward} official: ${email}`);
    }

    // ===== Seed 1 metro admin =====
    const adminEmail = 'metroadmin@nagarikaawaz.gov.np';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Metro admin already exists, skipping.');
    } else {
      const hashedAdminPassword = await bcrypt.hash('metroadmin123', 10);

      await User.create({
        fullName: 'Metro Admin',
        email: adminEmail,
        phone: '9800000000',
        ward: 1, // admins aren't tied to a specific ward, but schema requires one
        password: hashedAdminPassword,
        role: 'metro_admin',
        isVerified: true
      });

      console.log(`Created metro admin: ${adminEmail}`);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();