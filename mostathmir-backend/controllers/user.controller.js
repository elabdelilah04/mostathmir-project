const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Investment = require('../models/investment.model');
const Proposal = require('../models/proposal.model');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notification.controller.js');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const exchangeRatesToMAD = {
    "SAR": 2.65, "AED": 2.71, "QAR": 2.73, "OMR": 25.84,
    "KWD": 32.32, "BHD": 26.38, "EGP": 0.21, "JOD": 14.03,
    "USD": 9.95, "EUR": 10.75, "MAD": 1,
};
const exchangeRatesToUSD = {
    "SAR": 0.27, "AED": 0.27, "QAR": 0.27, "OMR": 2.60,
    "KWD": 3.25, "BHD": 2.65, "EGP": 0.021, "JOD": 1.41,
    "MAD": 0.10, "USD": 1, "EUR": 1.08,
};

// جلب الملف الشخصي الخاص بالمستخدم الحالي
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('followers', 'fullName profilePicture accountType profileTitle')
            .populate('following', 'fullName profilePicture');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// جلب الملف الشخصي العام (مع تطبيق منطق الخصوصية)
const getPublicUserProfile = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // التعديل: إضافة حقول الخصوصية والبيانات الحساسة في الـ select
        const user = await User.findById(userId)
            .select('fullName profilePicture accountType bio profileTitle location socialLinks interests skills achievements professionalExperience education testimonials followers following isVisible showEmailPublicly showPhonePublicly email phone');

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        let userObj = user.toObject();

        if (userObj.showEmailPublicly !== true) {
            delete userObj.email;
        }
        if (userObj.showPhonePublicly !== true) {
            delete userObj.phone;
        }

        let projects = [];
        let investorsCount = 0;
        let canAddTestimonial = false;
        let investorData = {};

        if (user.accountType === 'ideaHolder') {
            projects = await Project.find({
                owner: user._id,
                status: { $in: ['published', 'funded', 'completed'] },
                visibility: 'public'
            }).sort({ createdAt: -1 });

            const projectIds = projects.map(p => p._id);
            const uniqueInvestors = await Investment.distinct('investor', { project: { $in: projectIds } });
            investorsCount = uniqueInvestors.length;

            if (req.user && req.user.accountType === 'investor') {
                const hasInvested = uniqueInvestors.some(id => id.toString() === req.user._id.toString());
                if (hasInvested) canAddTestimonial = true;
            }
        }

        else if (user.accountType === 'investor') {
            const matchConditions = {
                investor: new mongoose.Types.ObjectId(userId)
            };

            const isOwner = req.user && req.user._id.toString() === userId.toString();
            if (!isOwner) {
                matchConditions.isVisible = true;
            }

            const investments = await Investment.aggregate([
                { $match: matchConditions },
                {
                    $group: {
                        _id: "$project",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                        lastDate: { $max: "$createdAt" },
                        currency: { $first: "$currency" }
                    }
                },
                {
                    $lookup: {
                        from: "projects",
                        localField: "_id",
                        foreignField: "_id",
                        as: "projectDetails"
                    }
                },
                { $unwind: "$projectDetails" },
                {
                    $project: {
                        _id: 0,
                        projectId: "$_id",
                        projectName: "$projectDetails.projectName",
                        projectDescription: "$projectDetails.projectDescription",
                        projectStatus: "$projectDetails.status",
                        fundingGoal: "$projectDetails.fundingGoal.amount",
                        equityOffered: "$projectDetails.equityOffered",
                        totalAmount: 1,
                        count: 1,
                        lastDate: 1,
                        currency: 1
                    }
                },
                { $sort: { lastDate: -1 } }
            ]);

            const stats = {
                investmentsCount: investments.length,
                partnersCount: investments.length
            };

            investorData = {
                investments: investments,
                stats: stats
            };
        }

        res.json({
            user: userObj, // إرسال الكائن بعد الفلترة
            projects: projects,
            investorsCount: investorsCount,
            canAddTestimonial: canAddTestimonial,
            investorData: investorData
        });

    } catch (error) {
        console.error("Error fetching public profile:", error);
        next(error);
    }
};

// تحديث بيانات الملف الشخصي (الإعدادات)
const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            // تحديث خيارات الخصوصية الجديدة
            user.showEmailPublicly = req.body.showEmailPublicly !== undefined ? req.body.showEmailPublicly : user.showEmailPublicly;
            user.showPhonePublicly = req.body.showPhonePublicly !== undefined ? req.body.showPhonePublicly : user.showPhonePublicly;

            // تحديث الحقول الأساسية
            user.fullName = req.body.fullName || user.fullName;
            user.phone = req.body.phone || user.phone;
            user.location = req.body.location || user.location;
            user.bio = req.body.bio || user.bio;
            user.profileTitle = req.body.profileTitle || user.profileTitle;

            if (req.body.skills) user.skills = req.body.skills;
            if (req.body.socialLinks) user.socialLinks = req.body.socialLinks;
            if (req.body.interests) user.interests = req.body.interests;
            if (req.body.achievements) user.achievements = req.body.achievements;
            if (req.body.professionalExperience) user.professionalExperience = req.body.professionalExperience;
            if (req.body.education) user.education = req.body.education;

            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'المستخدم غير موجود' });
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        next(error);
    }
};

// تحديث حالة الهاتف يدوياً (محاكاة)
const verifyPhoneManual = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

        user.isPhoneVerified = true;
        await user.save();

        res.json({ message: 'تم تأكيد الهاتف بنجاح', isPhoneVerified: true });
    } catch (error) {
        console.error("Error in verifyPhoneManual:", error);
        next(error);
    }
};

// تحديث صورة الملف الشخصي
const updateUserProfilePicture = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'الرجاء اختيار ملف صورة' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        user.profilePicture = req.file.path;
        const updatedUser = await user.save();

        res.json({
            message: 'تم تحديث الصورة بنجاح',
            profilePicture: updatedUser.profilePicture
        });
    } catch (error) {
        console.error("SERVER ERROR in updateUserProfilePicture:", error);
        next(error);
    }
};

// جلب إحصائيات لوحة التحكم لصاحب الفكرة
const getIdeaHolderDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const projects = await Project.find({ owner: userId }).select('views followers fundingGoal fundingAmountRaised status');

        let totalFundingGoalMAD = 0;
        let totalFundingRaisedMAD = 0;
        const projectsByStatus = {
            draft: 0, 'under-review': 0, closed: 0,
            publishedUnfunded: 0, fundingInProgress: 0, fundedOrCompleted: 0, active: 0
        };
        let totalViews = 0;
        let totalFollowers = 0;

        projects.forEach(p => {
            const goalRate = exchangeRatesToMAD[p.fundingGoal.currency] || 1;
            totalFundingGoalMAD += (p.fundingGoal.amount || 0) * goalRate;
            totalFundingRaisedMAD += (p.fundingAmountRaised || 0) * goalRate;

            totalViews += p.views || 0;
            totalFollowers += p.followers ? p.followers.length : 0;

            if (p.status) {
                if (projectsByStatus.hasOwnProperty(p.status)) { projectsByStatus[p.status]++; }
                if (p.status === 'published' && (p.fundingAmountRaised || 0) === 0) { projectsByStatus.publishedUnfunded++; }
                if (p.status === 'published' && (p.fundingAmountRaised || 0) > 0) { projectsByStatus.fundingInProgress++; }
                if (p.status === 'funded' || p.status === 'completed') { projectsByStatus.fundedOrCompleted++; }
            }
        });

        projectsByStatus.active = projectsByStatus.publishedUnfunded + projectsByStatus.fundingInProgress + projectsByStatus.fundedOrCompleted;

        const dashboardData = {
            totalProjects: projects.length,
            totalFundingGoal: totalFundingGoalMAD,
            totalFundingRaised: totalFundingRaisedMAD,
            dashboardCurrency: 'MAD',
            totalViews: totalViews,
            totalFollowers: totalFollowers,
            projectsByStatus: projectsByStatus
        };

        res.json(dashboardData);

    } catch (error) {
        console.error("Error in getIdeaHolderDashboard:", error);
        next(error);
    }
};

// جلب عروض الشراكة المستلمة
const getReceivedProposals = async (req, res, next) => {
    try {
        const projectIds = await Project.find({ owner: req.user._id }).distinct('_id');
        const proposals = await Proposal.find({ projectId: { $in: projectIds } })
            .populate('investorId', 'fullName profilePicture profileTitle accountType')
            .populate('projectId', 'projectName')
            .sort({ createdAt: -1 });
        res.json(proposals);
    } catch (error) {
        console.error("Error fetching received proposals:", error);
        next(error);
    }
};

// متابعة مستخدم أو إلغاء المتابعة
const toggleFollowUser = async (req, res, next) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);
        if (!userToFollow) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }
        if (currentUser._id.equals(userToFollow._id)) {
            return res.status(400).json({ message: 'لا يمكنك متابعة نفسك.' });
        }
        const isFollowing = currentUser.following.includes(userToFollow._id);
        let messageKey = '';
        let notificationType = '';
        if (isFollowing) {
            currentUser.following.pull(userToFollow._id);
            userToFollow.followers.pull(currentUser._id);
            messageKey = 'notification_user_unfollowed_you';
            notificationType = 'USER_UNFOLLOW';
        } else {
            currentUser.following.push(userToFollow._id);
            userToFollow.followers.push(currentUser._id);
            messageKey = 'notification_user_followed_you';
            notificationType = 'NEW_USER_FOLLOWER';
        }
        await currentUser.save();
        await userToFollow.save();

        await createNotification({
            recipient: userToFollow._id,
            type: notificationType,
            messageKey: messageKey,
            messageParams: { userName: currentUser.fullName },
            link: `/public-profile.html?id=${currentUser._id}`,
            sender: currentUser._id
        });

        res.json({
            isFollowing: !isFollowing,
            followersCount: userToFollow.followers.length
        });
    } catch (error) {
        console.error("Error toggling user follow:", error);
        next(error);
    }
};

// جلب سجل الاستثمارات للمستثمر
const getInvestmentRecords = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const records = await Investment.find({ investor: req.user._id })
            .populate({
                path: 'project',
                select: 'projectName projectDescription projectCategory status fundingGoal followers fundingAmountRaised investmentPeriod equityOffered',
                populate: {
                    path: 'owner',
                    select: 'fullName profileTitle accountType'
                }
            })
            .select('amount investmentType createdAt currency amountPaidNow amountRemaining equityObtained isVisible');
        res.json(records);
    } catch (error) {
        console.error("Error fetching investment records:", error);
        next(error);
    }
};

// جلب المشاريع المتابعة
const getFollowedProjects = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const projects = await Project.find({ followers: req.user._id })
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error("Error fetching followed projects:", error);
        next(error);
    }
};

// جلب إحصائيات المستثمر
const getInvestorStats = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const userId = req.user._id;

        const investmentAggregation = await Investment.aggregate([
            { $match: { investor: userId } },
            {
                $group: {
                    _id: "$project",
                    totalInvestedInProject: {
                        $sum: {
                            $multiply: [
                                '$amount',
                                {
                                    $switch: {
                                        branches: Object.entries(exchangeRatesToUSD).map(([currency, rate]) => ({
                                            case: { $eq: ['$currency', currency] },
                                            then: rate
                                        })),
                                        default: 1
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'projectDetails' } },
            { $unwind: '$projectDetails' },
            {
                $addFields: {
                    progressPercentage: {
                        $cond: [
                            { $gt: ['$projectDetails.fundingGoal.amount', 0] },
                            { $multiply: [{ $divide: ['$projectDetails.fundingAmountRaised', '$projectDetails.fundingGoal.amount'] }, 100] },
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    uniqueProjectIds: { $addToSet: '$_id' },
                    totalInvestmentInUSD: { $sum: '$totalInvestedInProject' },
                    totalProgressSum: { $sum: '$progressPercentage' }
                }
            }
        ]);

        const stats = investmentAggregation[0] || {};
        const totalInvestmentInUSD = stats.totalInvestmentInUSD || 0;
        const totalInvestedProjects = stats.uniqueProjectIds ? stats.uniqueProjectIds.length : 0;
        const averageProjectCompletion = totalInvestedProjects > 0 ? (stats.totalProgressSum || 0) / totalInvestedProjects : 0;

        res.json({
            totalInvestedProjects: totalInvestedProjects,
            totalInvestment: totalInvestmentInUSD,
            investmentCurrency: 'USD',
            averageProjectCompletion: parseFloat(averageProjectCompletion.toFixed(1)),
            averageExpectedReturn: 0,
        });
    } catch (error) {
        next(error);
    }
};

// جلب العروض قيد الانتظار
const getPendingProposals = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const proposals = await Proposal.find({ investorId: req.user._id })
            .populate({
                path: 'projectId',
                select: 'projectName'
            })
            .sort({ createdAt: -1 });
        res.json(proposals);
    } catch (error) {
        console.error("Error fetching partnership proposals:", error);
        next(error);
    }
};

// إضافة توصية
const addTestimonial = async (req, res, next) => {
    try {
        const userToReview = await User.findById(req.params.id);
        const reviewer = await User.findById(req.user._id);
        if (!userToReview || !reviewer) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }
        const { quote, rating } = req.body;
        if (!quote || quote.trim() === '') {
            return res.status(400).json({ message: 'محتوى التوصية لا يمكن أن يكون فارغًا.' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'الرجاء تقديم تقييم صحيح من 1 إلى 5 نجوم.' });
        }
        const newTestimonial = {
            quote: quote,
            authorName: reviewer.fullName,
            authorRole: reviewer.profileTitle || (reviewer.accountType === 'investor' ? 'مستثمر' : 'حامل فكرة'),
            rating: rating,
            authorId: reviewer._id
        };
        userToReview.testimonials.push(newTestimonial);
        await userToReview.save();

        await createNotification({
            recipient: userToReview._id,
            type: 'NEW_MESSAGE',
            messageKey: 'notification_new_testimonial',
            messageParams: { userName: reviewer.fullName },
            link: `/public-profile.html?id=${userToReview._id}`,
            sender: reviewer._id
        });

        res.status(201).json(userToReview.testimonials);
    } catch (error) {
        console.error("Error adding testimonial:", error);
        next(error);
    }
};

// حذف توصية
const deleteTestimonial = async (req, res, next) => {
    try {
        const userToReview = await User.findById(req.params.id);
        const { testimonialId } = req.params;
        if (!userToReview) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }
        const testimonial = userToReview.testimonials.id(testimonialId);
        if (!testimonial) {
            return res.status(404).json({ message: 'التوصية غير موجودة.' });
        }
        if (testimonial.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك بحذف هذه التوصية.' });
        }
        userToReview.testimonials.pull(testimonialId);
        await userToReview.save();
        res.json(userToReview.testimonials);
    } catch (error) {
        console.error("Error deleting testimonial:", error);
        next(error);
    }
};

// تحديث توصية
const updateTestimonial = async (req, res, next) => {
    try {
        const userToReview = await User.findById(req.params.id);
        const { testimonialId } = req.params;
        const { quote, rating } = req.body;
        if (!userToReview) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }
        const testimonial = userToReview.testimonials.id(testimonialId);
        if (!testimonial) {
            return res.status(404).json({ message: 'التوصية غير موجودة.' });
        }
        if (testimonial.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك بتعديل هذه التوصية.' });
        }
        if (quote) testimonial.quote = quote;
        if (rating !== undefined) testimonial.rating = rating;
        await userToReview.save();
        res.json(userToReview.testimonials);
    } catch (error) {
        console.error("Error updating testimonial:", error);
        next(error);
    }
};

// جلب إحصائيات عامة للمنصة
const getPublicPlatformStats = async (req, res, next) => {
    try {
        const investorCount = await User.countDocuments({ accountType: 'investor' });
        res.json({
            investorCount: investorCount
        });
    } catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// جلب أعضاء النخبة
const getEliteMembers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('fullName profilePicture accountType profileTitle isVerified')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(users);
    } catch (error) {
        console.error("Error fetching elite members:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getPublicUserProfile,
    updateUserProfilePicture,
    getFollowedProjects,
    getInvestorStats,
    getIdeaHolderDashboard,
    getInvestmentRecords,
    getPendingProposals,
    getReceivedProposals,
    toggleFollowUser,
    addTestimonial,
    deleteTestimonial,
    updateTestimonial,
    getPublicPlatformStats,
    getEliteMembers,
    verifyPhoneManual // تمت إضافة الدالة الجديدة هنا
};