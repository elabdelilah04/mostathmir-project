const Message = require('../models/message.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');

const getUserMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const messages = await Message.find({
            $or: [{ sender: userId }, { recipient: userId }]
        })
            .populate('sender', 'fullName profilePicture accountType profileTitle')
            .populate('recipient', 'fullName profilePicture accountType profileTitle')
            .sort({ createdAt: -1 });

        const conversations = {};
        messages.forEach(message => {
            const otherUser = message.sender._id.toString() === userId.toString() ? message.recipient : message.sender;
            const otherUserId = otherUser._id.toString();

            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    otherUser: {
                        _id: otherUser._id,
                        fullName: otherUser.fullName,
                        profilePicture: otherUser.profilePicture,
                        accountType: otherUser.accountType,
                        profileTitle: otherUser.profileTitle
                    },
                    lastMessage: message,
                    unreadCount: 0
                };
            }
            if (!message.read && message.recipient.toString() === userId.toString()) {
                conversations[otherUserId].unreadCount += 1;
            }
        });

        const conversationsArray = Object.values(conversations);
        res.json(conversationsArray);

    } catch (error) {
        console.error("Error fetching user messages:", error);
        next(error);
    }
};

const getConversation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const otherUserId = req.params.otherUserId;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: otherUserId },
                { sender: otherUserId, recipient: userId }
            ]
        })
            .populate('sender', 'fullName profilePicture accountType profileTitle')
            .populate('recipient', 'fullName profilePicture accountType profileTitle')
            .populate('relatedProject', 'projectName') // جلب اسم المشروع
            .sort({ createdAt: 'asc' });

        await Message.updateMany(
            { sender: otherUserId, recipient: userId, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error("Error fetching conversation:", error);
        next(error);
    }
};

const createMessage = async (req, res, next) => {
    const { recipientId, content, subject, relatedProject } = req.body;
    const senderId = req.user._id;

    if (!recipientId || !content) {
        return res.status(400).json({ message: 'البيانات المطلوبة غير كاملة (المستقبل أو المحتوى).' });
    }
    if (senderId.toString() === recipientId) {
        return res.status(400).json({ message: 'لا يمكنك إرسال رسالة إلى نفسك.' });
    }
    try {
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'المستخدم المُستقبِل غير موجود.' });
        }
        const message = await Message.create({
            sender: senderId,
            recipient: recipientId,
            content: content,
            subject: subject,
            relatedProject: relatedProject || null
        });
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'fullName profilePicture accountType profileTitle')
            .populate('recipient', 'fullName profilePicture accountType profileTitle');

        res.status(201).json({
            message: 'تم إرسال الرسالة بنجاح.',
            data: populatedMessage
        });
    } catch (error) {
        console.error("Error creating message:", error);
        next(error);
    }
};

const markAllMessagesAsRead = async (req, res, next) => {
    try {
        await Message.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'All messages marked as read.' });
    } catch (error) {
        next(error);
    }
};

const deleteConversation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const otherUserId = req.params.otherUserId;
        await Message.deleteMany({
            $or: [
                { sender: userId, recipient: otherUserId },
                { sender: otherUserId, recipient: userId }
            ]
        });
        res.json({ message: 'Conversation deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

const deleteAllConversations = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await Message.deleteMany({
            $or: [{ sender: userId }, { recipient: userId }]
        });
        res.json({ message: 'All conversations deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createMessage,
    getUserMessages,
    getConversation,
    markAllMessagesAsRead,
    deleteConversation,
    deleteAllConversations
};