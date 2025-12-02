const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Signup POST
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('User already exists.');
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('Error during signup.');
  }
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send('Invalid credentials.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send('Invalid credentials.');

    // You can set session here if using express-session
    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error during login.');
  }
});

module.exports = router;
