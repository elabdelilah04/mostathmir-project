const Project = require('../models/project.model');
const { createNotification } = require('./notification.controller.js');

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

module.exports = { getProjectsForAdmin, updateProjectStatus, getAdminStats };