import mongoose from 'mongoose';

const pilotFeedbackSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    week: Number,
    rating: { type: Number, min: 1, max: 5 },
    featuresUsed: [String],
    featuresNotUsed: [String],
    missedFollowUpCause: String,
    painPoints: [String],
    suggestions: String,
    wouldRecommend: Boolean,
  },
  { timestamps: true }
);

const usageLogSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    feature: { type: String, required: true },
    action: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const aiAlertSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    type: {
      type: String,
      enum: ['follow_up_risk', 'silent_lead', 'high_priority', 'score_change', 'market_insight'],
      required: true,
    },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    isRead: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const aiConversationSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    type: { type: String, enum: ['assistant', 'qualification', 'voice_bot', 'analytics', 'negotiation'], required: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    subject: { type: String, required: true },
    description: String,
    category: { type: String, enum: ['payment', 'construction', 'possession', 'documentation', 'other'], default: 'other' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    resolution: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

export const PilotFeedback = mongoose.model('PilotFeedback', pilotFeedbackSchema);
export const UsageLog = mongoose.model('UsageLog', usageLogSchema);
export const AIAlert = mongoose.model('AIAlert', aiAlertSchema);
export const AIConversation = mongoose.model('AIConversation', aiConversationSchema);
export const Complaint = mongoose.model('Complaint', complaintSchema);
