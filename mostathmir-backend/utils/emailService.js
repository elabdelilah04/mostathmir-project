const sgMail = require('@sendgrid/mail');

// قم بتعيين مفتاح API الخاص بك
sgMail.setApiKey(process.env.EMAIL_PASS); // نحن نستخدم EMAIL_PASS لأنه يحتوي بالفعل على مفتاح SendGrid

const sendEmail = async (options) => {
    // استخراج البريد الإلكتروني الفعلي من EMAIL_FROM
    // المثال: "Mostathmir Platform" <no-reply@mostathmir.com> -> no-reply@mostathmir.com
    const fromEmailMatch = process.env.EMAIL_FROM.match(/<(.+)>/);
    const fromEmail = fromEmailMatch ? fromEmailMatch[1] : process.env.EMAIL_USER; // استخدم بريد إلكتروني احتياطي

    const msg = {
        to: options.email,
        from: {
            email: fromEmail, // استخدم البريد الإلكتروني الذي قمت بتوثيقه في SendGrid
            name: 'Mostathmir Platform'
        },
        subject: options.subject,
        html: options.html,
    };

    try {
        await sgMail.send(msg);
        console.log('Email sent successfully via SendGrid API to:', options.email);
    } catch (error) {
        console.error('Error sending email via SendGrid API:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        throw new Error('فشل إرسال البريد الإلكتروني.');
    }
};

module.exports = sendEmail;