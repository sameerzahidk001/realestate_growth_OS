import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const mapSiteVisit = (row) =>
  formatId({
    id: row.id,
    _id: row.id,
    leadId: row.leadId,
    builderId: row.builderId,
    projectId: row.projectId,
    assignedToId: row.assignedToId,
    scheduledAt: row.scheduledAt,
    status: row.status,
    feedback: row.feedback,
    rating: row.rating,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    lead: row.lead_id
      ? { id: row.lead_id, _id: row.lead_id, name: row.lead_name, phone: row.lead_phone }
      : undefined,
    project: row.project_id
      ? { id: row.project_id, _id: row.project_id, name: row.project_name, location: row.project_location }
      : undefined,
    assignedTo: row.assign_id
      ? { id: row.assign_id, _id: row.assign_id, name: row.assign_name }
      : undefined,
  });

const fetchSiteVisitById = async (id) => {
  const sql = getSql();
  const rows = await sql`
    SELECT
      v.*,
      l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone,
      p.id AS project_id, p.name AS project_name, p.location AS project_location,
      u.id AS assign_id, u.name AS assign_name
    FROM "SiteVisit" v
    LEFT JOIN "Lead" l ON l.id = v."leadId"
    LEFT JOIN "Project" p ON p.id = v."projectId"
    LEFT JOIN "User" u ON u.id = v."assignedToId"
    WHERE v.id = ${id}
    LIMIT 1
  `;
  return mapSiteVisit(rows[0]);
};

export const getSiteVisits = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const status = req.query.status;

    const rows = await sql`
      SELECT
        v.*,
        l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone,
        p.id AS project_id, p.name AS project_name, p.location AS project_location,
        u.id AS assign_id, u.name AS assign_name
      FROM "SiteVisit" v
      LEFT JOIN "Lead" l ON l.id = v."leadId"
      LEFT JOIN "Project" p ON p.id = v."projectId"
      LEFT JOIN "User" u ON u.id = v."assignedToId"
      WHERE v."builderId" = ${builderId}
      ${req.user.role === 'sales_executive' ? sql`AND v."assignedToId" = ${getUserId(req.user)}` : sql``}
      ${status ? sql`AND v.status = ${status}` : sql``}
      ORDER BY v."scheduledAt" DESC
    `;
    res.json(rows.map(mapSiteVisit));
  } catch (err) {
    console.error('getSiteVisits:', err);
    res.status(500).json({ message: err.message || 'Failed to load site visits' });
  }
};

export const createSiteVisit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    const id = cuid();
    const now = new Date();
    const scheduledAt = new Date(req.body.scheduledAt);
    const assignedToId = req.body.assignedTo || userId;

    await sql`
      INSERT INTO "SiteVisit" (
        id, "leadId", "builderId", "projectId", "assignedToId", "scheduledAt",
        status, "aiPlanned", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${req.body.lead}, ${builderId}, ${req.body.project}, ${assignedToId}, ${scheduledAt},
        'scheduled', false, ${now}, ${now}
      )
    `;

    await sql`
      UPDATE "Lead"
      SET status = 'interested', "lastContactedAt" = ${now}, "updatedAt" = ${now}
      WHERE id = ${req.body.lead}
    `;

    res.status(201).json(await fetchSiteVisitById(id));
  } catch (err) {
    console.error('createSiteVisit:', err);
    res.status(500).json({ message: err.message || 'Failed to create site visit' });
  }
};

export const updateSiteVisit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();
    const status = req.body.status;
    const feedback = req.body.feedback ?? null;
    const completedAt = status === 'completed' ? new Date(req.body.completedAt || now) : null;
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;

    const existing = await sql`
      SELECT id, "leadId" FROM "SiteVisit"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Site visit not found' });

    await sql`
      UPDATE "SiteVisit"
      SET
        status = COALESCE(${status ?? null}, status),
        feedback = COALESCE(${feedback}, feedback),
        "completedAt" = COALESCE(${completedAt}, "completedAt"),
        "scheduledAt" = COALESCE(${scheduledAt}, "scheduledAt"),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    if (status === 'completed' && existing[0].leadId) {
      await sql`
        UPDATE "Lead"
        SET status = 'site_visit_done', "updatedAt" = ${now}
        WHERE id = ${existing[0].leadId}
      `;
    }

    res.json(await fetchSiteVisitById(req.params.id));
  } catch (err) {
    console.error('updateSiteVisit:', err);
    res.status(500).json({ message: err.message || 'Failed to update site visit' });
  }
};

export const deleteSiteVisit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const existing = await sql`
      SELECT id FROM "SiteVisit"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Site visit not found' });

    await sql`DELETE FROM "SiteVisit" WHERE id = ${req.params.id} AND "builderId" = ${builderId}`;
    res.json({ message: 'Site visit deleted' });
  } catch (err) {
    console.error('deleteSiteVisit:', err);
    res.status(500).json({ message: err.message || 'Failed to delete site visit' });
  }
};
