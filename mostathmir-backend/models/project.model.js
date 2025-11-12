const mongoose = require('mongoose');

const financialProjectionSchema = new mongoose.Schema({
    year: String, // Changed to String to accommodate "السنة الأولى" etc.
    revenue: Number,
    expenses: Number,
    profit: Number
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
    name: String,
    role: String,
    bio: String
}, { _id: false });

const expenseItemSchema = new mongoose.Schema({
    item: String,
    percentage: Number
}, { _id: false });

const projectSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    projectName: { type: String, trim: true },
    projectCategory: { type: String },

    projectStage: {
        type: String,
        enum: ['idea', 'in-progress', 'established'],
        default: 'idea'
    },
    equityOffered: {
        type: Number,
        min: 0,
        max: 100
    },

    // --- === START: NEW FIELDS FOR PROJECT STAGE DETAILS === ---
    progressDetails: { // For "in-progress" stage
        type: String,
        trim: true
    },
    completionPercentage: { // For "in-progress" stage
        type: Number,
        min: 0,
        max: 100
    },
    pastFinancials: [financialProjectionSchema], // For "established" stage
    // --- === END: NEW FIELDS === ---

    projectDescription: { type: String },
    detailedDescription: { type: String },
    keyFeatures: [String],
    projectLocation: {
        country: String,
        city: String
    },
    videoLink: { type: String, trim: true },

    fundingGoal: {
        type: {
            amount: { type: Number, default: 0 },
            currency: { type: String, default: 'SAR' }
        },
        default: { amount: 0, currency: 'SAR' }
    },
    minInvestment: { type: Number, default: 0 },
    expectedReturn: { type: Number, default: 0 },
    investmentPeriod: { type: Number, default: 12 },

    fundingDetails: [expenseItemSchema],
    financialProjections: [financialProjectionSchema],

    mainImage: { type: String },
    projectImages: [String],
    businessPlan: { type: String },
    presentation: { type: String },

    targetAudience: { type: String, default: 'all' },
    campaignDuration: { type: Number, default: 60 },
    campaignStartDate: { type: Date },

    teamMembers: [teamMemberSchema],

    status: {
        type: String,
        enum: ['draft', 'under-review', 'published', 'funded', 'completed', 'cancelled', 'closed'],
        default: 'draft'
    },
    adminNotes: { type: String, trim: true },
    visibility: { type: String, enum: ['public', 'private', 'invited'], default: 'public' },
    views: { type: Number, default: 0 },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    fundingAmountRaised: { type: Number, default: 0 },

    investors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;