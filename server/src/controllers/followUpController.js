import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const mapFollowUp = (row) =>
  formatId({
    id: row.id,
    _id: row.id,
    leadId: row.leadId,
    builderId: row.builderId,
    assignedToId: row.assignedToId,
    scheduledAt: row.scheduledAt,
    type: row.type,
    notes: row.notes,
    status: row.status,
    completedAt: row.completedAt,
    summary: row.summary,
    createdAt: row.createdAt,
    lead: row.lead_id
      ? {
          id: row.lead_id,
          _id: row.lead_id,
          name: row.lead_name,
          phone: row.lead_phone,
          status: row.lead_status,
          aiScore: row.lead_ai_score,
        }
      : undefined,
    assignedTo: row.assign_id
      ? { id: row.assign_id, _id: row.assign_id, name: row.assign_name }
      : undefined,
  });

const fetchFollowUpById = async (id) => {
  const sql = getSql();
  const rows = await sql`
    SELECT
      f.*,
      l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.status AS lead_status, l."aiScore" AS lead_ai_score,
      u.id AS assign_id, u.name AS assign_name
    FROM "FollowUp" f
    LEFT JOIN "Lead" l ON l.id = f."leadId"
    LEFT JOIN "User" u ON u.id = f."assignedToId"
    WHERE f.id = ${id}
    LIMIT 1
  `;
  return mapFollowUp(rows[0]);
};

export const getFollowUps = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const status = req.query.status;

    const rows = await sql`
      SELECT
        f.*,
        l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.status AS lead_status, l."aiScore" AS lead_ai_score,
        u.id AS assign_id, u.name AS assign_name
      FROM "FollowUp" f
      LEFT JOIN "Lead" l ON l.id = f."leadId"
      LEFT JOIN "User" u ON u.id = f."assignedToId"
      WHERE f."builderId" = ${builderId}
      ${req.user.role === 'sales_executive' ? sql`AND f."assignedToId" = ${getUserId(req.user)}` : sql``}
      ${status ? sql`AND f.status = ${status}` : sql``}
      ORDER BY f."scheduledAt" ASC
    `;
    res.json(rows.map(mapFollowUp));
  } catch (err) {
    console.error('getFollowUps:', err);
    res.status(500).json({ message: err.message || 'Failed to load follow-ups' });
  }
};

export const getDueFollowUps = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();

    const rows = await sql`
      SELECT
        f.*,
        l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.status AS lead_status, l."aiScore" AS lead_ai_score,
        u.id AS assign_id, u.name AS assign_name
      FROM "FollowUp" f
      LEFT JOIN "Lead" l ON l.id = f."leadId"
      LEFT JOIN "User" u ON u.id = f."assignedToId"
      WHERE f."builderId" = ${builderId}
        AND f.status = 'pending'
        AND f."scheduledAt" <= ${now}
      ${req.user.role === 'sales_executive' ? sql`AND f."assignedToId" = ${getUserId(req.user)}` : sql``}
      ORDER BY f."scheduledAt" ASC
    `;
    res.json(rows.map(mapFollowUp));
  } catch (err) {
    console.error('getDueFollowUps:', err);
    res.status(500).json({ message: err.message || 'Failed to load due follow-ups' });
  }
};

export const createFollowUp = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    const id = cuid();
    const now = new Date();
    const scheduledAt = new Date(req.body.scheduledAt);
    const assignedToId = req.body.assignedTo || userId;

    await sql`
      INSERT INTO "FollowUp" (
        id, "leadId", "builderId", "assignedToId", "scheduledAt", type, notes,
        status, "isAiGenerated", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${req.body.lead}, ${builderId}, ${assignedToId}, ${scheduledAt},
        ${req.body.type || 'call'}, ${req.body.notes || null},
        'pending', false, ${now}, ${now}
      )
    `;

    if (req.body.lead) {
      await sql`UPDATE "Lead" SET "nextFollowUpAt" = ${scheduledAt}, "updatedAt" = ${now} WHERE id = ${req.body.lead}`;
    }

    res.status(201).json(await fetchFollowUpById(id));
  } catch (err) {
    console.error('createFollowUp:', err);
    res.status(500).json({ message: err.message || 'Failed to create follow-up' });
  }
};

export const completeFollowUp = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    const { summary, notes } = req.body;
    const now = new Date();

    const existing = await sql`
      SELECT id, "leadId" FROM "FollowUp"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Follow-up not found' });

    await sql`
      UPDATE "FollowUp"
      SET status = 'completed', "completedAt" = ${now}, summary = ${summary || null}, notes = ${notes || null}, "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const leadId = existing[0].leadId;
    await sql`UPDATE "Lead" SET "lastContactedAt" = ${now}, "updatedAt" = ${now} WHERE id = ${leadId}`;
    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "createdById", "createdAt")
      VALUES (${cuid()}, ${leadId}, 'follow_up', ${summary || notes || 'Follow-up completed'}, ${userId}, ${now})
    `;

    res.json(await fetchFollowUpById(req.params.id));
  } catch (err) {
    console.error('completeFollowUp:', err);
    res.status(500).json({ message: err.message || 'Failed to complete follow-up' });
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;

    const existing = await sql`
      SELECT id FROM "FollowUp"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Follow-up not found' });

    await sql`
      UPDATE "FollowUp"
      SET
        "leadId" = COALESCE(${req.body.lead ?? null}, "leadId"),
        "assignedToId" = COALESCE(${req.body.assignedTo ?? null}, "assignedToId"),
        "scheduledAt" = COALESCE(${scheduledAt}, "scheduledAt"),
        type = COALESCE(${req.body.type ?? null}, type),
        notes = COALESCE(${req.body.notes ?? null}, notes),
        status = COALESCE(${req.body.status ?? null}, status),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    res.json(await fetchFollowUpById(req.params.id));
  } catch (err) {
    console.error('updateFollowUp:', err);
    res.status(500).json({ message: err.message || 'Failed to update follow-up' });
  }
};

export const deleteFollowUp = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const existing = await sql`
      SELECT id FROM "FollowUp"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Follow-up not found' });

    await sql`DELETE FROM "FollowUp" WHERE id = ${req.params.id} AND "builderId" = ${builderId}`;
    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    console.error('deleteFollowUp:', err);
    res.status(500).json({ message: err.message || 'Failed to delete follow-up' });
  }
};
