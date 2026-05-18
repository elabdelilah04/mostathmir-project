const Project = require('../models/project.model');
const Proposal = require('../models/proposal.model');
const User = require('../models/user.model');
const Support = require('../models/support.model');
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
        res.json({ success: true, message: 'تم إرسال الإشعار بنجاح' });
    } catch (error) {
        next(error);
    }
};

const deleteProposal = async (req, res, next) => {
    try {
        await Proposal.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'تم الحذف بنجاح' });
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

const submitSupportTicket = async (req, res, next) => {
    try {
        const { name, email, type, message } = req.body;
        const userId = req.user ? req.user._id : null;
        const ticket = await Support.create({ name, email, type, message });
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
        const { status } = req.body;
        const ticket = await Support.findByIdAndUpdate(req.params.id, { status }, { new: true });
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
    deleteTicket
};