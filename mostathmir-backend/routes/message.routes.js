const express = require('express');
const router = express.Router();
const {
    createMessage,
    getUserMessages,
    getConversation,
    deleteConversation,
    deleteAllConversations,
    markAllMessagesAsRead
} = require('../controllers/message.controller.js');
const { protect } = require('../middleware/auth.middleware.js');

router.get('/', protect, getUserMessages);
router.get('/conversation/:otherUserId', protect, getConversation);
router.post('/', protect, createMessage);
router.put('/read-all', protect, markAllMessagesAsRead);
router.delete('/conversation/:otherUserId', protect, deleteConversation);
router.delete('/', protect, deleteAllConversations);

module.exports = router;