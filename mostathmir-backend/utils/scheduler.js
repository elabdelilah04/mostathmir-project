const cron = require('node-cron');
const Project = require('../models/project.model');
const Investment = require('../models/investment.model');
const { createNotification } = require('../controllers/notification.controller');

// دالة للتحقق من الحملات التي على وشك الانتهاء
const checkExpiringCampaigns = async () => {
    console.log('Running cron job: Checking for expiring campaigns...');

    try {
        const projects = await Project.find({
            status: 'published', // نهتم فقط بالمشاريع المنشورة والتي تجمع تمويلاً
            campaignStartDate: { $ne: null } // تأكد من أن تاريخ البدء موجود
        }).populate('followers', '_id');

        const today = new Date();

        for (const project of projects) {
            const endDate = new Date(project.campaignStartDate);
            endDate.setDate(endDate.getDate() + project.campaignDuration);

            const timeDiff = endDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

            // أرسل تذكيرًا إذا بقي 3 أيام أو يوم واحد
            if (daysRemaining === 3 || daysRemaining === 1) {

                // جلب قائمة المستثمرين الحاليين في هذا المشروع لمنع إرسال إشعار لهم
                const existingInvestors = await Investment.find({ project: project._id }).distinct('investor');
                const existingInvestorIds = new Set(existingInvestors.map(id => id.toString()));

                // فلترة المتابعين الذين لم يستثمروا بعد
                const followersToNotify = project.followers.filter(follower => !existingInvestorIds.has(follower._id.toString()));

                if (followersToNotify.length > 0) {
                    const notificationMessage = `لا تفوت الفرصة! بقيت ${daysRemaining} أيام فقط على انتهاء حملة تمويل مشروع "${project.projectName}". استثمر الآن وكن جزءًا من قصة النجاح.`;

                    for (const follower of followersToNotify) {
                        await createNotification(
                            follower._id,
                            'CAMPAIGN_ENDING_SOON',
                            notificationMessage,
                            `/project-view.html?id=${project._id}`,
                            null, // مرسل من النظام
                            null,
                            {},
                            null,
                            project._id
                        );
                    }
                    console.log(`Sent ${followersToNotify.length} reminders for project: ${project.projectName}`);
                }
            }
        }

    } catch (error) {
        console.error('Error in cron job checkExpiringCampaigns:', error);
    }
};

// جدولة المهمة لتعمل مرة واحدة يوميًا الساعة 10:00 صباحًا
const startScheduler = () => {
    cron.schedule('0 10 * * *', checkExpiringCampaigns, {
        scheduled: true,
        timezone: "Asia/Riyadh"
    });
    console.log('Campaign expiration scheduler started. Will run every day at 10:00 AM Riyadh time.');
};

module.exports = { startScheduler };