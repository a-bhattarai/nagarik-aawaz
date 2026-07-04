const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  ward: {
    type: Number,
    required: true,
    min: 1,
    max: 33
  },
  password: {
    type: String,
    required: true // stored as a bcrypt hash, never plain text
  },
  role: {
    type: String,
    enum: ['citizen', 'ward_official', 'metro_admin'],
    default: 'citizen'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);