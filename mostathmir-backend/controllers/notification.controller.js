const Notification = require('../models/notification.model.js');

const createNotification = async (notificationData) => {
    try {
        await Notification.create(notificationData);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

const getUserNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'fullName profilePicture _id')
            .populate('projectId', 'projectName _id')
            .sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification && notification.recipient.toString() === req.user._id.toString()) {
            notification.read = true;
            await notification.save();
            res.json({ message: 'Notification marked as read.' });
        } else {
            res.status(404).json({ message: 'Notification not found or unauthorized.' });
        }
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};

const deleteAllNotifications = async (req, res, next) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.json({ message: 'All notifications have been deleted.' });
    } catch (error) {
        next(error);
    }
};

const deleteNotificationById = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification && notification.recipient.toString() === req.user._id.toString()) {
            await notification.deleteOne();
            res.json({ message: 'Notification deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Notification not found or unauthorized.' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    deleteNotificationById
};