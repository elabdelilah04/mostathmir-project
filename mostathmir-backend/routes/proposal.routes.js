const express = require('express');
const router = express.Router();
const { createCustomProposal, respondToProposal } = require('../controllers/proposal.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, createCustomProposal);

router.put('/:id/respond', protect, respondToProposal);

module.exports = router;