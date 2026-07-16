import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    city: String,
    totalUnits: { type: Number, default: 0 },
    description: String,
    amenities: [String],
    priceList: [
      {
        bhkType: String,
        price: Number,
        area: String,
      },
    ],
    brochure: String,
    images: [String],
    status: { type: String, enum: ['planning', 'under_construction', 'ready', 'completed'], default: 'under_construction' },
    launchDate: Date,
    possessionDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
