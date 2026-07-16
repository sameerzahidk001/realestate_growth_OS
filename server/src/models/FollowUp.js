import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    type: { type: String, enum: ['call', 'visit', 'email', 'whatsapp', 'meeting'], default: 'call' },
    notes: String,
    status: { type: String, enum: ['pending', 'completed', 'missed', 'rescheduled'], default: 'pending' },
    completedAt: Date,
    summary: String,
    isAiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

followUpSchema.index({ builder: 1, scheduledAt: 1, status: 1 });

export default mongoose.model('FollowUp', followUpSchema);
