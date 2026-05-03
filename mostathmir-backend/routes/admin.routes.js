const express = require('express');
const router = express.Router();
const { getProjectsForAdmin, updateProjectStatus, getAdminStats, toggleFeaturedStatus } = require('../controllers/admin.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
const { admin } = require('../middleware/admin.middleware.js');

router.get('/projects', protect, admin, getProjectsForAdmin);
router.put('/projects/:id/status', protect, admin, updateProjectStatus);
router.get('/stats', protect, admin, getAdminStats);
router.put('/projects/:id/featured', protect, admin, toggleFeaturedStatus);

module.exports = router;