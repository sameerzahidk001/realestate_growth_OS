import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial'], default: 'pending' },
    paymentMethod: String,
    transactionId: String,
    notes: String,
    installmentNumber: Number,
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookingAmount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'agreement_pending', 'agreement_signed', 'payment_in_progress', 'possession_ready', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    agreement: {
      documentUrl: String,
      signedAt: Date,
      templateData: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

const loanSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    bankName: String,
    loanAmount: Number,
    status: {
      type: String,
      enum: ['not_started', 'documents_submitted', 'under_review', 'approved', 'disbursed', 'rejected'],
      default: 'not_started',
    },
    emiAmount: Number,
    tenureMonths: Number,
    notes: String,
    lastUpdated: Date,
  },
  { timestamps: true }
);

const possessionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    scheduledDate: Date,
    status: { type: String, enum: ['pending', 'scheduled', 'in_progress', 'completed'], default: 'pending' },
    checklist: [
      {
        item: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    documents: [{ name: String, url: String, uploadedAt: Date }],
    handoverNotes: String,
  },
  { timestamps: true }
);

const constructionUpdateSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    title: { type: String, required: true },
    description: String,
    milestone: String,
    progressPercent: Number,
    media: [{ type: String, url: String }],
    publishedAt: { type: Date, default: Date.now },
    visibleToCustomers: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const referralSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: 'Builder', required: true },
    referrerLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    referrerCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referredLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    referredName: String,
    referredPhone: String,
    status: { type: String, enum: ['pending', 'contacted', 'converted', 'rewarded'], default: 'pending' },
    incentiveAmount: Number,
    incentivePaid: { type: Boolean, default: false },
    notes: String,
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
export const Booking = mongoose.model('Booking', bookingSchema);
export const Loan = mongoose.model('Loan', loanSchema);
export const Possession = mongoose.model('Possession', possessionSchema);
export const ConstructionUpdate = mongoose.model('ConstructionUpdate', constructionUpdateSchema);
export const Referral = mongoose.model('Referral', referralSchema);
