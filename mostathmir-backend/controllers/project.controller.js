const Project = require('../models/project.model');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const fs = require('fs');
const path = require('path');
const Investment = require('../models/investment.model');
const { createNotification } = require('./notification.controller.js');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Helper: يحاول استخراج public_id صالح من:
 * - كائن الملف (file.public_id إن وُجد)
 * - أو من URL (file.path / file.secure_url / file.url)
 * الدالة تزيل بادئات النسخة مثل v12345/ وتفك الترميز (%20) وتزيل الامتداد
 */
const extractPublicIdFromUrl = (input) => {
    if (!input) return null;

    // إذا المِلَف لديه public_id مباشرة (multer-storage-cloudinary قد يضعه)
    if (typeof input === 'object' && input.public_id) {
        return input.public_id;
    }

    // إذا أُعطي string (file.path أو secure_url)
    let url = typeof input === 'string' ? input : (input.path || input.secure_url || input.url || '');
    if (!url) return null;

    try {
        // لو هو URL كامل: احصل على الجزء بعد '/upload/'
        const uploadIndex = url.indexOf('/upload/');
        let afterUpload = uploadIndex !== -1 ? url.substring(uploadIndex + '/upload/'.length) : url;

        // فك الترميز (يحوي %20 وغيرها)
        afterUpload = decodeURIComponent(afterUpload);

        // أزل query string إن وُجد
        afterUpload = afterUpload.split('?')[0];

        // إذا بدا أنه يبدأ بـ v{number}/ أزل هذا الجزء
        afterUpload = afterUpload.replace(/^v\d+\//, '');

        // أزل أي شرطة بادئة
        if (afterUpload.startsWith('/')) afterUpload = afterUpload.substring(1);

        // أزل الامتداد من آخر جزء فقط (cloudinary public_id لا يتضمن .ext)
        const lastSegment = afterUpload.split('/').pop();
        if (lastSegment && lastSegment.includes('.')) {
            // نحذف الامتداد فقط من آخر الجزء
            const withoutExt = afterUpload.substring(0, afterUpload.lastIndexOf('.'));
            return withoutExt;
        }

        return afterUpload;
    } catch (e) {
        console.warn('extractPublicIdFromUrl parse error', e);
        return null;
    }
};

/**
 * Helper: يبني URL آمن وثابت من public_id بالاستعلام عن Cloudinary للحصول على info.format و resource_type
 * يجرب كـ image أولاً ثم كـ raw
 */
const buildSecureUrlFromPublicId = async (publicIdCandidate) => {
    if (!publicIdCandidate) return null;
    try {
        // تجربة كـ image أولاً
        try {
            const info = await cloudinary.api.resource(publicIdCandidate, { resource_type: 'image' });
            if (info && info.format) {
                const resourceType = info.resource_type || 'image';
                const fixedUrl = cloudinary.url(publicIdCandidate, { resource_type: resourceType, format: info.format, secure: true });
                return fixedUrl;
            }
        } catch (errImage) {
            // لم يجد كـ image -> حاول كـ raw
            try {
                const infoRaw = await cloudinary.api.resource(publicIdCandidate, { resource_type: 'raw' });
                if (infoRaw && infoRaw.format) {
                    const resourceType = infoRaw.resource_type || 'raw';
                    const fixedUrl = cloudinary.url(publicIdCandidate, { resource_type: resourceType, format: infoRaw.format, secure: true });
                    return fixedUrl;
                }
            } catch (errRaw) {
                // كلا المحاولتين فشلتا
                console.warn(`Could not build secure URL from Cloudinary for ${publicIdCandidate}`, (errRaw && errRaw.message) || errImage && errImage.message || errRaw || errImage);
                return null;
            }
        }
        return null;
    } catch (err) {
        console.error('buildSecureUrlFromPublicId unexpected error', err);
        return null;
    }
};

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
                // fallback: إذا كان الحقل مصفوفة في السكيما اجعله مصفوفة، وإلا كائن
                const schemaPath = Project.schema.path(field);
                if (schemaPath && schemaPath.instance === 'Array') {
                    data[field] = [];
                } else {
                    data[field] = {};
                }
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

        // إذا أردت فَك التعليق مؤقتاً لرؤية ما يصل من multer/cloudinary أثناء debugging:
        // console.log('Uploaded files sample:', JSON.stringify(req.files, null, 2));

        if (req.files) {
            // projectImages: نعالج كل صورة ونحاول الحصول على URL ثابت مع الامتداد
            if (req.files.projectImages && req.files.projectImages.length > 0) {
                const imagePromises = req.files.projectImages.map(async file => {
                    const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                    const fixed = await buildSecureUrlFromPublicId(candidate);
                    return fixed || file.path || file.secure_url || file.url;
                });
                const resolvedImages = await Promise.all(imagePromises);
                newProject.projectImages = resolvedImages;
                newProject.mainImage = resolvedImages[0] || newProject.mainImage;
            }

            // businessPlan
            if (req.files.businessPlan && req.files.businessPlan[0]) {
                const file = req.files.businessPlan[0];
                const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                const fixed = await buildSecureUrlFromPublicId(candidate);
                newProject.businessPlan = fixed || file.path || file.secure_url || file.url;
            }

            // presentation
            if (req.files.presentation && req.files.presentation[0]) {
                const file = req.files.presentation[0];
                const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                const fixed = await buildSecureUrlFromPublicId(candidate);
                newProject.presentation = fixed || file.path || file.secure_url || file.url;
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
        const parsedData = parseProjectData(req.body);
        const oldStatus = project.status;

        Object.keys(parsedData).forEach(key => {
            if (Project.schema.path(key)) {
                project[key] = parsedData[key];
            }
        });

        if (parsedData.status) {
            if ((project.status === 'draft' || project.status === 'needs-revision') && parsedData.status === 'under-review') {
                project.status = 'under-review';
            } else if (parsedData.status === 'draft') {
                project.status = 'draft';
            }
        }

        if (req.files) {
            // projectImages: نضيف الصور الجديدة إلى القائمة الحالية
            if (req.files.projectImages && req.files.projectImages.length > 0) {
                const newImagePromises = req.files.projectImages.map(async file => {
                    const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                    const fixed = await buildSecureUrlFromPublicId(candidate);
                    return fixed || file.path || file.secure_url || file.url;
                });
                const newImagePaths = await Promise.all(newImagePromises);
                project.projectImages = [...(project.projectImages || []), ...newImagePaths];
                if (!project.mainImage && newImagePaths.length > 0) project.mainImage = newImagePaths[0];
            }

            // businessPlan
            if (req.files.businessPlan && req.files.businessPlan[0]) {
                const file = req.files.businessPlan[0];
                const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                const fixed = await buildSecureUrlFromPublicId(candidate);
                project.businessPlan = fixed || file.path || file.secure_url || file.url;
            }

            // presentation
            if (req.files.presentation && req.files.presentation[0]) {
                const file = req.files.presentation[0];
                const candidate = extractPublicIdFromUrl(file.public_id ? { public_id: file.public_id } : (file.path || file.secure_url || file.url || file));
                const fixed = await buildSecureUrlFromPublicId(candidate);
                project.presentation = fixed || file.path || file.secure_url || file.url;
            }
        }

        const updatedProject = await project.save();
        const newStatus = updatedProject.status;
        if (newStatus === 'under-review' && oldStatus !== 'under-review') {
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
        let viewingUser = null;
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                viewingUser = await User.findById(decoded.id);
            } catch (error) {
                viewingUser = null;
            }
        }
        const isOwner = viewingUser && project.owner._id.equals(viewingUser._id);
        const isAdmin = viewingUser && viewingUser.role === 'admin';
        if (project.status !== 'published' && project.status !== 'funded' && project.status !== 'completed') {
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'You are not authorized to view this project' });
            }
        }
        if (viewingUser && !project.owner._id.equals(viewingUser._id)) {
            project.views = (project.views || 0) + 1;
            await project.save({ timestamps: false });
        }
        const projectObject = project.toObject();
        const investments = await Investment.find({ project: project._id })
            .populate('investor', 'fullName profilePicture profileTitle accountType');
        projectObject.investorsCount = investments.length;
        if (isOwner) {
            projectObject.investorDetails = investments;
        }
        res.json(projectObject);
    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // You might want to delete associated files from Cloudinary here as well
        await project.deleteOne();
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getAllProjects = async (req, res, next) => {
    try {
        const publicCondition = { status: 'published', visibility: 'public' };
        const query = { $or: [publicCondition] };
        if (req.user && req.user.accountType === 'investor') {
            const investedProjectIds = await Investment.find({ investor: req.user._id }).distinct('project');
            if (investedProjectIds.length > 0) {
                const investorFundedCondition = {
                    _id: { $in: investedProjectIds },
                    status: { $in: ['funded', 'completed'] }
                };
                query.$or.push(investorFundedCondition);
            }
        }
        const projects = await Project.find(query)
            .populate('owner', 'fullName profileTitle')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
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

        // Extract public_id from Cloudinary URL
        const urlParts = filePath.split('/');
        const publicIdWithExt = urlParts.slice(urlParts.indexOf('mostathmir_projects')).join('/');
        const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

        await cloudinary.uploader.destroy(publicId);

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
};
