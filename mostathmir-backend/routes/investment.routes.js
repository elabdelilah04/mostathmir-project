const express = require('express');
const router = express.Router();
const { registerInvestment, getProjectInvestors } = require('../controllers/investment.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
// المسار سيكون الآن POST /api/investments/
router.post('/', protect, registerInvestment);
// مسار جديد لجلب المستثمرين لمشروع معين
router.get('/:projectId/investors', protect, getProjectInvestors);
module.exports = router;