const express = require('express');
const router = express.Router();
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    deleteNotificationById
} = require('../controllers/notification.controller.js');
const { protect } = require('../middleware/auth.middleware.js');

router.get('/', protect, getUserNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/', protect, deleteAllNotifications);
router.delete('/:id', protect, deleteNotificationById);

module.exports = router;