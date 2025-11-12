const SavedInvestment = require('../models/savedInvestment.model');

const saveInvestmentDraft = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'investor') {
            return res.status(403).json({ message: 'فقط المستثمرون يمكنهم حفظ مسودة.' });
        }

        const {
            projectId,
            investmentType,
            investmentAmount,
            proposedTerms,
            partnershipType,
            expertiseAreas,
            termsAccepted
        } = req.body;

        if (!projectId) {
            return res.status(400).json({ message: 'معرّف المشروع ناقص.' });
        }

        // البحث عن مسودة سابقة لنفس المستخدم ونفس المشروع لتحديثها
        const existingDraft = await SavedInvestment.findOneAndUpdate(
            { investor: req.user._id, project: projectId, status: 'draft' },
            {
                investmentType,
                investmentAmount: investmentAmount || 0,
                proposedTerms: proposedTerms || '',
                partnershipType,
                expertiseAreas,
                termsAccepted,
                // يتم إزالة حالة الدفع هنا لأنها ليست ذات صلة بالمسودة
            },
            { new: true, upsert: true } // أنشئ إذا لم يكن موجوداً، وحدث إذا كان موجوداً
        );

        res.status(201).json({
            message: 'تم حفظ المسودة بنجاح.',
            draftId: existingDraft._id,
            data: existingDraft
        });

    } catch (error) {
        console.error("Error saving investment draft:", error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء حفظ المسودة.' });
    }
};

module.exports = {
    saveInvestmentDraft
};