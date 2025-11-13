const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getAllProjects,
    toggleFollowProject,
    deleteProjectFile,
    getInvestmentsInMyProjects
} = require('../controllers/project.controller.js');
const { protect, getAuthUser } = require('../middleware/auth.middleware.js');
const path = require('path'); // تأكد من استيراد 'path'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        const resourceType = file.mimetype.startsWith('image') ? 'image' : 'raw';

        const fileName = path.parse(file.originalname).name;
        const publicId = `${fileName}-${Date.now()}`;

        return {
            folder: `mostathmir_projects/${req.user._id}`,
            public_id: publicId,
            resource_type: resourceType,
        };
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 15 } // 15MB limit
});

router.get('/public', getAuthUser, getAllProjects);
router.get('/myprojects', protect, getMyProjects);
router.get('/my-investments', protect, getInvestmentsInMyProjects);

router.post(
    '/',
    protect,
    upload.fields([
        { name: 'businessPlan', maxCount: 1 },
        { name: 'presentation', maxCount: 1 },
        { name: 'projectImages', maxCount: 5 }
    ]),
    createProject
);

router.get('/:id', getProjectById);

router.put(
    '/:id',
    protect,
    upload.fields([
        { name: 'businessPlan', maxCount: 1 },
        { name: 'presentation', maxCount: 1 },
        { name: 'projectImages', maxCount: 5 }
    ]),
    updateProject
);

router.delete('/:id/file', protect, deleteProjectFile);
router.delete('/:id', protect, deleteProject);
router.post('/:id/follow', protect, toggleFollowProject);

module.exports = router;