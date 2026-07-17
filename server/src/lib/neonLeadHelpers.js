import { getSql } from './neonSql.js';
import { formatId } from '../utils/apiFormat.js';

export const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const mapLeadRow = (row) => {
  if (!row) return null;
  const lead = {
    id: row.id,
    _id: row.id,
    builderId: row.builderId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status,
    assignedToId: row.assignedToId,
    projectId: row.projectId,
    unitId: row.unitId,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    preferredLocation: row.preferredLocation,
    bhkPreference: row.bhkPreference,
    loanRequired: row.loanRequired,
    familySize: row.familySize,
    timeline: row.timeline,
    notes: row.notes,
    tags: row.tags,
    aiScore: row.aiScore,
    aiQualified: row.aiQualified,
    aiQualificationData: row.aiQualificationData,
    lastContactedAt: row.lastContactedAt,
    nextFollowUpAt: row.nextFollowUpAt,
    lostReason: row.lostReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (row.assign_id) {
    lead.assignedTo = {
      id: row.assign_id,
      _id: row.assign_id,
      name: row.assign_name,
      email: row.assign_email,
      phone: row.assign_phone,
    };
  }

  if (row.project_id) {
    lead.project = {
      id: row.project_id,
      _id: row.project_id,
      name: row.project_name,
      location: row.project_location,
    };
  }

  return formatId(lead);
};

export const fetchLeads = async (whereBuilderId, { role, userId, query = {} }) => {
  const sql = getSql();
  const search = query.search?.trim();
  const status = query.status;
  const source = query.source;
  const assignedTo = query.assignedTo;

  const rows = await sql`
    SELECT
      l.*,
      u.id AS assign_id,
      u.name AS assign_name,
      u.email AS assign_email,
      u.phone AS assign_phone,
      p.id AS project_id,
      p.name AS project_name,
      p.location AS project_location
    FROM "Lead" l
    LEFT JOIN "User" u ON u.id = l."assignedToId"
    LEFT JOIN "Project" p ON p.id = l."projectId"
    WHERE l."builderId" = ${whereBuilderId}
    ${role === 'sales_executive' ? sql`AND l."assignedToId" = ${userId}` : sql``}
    ${assignedTo ? sql`AND l."assignedToId" = ${assignedTo}` : sql``}
    ${status ? sql`AND l.status = ${status}` : sql``}
    ${source ? sql`AND l.source = ${source}` : sql``}
    ${search ? sql`AND (l.name ILIKE ${'%' + search + '%'} OR l.phone LIKE ${'%' + search + '%'} OR l.email ILIKE ${'%' + search + '%'})` : sql``}
    ORDER BY l."aiScore" DESC, l."createdAt" DESC
  `;

  return rows.map(mapLeadRow);
};

export const fetchLeadById = async (leadId, builderId, { role, userId } = {}) => {
  const sql = getSql();
  const rows = await sql`
    SELECT
      l.*,
      u.id AS assign_id,
      u.name AS assign_name,
      u.email AS assign_email,
      u.phone AS assign_phone,
      p.id AS project_id,
      p.name AS project_name,
      p.location AS project_location
    FROM "Lead" l
    LEFT JOIN "User" u ON u.id = l."assignedToId"
    LEFT JOIN "Project" p ON p.id = l."projectId"
    WHERE l.id = ${leadId}
      AND l."builderId" = ${builderId}
      ${role === 'sales_executive' ? sql`AND l."assignedToId" = ${userId}` : sql``}
    LIMIT 1
  `;
  return mapLeadRow(rows[0]);
};

export const fetchLeadActivities = async (leadId) => {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*, u.id AS creator_id, u.name AS creator_name
    FROM "LeadActivity" a
    LEFT JOIN "User" u ON u.id = a."createdById"
    WHERE a."leadId" = ${leadId}
    ORDER BY a."createdAt" ASC
  `;

  return rows.map((row) =>
    formatId({
      id: row.id,
      _id: row.id,
      leadId: row.leadId,
      type: row.type,
      description: row.description,
      oldValue: row.oldValue,
      newValue: row.newValue,
      metadata: row.metadata,
      createdAt: row.createdAt,
      createdBy: row.creator_id
        ? { id: row.creator_id, _id: row.creator_id, name: row.creator_name }
        : undefined,
    })
  );
};
