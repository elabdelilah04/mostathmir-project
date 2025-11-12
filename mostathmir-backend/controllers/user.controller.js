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

const exchangeRatesToUSD = {
    "SAR": 0.27, "AED": 0.27, "QAR": 0.27, "OMR": 2.60,
    "KWD": 3.25, "BHD": 2.65, "EGP": 0.021, "JOD": 1.41,
    "MAD": 0.10, "USD": 1, "EUR": 1.08,
};

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

const getPublicUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('fullName profilePicture accountType bio profileTitle location socialLinks interests skills achievements professionalExperience education testimonials followers following');

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
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
                const hasInvested = uniqueInvestors.some(investorId => investorId.equals(req.user._id));
                if (hasInvested) {
                    canAddTestimonial = true;
                }
            }
        } else if (user.accountType === 'investor') {
            const investments = await Investment.find({ investor: user._id })
                .populate({
                    path: 'project',
                    select: 'projectName projectDescription projectCategory status fundingGoal fundingAmountRaised owner',
                    populate: {
                        path: 'owner',
                        select: '_id'
                    }
                });

            const uniquePartners = new Set(investments.map(inv => inv.project.owner._id.toString()));
            const uniqueInvestedProjects = new Set(investments.map(inv => inv.project._id.toString()));

            investorData = {
                investments: investments,
                stats: {
                    investmentsCount: uniqueInvestedProjects.size,
                    partnersCount: uniquePartners.size
                }
            };
        }

        res.json({
            user: user,
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

const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
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

const updateUserProfilePicture = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'الرجاء اختيار ملف صورة' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        user.profilePicture = req.file.path; // req.file.path هو رابط URL من Cloudinary

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

const getIdeaHolderDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const interactionStatsPromise = Project.aggregate([
            { $match: { owner: userId } },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" },
                    totalFollowers: { $sum: { $size: "$followers" } }
                }
            }
        ]);
        const projectStatsPromise = Project.aggregate([
            { $match: { owner: userId } },
            {
                $group: {
                    _id: null,
                    totalProjects: { $sum: 1 },
                    totalFundingGoal: { $sum: "$fundingGoal.amount" },
                    totalFundingRaised: { $sum: "$fundingAmountRaised" },
                    countDraft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
                    countUnderReview: { $sum: { $cond: [{ $eq: ["$status", "under-review"] }, 1, 0] } },
                    countClosed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
                    countPublishedUnfunded: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "published"] },
                                    { $eq: ["$fundingAmountRaised", 0] }
                                ]
                            }, 1, 0]
                        }
                    },
                    countFundingInProgress: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "published"] },
                                    { $gt: ["$fundingAmountRaised", 0] }
                                ]
                            }, 1, 0]
                        }
                    },
                    countFundedOrCompleted: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["funded", "completed"]] }, 1, 0]
                        }
                    }
                }
            }
        ]);
        const [interactionStats, projectStatsArr] = await Promise.all([
            interactionStatsPromise,
            projectStatsPromise
        ]);
        const projectStats = projectStatsArr[0] || {};
        const dashboardData = {
            totalProjects: projectStats.totalProjects || 0,
            totalFundingGoal: projectStats.totalFundingGoal || 0,
            totalFundingRaised: projectStats.totalFundingRaised || 0,
            totalViews: (interactionStats[0] || {}).totalViews || 0,
            totalFollowers: (interactionStats[0] || {}).totalFollowers || 0,
            projectsByStatus: {
                draft: projectStats.countDraft || 0,
                'under-review': projectStats.countUnderReview || 0,
                closed: projectStats.countClosed || 0,
                publishedUnfunded: projectStats.countPublishedUnfunded || 0,
                fundingInProgress: projectStats.countFundingInProgress || 0,
                fundedOrCompleted: projectStats.countFundedOrCompleted || 0,
                active: (projectStats.countPublishedUnfunded || 0) + (projectStats.countFundingInProgress || 0) + (projectStats.countFundedOrCompleted || 0)
            }
        };
        res.json(dashboardData);
    } catch (error) {
        next(error);
    }
};

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

const getInvestmentRecords = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const records = await Investment.find({ investor: req.user._id })
            .populate({
                path: 'project',
                select: 'projectName projectDescription projectCategory status fundingGoal followers fundingAmountRaised expectedReturn investmentPeriod',
                populate: {
                    path: 'owner',
                    select: 'fullName profileTitle accountType'
                }
            })
            .select('amount investmentType createdAt currency amountPaidNow amountRemaining');
        res.json(records);
    } catch (error) {
        console.error("Error fetching investment records:", error);
        next(error);
    }
};

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

const getInvestorStats = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'الوصول مقتصر على المستثمرين فقط.' });
        }
        const userId = req.user._id;
        const investmentStatsPromise = Investment.aggregate([
            { $match: { investor: userId } },
            { $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'projectDetails' } },
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
                    uniqueProjectIds: { $addToSet: '$project' },
                    totalInvestmentInUSD: {
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
                    },
                    totalWeightedReturn: {
                        $sum: {
                            $multiply: [
                                '$amount',
                                { $ifNull: ['$projectDetails.expectedReturn', 0] },
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
                    },
                    totalProgressSum: { $sum: '$progressPercentage' }
                }
            }
        ]);
        const [investmentAggregation] = await Promise.all([investmentStatsPromise]);
        const stats = investmentAggregation[0] || {};
        const totalInvestmentInUSD = stats.totalInvestmentInUSD || 0;
        const totalWeightedReturn = stats.totalWeightedReturn || 0;
        const totalInvestedProjects = stats.uniqueProjectIds ? stats.uniqueProjectIds.length : 0;
        const averageExpectedReturn = totalInvestmentInUSD > 0 ? (totalWeightedReturn / 100) / totalInvestmentInUSD * 100 : 0;
        const averageProjectCompletion = totalInvestedProjects > 0 ? (stats.totalProgressSum || 0) / totalInvestedProjects : 0;
        res.json({
            totalInvestedProjects: totalInvestedProjects,
            totalInvestment: totalInvestmentInUSD,
            investmentCurrency: 'USD',
            averageProjectCompletion: parseFloat(averageProjectCompletion.toFixed(1)),
            averageExpectedReturn: parseFloat(averageExpectedReturn.toFixed(2)),
        });
    } catch (error) {
        next(error);
    }
};

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
    updateTestimonial
};