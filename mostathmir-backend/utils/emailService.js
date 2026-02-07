const nodemailer = require('nodemailer');

const sendEmail = async (options) => {

    // 1. إعداد الناقل (Transporter) باستخدام إعدادات Brevo
    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", // خادم Brevo
        port: 587,                    // المنفذ القياسي
        secure: false,                // false لـ 587، true لـ 465
        auth: {
            user: process.env.EMAIL_USER, // إيميل تسجيل الدخول في Brevo
            pass: process.env.EMAIL_PASS, // مفتاح SMTP Key (وليس كلمة سر حسابك)
        },
    });

    // 2. التحقق من إيميل المرسل
    const sender = process.env.EMAIL_FROM;
    if (!sender) {
        console.error("❌ ERROR: EMAIL_FROM is missing in Environment Variables.");
        throw new Error("Sender email is not configured.");
    }

    // 3. خيارات الرسالة
    const message = {
        from: `Mostathmir Platform <${sender}>`, // يظهر الاسم وبجانبه الإيميل
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    // 4. الإرسال
    try {
        const info = await transporter.sendMail(message);
        console.log(`✅ Email sent: ${info.messageId}`);
    } catch (error) {
        console.error("❌ SMTP Error:", error);
        throw new Error("فشل إرسال البريد الإلكتروني عبر Brevo.");
    }
};

module.exports = sendEmail;