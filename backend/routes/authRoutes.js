const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate a random 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== REGISTER =====
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, ward, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !ward || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    // If already verified, block re-registration
    if (user && user.isVerified) {
      return res.status(400).json({ message: 'Email already registered. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (user && !user.isVerified) {
      // overwrite existing unverified record (per our agreed rule A)
      user.fullName = fullName;
      user.phone = phone;
      user.ward = ward;
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        ward,
        password: hashedPassword,
        otp,
        otpExpiresAt
      });
      await user.save();
    }

    // DEMO ONLY: log OTP to console instead of sending real email
    console.log(`[DEMO OTP] Email: ${email} | OTP: ${otp} | Expires in 5 min`);

    res.status(200).json({ message: 'OTP sent to email (check server console for demo)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ===== VERIFY OTP (Registration) =====
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (!user.otp || !user.otpExpiresAt) return res.status(400).json({ message: 'No OTP requested' });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: 'Account verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// ===== RESEND OTP (Registration) =====
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // DEMO ONLY: log OTP to console instead of sending real email
    console.log(`[DEMO OTP - RESEND] Email: ${email} | OTP: ${otp} | Expires in 5 min`);

    res.status(200).json({ message: 'OTP resent (check server console for demo)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'Incorrect email or password' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect email or password' });

    const token = jwt.sign(
      { id: user._id, role: user.role, ward: user.ward },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      role: user.role,
      ward: user.ward,
      fullName: user.fullName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ===== FORGOT PASSWORD: SEND OTP =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'Email not found' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your account first' });

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // DEMO ONLY: log OTP to console instead of sending real email
    console.log(`[DEMO OTP - RESET PASSWORD] Email: ${email} | OTP: ${otp} | Expires in 5 min`);

    res.status(200).json({ message: 'OTP sent to email (check server console for demo)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during forgot password' });
  }
});

// ===== FORGOT PASSWORD: VERIFY RESET OTP =====
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.otp || !user.otpExpiresAt) return res.status(400).json({ message: 'No OTP requested' });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    // Note: we don't clear the OTP here yet — it's cleared only after the
    // password is actually reset, in case the user needs to retry step 3
    res.status(200).json({ message: 'OTP verified. You may now reset your password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// ===== FORGOT PASSWORD: RESET PASSWORD =====
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.otp || !user.otpExpiresAt) return res.status(400).json({ message: 'No OTP requested' });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;