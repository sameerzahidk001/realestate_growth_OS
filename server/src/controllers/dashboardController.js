import prisma from '../lib/prisma.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const getExecutivePerformance = async (builderId) => {
  const executives = await prisma.user.findMany({
    where: { builderId, role: 'sales_executive', isActive: true },
  });

  return Promise.all(
    executives.map(async (exec) => {
      const [assigned, converted, visits] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: exec.id, status: { not: 'lost' } } }),
        prisma.lead.count({ where: { assignedToId: exec.id, status: 'booked' } }),
        prisma.siteVisit.count({ where: { assignedToId: exec.id, status: 'completed' } }),
      ]);
      return {
        id: exec.id,
        name: exec.name,
        leadsAssigned: assigned,
        leadsConverted: converted,
        conversionRate: assigned ? Math.round((converted / assigned) * 100) : 0,
        siteVisitsCompleted: visits,
      };
    })
  );
};

export const getDashboard = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const leadWhere = { builderId };
  const followWhere = { builderId };
  if (req.user.role === 'sales_executive') {
    leadWhere.assignedToId = getUserId(req.user);
    followWhere.assignedToId = getUserId(req.user);
  }

  const [
    totalLeads,
    newLeadsToday,
    siteVisitsScheduled,
    bookingsThisMonth,
    dueFollowUps,
    aiAlerts,
    executivePerformance,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...leadWhere, status: { not: 'lost' } } }),
    prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: today } } }),
    prisma.siteVisit.count({ where: { builderId, status: 'scheduled', scheduledAt: { gte: today } } }),
    prisma.booking.count({ where: { builderId, createdAt: { gte: monthStart } } }),
    prisma.followUp.count({ where: { ...followWhere, status: 'pending', scheduledAt: { lte: new Date() } } }),
    prisma.aIAlert.findMany({
      where: { builderId, isRead: false },
      include: { lead: { select: { id: true, name: true, phone: true, aiScore: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    getExecutivePerformance(builderId),
  ]);

  res.json({
    totalLeads,
    newLeadsToday,
    siteVisitsScheduled,
    bookingsThisMonth,
    dueFollowUps,
    aiAlerts: formatId(aiAlerts),
    executivePerformance,
  });
};

export const getLeadSourceReport = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const leads = await prisma.lead.groupBy({
    by: ['source'],
    where: { builderId },
    _count: { _all: true },
  });

  const report = await Promise.all(
    leads.map(async (item) => ({
      _id: item.source,
      count: item._count._all,
      booked: await prisma.lead.count({ where: { builderId, source: item.source, status: 'booked' } }),
    }))
  );

  res.json(report.sort((a, b) => b.count - a.count));
};

export const getFunnelReport = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
  const funnel = await Promise.all(
    stages.map(async (stage) => ({
      stage,
      count: await prisma.lead.count({ where: { builderId, status: stage } }),
    }))
  );
  res.json(funnel);
};

export const getExecutiveReport = async (req, res) => {
  res.json(await getExecutivePerformance(getBuilderId(req.user)));
};
