import mongoose from 'mongoose';

const siteVisitSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'], default: 'scheduled' },
    feedback: String,
    rating: { type: Number, min: 1, max: 5 },
    interestLevel: { type: String, enum: ['low', 'medium', 'high', 'very_high'] },
    completedAt: Date,
    aiPlanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('SiteVisit', siteVisitSchema);
