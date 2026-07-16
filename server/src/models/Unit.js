import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    unitNumber: { type: String, required: true },
    type: { type: String, enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse', 'Villa', 'Plot', 'Shop'], required: true },
    floor: Number,
    area: String,
    price: { type: Number, required: true },
    facing: String,
    status: { type: String, enum: ['available', 'held', 'sold', 'blocked'], default: 'available' },
    linkedLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    linkedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true }
);

unitSchema.index({ project: 1, unitNumber: 1 }, { unique: true });

export default mongoose.model('Unit', unitSchema);
