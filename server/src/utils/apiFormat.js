const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

export const formatId = (record) => {
  if (record == null) return record;
  if (Array.isArray(record)) return record.map(formatId);
  if (!isObject(record)) return record;

  const formatted = { ...record };
  if (formatted.id) formatted._id = formatted.id;

  if (formatted.budgetMin != null || formatted.budgetMax != null) {
    formatted.budget = { min: formatted.budgetMin, max: formatted.budgetMax };
  }

  if (formatted.builderId && !formatted.builder) {
    formatted.builder = formatted.builderId;
  }

  const nestedKeys = [
    'builder',
    'assignedTo',
    'project',
    'unit',
    'lead',
    'submittedBy',
    'referrerLead',
    'referredLead',
    'customer',
    'activities',
    'payments',
    'loans',
    'possessions',
  ];

  for (const key of nestedKeys) {
    if (formatted[key]) formatted[key] = formatId(formatted[key]);
  }

  if (formatted.agreementDocumentUrl || formatted.agreementSignedAt || formatted.agreementTemplateData) {
    formatted.agreement = {
      documentUrl: formatted.agreementDocumentUrl,
      signedAt: formatted.agreementSignedAt,
      templateData: formatted.agreementTemplateData,
    };
  }

  if (formatted.stats) {
    formatted.stats = formatId(formatted.stats);
  }

  delete formatted.password;
  return formatted;
};

export const getBuilderId = (user) =>
  user?.builderId || user?.builder?._id || user?.builder?.id || user?.builder;

export const getUserId = (user) => user?._id || user?.id;
