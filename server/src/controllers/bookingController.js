import { Booking, Payment, Loan, Possession, ConstructionUpdate, Referral } from '../models/Booking.js';
import Lead from '../models/Lead.js';
import Unit from '../models/Unit.js';
import PDFDocument from 'pdfkit';

export const getBookings = async (req, res) => {
  const bookings = await Booking.find({ builder: req.user.builder._id || req.user.builder })
    .populate('lead', 'name phone email')
    .populate('project', 'name')
    .populate('unit', 'unitNumber type price')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

export const createBooking = async (req, res) => {
  const { leadId, projectId, unitId, bookingAmount, totalPrice } = req.body;

  const unit = await Unit.findById(unitId);
  if (!unit || unit.status !== 'available') {
    return res.status(400).json({ message: 'Unit not available' });
  }

  const booking = await Booking.create({
    builder: req.user.builder._id || req.user.builder,
    lead: leadId,
    project: projectId,
    unit: unitId,
    bookingAmount,
    totalPrice: totalPrice || unit.price,
    status: 'confirmed',
  });

  await Unit.findByIdAndUpdate(unitId, { status: 'held', linkedLead: leadId, linkedBooking: booking._id });
  await Lead.findByIdAndUpdate(leadId, { status: 'booked', unit: unitId });

  const payments = generatePaymentSchedule(booking._id, req.user.builder._id || req.user.builder, totalPrice || unit.price, bookingAmount);
  await Payment.insertMany(payments);

  await Loan.create({
    booking: booking._id,
    builder: req.user.builder._id || req.user.builder,
    status: 'not_started',
  });

  await Possession.create({
    booking: booking._id,
    builder: req.user.builder._id || req.user.builder,
    checklist: [
      { item: 'Final payment clearance' },
      { item: 'Agreement signed' },
      { item: 'Society NOC' },
      { item: 'Key handover' },
      { item: 'Possession letter' },
    ],
  });

  const populated = await Booking.findById(booking._id)
    .populate('lead', 'name')
    .populate('unit', 'unitNumber type');

  res.status(201).json(populated);
};

const generatePaymentSchedule = (bookingId, builderId, totalPrice, bookingAmount) => {
  const remaining = totalPrice - bookingAmount;
  const installments = 4;
  const schedule = [];
  const now = new Date();

  schedule.push({
    booking: bookingId,
    builder: builderId,
    amount: bookingAmount,
    dueDate: now,
    status: 'paid',
    paidDate: now,
    installmentNumber: 1,
    notes: 'Booking amount',
  });

  for (let i = 1; i <= installments; i++) {
    const due = new Date(now);
    due.setMonth(due.getMonth() + i * 3);
    schedule.push({
      booking: bookingId,
      builder: builderId,
      amount: Math.round(remaining / installments),
      dueDate: due,
      status: 'pending',
      installmentNumber: i + 1,
    });
  }

  return schedule;
};

export const generateAgreement = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('lead', 'name phone email')
    .populate('project', 'name location')
    .populate('unit', 'unitNumber type floor area price');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('SALE AGREEMENT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`This Agreement is made between the Builder and ${booking.lead.name}.`);
  doc.text(`Project: ${booking.project.name}, ${booking.project.location}`);
  doc.text(`Unit: ${booking.unit.unitNumber} (${booking.unit.type}), Floor ${booking.unit.floor}`);
  doc.text(`Total Price: ₹${booking.totalPrice.toLocaleString('en-IN')}`);
  doc.text(`Booking Amount Received: ₹${booking.bookingAmount.toLocaleString('en-IN')}`);
  doc.moveDown();
  doc.text('Terms and conditions apply as per RERA guidelines.');
  doc.end();

  await new Promise((r) => doc.on('end', r));
  const buffer = Buffer.concat(chunks);

  booking.agreement = {
    documentUrl: `/api/bookings/${booking._id}/agreement`,
    templateData: { generatedAt: new Date() },
  };
  booking.status = 'agreement_pending';
  await booking.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.send(buffer);
};

export const getPayments = async (req, res) => {
  const payments = await Payment.find({
    builder: req.user.builder._id || req.user.builder,
    ...(req.params.bookingId && { booking: req.params.bookingId }),
  }).sort({ dueDate: 1 });
  res.json(payments);
};

export const recordPayment = async (req, res) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    { status: 'paid', paidDate: new Date(), ...req.body },
    { new: true }
  );
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
};

export const getLoan = async (req, res) => {
  const loan = await Loan.findOne({ booking: req.params.bookingId });
  res.json(loan);
};

export const updateLoan = async (req, res) => {
  const loan = await Loan.findOneAndUpdate(
    { booking: req.params.bookingId },
    { ...req.body, lastUpdated: new Date() },
    { new: true, upsert: true }
  );
  res.json(loan);
};

export const getPossession = async (req, res) => {
  const possession = await Possession.findOne({ booking: req.params.bookingId });
  res.json(possession);
};

export const updatePossession = async (req, res) => {
  const possession = await Possession.findOneAndUpdate(
    { booking: req.params.bookingId },
    req.body,
    { new: true }
  );
  res.json(possession);
};

export const getConstructionUpdates = async (req, res) => {
  const filter = { builder: req.user.builder._id || req.user.builder };
  if (req.query.projectId) filter.project = req.query.projectId;

  const updates = await ConstructionUpdate.find(filter)
    .populate('project', 'name')
    .sort({ publishedAt: -1 });
  res.json(updates);
};

export const createConstructionUpdate = async (req, res) => {
  const update = await ConstructionUpdate.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(update);
};

export const getReferrals = async (req, res) => {
  const referrals = await Referral.find({ builder: req.user.builder._id || req.user.builder })
    .populate('referrerLead', 'name phone')
    .populate('referredLead', 'name phone status')
    .sort({ createdAt: -1 });
  res.json(referrals);
};

export const createReferral = async (req, res) => {
  const referral = await Referral.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(referral);
};

export const updateReferral = async (req, res) => {
  const referral = await Referral.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    req.body,
    { new: true }
  );
  res.json(referral);
};
