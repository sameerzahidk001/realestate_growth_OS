import prisma from '../lib/prisma.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

export const getSiteVisits = async (req, res) => {
  const where = { builderId: getBuilderId(req.user) };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);
  if (req.query.status) where.status = req.query.status;

  const visits = await prisma.siteVisit.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      project: { select: { id: true, name: true, location: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });
  res.json(formatId(visits));
};

export const createSiteVisit = async (req, res) => {
  const visit = await prisma.siteVisit.create({
    data: {
      leadId: req.body.lead,
      builderId: getBuilderId(req.user),
      projectId: req.body.project,
      assignedToId: req.body.assignedTo || getUserId(req.user),
      scheduledAt: new Date(req.body.scheduledAt),
    },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      project: { select: { id: true, name: true } },
    },
  });

  await prisma.lead.update({
    where: { id: req.body.lead },
    data: { status: 'interested', lastContactedAt: new Date() },
  });

  res.status(201).json(formatId(visit));
};

export const updateSiteVisit = async (req, res) => {
  const data = { ...req.body };
  if (req.body.scheduledAt) data.scheduledAt = new Date(req.body.scheduledAt);
  if (req.body.status === 'completed') data.completedAt = new Date();

  const result = await prisma.siteVisit.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data,
  });
  if (!result.count) return res.status(404).json({ message: 'Site visit not found' });

  const visit = await prisma.siteVisit.findUnique({
    where: { id: req.params.id },
    include: { lead: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  });

  if (req.body.status === 'completed' && visit?.leadId) {
    await prisma.lead.update({ where: { id: visit.leadId }, data: { status: 'site_visit_done' } });
  }

  res.json(formatId(visit));
};
