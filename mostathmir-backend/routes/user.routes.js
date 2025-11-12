const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const {
    getUserProfile,
    updateUserProfile,
    getPublicUserProfile,
    updateUserProfilePicture,
    getFollowedProjects,
    getInvestorStats,
    getIdeaHolderDashboard,
    getInvestmentRecords,
    getPendingProposals,
    getReceivedProposals,
    toggleFollowUser,
    addTestimonial,
    deleteTestimonial,
    updateTestimonial
} = require('../controllers/user.controller.js');
const { protect, getAuthUser } = require('../middleware/auth.middleware.js');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const userStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        return {
            folder: `mostathmir_users/${req.user._id}`,
            public_id: `avatar-${req.user._id}`, // اسم ثابت للصورة لتحديثها بدلاً من إنشاء جديد
            allowed_formats: ['jpeg', 'jpg', 'png'],
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
            overwrite: true // السماح بالكتابة فوق الصورة القديمة
        };
    }
});

const upload = multer({
    storage: userStorage,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

router.get('/dashboard', protect, getIdeaHolderDashboard);
router.get('/dashboard/proposals', protect, getReceivedProposals);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.post('/profile/picture', protect, upload.single('profilePicture'), updateUserProfilePicture);
router.get('/:id/public', getAuthUser, getPublicUserProfile);
router.post('/:id/follow', protect, toggleFollowUser);
router.post('/:id/testimonials', protect, addTestimonial);
router.put('/:id/testimonials/:testimonialId', protect, updateTestimonial);
router.delete('/:id/testimonials/:testimonialId', protect, deleteTestimonial);

router.get('/portfolio/stats', protect, getInvestorStats);
router.get('/portfolio/investments', protect, getInvestmentRecords);
router.get('/portfolio/followed', protect, getFollowedProjects);
router.get('/portfolio/proposals', protect, getPendingProposals);

module.exports = router;