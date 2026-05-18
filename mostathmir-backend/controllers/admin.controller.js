const Project = require('../models/project.model');
const Proposal = require('../models/proposal.model');
const User = require('../models/user.model');
const { createNotification } = require('./notification.controller.js');

/**
 * 1. جلب المشاريع للمراجعة (مع الفلاتر والبحث)
 */
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
        console.error("Admin: Error fetching projects:", error);
        next(error);
    }
};

/**
 * 2. تحديث حالة المشروع (قبول/رفض/طلب مراجعة) مع إشعار آلي
 */
const updateProjectStatus = async (req, res, next) => {
    try {
        const { status, adminNotes } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

        const oldStatus = project.status;
        project.status = status;
        project.adminNotes = adminNotes || '';

        await project.save();

        // إرسال إشعار لصاحب المشروع عند تغيير الحالة
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

        res.json({ message: `تم تحديث الحالة بنجاح إلى ${status}` });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. جلب إحصائيات لوحة تحكم الآدمن
 */
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

/**
 * 4. تبديل حالة المشروع "كمميز" (Featured) لعرضه في الصفحة الرئيسية
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
 * 5. جلب كافة عروض الشراكة (Proposals) لإدارتها
 */
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
        console.error("Admin: Error fetching proposals:", error);
        next(error);
    }
};

/**
 * 6. إرسال إشعار إداري رسمي بخصوص "عرض شراكة" محدد (الصيغة المطلوبة)
 */
const notifyProposalParty = async (req, res, next) => {
    const { recipientId, adminNote, proposalId, projectName, projectId } = req.body;

    try {
        // التحقق من البيانات الأساسية
        if (!recipientId || !adminNote) {
            return res.status(400).json({ message: 'نقص في بيانات الإشعار' });
        }

        await createNotification({
            recipient: recipientId,
            sender: req.user._id, // الآدمن
            type: 'PROJECT_STATUS_UPDATE',
            // هذا المفتاح يتم تعريفه في translation.js ليظهر الصيغة التي طلبتها
            messageKey: 'notification_admin_proposal_official',
            messageParams: {
                projectName: projectName || 'المشروع',
                adminNote: adminNote
            },
            note: adminNote,
            projectId: projectId,
            referenceId: proposalId,
            link: '/messages.html#notifications'
        });

        res.json({ success: true, message: 'تم إرسال الإشعار الرسمي بنجاح' });
    } catch (error) {
        console.error("Error in notifyProposalParty:", error);
        res.status(500).json({ message: 'فشل إرسال الإشعار من السيرفر' });
    }
};

/**
 * 7. إرسال إشعار إداري عام لأي مستخدم
 */
const sendAdminNotification = async (req, res, next) => {
    const { recipientId, message, projectId } = req.body;
    try {
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
        res.json({ success: true, message: 'تم إرسال الإشعار' });
    } catch (error) {
        next(error);
    }
};

/**
 * 8. حذف عرض شراكة نهائياً (في حالات Spam)
 */
const deleteProposal = async (req, res, next) => {
    try {
        const deleted = await Proposal.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'العرض غير موجود' });
        res.json({ success: true, message: 'تم حذف العرض نهائياً' });
    } catch (error) {
        next(error);
    }
};

const Support = require('../models/support.model');

// إرسال تذكرة دعم (من قبل المستخدم)
const submitSupportTicket = async (req, res) => {
    try {
        const { name, email, type, message } = req.body;
        await Support.create({ name, email, type, message });
        res.status(201).json({ success: true, message: 'تم استلام رسالتك بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'فشل إرسال الرسالة' });
    }
};

// جلب كافة التذاكر (للآدمن)
const getAllSupportTickets = async (req, res) => {
    try {
        const tickets = await Support.find().sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets' });
    }
};


module.exports = {
    getProjectsForAdmin,
    updateProjectStatus,
    getAdminStats,
    toggleFeaturedStatus,
    getAllProposalsForAdmin,
    sendAdminNotification,
    notifyProposalParty,
    deleteProposal,
    submitSupportTicket,
    getAllSupportTickets,
};