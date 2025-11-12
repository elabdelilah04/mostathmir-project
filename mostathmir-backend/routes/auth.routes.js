const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationToken,
    forgotPassword,
    resetPassword,
} = require('../controllers/auth.controller');

router.post('/register', registerUser);
router.post('/login', loginUser);

// === START: NEW ROUTES ===
router.post('/verify-email', verifyEmail);
router.post('/resend-token', resendVerificationToken);
// === END: NEW ROUTES ===
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;