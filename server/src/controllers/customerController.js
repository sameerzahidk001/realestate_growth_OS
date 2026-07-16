import { Booking, Payment, ConstructionUpdate } from '../models/Booking.js';
import { Complaint } from '../models/Support.js';
import Lead from '../models/Lead.js';

export const getCustomerDashboard = async (req, res) => {
  const lead = await Lead.findOne({ email: req.user.email, builder: req.user.builder });
  const booking = await Booking.findOne({ lead: lead?._id })
    .populate('project', 'name location')
    .populate('unit', 'unitNumber type');

  const payments = booking
    ? await Payment.find({ booking: booking._id }).sort({ dueDate: 1 })
    : [];

  const updates = booking
    ? await ConstructionUpdate.find({ project: booking.project, visibleToCustomers: true })
        .sort({ publishedAt: -1 })
        .limit(10)
    : [];

  res.json({ lead, booking, payments, constructionUpdates: updates });
};

export const getCustomerComplaints = async (req, res) => {
  const complaints = await Complaint.find({ customer: req.user._id });
  res.json(complaints);
};

export const createComplaint = async (req, res) => {
  const complaint = await Complaint.create({
    ...req.body,
    customer: req.user._id,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(complaint);
};

export const getCustomerReferrals = async (req, res) => {
  const lead = await Lead.findOne({ email: req.user.email });
  const { Referral } = await import('../models/Booking.js');
  const referrals = await Referral.find({
    builder: req.user.builder._id || req.user.builder,
    referrerLead: lead?._id,
  });
  res.json(referrals);
};
