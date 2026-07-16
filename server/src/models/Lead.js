import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['status_change', 'call', 'note', 'follow_up', 'assignment', 'ai_qualification', 'ai_message', 'email', 'whatsapp'],
      required: true,
    },
    description: String,
    oldValue: String,
    newValue: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    name: { type: String, required: true },
    email: String,
    phone: { type: String, required: true },
    source: {
      type: String,
      enum: [
        'walk_in',
        'website',
        'facebook',
        'google',
        'magicbricks',
        '99acres',
        'housing',
        'referral',
        'whatsapp',
        'landing_page',
        'manual',
        'other',
      ],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'],
      default: 'new',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    budget: { min: Number, max: Number },
    preferredLocation: String,
    bhkPreference: String,
    loanRequired: Boolean,
    familySize: Number,
    timeline: String,
    notes: String,
    tags: [String],
    aiScore: { type: Number, min: 0, max: 100, default: 0 },
    aiQualified: { type: Boolean, default: false },
    aiQualificationData: mongoose.Schema.Types.Mixed,
    lastContactedAt: Date,
    nextFollowUpAt: Date,
    lostReason: String,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    activities: [activitySchema],
    isSilent: { type: Boolean, default: false },
    silentSince: Date,
  },
  { timestamps: true }
);

leadSchema.index({ builder: 1, status: 1 });
leadSchema.index({ builder: 1, assignedTo: 1 });
leadSchema.index({ builder: 1, aiScore: -1 });

export default mongoose.model('Lead', leadSchema);
