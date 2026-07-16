import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import { Booking } from '../models/Booking.js';
import FollowUp from '../models/FollowUp.js';
import User from '../models/User.js';
import { AIAlert } from '../models/Support.js';

export const getDashboard = async (req, res) => {
  const builderId = req.user.builder._id || req.user.builder;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const baseFilter = { builder: builderId };
  if (req.user.role === 'sales_executive') baseFilter.assignedTo = req.user._id;

  const [
    totalLeads,
    newLeadsToday,
    siteVisitsScheduled,
    bookingsThisMonth,
    dueFollowUps,
    aiAlerts,
    executivePerformance,
  ] = await Promise.all([
    Lead.countDocuments({ ...baseFilter, status: { $ne: 'lost' } }),
    Lead.countDocuments({ ...baseFilter, createdAt: { $gte: today } }),
    SiteVisit.countDocuments({
      ...baseFilter,
      status: 'scheduled',
      scheduledAt: { $gte: today },
    }),
    Booking.countDocuments({ builder: builderId, createdAt: { $gte: monthStart } }),
    FollowUp.countDocuments({
      ...baseFilter,
      status: 'pending',
      scheduledAt: { $lte: new Date() },
    }),
    AIAlert.find({ builder: builderId, isRead: false }).sort({ createdAt: -1 }).limit(10),
    getExecutivePerformance(builderId),
  ]);

  res.json({
    totalLeads,
    newLeadsToday,
    siteVisitsScheduled,
    bookingsThisMonth,
    dueFollowUps,
    aiAlerts,
    executivePerformance,
  });
};

const getExecutivePerformance = async (builderId) => {
  const executives = await User.find({
    builder: builderId,
    role: 'sales_executive',
    isActive: true,
  });

  const performance = await Promise.all(
    executives.map(async (exec) => {
      const [assigned, converted, visits] = await Promise.all([
        Lead.countDocuments({ assignedTo: exec._id, status: { $ne: 'lost' } }),
        Lead.countDocuments({ assignedTo: exec._id, status: 'booked' }),
        SiteVisit.countDocuments({ assignedTo: exec._id, status: 'completed' }),
      ]);
      return {
        id: exec._id,
        name: exec.name,
        leadsAssigned: assigned,
        leadsConverted: converted,
        conversionRate: assigned ? Math.round((converted / assigned) * 100) : 0,
        siteVisitsCompleted: visits,
      };
    })
  );

  return performance;
};

export const getLeadSourceReport = async (req, res) => {
  const builderId = req.user.builder._id || req.user.builder;
  const report = await Lead.aggregate([
    { $match: { builder: builderId } },
    { $group: { _id: '$source', count: { $sum: 1 }, booked: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } } } },
    { $sort: { count: -1 } },
  ]);
  res.json(report);
};

export const getFunnelReport = async (req, res) => {
  const builderId = req.user.builder._id || req.user.builder;
  const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
  const funnel = await Promise.all(
    stages.map(async (stage) => ({
      stage,
      count: await Lead.countDocuments({ builder: builderId, status: stage }),
    }))
  );
  res.json(funnel);
};

export const getExecutiveReport = async (req, res) => {
  const builderId = req.user.builder._id || req.user.builder;
  const performance = await getExecutivePerformance(builderId);
  res.json(performance);
};
