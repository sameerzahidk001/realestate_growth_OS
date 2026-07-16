import prisma from '../lib/prisma.js';
import PDFDocument from 'pdfkit';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

const bookingInclude = {
  lead: { select: { id: true, name: true, phone: true, email: true } },
  project: { select: { id: true, name: true, location: true } },
  unit: { select: { id: true, unitNumber: true, type: true, price: true, floor: true, area: true } },
};

const generatePaymentSchedule = (bookingId, builderId, totalPrice, bookingAmount) => {
  const remaining = totalPrice - bookingAmount;
  const installments = 4;
  const schedule = [];
  const now = new Date();

  schedule.push({
    bookingId,
    builderId,
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
      bookingId,
      builderId,
      amount: Math.round(remaining / installments),
      dueDate: due,
      status: 'pending',
      installmentNumber: i + 1,
    });
  }

  return schedule;
};

export const getBookings = async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { builderId: getBuilderId(req.user) },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(formatId(bookings));
};

export const createBooking = async (req, res) => {
  const { leadId, projectId, unitId, bookingAmount, totalPrice } = req.body;
  const builderId = getBuilderId(req.user);

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.status !== 'available') {
    return res.status(400).json({ message: 'Unit not available' });
  }

  const booking = await prisma.booking.create({
    data: {
      builderId,
      leadId,
      projectId,
      unitId,
      bookingAmount: Number(bookingAmount),
      totalPrice: Number(totalPrice || unit.price),
      status: 'confirmed',
    },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: 'held', linkedLeadId: leadId, linkedBookingId: booking.id },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'booked', unitId } });

  await prisma.payment.createMany({
    data: generatePaymentSchedule(booking.id, builderId, Number(totalPrice || unit.price), Number(bookingAmount)),
  });

  await prisma.loan.create({ data: { bookingId: booking.id, builderId, status: 'not_started' } });
  await prisma.possession.create({
    data: {
      bookingId: booking.id,
      builderId,
      checklist: [
        { item: 'Final payment clearance', completed: false },
        { item: 'Agreement signed', completed: false },
        { item: 'Society NOC', completed: false },
        { item: 'Key handover', completed: false },
        { item: 'Possession letter', completed: false },
      ],
    },
  });

  const populated = await prisma.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });
  res.status(201).json(formatId(populated));
};

export const generateAgreement = async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    include: bookingInclude,
  });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('SALE AGREEMENT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`This Agreement is made between the Builder and ${booking.lead.name}.`);
  doc.text(`Project: ${booking.project.name}, ${booking.project.location}`);
  doc.text(`Unit: ${booking.unit.unitNumber} (${booking.unit.type}), Floor ${booking.unit.floor || '-'}`);
  doc.text(`Total Price: ₹${booking.totalPrice.toLocaleString('en-IN')}`);
  doc.text(`Booking Amount Received: ₹${booking.bookingAmount.toLocaleString('en-IN')}`);
  doc.end();

  await new Promise((r) => doc.on('end', r));
  const buffer = Buffer.concat(chunks);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      agreementDocumentUrl: `/api/bookings/${booking.id}/agreement`,
      agreementTemplateData: { generatedAt: new Date() },
      status: 'agreement_pending',
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.send(buffer);
};

export const getPayments = async (req, res) => {
  const where = { builderId: getBuilderId(req.user) };
  if (req.params.bookingId) where.bookingId = req.params.bookingId;

  const payments = await prisma.payment.findMany({ where, orderBy: { dueDate: 'asc' } });
  res.json(formatId(payments));
};

export const recordPayment = async (req, res) => {
  const result = await prisma.payment.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: { status: 'paid', paidDate: new Date(), ...req.body },
  });
  if (!result.count) return res.status(404).json({ message: 'Payment not found' });
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  res.json(formatId(payment));
};

export const getLoan = async (req, res) => {
  const loan = await prisma.loan.findFirst({ where: { bookingId: req.params.bookingId } });
  res.json(formatId(loan));
};

export const updateLoan = async (req, res) => {
  const existing = await prisma.loan.findFirst({ where: { bookingId: req.params.bookingId } });
  const loan = existing
    ? await prisma.loan.update({ where: { id: existing.id }, data: { ...req.body, lastUpdated: new Date() } })
    : await prisma.loan.create({
        data: { bookingId: req.params.bookingId, builderId: getBuilderId(req.user), ...req.body, lastUpdated: new Date() },
      });
  res.json(formatId(loan));
};

export const getPossession = async (req, res) => {
  const possession = await prisma.possession.findFirst({ where: { bookingId: req.params.bookingId } });
  res.json(formatId(possession));
};

export const updatePossession = async (req, res) => {
  const possession = await prisma.possession.updateMany({
    where: { bookingId: req.params.bookingId, builderId: getBuilderId(req.user) },
    data: req.body,
  });
  const updated = await prisma.possession.findFirst({ where: { bookingId: req.params.bookingId } });
  res.json(formatId(updated));
};

export const getConstructionUpdates = async (req, res) => {
  const where = { builderId: getBuilderId(req.user) };
  if (req.query.projectId) where.projectId = req.query.projectId;

  const updates = await prisma.constructionUpdate.findMany({
    where,
    include: { project: { select: { id: true, name: true } } },
    orderBy: { publishedAt: 'desc' },
  });
  res.json(formatId(updates));
};

export const createConstructionUpdate = async (req, res) => {
  const update = await prisma.constructionUpdate.create({
    data: {
      builderId: getBuilderId(req.user),
      projectId: req.body.project,
      title: req.body.title,
      description: req.body.description,
      milestone: req.body.milestone,
      progressPercent: req.body.progressPercent,
      media: req.body.media,
    },
  });
  res.status(201).json(formatId(update));
};

export const getReferrals = async (req, res) => {
  const referrals = await prisma.referral.findMany({
    where: { builderId: getBuilderId(req.user) },
    include: {
      referrerLead: { select: { id: true, name: true, phone: true } },
      referredLead: { select: { id: true, name: true, phone: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(formatId(referrals));
};

export const createReferral = async (req, res) => {
  const referral = await prisma.referral.create({
    data: { builderId: getBuilderId(req.user), ...req.body, referrerLeadId: req.body.referrerLead },
  });
  res.status(201).json(formatId(referral));
};

export const updateReferral = async (req, res) => {
  const result = await prisma.referral.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: req.body,
  });
  if (!result.count) return res.status(404).json({ message: 'Referral not found' });
  const referral = await prisma.referral.findUnique({ where: { id: req.params.id } });
  res.json(formatId(referral));
};
