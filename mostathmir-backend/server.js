const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const adminRoutes = require('./routes/admin.routes');
const investmentRoutes = require('./routes/investment.routes');
const proposalRoutes = require('./routes/proposal.routes');
const savedInvestmentRoutes = require('./routes/savedInvestment.routes');
const messageRoutes = require('./routes/message.routes.js');
const notificationRoutes = require('./routes/notification.routes.js');

const app = express();

// === START: AGGRESSIVE CORS CONFIGURATION FOR DEBUGGING ===
// This is placed at the very top to ensure it runs first.
const allowedOrigins = [
    'https://mostathmir-app.onrender.com', // رابط الواجهة الأمامية الخاص بك
    'http://127.0.0.1:5500',              // واجهتك الأمامية المحلية للتجربة
    'http://localhost:5500'                // أيضاً واجهتك الأمامية المحلية
];

app.use(cors({
    origin: function (origin, callback) {
        // السماح بالطلبات التي لا تحتوي على origin (مثل تطبيقات الموبايل أو curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'سياسة CORS لهذا الموقع لا تسمح بالوصول من المصدر المحدد.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/saved-investments', savedInvestmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

const frontendPath = path.join(__dirname, '..', 'mostathmir-frontend');
app.use(express.static(frontendPath));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.resolve(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ message: err.message });
    }
    next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});