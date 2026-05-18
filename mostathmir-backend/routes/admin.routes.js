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
    deleteTicket
} = require('../controllers/admin.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
const { admin } = require('../middleware/admin.middleware.js');

router.get('/projects', protect, admin, getProjectsForAdmin);
router.put('/projects/:id/status', protect, admin, updateProjectStatus);
router.get('/stats', protect, admin, getAdminStats);
router.put('/projects/:id/featured', protect, admin, toggleFeaturedStatus);

router.get('/proposals', protect, admin, getAllProposalsForAdmin);
router.post('/proposals/notify', protect, admin, notifyProposalParty);
router.delete('/proposals/:id', protect, admin, deleteProposal);

router.post('/notify-user', protect, admin, sendAdminNotification);

router.post('/support/submit', submitSupportTicket);
router.get('/support/tickets', protect, admin, getAllSupportTickets);
router.put('/support/tickets/:id', protect, admin, updateTicketStatus);
router.delete('/support/tickets/:id', protect, admin, deleteTicket);

module.exports = router;