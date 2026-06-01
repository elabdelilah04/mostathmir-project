const express = require('express');
const router = express.Router();
const {
    getProjectsForAdmin,
    updateProjectStatus,
    getAdminStats,
    toggleFeaturedStatus,
    getAllProposalsForAdmin,
    notifyProposalParty,
    deleteProposal,
    sendAdminNotification,
    submitSupportTicket,
    getAllSupportTickets,
    updateTicketStatus,
    deleteTicket,
    replyToSupportDirectly,
    getFAQs,
    addFAQ,
    deleteFAQ
} = require('../controllers/admin.controller.js');
const { protect, getAuthUser } = require('../middleware/auth.middleware.js');
const { admin } = require('../middleware/admin.middleware.js');

// مشاريع وإحصائيات
router.get('/projects', protect, admin, getProjectsForAdmin);
router.put('/projects/:id/status', protect, admin, updateProjectStatus);
router.get('/stats', protect, admin, getAdminStats);
router.put('/projects/:id/featured', protect, admin, toggleFeaturedStatus);

// مقترحات
router.get('/proposals', protect, admin, getAllProposalsForAdmin);
router.post('/proposals/notify', protect, admin, notifyProposalParty);
router.delete('/proposals/:id', protect, admin, deleteProposal);

// إشعارات مباشرة
router.post('/notify-user', protect, admin, sendAdminNotification);

// نظام الدعم (محدث)
router.post('/support/submit', getAuthUser, submitSupportTicket);
router.get('/support/tickets', protect, admin, getAllSupportTickets);
router.put('/support/tickets/:id', protect, admin, updateTicketStatus);
router.delete('/support/tickets/:id', protect, admin, deleteTicket);
router.post('/support/reply-direct', protect, admin, replyToSupportDirectly); // مسار الرد المباشر

// الأسئلة الشائعة FAQ (جديد)
router.get('/support/faqs', getFAQs);
router.post('/support/faqs', protect, admin, addFAQ);
router.delete('/support/faqs/:id', protect, admin, deleteFAQ);

module.exports = router;