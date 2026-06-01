const Message = require('../models/message.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');

const getUserMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const lastMessages = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { recipient: userId }],
                    deletedBy: { $ne: userId }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $gt: ["$sender", "$recipient"] },
                            { $concat: [{ "$toString": "$sender" }, "-", { "$toString": "$recipient" }] },
                            { $concat: [{ "$toString": "$recipient" }, "-", { "$toString": "$sender" }] }
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$lastMessage" } },
            { $sort: { createdAt: -1 } }
        ]);

        // التعديل هنا: إضافة حقل role لتمكين الواجهة من التعرف على الإدارة
        await User.populate(lastMessages, {
            path: "sender recipient",
            select: "fullName profilePicture accountType profileTitle role"
        });

        const conversations = [];
        for (const message of lastMessages) {
            const otherUser = message.sender._id.toString() === userId.toString() ? message.recipient : message.sender;

            const unreadCount = await Message.countDocuments({
                sender: otherUser._id,
                recipient: userId,
                read: false,
                deletedBy: { $ne: userId }
            });

            conversations.push({
                otherUser: otherUser,
                lastMessage: message,
                unreadCount: unreadCount
            });
        }

        res.json(conversations);

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
            ],
            deletedBy: { $ne: userId }
        })
            // التعديل هنا: إضافة حقل role في populate للمرسل والمستقبل
            .populate('sender', 'fullName profilePicture accountType profileTitle role')
            .populate('recipient', 'fullName profilePicture accountType profileTitle role')
            .populate('relatedProject', 'projectName')
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

        // التعديل هنا: إضافة حقل role لضمان ظهور هوية المنصة فور الإرسال
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'fullName profilePicture accountType profileTitle role')
            .populate('recipient', 'fullName profilePicture accountType profileTitle role');

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

        await Message.updateMany(
            {
                $or: [
                    { sender: userId, recipient: otherUserId },
                    { sender: otherUserId, recipient: userId }
                ],
                deletedBy: { $ne: userId }
            },
            {
                $addToSet: { deletedBy: userId }
            }
        );

        res.json({ message: 'Conversation deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

const deleteAllConversations = async (req, res, next) => {
    try {
        const userId = req.user._id;

        await Message.updateMany(
            {
                $or: [{ sender: userId }, { recipient: userId }],
                deletedBy: { $ne: userId }
            },
            {
                $addToSet: { deletedBy: userId }
            }
        );

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