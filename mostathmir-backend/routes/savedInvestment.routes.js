const express = require('express');
const router = express.Router();
const { saveInvestmentDraft } = require('../controllers/savedInvestment.controller');
const { protect } = require('../middleware/auth.middleware');

// المسار: POST /api/saved-investments
router.post('/', protect, saveInvestmentDraft);

// يمكن إضافة مسار لجلب المسودات المحفوظة لاحقاً:
// router.get('/', protect, getSavedDrafts);

module.exports = router;