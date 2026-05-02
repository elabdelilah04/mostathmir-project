const axios = require('axios');

const sendEmail = async (options) => {
    // نستخدم مفتاح الـ API الطويل الذي يبدأ بـ xsmtpsib
    const apiKey = process.env.EMAIL_PASS;

    try {
        console.log(`⏳ جاري إرسال البريد عبر Brevo API إلى: ${options.email}...`);

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: {
                name: "Mostathmir Platform",
                email: process.env.EMAIL_FROM
            },
            to: [{
                email: options.email
            }],
            subject: options.subject,
            htmlContent: options.html // ملاحظة: الـ API يتوقع htmlContent
        }, {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log(`✅ تم الإرسال بنجاح عبر API! المعرف: ${response.data.messageId}`);
        return response.data;

    } catch (error) {
        console.error("❌ فشل الإرسال عبر نظام الـ API الخاص بـ Brevo:");
        if (error.response) {
            // عرض تفاصيل الخطأ القادم من سيرفر بريفو لسهولة التشخيص
            console.error("Brevo API Response Error:", error.response.data);
        } else {
            console.error("Error Message:", error.message);
        }
        throw new Error("فشل إرسال بريد التحقق عبر API.");
    }
};

module.exports = sendEmail;