// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

const protect = async (req, res, next) => {
    let token;

    // التحقق من وجود التوكن في الـ headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخلاص التوكن من الهيدر (Bearer token_string)
            token = req.headers.authorization.split(' ')[1];

            // التحقق من صحة التوكن
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // جلب بيانات المستخدم من قاعدة البيانات باستخدام الـ ID الموجود في التوكن
            // ونضيفها إلى كائن الطلب (req) لتكون متاحة في الخطوة التالية
            req.user = await User.findById(decoded.id).select('-password');

            next(); // الانتقال إلى الدالة التالية (منطق نقطة النهاية)
        } catch (error) {
            res.status(401).json({ message: 'غير مصرح لك، التوكن فشل' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'غير مصرح لك، لا يوجد توكن' });
    }
};
const getAuthUser = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // إذا كان التوكن غير صالح، نتجاهله ونكمل كزائر
            console.error('Optional auth token validation failed:', error.message);
        }
    }

    next(); // ننتقل دائماً إلى الخطوة التالية
};

module.exports = { protect, getAuthUser };