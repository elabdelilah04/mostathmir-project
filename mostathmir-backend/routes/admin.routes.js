const express = require('express');
const router = express.Router();

// استيراد كافة المتحكمات من admin.controller
const { 
    getProjectsForAdmin,
    updateProjectStatus,
    getAdminStats,
    toggleFeaturedStatus,
    getAllProposalsForAdmin,
    notifyProposalParty,
    sendAdminNotification,
    deleteProposal 
} = require('../controllers/admin.controller.js');

// استيراد برمجيات الحماية (Middleware)
const { protect } = require('../middleware/auth.middleware.js');
const { admin } = require('../middleware/admin.middleware.js');

/**
 * ملاحظة: جميع المسارات أدناه محمية.
 * يجب أن يكون المستخدم مسجلاً (protect) ويمتلك صلاحية مدير (admin).
 */

// --- أولاً: مسارات إدارة المشاريع والمصادقة ---
router.get('/projects', protect, admin, getProjectsForAdmin);
router.put('/projects/:id/status', protect, admin, updateProjectStatus);
router.get('/stats', protect, admin, getAdminStats);
router.put('/projects/:id/featured', protect, admin, toggleFeaturedStatus);

// --- ثانياً: مسارات إدارة عروض الشراكة (Proposals) ---
router.get('/proposals', protect, admin, getAllProposalsForAdmin);
router.post('/proposals/notify', protect, admin, notifyProposalParty);
router.delete('/proposals/:id', protect, admin, deleteProposal);

// --- ثالثاً: مسارات الإشعارات الإدارية المباشرة ---
router.post('/notify-user', protect, admin, sendAdminNotification);

module.exports = router;