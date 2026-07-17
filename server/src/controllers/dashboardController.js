import { getSql } from '../lib/neonSql.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const getExecutivePerformance = async (builderId) => {
  const sql = getSql();
  const executives = await sql`
    SELECT id, name FROM "User"
    WHERE "builderId" = ${builderId} AND role = 'sales_executive' AND "isActive" = true
  `;

  return Promise.all(
    executives.map(async (exec) => {
      const [assignedRows, convertedRows, visitsRows] = await Promise.all([
        sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "assignedToId" = ${exec.id} AND status <> 'lost'`,
        sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "assignedToId" = ${exec.id} AND status = 'booked'`,
        sql`SELECT COUNT(*)::int AS c FROM "SiteVisit" WHERE "assignedToId" = ${exec.id} AND status = 'completed'`,
      ]);
      const assigned = assignedRows[0]?.c ?? 0;
      const converted = convertedRows[0]?.c ?? 0;
      const visits = visitsRows[0]?.c ?? 0;
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
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const userId = getUserId(req.user);
    const isExec = req.user.role === 'sales_executive';

    const [
      totalLeadsRows,
      newLeadsRows,
      siteVisitsRows,
      bookingsRows,
      dueFollowUpsRows,
      aiAlertsRows,
      executivePerformance,
    ] = await Promise.all([
      isExec
        ? sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "builderId" = ${builderId} AND "assignedToId" = ${userId} AND status <> 'lost'`
        : sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "builderId" = ${builderId} AND status <> 'lost'`,
      isExec
        ? sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "builderId" = ${builderId} AND "assignedToId" = ${userId} AND "createdAt" >= ${today}`
        : sql`SELECT COUNT(*)::int AS c FROM "Lead" WHERE "builderId" = ${builderId} AND "createdAt" >= ${today}`,
      sql`SELECT COUNT(*)::int AS c FROM "SiteVisit" WHERE "builderId" = ${builderId} AND status = 'scheduled' AND "scheduledAt" >= ${today}`,
      sql`SELECT COUNT(*)::int AS c FROM "Booking" WHERE "builderId" = ${builderId} AND "createdAt" >= ${monthStart}`,
      isExec
        ? sql`SELECT COUNT(*)::int AS c FROM "FollowUp" WHERE "builderId" = ${builderId} AND "assignedToId" = ${userId} AND status = 'pending' AND "scheduledAt" <= ${new Date()}`
        : sql`SELECT COUNT(*)::int AS c FROM "FollowUp" WHERE "builderId" = ${builderId} AND status = 'pending' AND "scheduledAt" <= ${new Date()}`,
      sql`
        SELECT a.*, l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l."aiScore" AS lead_ai_score
        FROM "AIAlert" a
        LEFT JOIN "Lead" l ON l.id = a."leadId"
        WHERE a."builderId" = ${builderId} AND a."isRead" = false
        ORDER BY a."createdAt" DESC
        LIMIT 10
      `,
      getExecutivePerformance(builderId),
    ]);

    const aiAlerts = aiAlertsRows.map((row) =>
      formatId({
        id: row.id,
        _id: row.id,
        type: row.type,
        message: row.message,
        priority: row.priority,
        lead: row.lead_id
          ? { id: row.lead_id, _id: row.lead_id, name: row.lead_name, phone: row.lead_phone, aiScore: row.lead_ai_score }
          : undefined,
      })
    );

    res.json({
      totalLeads: totalLeadsRows[0]?.c ?? 0,
      newLeadsToday: newLeadsRows[0]?.c ?? 0,
      siteVisitsScheduled: siteVisitsRows[0]?.c ?? 0,
      bookingsThisMonth: bookingsRows[0]?.c ?? 0,
      dueFollowUps: dueFollowUpsRows[0]?.c ?? 0,
      aiAlerts,
      executivePerformance,
    });
  } catch (err) {
    console.error('getDashboard:', err);
    res.status(500).json({ message: err.message || 'Failed to load dashboard' });
  }
};

export const getLeadSourceReport = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const sources = await sql`
      SELECT source, COUNT(*)::int AS count
      FROM "Lead"
      WHERE "builderId" = ${builderId}
      GROUP BY source
    `;

    const report = await Promise.all(
      sources.map(async (item) => {
        const bookedRows = await sql`
          SELECT COUNT(*)::int AS c FROM "Lead"
          WHERE "builderId" = ${builderId} AND source = ${item.source} AND status = 'booked'
        `;
        return { _id: item.source, count: item.count, booked: bookedRows[0]?.c ?? 0 };
      })
    );

    res.json(report.sort((a, b) => b.count - a.count));
  } catch (err) {
    console.error('getLeadSourceReport:', err);
    res.status(500).json({ message: err.message || 'Failed to load report' });
  }
};

export const getFunnelReport = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
    const funnel = await Promise.all(
      stages.map(async (stage) => {
        const rows = await sql`
          SELECT COUNT(*)::int AS c FROM "Lead" WHERE "builderId" = ${builderId} AND status = ${stage}
        `;
        return { stage, count: rows[0]?.c ?? 0 };
      })
    );
    res.json(funnel);
  } catch (err) {
    console.error('getFunnelReport:', err);
    res.status(500).json({ message: err.message || 'Failed to load funnel' });
  }
};

export const getExecutiveReport = async (req, res) => {
  try {
    res.json(await getExecutivePerformance(getBuilderId(req.user)));
  } catch (err) {
    console.error('getExecutiveReport:', err);
    res.status(500).json({ message: err.message || 'Failed to load report' });
  }
};
