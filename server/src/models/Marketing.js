import mongoose from 'mongoose';

const landingPageSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    blocks: [
      {
        type: { type: String, enum: ['hero', 'features', 'gallery', 'form', 'cta', 'testimonials'], required: true },
        content: mongoose.Schema.Types.Mixed,
        order: Number,
      },
    ],
    isPublished: { type: Boolean, default: false },
    leadsCaptured: { type: Number, default: 0 },
    theme: { primaryColor: String, fontFamily: String },
  },
  { timestamps: true }
);

const campaignSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    name: { type: String, required: true },
    platform: { type: String, enum: ['facebook', 'google', 'whatsapp', 'magicbricks', '99acres', 'housing', 'email', 'sms'], required: true },
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
    budget: Number,
    leadsGenerated: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    aiSuggestions: {
      headline: String,
      description: String,
      imagePrompt: String,
      cta: String,
    },
    externalCampaignId: String,
    landingPage: { type: mongoose.Schema.Types.ObjectId, ref: 'LandingPage' },
    targetAudience: mongoose.Schema.Types.Mixed,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

const marketingCampaignSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['segment', 'birthday', 'festival', 'drip', 'broadcast'], required: true },
    channels: [{ type: String, enum: ['whatsapp', 'email', 'sms'] }],
    segment: {
      bhkPreference: String,
      status: [String],
      budgetMin: Number,
      budgetMax: Number,
      project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    },
    content: {
      subject: String,
      body: String,
      aiGenerated: { type: Boolean, default: false },
    },
    schedule: {
      type: { type: String, enum: ['immediate', 'scheduled', 'recurring'], default: 'immediate' },
      runAt: Date,
      cron: String,
    },
    status: { type: String, enum: ['draft', 'scheduled', 'running', 'completed', 'paused'], default: 'draft' },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const competitorSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    name: { type: String, required: true },
    location: String,
    projectName: String,
    priceRange: { min: Number, max: Number },
    offers: [String],
    launchDate: Date,
    aiInsights: String,
    lastTrackedAt: Date,
  },
  { timestamps: true }
);

export const LandingPage = mongoose.model('LandingPage', landingPageSchema);
export const Campaign = mongoose.model('Campaign', campaignSchema);
export const MarketingCampaign = mongoose.model('MarketingCampaign', marketingCampaignSchema);
export const Competitor = mongoose.model('Competitor', competitorSchema);
