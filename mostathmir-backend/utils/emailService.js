const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. إنشاء "الناقل" (Transporter) باستخدام إعدادات الإنتاج
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        // secure: false, // `secure: true` يكون لـ port 465, أما 587 فيستخدم STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        // (اختياري ولكن موصى به) لإضافة المزيد من الموثوقية
        tls: {
            rejectUnauthorized: false
        }
    });

    // 2. تحديد خيارات البريد الإلكتروني
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        html: options.html
        // يمكنك إضافة نسخة نصية بسيطة كخيار احتياطي
        // text: options.text 
    };

    // 3. إرسال البريد الإلكتروني
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", options.email);
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
        // رمي الخطأ مرة أخرى للسماح لوحدة التحكم بالتعامل معه
        throw new Error('فشل إرسال البريد الإلكتروني.');
    }
};

module.exports = sendEmail;