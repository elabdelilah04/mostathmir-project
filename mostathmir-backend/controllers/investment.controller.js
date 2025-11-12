const Investment = require('../models/investment.model');
const Project = require('../models/project.model');
const { createNotification } = require('./notification.controller.js');

async function generateInvestmentId() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const lastInvestment = await Investment.findOne({ investmentId: new RegExp(`^${prefix}`) })
        .sort({ createdAt: -1 });
    let sequenceNumber = 1;
    if (lastInvestment) {
        const lastSequence = parseInt(lastInvestment.investmentId.split('-')[2], 10);
        sequenceNumber = lastSequence + 1;
    }
    return `${prefix}${sequenceNumber.toString().padStart(4, '0')}`;
}

const registerInvestment = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'فقط المستثمرون يمكنهم الاستثمار.' });
        }
        const { investmentAmount, amountPaidNow, amountRemaining, isReservation, projectId, investmentType, currency } = req.body;
        if (!investmentAmount || !projectId || !investmentType) {
            return res.status(400).json({ message: 'بيانات الاستثمار ناقصة: (المبلغ، المشروع، أو النوع).' });
        }
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'المشروع غير موجود.' });
        }
        const newInvestmentId = await generateInvestmentId();
        const investment = await Investment.create({
            investmentId: newInvestmentId,
            investor: req.user._id,
            project: projectId,
            amount: investmentAmount,
            currency: currency || project.fundingGoal.currency,
            investmentType: investmentType,
            amountPaidNow: amountPaidNow,
            amountRemaining: amountRemaining,
            isReservation: isReservation,
            paymentStatus: 'paid'
        });
        let fundingGoalReached = false;
        if (investmentType === 'full' || investmentType === 'reservation') {
            project.fundingAmountRaised = (project.fundingAmountRaised || 0) + Number(investmentAmount);
            const investorId = req.user._id.toString();
            if (!project.investors.some(id => id.toString() === investorId)) {
                project.investors.push(req.user._id);
            }
            if (project.fundingAmountRaised >= project.fundingGoal.amount) {
                project.status = 'funded';
                fundingGoalReached = true;
            }
        }
        await project.save();

        const investorName = req.user.fullName;
        const projectName = `"${project.projectName}"`;
        const financialDetails = {
            amount: investmentAmount,
            currency: currency || project.fundingGoal.currency,
            investmentType: investmentType,
            amountPaidNow: amountPaidNow,
            amountRemaining: amountRemaining
        };

        await createNotification({
            recipient: project.owner,
            type: 'NEW_INVESTMENT',
            messageKey: 'notification_new_investment_owner',
            messageParams: { projectName, investorName },
            link: `/project-view.html?id=${project._id}`,
            sender: req.user._id,
            projectId: project._id,
            ...financialDetails
        });

        await createNotification({
            recipient: req.user._id,
            type: 'NEW_INVESTMENT',
            messageKey: 'notification_new_investment_investor',
            messageParams: { projectName },
            link: `/investor-portfolio.html`,
            projectId: project._id,
            ...financialDetails
        });

        if (fundingGoalReached) {
            await createNotification({
                recipient: project.owner,
                type: 'FUNDING_GOAL_REACHED',
                messageKey: 'notification_goal_reached_owner',
                messageParams: { projectName },
                link: `/project-view.html?id=${project._id}`,
                projectId: project._id
            });

            const allInvestmentsInProject = await Investment.find({ project: project._id }).select('investor investmentType');
            const notifiedInvestors = new Set();
            for (const investmentRecord of allInvestmentsInProject) {
                const investorIdString = investmentRecord.investor.toString();
                if (!notifiedInvestors.has(investorIdString)) {
                    await createNotification({
                        recipient: investorIdString,
                        type: 'FUNDING_COMPLETED_GENERAL',
                        messageKey: 'notification_goal_reached_investor',
                        messageParams: { projectName },
                        link: `/project-view.html?id=${project._id}`,
                        projectId: project._id
                    });
                    notifiedInvestors.add(investorIdString);
                }
                if (investmentRecord.investmentType === 'reservation') {
                    await createNotification({
                        recipient: investorIdString,
                        type: 'RESERVATION_PAYMENT_DUE',
                        messageKey: 'notification_payment_due_investor',
                        messageParams: { projectName },
                        link: `/invest.html?id=${project._id}`,
                        note: "مهم: يرجى إتمام الدفع لتأكيد حصتك في المشروع.",
                        projectId: project._id
                    });
                }
            }
        }
        const projectFollowers = project.followers.map(id => id.toString());
        const isFollowing = projectFollowers.includes(req.user._id.toString());
        res.status(201).json({
            message: 'تم تسجيل استثمارك بنجاح!',
            investment,
            isFollowing
        });
    } catch (error) {
        console.error("Error registering investment:", error);
        next(error);
    }
};

const getProjectInvestors = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ message: "المشروع غير موجود." });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "غير مصرح لك بعرض هذه المعلومات." });
        }
        const investments = await Investment.find({ project: projectId })
            .populate('investor', 'fullName profilePicture profileTitle accountType')
            .sort({ createdAt: -1 });
        res.json(investments);
    } catch (error) {
        console.error("Error fetching project investors:", error);
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
            .select('amount investmentType createdAt');
        res.json(records);
    } catch (error) {
        console.error("Error fetching investment records:", error);
        next(error);
    }
};

module.exports = {
    registerInvestment,
    getInvestmentRecords,
    getProjectInvestors
};