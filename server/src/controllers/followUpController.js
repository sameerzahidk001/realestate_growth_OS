import prisma from '../lib/prisma.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

export const getFollowUps = async (req, res) => {
  const where = { builderId: getBuilderId(req.user) };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);
  if (req.query.status) where.status = req.query.status;

  const followUps = await prisma.followUp.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, phone: true, status: true, aiScore: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(formatId(followUps));
};

export const getDueFollowUps = async (req, res) => {
  const where = {
    builderId: getBuilderId(req.user),
    status: 'pending',
    scheduledAt: { lte: new Date() },
  };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);

  const due = await prisma.followUp.findMany({
    where,
    include: { lead: { select: { id: true, name: true, phone: true, status: true, aiScore: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(formatId(due));
};

export const createFollowUp = async (req, res) => {
  const followUp = await prisma.followUp.create({
    data: {
      leadId: req.body.lead,
      builderId: getBuilderId(req.user),
      assignedToId: req.body.assignedTo || getUserId(req.user),
      scheduledAt: new Date(req.body.scheduledAt),
      type: req.body.type || 'call',
      notes: req.body.notes,
    },
    include: { lead: { select: { id: true, name: true, phone: true } } },
  });

  if (req.body.lead) {
    await prisma.lead.update({
      where: { id: req.body.lead },
      data: { nextFollowUpAt: new Date(req.body.scheduledAt) },
    });
  }

  res.status(201).json(formatId(followUp));
};

export const completeFollowUp = async (req, res) => {
  const { summary, notes } = req.body;
  const existing = await prisma.followUp.findFirst({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
  });
  if (!existing) return res.status(404).json({ message: 'Follow-up not found' });

  const followUp = await prisma.followUp.update({
    where: { id: existing.id },
    data: { status: 'completed', completedAt: new Date(), summary, notes },
    include: { lead: { select: { id: true, name: true } } },
  });

  await prisma.lead.update({
    where: { id: followUp.leadId },
    data: { lastContactedAt: new Date() },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: followUp.leadId,
      type: 'follow_up',
      description: summary || notes || 'Follow-up completed',
      createdById: getUserId(req.user),
    },
  });

  res.json(formatId(followUp));
};
