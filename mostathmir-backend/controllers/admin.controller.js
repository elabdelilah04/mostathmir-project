const Project = require('../models/project.model');
const Proposal = require('../models/proposal.model');
const User = require('../models/user.model');
const Support = require('../models/support.model');
const FAQ = require('../models/faq.model');
const { createNotification } = require('./notification.controller.js');
const RevisionRequest = require('../models/revision.model');

/**
 * جلب المشاريع للمراجعة
 */
const getProjectsForAdmin = async (req, res, next) => {
    try {
        let query = {};

        if (req.query.status === 'updates-pending') {
            query = { hasPendingChanges: true };
        } else if (req.query.status && req.query.status !== "") {
            const filterStatus = req.query.status === 'pending' ? 'under-review' : req.query.status;
            query = { status: filterStatus };
        } else {
            query = { status: { $ne: 'draft' } };
        }

        if (req.query.keyword) {
            query.projectName = { $regex: req.query.keyword, $options: 'i' };
        }

        const projects = await Project.find(query)
            .populate('owner', 'fullName email')
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (error) {
        next(error);
    }
};

/**
 * تحديث حالة المشروع (قبول/رفض/طلب تعديل)
 */
const updateProjectStatus = async (req, res, next) => {
    try {
        const { status, adminNotes } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const oldStatus = project.status;
        let isUpdateRejection = false;

        if (status === 'published' && project.hasPendingChanges) {
            Object.assign(project, project.pendingChanges); // استبدال البيانات القديمة بالجديدة
            project.pendingChanges = null;
            project.hasPendingChanges = false;
            project.status = 'published'; // ضمان بقاء الحالة منشور
        }

        else if (status === 'closed' && project.hasPendingChanges) {
            project.pendingChanges = null; // حذف المقترحات الجديدة
            project.hasPendingChanges = false; // إزالة علامة وجود تحديث
            isUpdateRejection = true;
        }

        else {
            project.status = status;
        }

        project.adminNotes = adminNotes || '';
        await project.save();

        let messageKey = '';
        const params = { projectName: `"${project.projectName}"` };

        if (isUpdateRejection) {
            messageKey = 'notification_project_update_rejected';
        } else {
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
        }

        if (messageKey) {
            await createNotification({
                recipient: project.owner,
                sender: req.user._id,
                type: 'PROJECT_STATUS_UPDATE',
                messageKey: messageKey,
                messageParams: params,
                link: `/project-view.html?id=${project._id}`,
                note: adminNotes || null,
                projectId: project._id
            });
        }

        res.json({
            success: true,
            message: isUpdateRejection ? 'تم رفض التعديلات المقترحة مع إبقاء المشروع منشوراً' : `تم تحديث حالة المشروع إلى ${status}`
        });
    } catch (error) {
        console.error("Admin: Error updating project status:", error);
        next(error);
    }
};

/**
 * إحصائيات لوحة تحكم الإدارة
 */
const getAdminStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [pending, approvedToday, rejectedToday, updatesPending] = await Promise.all([
            Project.countDocuments({ status: 'under-review' }),
            Project.countDocuments({ status: 'published', updatedAt: { $gte: today } }),
            Project.countDocuments({ status: 'closed', updatedAt: { $gte: today } }),
            Project.countDocuments({ hasPendingChanges: true }) // الإحصائية الجديدة
        ]);
        res.json({
            pendingCount: pending || 0,
            approvedToday: approvedToday || 0,
            rejectedToday: rejectedToday || 0,
            updatesPendingCount: updatesPending || 0
        });
    } catch (error) {
        console.error("Error in getAdminStats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * تمييز المشروع (Featured)
 */
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

/**
 * جلب كافة عروض الشراكة
 */
const getAllProposalsForAdmin = async (req, res, next) => {
    try {
        const proposals = await Proposal.find()
            .populate('investorId', 'fullName email profilePicture role')
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

/**
 * إرسال إشعار رسمي بخصوص عرض شراكة
 */
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

/**
 * حذف عرض شراكة
 */
const deleteProposal = async (req, res, next) => {
    try {
        await Proposal.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * إرسال إشعار إداري مباشر لمستخدم
 */
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
            link: projectId ? `/project-view.html?id=${projectId}` : '/messages.html#notifications'
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * تقديم تذكرة دعم (من قبل المستخدم)
 */
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

/**
 * جلب كافة تذاكر الدعم
 */
const getAllSupportTickets = async (req, res, next) => {
    try {
        const tickets = await Support.find()
            .populate('user', 'fullName profilePicture role')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        next(error);
    }
};

/**
 * تحديث حالة تذكرة دعم
 */
const updateTicketStatus = async (req, res, next) => {
    try {
        const ticket = await Support.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json({ success: true, ticket });
    } catch (error) {
        next(error);
    }
};

/**
 * حذف تذكرة دعم
 */
const deleteTicket = async (req, res, next) => {
    try {
        await Support.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * الرد المباشر عبر المنصة (عبر الإشعارات فقط)
 * التعديل: لا يتم إرسال رسالة شات، فقط إشعار يحتوي على الرد والطلب الأصلي
 */
const replyToSupportDirectly = async (req, res, next) => {
    try {
        const { ticketId, replyMessage } = req.body;
        const ticket = await Support.findById(ticketId);

        if (!ticket || !ticket.user) {
            return res.status(400).json({ message: 'لا يمكن الرد مباشرة على زائر أو تذكرة غير موجودة' });
        }

        // إرسال إشعار رسمي متطور للمستخدم
        await createNotification({
            recipient: ticket.user,
            sender: req.user._id, // مرسل من حساب الآدمن المسجل
            type: 'PROJECT_STATUS_UPDATE', // نوع يدعم عرض الملاحظات
            messageKey: 'notification_support_official_reply',
            messageParams: { ticketId: ticket._id.toString().substring(18) },
            responseMessage: replyMessage, // تخزين الرد الرسمي هنا
            note: ticket.message,         // تخزين نص طلب المستخدم الأصلي كـ "ملاحظة"
            link: '/messages.html#notifications'
        });

        // تحديث حالة التذكرة إلى تم الرد
        ticket.status = 'replied';
        await ticket.save();

        res.json({ success: true, message: 'تم إرسال الرد الرسمي عبر الإشعارات بنجاح' });
    } catch (error) {
        next(error);
    }
};

/**
 * جلب الأسئلة الشائعة FAQ
 */
const getFAQs = async (req, res, next) => {
    try {
        const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 });
        res.json(faqs);
    } catch (error) {
        next(error);
    }
};

/**
 * إضافة سؤال شائع جديد
 */
const addFAQ = async (req, res, next) => {
    try {
        const faq = await FAQ.create(req.body);
        res.status(201).json(faq);
    } catch (error) {
        next(error);
    }
};

/**
 * حذف سؤال شائع
 */
const deleteFAQ = async (req, res, next) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};


// 1. جلب كافة طلبات التعديل للآدمن
const getAllRevisionRequests = async (req, res, next) => {
    try {
        const requests = await RevisionRequest.find()
            .populate('user', 'fullName email')
            .populate('project', 'projectName status')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) { next(error); }
};

// 2. اتخاذ قرار (قبول/رفض) طلب التعديل
const handleRevisionDecision = async (req, res, next) => {
    try {
        const { requestId, decision, adminNote } = req.body;
        const request = await RevisionRequest.findById(requestId).populate('project');

        if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

        request.status = decision;
        request.adminNote = adminNote;
        await request.save();

        if (decision === 'approved') {
            // التعديل الجوهري: نفتح خاصية التعديل مع بقاء المشروع Published
            await Project.findByIdAndUpdate(request.project._id, {
                isRevisionAllowed: true,
                adminRevisionNote: adminNote
            });
        }

        // إرسال إشعار للمستخدم بالقرار
        await createNotification({
            recipient: request.user,
            type: 'PROJECT_STATUS_UPDATE',
            messageKey: decision === 'approved' ? 'notification_revision_approved' : 'notification_revision_rejected',
            messageParams: { projectName: request.project.projectName },
            note: adminNote,
            projectId: request.project._id,
            link: decision === 'approved' ? `/add-project-new.html?id=${request.project._id}` : null
        });

        res.json({ success: true, message: `تم ${decision === 'approved' ? 'قبول' : 'رفض'} طلب التعديل` });
    } catch (error) { next(error); }
};

const getRevisionStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [pending, approvedToday, rejectedToday] = await Promise.all([
            RevisionRequest.countDocuments({ status: 'pending' }),
            RevisionRequest.countDocuments({ status: 'approved', updatedAt: { $gte: today } }),
            RevisionRequest.countDocuments({ status: 'rejected', updatedAt: { $gte: today } })
        ]);

        res.json({
            pendingCount: pending,
            approvedToday: approvedToday,
            rejectedToday: rejectedToday
        });
    } catch (error) {
        next(error);
    }
};

const approveFinalChanges = async (req, res, next) => {
    try {
        const { requestId } = req.body;
        const RevisionRequest = require('../models/revision.model');
        const request = await RevisionRequest.findById(requestId).populate('project');

        if (!request || !request.updatedData) return res.status(400).json({ message: 'لا توجد بيانات للتحديث' });

        // 1. نقل البيانات الجديدة للمشروع الأصلي (Merging)
        const updatedFields = request.updatedData;
        Object.assign(request.project, updatedFields);

        // 2. التأكد من بقاء الحالة Published
        request.project.status = 'published';
        await request.project.save();

        // 3. إغلاق الطلب
        request.status = 'approved'; // أو حالة جديدة مثل 'finalized'
        await request.save();

        res.json({ success: true, message: 'تم نشر التعديلات الجديدة بنجاح' });
    } catch (error) { next(error); }
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
    replyToSupportDirectly,
    getFAQs,
    addFAQ,
    deleteFAQ,
    handleRevisionDecision,
    getAllRevisionRequests,
    getRevisionStats,
    approveFinalChanges,
};