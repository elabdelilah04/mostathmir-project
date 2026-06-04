const Project = require('../models/project.model');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Investment = require('../models/investment.model');
const { createNotification } = require('./notification.controller.js');
const cloudinary = require('cloudinary').v2;
const RevisionRequest = require('../models/revision.model');
const exchangeRatesToUSD = {
    "SAR": 0.27, "AED": 0.27, "QAR": 0.27, "OMR": 2.60,
    "KWD": 3.25, "BHD": 2.65, "EGP": 0.021, "JOD": 1.41,
    "MAD": 0.10, "USD": 1, "EUR": 1.08,
};
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const parseProjectData = (body) => {
    const data = { ...body };
    const fieldsToParse = [
        'projectLocation', 'keyFeatures', 'fundingGoal', 'fundingDetails',
        'financialProjections', 'targetInvestors', 'teamMembers', 'budgetBreakdown',
        'pastFinancials'
    ];
    fieldsToParse.forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
            try {
                data[field] = JSON.parse(data[field]);
            } catch (e) {
                console.error(`Failed to parse field ${field}:`, e);
                data[field] = Array.isArray(Project.schema.path(field).caster) ? [] : {};
            }
        }
    });
    return data;
};

const createProject = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'ideaHolder') {
            return res.status(403).json({ message: 'Only Idea Holders can create projects.' });
        }
        const parsedData = parseProjectData(req.body);
        const projectStatus = parsedData.status === 'draft' ? 'draft' : 'under-review';
        const newProject = new Project({
            ...parsedData,
            owner: req.user._id,
            status: projectStatus,
        });

        if (req.files) {
            if (req.files.projectImages && req.files.projectImages.length > 0) {
                newProject.mainImage = req.files.projectImages[0].path;
                newProject.projectImages = req.files.projectImages.map(file => file.path);
            }
            if (req.files.businessPlan) {
                newProject.businessPlan = req.files.businessPlan[0].path;
            }
            if (req.files.presentation) {
                newProject.presentation = req.files.presentation[0].path;
            }
        }

        const createdProject = await newProject.save();

        if (createdProject.status === 'under-review') {
            await createNotification({
                recipient: createdProject.owner,
                type: 'PROJECT_STATUS_UPDATE',
                messageKey: 'notification_project_submitted',
                messageParams: { projectName: `"${createdProject.projectName}"` },
                link: `/my-projects.html`,
                projectId: createdProject._id
            });
        }
        res.status(201).json(createdProject);
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(400).json({ message: error.message });
    }
};
const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found.' });

        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this project.' });
        }

        const hasInvestments = (project.fundingAmountRaised || 0) > 0;
        if (hasInvestments && !project.isRevisionAllowed && project.status === 'published') {
            return res.status(403).json({ message: 'تعديل المشروع المنشور يتطلب إذن مراجعة من الإدارة.' });
        }

        const parsedData = parseProjectData(req.body);
        const oldStatus = project.status;

        let fileData = {};
        if (req.files) {
            if (req.files.projectImages && req.files.projectImages.length > 0) {
                const newImagePaths = req.files.projectImages.map(file => file.path);
                fileData.projectImages = [...(project.projectImages || []), ...newImagePaths];
                if (!project.mainImage) fileData.mainImage = newImagePaths[0];
            }
            if (req.files.businessPlan) fileData.businessPlan = req.files.businessPlan[0].path;
            if (req.files.presentation) fileData.presentation = req.files.presentation[0].path;
        }

        const finalUpdateData = { ...parsedData, ...fileData };

        if (project.status === 'published' && project.isRevisionAllowed) {
            project.pendingChanges = finalUpdateData;
            project.hasPendingChanges = true;
            project.isRevisionAllowed = false;
            await project.save();
            return res.json({
                message: 'تم إرسال التعديلات لصفحة المصادقة بنجاح. سيبقى مشروعك منشوراً بالبيانات الحالية حتى الموافقة.',
                stayPublished: true
            });
        }

        Object.keys(finalUpdateData).forEach(key => {
            if (Project.schema.path(key)) {
                project[key] = finalUpdateData[key];
            }
        });

        if (finalUpdateData.status === 'under-review') {
            project.status = 'under-review';
        } else if (finalUpdateData.status === 'draft') {
            project.status = 'draft';
        }

        const updatedProject = await project.save();

        if (updatedProject.status === 'under-review' && oldStatus !== 'under-review') {
            await createNotification({
                recipient: updatedProject.owner,
                type: 'PROJECT_STATUS_UPDATE',
                messageKey: 'notification_project_resubmitted',
                messageParams: { projectName: `"${updatedProject.projectName}"` },
                link: `/my-projects.html`,
                projectId: updatedProject._id
            });
        }

        res.json(updatedProject);
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(400).json({ message: error.message });
    }
};

const getMyProjects = async (req, res, next) => {
    try {
        const query = { owner: req.user._id };
        if (req.query.keyword) query.projectName = { $regex: req.query.keyword, $options: 'i' };
        if (req.query.status) query.status = req.query.status;
        let sortOrder = { createdAt: -1 };
        if (req.query.sort === 'oldest') sortOrder = { createdAt: 1 };
        const projects = await Project.find(query).sort(sortOrder).populate('followers', 'fullName profilePicture accountType profileTitle');
        res.json(projects);
    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'fullName profileTitle profilePicture socialLinks');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // --- محاولة التعرف على المستخدم الزائر (سواء عبر middleware أو مانيوال) ---
        let viewingUser = req.user;
        if (!viewingUser) {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    viewingUser = await User.findById(decoded.id);
                } catch (error) {
                    viewingUser = null;
                }
            }
        }

        const isOwner = viewingUser && project.owner._id.equals(viewingUser._id);
        const isAdmin = viewingUser && viewingUser.role === 'admin';

        // 1. حماية المشاريع غير المنشورة (Drafts / Review)
        const publicStatuses = ['published', 'funded', 'completed'];
        if (!publicStatuses.includes(project.status)) {
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'هذا المشروع غير متاح للعرض العام حالياً.' });
            }
        }

        // 2. تطبيق قيود الخصوصية والتوثيق (للروابط المباشرة)
        // يتم تطبيق هذه القيود على الجميع ما عدا المالك والآدمن
        if (!isOwner && !isAdmin) {

            // أ- المنع التام للزوار (يجب تسجيل الدخول لرؤية أي مشروع)
            if (!viewingUser) {
                return res.status(401).json({ message: 'يرجى تسجيل الدخول لمشاهدة تفاصيل المشروع.' });
            }

            // ب- فحص قيد "للمستثمرين فقط"
            if (project.visibilityScope === 'investors_only' && viewingUser.accountType !== 'investor') {
                return res.status(403).json({ message: 'عذراً، هذا المشروع مخصص للمستثمرين فقط ولا يمكن لرواد الأعمال الآخرين الاطلاع عليه.' });
            }

            // ج- فحص قيد "للحسابات الموثقة فقط" (توثيق الهاتف)
            if (project.accessRestriction === 'verified_only' && !viewingUser.isPhoneVerified) {
                return res.status(403).json({ message: 'يجب توثيق حسابك وتأكيد رقم الهاتف لتتمكن من رؤية تفاصيل هذا المشروع.' });
            }
        }

        // 3. تحديث عدد المشاهدات (إذا كان المشاهد ليس المالك)
        if (viewingUser && !isOwner) {
            project.views = (project.views || 0) + 1;
            await project.save({ timestamps: false });
        }

        // 4. تجهيز البيانات للإرسال
        const projectObject = project.toObject();
        const investments = await Investment.find({ project: project._id })
            .populate('investor', 'fullName profilePicture profileTitle accountType');

        projectObject.investorsCount = investments.length;

        // 5. منطق المالك (عرض تفاصيل المستثمرين وتحويل العملات)
        if (isOwner) {
            const projectCurrency = project.fundingGoal?.currency || 'USD';
            const projectRate = exchangeRatesToUSD[projectCurrency] || 1;

            projectObject.investorDetails = investments.map(inv => {
                const invObj = inv.toObject();
                if (invObj.currency !== projectCurrency) {
                    const investmentRate = exchangeRatesToUSD[invObj.currency] || 1;
                    const amountInUSD = invObj.amount * investmentRate;
                    invObj.equivalentAmount = amountInUSD / projectRate;
                }
                return invObj;
            });
        }

        res.json(projectObject);

    } catch (error) {
        console.error("Error in getProjectById:", error);
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.fundingAmountRaised > 0) {
            return res.status(403).json({
                message: 'لا يمكن حذف المشروع لأنه يحتوي على استثمارات قائمة.'
            });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await project.deleteOne();
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getAllProjects = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.json([]);
        }

        const user = req.user;

        let investedProjectIds = [];
        if (user.accountType === 'investor') {
            investedProjectIds = await Investment.find({ investor: user._id }).distinct('project');
        }

        const query = {
            $or: [
                {
                    status: 'published',
                    $and: [
                        {
                            $or: [
                                { visibilityScope: 'public' },
                                {
                                    visibilityScope: 'investors_only',
                                    $expr: { $eq: [user.accountType, 'investor'] }
                                }
                            ]
                        },
                        {
                            $or: [
                                { accessRestriction: 'all' },
                                {
                                    accessRestriction: 'verified_only',
                                    $expr: { $eq: [user.isPhoneVerified, true] }
                                }
                            ]
                        }
                    ]
                },
                {
                    _id: { $in: investedProjectIds },
                    status: { $in: ['funded', 'completed'] }
                },
                { owner: user._id }
            ]
        };

        const projects = await Project.find(query)
            .populate('owner', 'fullName profileTitle profilePicture')
            .sort({ createdAt: -1 });

        res.json(projects);

    } catch (error) {
        console.error("Error in getAllProjects:", error);
        next(error);
    }
};

const toggleFollowProject = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'Only investors can follow projects.' });
        }
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        const user = req.user;
        const isFollowing = project.followers.some(followerId => followerId.equals(user._id));
        let messageKey = '';
        const params = { userName: user.fullName, projectName: `"${project.projectName}"` };
        if (isFollowing) {
            project.followers.pull(user._id);
            messageKey = 'notification_project_unfollowed';
        } else {
            project.followers.push(user._id);
            messageKey = 'notification_project_followed';
        }
        await project.save();
        await createNotification({
            recipient: project.owner,
            type: isFollowing ? 'PROJECT_UNFOLLOW' : 'NEW_FOLLOWER',
            messageKey: messageKey,
            messageParams: params,
            link: `/project-view.html?id=${project._id}`,
            sender: user._id,
            projectId: project._id
        });
        res.json({ isFollowing: !isFollowing, followersCount: project.followers.length });
    } catch (error) {
        next(error);
    }
};

const deleteProjectFile = async (req, res, next) => {
    try {
        const { fileType, filePath } = req.body;
        const projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project || project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }
        if (!filePath) {
            return res.status(400).json({ message: 'بيانات الملف ناقصة' });
        }

        const urlParts = filePath.split('/');
        const publicIdWithExt = urlParts.slice(urlParts.indexOf('mostathmir_projects')).join('/');
        const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
        const resourceType = filePath.includes('/image/upload/') ? 'image' : 'raw';

        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

        switch (fileType) {
            case 'businessPlan':
                project.businessPlan = undefined;
                break;
            case 'presentation':
                project.presentation = undefined;
                break;
            case 'projectImage':
                project.projectImages = project.projectImages.filter(p => p !== filePath);
                if (project.mainImage === filePath) {
                    project.mainImage = project.projectImages.length > 0 ? project.projectImages[0] : undefined;
                }
                break;
        }
        await project.save();
        res.json({ message: 'تم حذف الملف بنجاح' });
    } catch (error) {
        console.error("Error deleting project file:", error);
        res.status(500).json({ message: 'فشل حذف الملف من السحابة' });
    }
};

const getInvestmentsInMyProjects = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const projectIds = await Project.find({ owner: userId }).distinct('_id');
        const investments = await Investment.find({ project: { $in: projectIds } })
            .populate('investor', 'fullName profilePicture profileTitle accountType')
            .populate('project', 'projectName fundingGoal')
            .sort({ createdAt: -1 });
        res.json(investments);
    } catch (error) {
        console.error("Error fetching investments in my projects:", error);
        next(error);
    }
};

// ==========================================
// التعديلات الجديدة للأدمن (المشاريع المميزة)
// ==========================================

// 1. دالة للأدمن لتمييز المشروع أو إلغاء تمييزه
const adminToggleFeatured = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

        project.isFeatured = !project.isFeatured;
        await project.save();

        res.json({
            message: project.isFeatured ? 'تم تمييز المشروع بنجاح' : 'تم إلغاء تمييز المشروع',
            isFeatured: project.isFeatured
        });
    } catch (error) {
        next(error);
    }
};

// 2. دالة لجلب المشاريع المميزة فقط للهوم بيج (مع مراعاة الخصوصية)
const getFeaturedProjects = async (req, res, next) => {
    try {
        // المشاريع المميزة تظهر فقط للمسجلين لضمان تفاعل أعلى
        if (!req.user) return res.json([]);

        const user = req.user;
        const query = {
            isFeatured: true,
            status: 'published',
            $and: [
                {
                    $or: [
                        { visibilityScope: 'public' },
                        { visibilityScope: 'investors_only', $expr: { $eq: [user.accountType, 'investor'] } }
                    ]
                },
                {
                    $or: [
                        { accessRestriction: 'all' },
                        { accessRestriction: 'verified_only', $expr: { $eq: [user.isPhoneVerified, true] } }
                    ]
                }
            ]
        };

        const projects = await Project.find(query)
            .populate('owner', 'fullName profileTitle profilePicture')
            .limit(6)
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getAllProjects,
    toggleFollowProject,
    deleteProjectFile,
    getInvestmentsInMyProjects,
    adminToggleFeatured, // تصدير الدالة الجديدة
    getFeaturedProjects    // تصدير الدالة الجديدة
};