const Project = require('../models/project.model');
const { createNotification } = require('./notification.controller.js');
const Proposal = require('../models/proposal.model');


const getProjectsForAdmin = async (req, res, next) => {
    try {
        const query = {
            status: { $ne: 'draft' }
        };

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

        const projects = await Project.find(query).populate('owner', 'fullName').sort(sortOrder);
        res.json(projects);

    } catch (error) {
        console.error("Admin: Error fetching projects:", error);
        next(error);
    }
};

const updateProjectStatus = async (req, res, next) => {
    try {
        const { status, adminNotes } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'المشروع غير موجود' });
        }

        const oldStatus = project.status;
        const oldAdminNotes = project.adminNotes;

        project.status = status;
        project.adminNotes = adminNotes || '';

        await project.save();

        if (oldStatus !== status || (oldStatus === status && oldAdminNotes !== adminNotes && adminNotes)) {
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
                default:
                    if (oldStatus === status && adminNotes) {
                        messageKey = 'notification_admin_new_notes';
                    }
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

        res.json({ message: `تم تحديث حالة المشروع إلى ${status}` });
    } catch (error) {
        console.error("Admin: Error updating project status:", error);
        next(error);
    }
};

const getAdminStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingCount = Project.countDocuments({ status: 'under-review' });

        const approvedToday = Project.countDocuments({
            status: 'published',
            updatedAt: { $gte: today }
        });

        const rejectedToday = Project.countDocuments({
            status: 'closed',
            updatedAt: { $gte: today }
        });

        const [pending, approved, rejected] = await Promise.all([
            pendingCount,
            approvedToday,
            rejectedToday
        ]);

        res.json({
            pendingCount: pending,
            approvedToday: approved,
            rejectedToday: rejected
        });

    } catch (error) {
        console.error("Admin: Error getting stats:", error);
        next(error);
    }
};

const toggleFeaturedStatus = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

        // عكس القيمة الحالية
        project.isFeatured = !project.isFeatured;
        await project.save();

        res.json({
            message: project.isFeatured ? 'تمت إضافة المشروع للمشاريع المميزة' : 'تمت إزالة المشروع من المميزة',
            isFeatured: project.isFeatured
        });
    } catch (error) {
        next(error);
    }
};

const getAllProposalsForAdmin = async (req, res, next) => {
    try {
        const proposals = await Proposal.find()
            .populate('investorId', 'fullName email profilePicture') // بيانات مرسل العرض
            .populate({
                path: 'projectId',
                select: 'projectName owner',
                populate: { path: 'owner', select: 'fullName email' } // بيانات صاحب المشروع
            })
            .sort({ createdAt: -1 });

        res.json(proposals);
    } catch (error) {
        console.error("Admin: Error fetching proposals:", error);
        next(error);
    }
};
// دالة إرسال إشعار إداري يدوي
const sendAdminNotification = async (req, res, next) => {
    const { recipientId, message, projectId } = req.body;

    try {
        await createNotification({
            recipient: recipientId,
            sender: req.user._id, // معرف الآدمن
            type: 'PROJECT_STATUS_UPDATE',
            messageKey: 'notification_admin_direct_message',
            messageParams: { adminMessage: message },
            note: message,
            projectId: projectId,
            link: `/project-view.html?id=${projectId}`
        });

        res.json({ success: true, message: 'تم إرسال الإشعار بنجاح' });
    } catch (error) {
        console.error("Admin: Error sending notification:", error);
        next(error);
    }
};
// 1. دالة إرسال إشعار إداري بخصوص اقتراح محدد
const notifyProposalParty = async (req, res, next) => {
    const { recipientId, adminNote, proposalId, senderName, projectId } = req.body;

    try {
        await createNotification({
            recipient: recipientId,
            sender: req.user._id, // الآدمن
            type: 'PROJECT_STATUS_UPDATE',
            messageKey: 'notification_admin_proposal_official', // مفتاح الترجمة الجديد
            messageParams: { projectName, adminNote }, // إرسال اسم المشروع والملاحظة
            note: adminNote,
            projectId: projectId,
            referenceId: proposalId,
            link: '/messages.html#notifications' // سيوجهه لمكان رؤية تفاصيل الإشعار
        });

        res.json({ success: true, message: 'تم توجيه الإشعار بنجاح' });
    } catch (error) {
        next(error);
    }
};

// 2. دالة حذف الاقتراح نهائياً
const deleteProposal = async (req, res, next) => {
    try {
        await Proposal.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'تم حذف الاقتراح نهائياً' });
    } catch (error) {
        next(error);
    }
};


module.exports = { getProjectsForAdmin, updateProjectStatus, getAdminStats, toggleFeaturedStatus, getAllProposalsForAdmin, sendAdminNotification, notifyProposalParty, deleteProposal };