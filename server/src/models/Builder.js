import mongoose from 'mongoose';

const builderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    address: String,
    city: String,
    logo: String,
    plan: { type: String, enum: ['pilot', 'starter', 'growth', 'enterprise'], default: 'pilot' },
    isActive: { type: Boolean, default: true },
    settings: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      currency: { type: String, default: 'INR' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Builder', builderSchema);
