const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    const { fullName, email, phone, password, accountType, location, bio } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ messageKey: 'auth_email_exists' });
        }
        const user = await User.create({
            fullName, email, phone, password, accountType, location, bio,
        });
        const verificationToken = user.createVerificationToken();
        await user.save({ validateBeforeSave: false });

        const verificationURL = `${process.env.FRONTEND_URL}/verify-email.html?email=${user.email}`;
        const message = `
            <h2>مرحباً ${user.fullName},</h2>
            <p>شكراً لتسجيلك في منصة مستثمر. يرجى استخدام الرمز التالي لتفعيل حسابك:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px; margin: 20px 0; color: #1E3A8A;">${verificationToken}</h1>
            <p>هذا الرمز صالح لمدة 10 دقائق.</p>
            <p>أو يمكنك تفعيل حسابك مباشرة عبر النقر على الرابط التالي:</p>
            <a href="${verificationURL}" style="display: inline-block; padding: 10px 20px; background-color: #1E3A8A; color: white; text-decoration: none; border-radius: 5px;">تفعيل الحساب</a>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'رمز تفعيل حسابك في منصة مستثمر',
                html: message
            });
            res.status(201).json({
                success: true,
                messageKey: 'auth_verification_sent'
            });
        } catch (err) {
            console.error(err);
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ messageKey: 'auth_email_send_failed' });
        }
    } catch (error) {
        res.status(500).json({ messageKey: 'auth_server_error' });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ messageKey: 'auth_invalid_credentials' });
        }

        if (!user.isVerified) {
            const verificationToken = user.createVerificationToken();
            await user.save({ validateBeforeSave: false });

            const verificationURL = `${process.env.FRONTEND_URL}/verify-email.html?email=${user.email}`;
            const message = `
                <h2>مرحباً ${user.fullName},</h2>
                <p>لقد حاولت تسجيل الدخول لحسابك غير المفعل. يرجى استخدام الرمز الجديد التالي لإكمال عملية التفعيل:</p>
                <h1 style="font-size: 36px; letter-spacing: 5px; margin: 20px 0; color: #1E3A8A;">${verificationToken}</h1>
                <p>هذا الرمز صالح لمدة 10 دقائق.</p>
                <p>أو يمكنك تفعيل حسابك مباشرة عبر النقر على الرابط التالي:</p>
                <a href="${verificationURL}" style="display: inline-block; padding: 10px 20px; background-color: #1E3A8A; color: white; text-decoration: none; border-radius: 5px;">تفعيل الحساب</a>
            `;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'رمز تفعيل جديد لحسابك في منصة مستثمر',
                    html: message
                });
                return res.status(401).json({
                    messageKey: 'auth_account_not_verified',
                    notVerified: true
                });
            } catch (err) {
                console.error(err);
                return res.status(500).json({ messageKey: 'auth_verification_email_failed' });
            }
        }

        res.json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            accountType: user.accountType,
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({ messageKey: 'auth_server_error' });
    }
};

exports.verifyEmail = async (req, res) => {
    const { email, token } = req.body;
    if (!email || !token) {
        return res.status(400).json({ messageKey: 'auth_missing_data' });
    }
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            email: email,
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ messageKey: 'auth_invalid_or_expired_token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            messageKey: 'auth_account_verified_success',
            token: generateToken(user._id),
            user: {
                _id: user._id,
                accountType: user.accountType
            }
        });
    } catch (error) {
        res.status(500).json({ messageKey: 'auth_server_error' });
    }
};

exports.resendVerificationToken = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ messageKey: 'auth_email_required' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ messageKey: 'auth_user_not_found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ messageKey: 'auth_account_already_verified' });
        }

        const verificationToken = user.createVerificationToken();
        await user.save({ validateBeforeSave: false });

        const verificationURL = `${req.protocol}://${req.get('host')}/verify-email.html?email=${user.email}`;
        const message = `
            <h2>مرحباً ${user.fullName},</h2>
            <p>لقد طلبت إعادة إرسال رمز التفعيل. يرجى استخدام الرمز التالي:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px; margin: 20px 0; color: #1E3A8A;">${verificationToken}</h1>
            <p>أو عبر الرابط: <a href="${verificationURL}">تفعيل الحساب</a></p>
        `;

        await sendEmail({
            email: user.email,
            subject: 'رمز تفعيل حسابك الجديد في منصة مستثمر',
            html: message
        });

        res.status(200).json({
            success: true,
            messageKey: 'auth_new_token_sent'
        });
    } catch (error) {
        res.status(500).json({ messageKey: 'auth_server_error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ messageKey: 'auth_reset_link_sent_if_exists' });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const resetURL = `${process.env.FRONTEND_URL}/new-password.html?token=${resetToken}`;
        const message = `
            <h2>طلب إعادة تعيين كلمة السر</h2>
            <p>لقد طلبت إعادة تعيين كلمة السر لحسابك في منصة مستثمر.</p>
            <p>انقر على الرابط التالي لإعادة تعيين كلمة السر. هذا الرابط صالح لمدة 10 دقائق فقط:</p>
            <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #1E3A8A; color: white; text-decoration: none; border-radius: 5px;">إعادة تعيين كلمة السر</a>
            <p>إذا لم تطلب هذا الإجراء، يرجى تجاهل هذه الرسالة.</p>
        `;

        await sendEmail({
            email: user.email,
            subject: 'إعادة تعيين كلمة السر لحسابك في مستثمر',
            html: message
        });

        res.status(200).json({ messageKey: 'auth_reset_link_sent' });

    } catch (error) {
        if (req.user) {
            req.user.passwordResetToken = undefined;
            req.user.passwordResetExpires = undefined;
            await req.user.save({ validateBeforeSave: false });
        }
        res.status(500).json({ messageKey: 'auth_email_send_failed' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ messageKey: 'auth_invalid_or_expired_token' });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
            messageKey: 'auth_password_reset_success',
            token: token
        });

    } catch (error) {
        res.status(500).json({ messageKey: 'auth_password_reset_failed' });
    }
};