// في middleware/admin.middleware.js
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // إذا كان المستخدم مسجلاً وهو admin، اسمح له بالمرور
    } else {
        res.status(403).json({ message: 'غير مصرح لك، الوصول مقتصر على المسؤولين فقط' });
    }
};

module.exports = { admin };