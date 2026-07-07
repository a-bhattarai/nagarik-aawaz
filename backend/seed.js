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

    const email = 'ward5official@nagarikaawaz.gov.np';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('This seed user already exists, skipping creation:', email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('ward5pass123', 10);

    const wardOfficial = await User.create({
      fullName: 'Ward 5 Official',
      email,
      phone: '9800000005',
      ward: 5,
      password: hashedPassword,
      role: 'ward_official',
      isVerified: true // seeded accounts start pre-verified, no OTP needed
    });

    console.log('Ward 5 official created successfully:');
    console.log({ email: wardOfficial.email, role: wardOfficial.role, ward: wardOfficial.ward });

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();