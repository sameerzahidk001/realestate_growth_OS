import { parse } from 'csv-parse/sync';
import { getSql } from '../lib/neonSql.js';
import { cuid, fetchLeadActivities, fetchLeadById, fetchLeads, mapLeadRow } from '../lib/neonLeadHelpers.js';
import { calculateLeadScore, qualifyLead } from '../services/aiService.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

export const getLeads = async (req, res) => {
  try {
    const leads = await fetchLeads(getBuilderId(req.user), {
      role: req.user.role,
      userId: getUserId(req.user),
      query: req.query,
    });
    res.json(leads);
  } catch (err) {
    console.error('getLeads:', err);
    res.status(500).json({ message: err.message || 'Failed to load leads' });
  }
};

export const getLead = async (req, res) => {
  try {
    const lead = await fetchLeadById(req.params.id, getBuilderId(req.user), {
      role: req.user.role,
      userId: getUserId(req.user),
    });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const activities = await fetchLeadActivities(lead.id);
    res.json({ ...lead, activities: activities || [] });
  } catch (err) {
    console.error('getLead:', err);
    res.status(500).json({ message: err.message || 'Failed to load lead' });
  }
};

export const createLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    const assignedToId = req.body.assignedTo || (req.user.role === 'sales_executive' ? userId : null);
    const leadId = cuid();
    const now = new Date();
    const source = (req.body.source || 'manual').toLowerCase().replace(/\s+/g, '_');

    await sql`
      INSERT INTO "Lead" (
        id, "builderId", name, phone, email, source, status, "assignedToId", "projectId",
        notes, "budgetMin", "budgetMax", "bhkPreference", timeline,
        "aiScore", "aiQualified", tags, "isSilent", "createdAt", "updatedAt"
      )
      VALUES (
        ${leadId}, ${builderId}, ${req.body.name}, ${req.body.phone}, ${req.body.email || null},
        ${source}, 'new', ${assignedToId || null}, ${req.body.project || null},
        ${req.body.notes || null}, ${req.body.budget?.min ?? null}, ${req.body.budget?.max ?? null},
        ${req.body.bhkPreference || null}, ${req.body.timeline || null},
        0, false, ARRAY[]::text[], false, ${now}, ${now}
      )
    `;

    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "createdById", "createdAt")
      VALUES (${cuid()}, ${leadId}, 'note', 'Lead created', ${userId}, ${now})
    `;

    let lead = await fetchLeadById(leadId, builderId);
    const aiScore = calculateLeadScore(lead);
    await sql`UPDATE "Lead" SET "aiScore" = ${aiScore}, "updatedAt" = ${now} WHERE id = ${leadId}`;
    lead = { ...lead, aiScore };

    res.status(201).json(lead);
  } catch (err) {
    console.error('createLead:', err);
    res.status(500).json({ message: err.message || 'Failed to create lead' });
  }
};

export const updateLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const existing = await fetchLeadById(req.params.id, builderId, {
      role: req.user.role,
      userId: getUserId(req.user),
    });
    if (!existing) return res.status(404).json({ message: 'Lead not found' });

    if (req.body.status && req.body.status !== existing.status) {
      await sql`
        INSERT INTO "LeadActivity" (id, "leadId", type, description, "oldValue", "newValue", "createdById", "createdAt")
        VALUES (
          ${cuid()}, ${existing.id}, 'status_change',
          ${`Status changed from ${existing.status} to ${req.body.status}`},
          ${existing.status}, ${req.body.status}, ${getUserId(req.user)}, ${new Date()}
        )
      `;
    }

    const now = new Date();
    await sql`
      UPDATE "Lead"
      SET
        name = COALESCE(${req.body.name ?? null}, name),
        phone = COALESCE(${req.body.phone ?? null}, phone),
        email = COALESCE(${req.body.email ?? null}, email),
        source = COALESCE(${req.body.source ?? null}, source),
        status = COALESCE(${req.body.status ?? null}, status),
        notes = COALESCE(${req.body.notes ?? null}, notes),
        "assignedToId" = COALESCE(${req.body.assignedTo || null}, "assignedToId"),
        "projectId" = COALESCE(${req.body.project || null}, "projectId"),
        "unitId" = COALESCE(${req.body.unit || null}, "unitId"),
        "budgetMin" = COALESCE(${req.body.budget?.min ?? null}, "budgetMin"),
        "budgetMax" = COALESCE(${req.body.budget?.max ?? null}, "budgetMax"),
        "bhkPreference" = COALESCE(${req.body.bhkPreference ?? null}, "bhkPreference"),
        timeline = COALESCE(${req.body.timeline ?? null}, timeline),
        "updatedAt" = ${now}
      WHERE id = ${existing.id}
    `;

    let lead = await fetchLeadById(existing.id, builderId);
    const aiScore = calculateLeadScore({ ...lead, ...req.body });
    await sql`UPDATE "Lead" SET "aiScore" = ${aiScore} WHERE id = ${existing.id}`;
    lead = { ...lead, aiScore };

    res.json(lead);
  } catch (err) {
    console.error('updateLead:', err);
    res.status(500).json({ message: err.message || 'Failed to update lead' });
  }
};

export const updateLeadStatus = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const { status } = req.body;
    const existing = await fetchLeadById(req.params.id, builderId, {
      role: req.user.role,
      userId: getUserId(req.user),
    });
    if (!existing) return res.status(404).json({ message: 'Lead not found' });

    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "oldValue", "newValue", "createdById", "createdAt")
      VALUES (
        ${cuid()}, ${existing.id}, 'status_change',
        ${`Pipeline: ${existing.status} → ${status}`},
        ${existing.status}, ${status}, ${getUserId(req.user)}, ${new Date()}
      )
    `;

    const aiScore = calculateLeadScore({ ...existing, status });
    await sql`
      UPDATE "Lead"
      SET status = ${status}, "aiScore" = ${aiScore}, "updatedAt" = ${new Date()}
      WHERE id = ${existing.id}
    `;

    const lead = await fetchLeadById(existing.id, builderId);
    res.json({ ...lead, aiScore });
  } catch (err) {
    console.error('updateLeadStatus:', err);
    res.status(500).json({ message: err.message || 'Failed to update status' });
  }
};

export const assignLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const { assignedTo } = req.body;
    const existing = await fetchLeadById(req.params.id, builderId);
    if (!existing) return res.status(404).json({ message: 'Lead not found' });

    await sql`
      UPDATE "Lead"
      SET "assignedToId" = ${assignedTo}, "updatedAt" = ${new Date()}
      WHERE id = ${existing.id} AND "builderId" = ${builderId}
    `;

    const updated = await fetchLeadById(existing.id, builderId);
    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "createdById", "createdAt")
      VALUES (
        ${cuid()}, ${existing.id}, 'assignment',
        ${`Assigned to ${updated.assignedTo?.name || 'executive'}`},
        ${getUserId(req.user)}, ${new Date()}
      )
    `;

    res.json(updated);
  } catch (err) {
    console.error('assignLead:', err);
    res.status(500).json({ message: err.message || 'Failed to assign lead' });
  }
};

export const addLeadNote = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const { note, type = 'note' } = req.body;
    const lead = await fetchLeadById(req.params.id, builderId, {
      role: req.user.role,
      userId: getUserId(req.user),
    });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const now = new Date();
    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "createdById", "createdAt")
      VALUES (${cuid()}, ${lead.id}, ${type}, ${note}, ${getUserId(req.user)}, ${now})
    `;
    await sql`UPDATE "Lead" SET "lastContactedAt" = ${now}, "updatedAt" = ${now} WHERE id = ${lead.id}`;

    const activities = await fetchLeadActivities(lead.id);
    res.json({ ...lead, activities });
  } catch (err) {
    console.error('addLeadNote:', err);
    res.status(500).json({ message: err.message || 'Failed to add note' });
  }
};

export const importLeads = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });

    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    const records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const created = [];
    for (const row of records) {
      const leadId = cuid();
      const now = new Date();
      const source = (row.source || row.Source || 'manual').toLowerCase().replace(/\s+/g, '_');

      await sql`
        INSERT INTO "Lead" (
          id, "builderId", name, phone, email, source, status, "assignedToId",
          notes, "aiScore", "aiQualified", tags, "isSilent", "createdAt", "updatedAt"
        )
        VALUES (
          ${leadId}, ${builderId}, ${row.name || row.Name}, ${row.phone || row.Phone},
          ${row.email || row.Email || null}, ${source}, 'new',
          ${req.body.assignedTo || userId}, ${row.notes || row.Notes || null},
          20, false, ARRAY[]::text[], false, ${now}, ${now}
        )
      `;
      created.push(await fetchLeadById(leadId, builderId));
    }

    res.status(201).json({ imported: created.length, leads: created });
  } catch (err) {
    console.error('importLeads:', err);
    res.status(500).json({ message: err.message || 'Failed to import leads' });
  }
};

export const getPipeline = async (req, res) => {
  try {
    const builderId = getBuilderId(req.user);
    const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
    const pipeline = {};

    for (const stage of stages) {
      pipeline[stage] = await fetchLeads(builderId, {
        role: req.user.role,
        userId: getUserId(req.user),
        query: { ...req.query, status: stage },
      });
    }

    res.json(pipeline);
  } catch (err) {
    console.error('getPipeline:', err);
    res.status(500).json({ message: err.message || 'Failed to load pipeline' });
  }
};

export const aiQualifyLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const lead = await fetchLeadById(req.params.id, builderId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const activities = await fetchLeadActivities(lead.id);
    const qualification = await qualifyLead({ ...lead, activities });

    let budgetMin = lead.budgetMin;
    let budgetMax = lead.budgetMax;

    if (qualification.budget?.min) {
      budgetMin = qualification.budget.min;
      budgetMax = qualification.budget.max;
    } else if (typeof qualification.budget === 'string') {
      const match = qualification.budget.match(/(\d+)[^\d]+(\d+)/);
      if (match) {
        budgetMin = parseInt(match[1], 10) * 100000;
        budgetMax = parseInt(match[2], 10) * 100000;
      }
    }

    const aiScore = calculateLeadScore({
      ...lead,
      ...qualification,
      budget: { min: budgetMin, max: budgetMax },
    });

    await sql`
      UPDATE "Lead"
      SET
        "aiQualificationData" = ${JSON.stringify(qualification)}::jsonb,
        "aiQualified" = true,
        "budgetMin" = ${budgetMin},
        "budgetMax" = ${budgetMax},
        "preferredLocation" = COALESCE(${qualification.location ?? null}, "preferredLocation"),
        "loanRequired" = COALESCE(${qualification.loanRequired ?? null}, "loanRequired"),
        "familySize" = COALESCE(${qualification.familySize ?? null}, "familySize"),
        timeline = COALESCE(${qualification.timeline ?? null}, timeline),
        "bhkPreference" = COALESCE(${qualification.bhkPreference ?? null}, "bhkPreference"),
        "aiScore" = ${aiScore},
        "updatedAt" = ${new Date()}
      WHERE id = ${lead.id}
    `;

    await sql`
      INSERT INTO "LeadActivity" (id, "leadId", type, description, "createdById", metadata, "createdAt")
      VALUES (
        ${cuid()}, ${lead.id}, 'ai_qualification',
        ${qualification.summary || 'AI qualification completed'},
        ${getUserId(req.user)}, ${JSON.stringify(qualification)}::jsonb, ${new Date()}
      )
    `;

    const updated = await fetchLeadById(lead.id, builderId);
    res.json({ lead: updated, qualification });
  } catch (err) {
    console.error('aiQualifyLead:', err);
    res.status(500).json({ message: err.message || 'Failed to qualify lead' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const where = {
      role: req.user.role,
      userId: getUserId(req.user),
    };

    const existing = await fetchLeadById(req.params.id, builderId, where);
    if (!existing) return res.status(404).json({ message: 'Lead not found' });

    const bookings = await sql`SELECT id FROM "Booking" WHERE "leadId" = ${existing.id} LIMIT 1`;
    if (bookings.length) {
      return res.status(400).json({ message: 'Cannot delete lead with existing bookings. Mark as Lost instead.' });
    }

    await sql`DELETE FROM "LeadActivity" WHERE "leadId" = ${existing.id}`;
    await sql`DELETE FROM "FollowUp" WHERE "leadId" = ${existing.id}`;
    await sql`DELETE FROM "SiteVisit" WHERE "leadId" = ${existing.id}`;
    await sql`DELETE FROM "AIAlert" WHERE "leadId" = ${existing.id}`;
    await sql`DELETE FROM "AIConversation" WHERE "leadId" = ${existing.id}`;
    await sql`UPDATE "Referral" SET "referrerLeadId" = NULL WHERE "referrerLeadId" = ${existing.id}`;
    await sql`UPDATE "Referral" SET "referredLeadId" = NULL WHERE "referredLeadId" = ${existing.id}`;
    await sql`DELETE FROM "Lead" WHERE id = ${existing.id} AND "builderId" = ${builderId}`;

    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('deleteLead:', err);
    res.status(500).json({ message: err.message || 'Failed to delete lead' });
  }
};
