import prisma from '../lib/prisma.js';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

export const getCustomerDashboard = async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { email: req.user.email, builderId: getBuilderId(req.user) },
  });

  const booking = lead
    ? await prisma.booking.findFirst({
        where: { leadId: lead.id },
        include: {
          project: { select: { id: true, name: true, location: true } },
          unit: { select: { id: true, unitNumber: true, type: true } },
        },
      })
    : null;

  const payments = booking
    ? await prisma.payment.findMany({ where: { bookingId: booking.id }, orderBy: { dueDate: 'asc' } })
    : [];

  const updates = booking
    ? await prisma.constructionUpdate.findMany({
        where: { projectId: booking.projectId, visibleToCustomers: true },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      })
    : [];

  res.json({
    lead: formatId(lead),
    booking: formatId(booking),
    payments: formatId(payments),
    constructionUpdates: formatId(updates),
  });
};

export const getCustomerComplaints = async (req, res) => {
  const complaints = await prisma.complaint.findMany({ where: { customerId: req.user._id || req.user.id } });
  res.json(formatId(complaints));
};

export const createComplaint = async (req, res) => {
  const complaint = await prisma.complaint.create({
    data: {
      builderId: getBuilderId(req.user),
      customerId: req.user._id || req.user.id,
      bookingId: req.body.booking,
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category || 'other',
    },
  });
  res.status(201).json(formatId(complaint));
};

export const getCustomerReferrals = async (req, res) => {
  const lead = await prisma.lead.findFirst({ where: { email: req.user.email } });
  const referrals = await prisma.referral.findMany({
    where: { builderId: getBuilderId(req.user), referrerLeadId: lead?.id },
  });
  res.json(formatId(referrals));
};
