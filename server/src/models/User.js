import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    phone: String,
    role: {
      type: String,
      enum: ['owner', 'sales_manager', 'sales_executive', 'customer'],
      default: 'sales_executive',
    },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    performance: {
      leadsAssigned: { type: Number, default: 0 },
      leadsConverted: { type: Number, default: 0 },
      siteVisitsCompleted: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
