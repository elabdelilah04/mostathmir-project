const Project = require('../models/project.model');
const Proposal = require('../models/proposal.model');
const User = require('../models/user.model');
const Support = require('../models/support.model');
const FAQ = require('../models/faq.model'); // استدعاء الموديل الجديد
const Message = require('../models/message.model'); // استدعاء موديل الرسائل للرد المباشر
const { createNotification } = require('./notification.controller.js');

const getProjectsForAdmin = async (req, res, next) => {
    try {
        const query = { status: { $ne: 'draft' } };
        if (req.query.status) {
            query.status = req.query.status === 'pending' ? 'under-review' : req.query.status;
        }
        if (req.query.keyword) {
            query.projectName = { $regex: req.query.keyword, $options: 'i' };
        }
        let sortOrder = { createdAt: -1 };
        if (req.query.sort === 'oldest') {
            sortOrder = { createdAt: 1 };
        }
        const projects = await Project.find(query).populate('owner', 'fullName email').sort(sortOrder);
        res.json(projects);
    } catch (error) {
        next(error);
    }
};

const updateProjectStatus = async (req, res, next) => {
    try {
        const { status, adminNotes } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

        const oldStatus = project.status;
        project.status = status;
        project.adminNotes = adminNotes || '';
        await project.save();

        if (oldStatus !== status) {
            let messageKey = '';
            const params = { projectName: `"${project.projectName}"` };
            switch (status) {
                case 'published':
                    messageKey = adminNotes ? 'notification_project_approved_with_notes' : 'notification_project_approved';
                    break;
                case 'closed':
                    messageKey = adminNotes ? 'notification_project_rejected_with_notes' : 'notification_project_rejected';
                    break;
                case 'needs-revision':
                    messageKey = adminNotes ? 'notification_project_revision_with_notes' : 'notification_project_revision';
                    break;
            }
            if (messageKey) {
                await createNotification({
                    recipient: project.owner,
                    type: 'PROJECT_STATUS_UPDATE',
                    messageKey: messageKey,
                    messageParams: params,
                    link: `/project-view.html?id=${project._id}`,
                    note: adminNotes || null,
                    projectId: project._id
                });
            }
        }
        res.json({ message: `تم تحديث الحالة إلى ${status}` });
    } catch (error) {
        next(error);
    }
};

const getAdminStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [pending, approvedToday, rejectedToday] = await Promise.all([
            Project.countDocuments({ status: 'under-review' }),
            Project.countDocuments({ status: 'published', updatedAt: { $gte: today } }),
            Project.countDocuments({ status: 'closed', updatedAt: { $gte: today } })
        ]);
        res.json({ pendingCount: pending, approvedToday, rejectedToday });
    } catch (error) {
        next(error);
    }
};

const toggleFeaturedStatus = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });
        project.isFeatured = !project.isFeatured;
        await project.save();
        res.json({ success: true, isFeatured: project.isFeatured });
    } catch (error) {
        next(error);
    }
};

const getAllProposalsForAdmin = async (req, res, next) => {
    try {
        const proposals = await Proposal.find()
            .populate('investorId', 'fullName email profilePicture')
            .populate({
                path: 'projectId',
                select: 'projectName owner',
                populate: { path: 'owner', select: 'fullName email' }
            })
            .sort({ createdAt: -1 });
        res.json(proposals);
    } catch (error) {
        next(error);
    }
};

const notifyProposalParty = async (req, res, next) => {
    try {
        const { recipientId, adminNote, proposalId, projectName, projectId } = req.body;
        await createNotification({
            recipient: recipientId,
            sender: req.user._id,
            type: 'PROJECT_STATUS_UPDATE',
            messageKey: 'notification_admin_proposal_official',
            messageParams: { projectName: projectName || 'المشروع', adminNote },
            note: adminNote,
            projectId: projectId,
            referenceId: proposalId,
            link: '/messages.html#notifications'
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const deleteProposal = async (req, res, next) => {
    try {
        await Proposal.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const sendAdminNotification = async (req, res, next) => {
    try {
        const { recipientId, message, projectId } = req.body;
        await createNotification({
            recipient: recipientId,
            sender: req.user._id,
            type: 'PROJECT_STATUS_UPDATE',
            messageKey: 'notification_admin_direct_message',
            messageParams: { adminMessage: message },
            note: message,
            projectId: projectId,
            link: `/project-view.html?id=${projectId}`
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// --- دوال نظام الدعم المحدثة ---

const submitSupportTicket = async (req, res, next) => {
    try {
        const { name, email, type, message } = req.body;
        const userId = req.user ? req.user._id : null;
        const ticket = await Support.create({ user: userId, name, email, type, message });
        res.status(201).json({ success: true, ticket });
    } catch (error) {
        next(error);
    }
};

const getAllSupportTickets = async (req, res, next) => {
    try {
        const tickets = await Support.find()
            .populate('user', 'fullName profilePicture')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        next(error);
    }
};

const updateTicketStatus = async (req, res, next) => {
    try {
        const ticket = await Support.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json({ success: true, ticket });
    } catch (error) {
        next(error);
    }
};

const deleteTicket = async (req, res, next) => {
    try {
        await Support.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// الرد المباشر عبر المنصة (جديد)
const replyToSupportDirectly = async (req, res, next) => {
    try {
        const { ticketId, replyMessage } = req.body;
        const ticket = await Support.findById(ticketId);

        if (!ticket || !ticket.user) {
            return res.status(400).json({ message: 'لا يمكن الرد مباشرة على زائر أو تذكرة غير موجودة' });
        }

        // 1. إرسال رسالة شات رسمية للمستخدم من قبل الإدارة
        await Message.create({
            sender: req.user._id, // الآدمن المسجل
            recipient: ticket.user,
            subject: 'اقتراح شراكة', // نستخدم subject موجود في الـ Enum الأصلي 'اقتراح شراكة' أو نعدل الـ Model لاحقاً
            content: `[رد رسمي بخصوص طلبك رقم ${ticket._id.toString().substring(18)}]: \n\n ${replyMessage}`
        });

        // 2. إرسال إشعار للمستخدم
        await createNotification({
            recipient: ticket.user,
            sender: req.user._id,
            type: 'NEW_MESSAGE',
            messageKey: 'notification_support_reply',
            messageParams: { ticketId: ticket._id.toString().substring(18) },
            link: '/messages.html#messages'
        });

        // 3. تحديث حالة التذكرة إلى "Replied"
        ticket.status = 'replied';
        await ticket.save();

        res.json({ success: true, message: 'تم إرسال الرد وتحديث الحالة' });
    } catch (error) {
        next(error);
    }
};

// دوال الـ FAQ الديناميكية (جديد)
const getFAQs = async (req, res, next) => {
    try {
        const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 });
        res.json(faqs);
    } catch (error) {
        next(error);
    }
};

const addFAQ = async (req, res, next) => {
    try {
        const faq = await FAQ.create(req.body);
        res.status(201).json(faq);
    } catch (error) {
        next(error);
    }
};

const deleteFAQ = async (req, res, next) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProjectsForAdmin,
    updateProjectStatus,
    getAdminStats,
    toggleFeaturedStatus,
    getAllProposalsForAdmin,
    notifyProposalParty,
    deleteProposal,
    sendAdminNotification,
    submitSupportTicket,
    getAllSupportTickets,
    updateTicketStatus,
    deleteTicket,
    replyToSupportDirectly, // تصدير الدالة الجديدة
    getFAQs,                // تصدير دوال FAQ
    addFAQ,
    deleteFAQ
};