const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // تمت الإضافة

const experienceSchema = new mongoose.Schema({
    title: String,
    company: String,
    period: String,
    description: String
}, { _id: false });

const educationSchema = new mongoose.Schema({
    degree: String,
    institution: String,
    details: String
}, { _id: false });

const testimonialSchema = new mongoose.Schema({
    quote: String,
    authorName: String,
    authorRole: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: true, timestamps: true });

const skillSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    level: { type: Number, min: 0, max: 100 }
}, { _id: false });

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    accountType: { type: String, required: true, enum: ['investor', 'ideaHolder'] },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    location: { type: String },
    bio: { type: String },
    profileTitle: { type: String },
    profilePicture: { type: String, default: 'default-avatar.png' },
    isVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    showEmailPublicly: {
        type: Boolean,
        default: false
    },
    showPhonePublicly: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    socialLinks: [
        {
            platform: { type: String, enum: ['instagram', 'youtube', 'linkedin', 'twitter', 'facebook', 'github', 'website'] },
            url: { type: String }
        }
    ],
    interests: [String],
    skills: [skillSchema],
    achievements: [
        {
            title: String,
            issuer: String,
            year: String,
            icon: String
        }
    ],
    professionalExperience: [experienceSchema],
    education: [educationSchema],
    testimonials: [testimonialSchema],

    preferredLanguage: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },
    preferredCurrency: {
        type: String,
        default: 'MAD' 
    },
    preferredCountry: {
        type: String,
        default: 'Morocco'
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createVerificationToken = function () {
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    this.verificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    this.verificationTokenExpires = Date.now() + 10 * 60 * 1000;

    return token;
};
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);