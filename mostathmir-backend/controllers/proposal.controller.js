const Proposal = require('../models/proposal.model');
const Project = require('../models/project.model');
const { createNotification } = require('./notification.controller.js');

const createCustomProposal = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'فقط المستثمرون يمكنهم إرسال عروض شراكة.' });
        }
        const { projectId, investmentAmount, currency, proposedTerms, partnershipType, contactMethod, expertiseAreas } = req.body;
        if (!projectId || !proposedTerms) {
            return res.status(400).json({ message: 'بيانات العرض ناقصة.' });
        }
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'المشروع غير موجود.' });
        }
        const newProposal = new Proposal({
            projectId,
            investorId: req.user._id,
            investmentType: 'custom',
            investmentAmount: investmentAmount || 0,
            currency,
            proposedTerms,
            partnershipType,
            contactMethod,
            expertiseAreas
        });
        const createdProposal = await newProposal.save();
        const proposalDetails = {
            partnershipType,
            proposedTerms,
            amount: investmentAmount,
            currency,
            expertiseAreas
        };

        await createNotification({
            recipient: project.owner,
            type: 'NEW_PROPOSAL',
            messageKey: 'notification_new_proposal',
            messageParams: { userName: req.user.fullName, projectName: `"${project.projectName}"` },
            link: `/messages`,
            sender: req.user._id,
            referenceId: createdProposal._id,
            projectId: project._id,
            ...proposalDetails
        });

        res.status(201).json({
            message: 'تم إرسال اقتراح الشراكة بنجاح.',
            proposalId: createdProposal._id,
            status: createdProposal.status
        });
    } catch (error) {
        console.error("Error creating custom proposal:", error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء إنشاء العرض.' });
    }
};

const respondToProposal = async (req, res, next) => {
    try {
        const { id: proposalId } = req.params;
        const { status, responseMessage } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'حالة الرد غير صالحة.' });
        }
        const proposal = await Proposal.findById(proposalId).populate({
            path: 'projectId',
            select: 'owner projectName'
        });
        if (!proposal) {
            return res.status(404).json({ message: 'الاقتراح غير موجود.' });
        }
        if (proposal.projectId.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك بالرد على هذا الاقتراح.' });
        }
        if (proposal.status !== 'pending') {
            return res.status(400).json({ message: 'تم الرد على هذا الاقتراح مسبقاً.' });
        }
        proposal.status = status;
        proposal.responseMessage = responseMessage || '';
        proposal.respondedAt = new Date();
        await proposal.save();

        const recipientId = proposal.investorId;
        const statusKey = status === 'accepted' ? 'js-status-accepted' : 'js-status-rejected';
        const messageKey = 'notification_proposal_response';
        const params = { userName: req.user.fullName, statusKey: statusKey, projectName: `"${proposal.projectId.projectName}"` };

        const notificationDetails = {
            responseMessage: responseMessage,
            responseStatus: status,
            partnershipType: proposal.partnershipType,
            proposedTerms: proposal.proposedTerms,
            amount: proposal.investmentAmount,
            currency: proposal.currency,
            expertiseAreas: proposal.expertiseAreas
        };

        await createNotification({
            recipient: recipientId,
            type: 'PROPOSAL_RESPONSE',
            messageKey: messageKey,
            messageParams: params,
            link: '/messages',
            sender: req.user._id,
            referenceId: proposalId,
            projectId: proposal.projectId._id,
            ...notificationDetails
        });

        res.json({ message: 'تم إرسال الرد بنجاح.' });
    } catch (error) {
        console.error("Error responding to proposal:", error);
        next(error);
    }
};

module.exports = {
    createCustomProposal,
    respondToProposal
};