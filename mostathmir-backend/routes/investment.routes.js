const express = require('express');
const router = express.Router();
const {
    registerInvestment,
    getProjectInvestors,
    toggleInvestmentVisibility,
} = require('../controllers/investment.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
router.post('/', protect, registerInvestment);
router.get('/:projectId/investors', protect, getProjectInvestors);
router.put('/:id/visibility', protect, toggleInvestmentVisibility);

module.exports = router;