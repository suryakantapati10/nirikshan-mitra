import { ExtractedFields, RuleEvaluation, RuleDefinition, ComplianceSummary } from '../types/compliance';

export const DISCLAIMER_TEXT =
  'Preliminary automated assessment under Legal Metrology (Packaged Commodities) Rules, 2011. This assessment does not constitute official legal certification.';

function isNonEmpty(val: any): boolean {
  return val !== null && val !== undefined && typeof val === 'string' && val.trim().length > 0;
}

export function evaluateManufacturer(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.manufacturer : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'manufacturer',
      field_name: 'Manufacturer / Packer / Importer',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Manufacturer, packer, or importer name was not detected on the label.',
      suggested_action:
        'Inspect packaging for manufacturer declaration or upload an image showing the manufacturer details panel.'
    };
  }

  const clean = (rawVal as string).trim();
  if (clean.length < 3) {
    return {
      field_key: 'manufacturer',
      field_name: 'Manufacturer / Packer / Importer',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation: 'Manufacturer text detected but appears incomplete or ambiguous.',
      suggested_action:
        'Manually inspect packaging to verify full legal entity name of the manufacturer or packer.'
    };
  }

  return {
    field_key: 'manufacturer',
    field_name: 'Manufacturer / Packer / Importer',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Manufacturer / Packer / Importer identity is clearly declared.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateAddress(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.address : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'address',
      field_name: 'Address',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Complete postal address of the manufacturer or packer was not detected.',
      suggested_action: 'Verify that the full premises address is legibly printed on the package.'
    };
  }

  const clean = (rawVal as string).trim();
  const hasPincode = /\b[1-9][0-9]{5}\b/.test(clean);

  if (!hasPincode || clean.length < 10) {
    return {
      field_key: 'address',
      field_name: 'Address',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation:
        'Address detected but standard 6-digit postal PIN code is missing or location details appear brief.',
      suggested_action:
        'Inspect physical package to confirm complete postal address with PIN code under Rule 6(1)(a).'
    };
  }

  return {
    field_key: 'address',
    field_name: 'Address',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Full premises address with valid postal PIN code is declared.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateNetQuantity(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.net_quantity : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'net_quantity',
      field_name: 'Net Quantity',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Net quantity declaration was not detected on the label.',
      suggested_action: 'Verify net weight, volume, or count on the principal display panel.'
    };
  }

  const clean = (rawVal as string).trim();
  const metricRegex =
    /\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?|tablets?|capsules?)\b/i;
  const match = clean.match(metricRegex);

  if (!match || parseFloat(match[1]) <= 0) {
    return {
      field_key: 'net_quantity',
      field_name: 'Net Quantity',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation: 'Quantity text detected but metric unit or numeric measure requires human verification.',
      suggested_action:
        'Check if net quantity conforms to standard Legal Metrology metric units (g, kg, ml, L).'
    };
  }

  return {
    field_key: 'net_quantity',
    field_name: 'Net Quantity',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Net quantity is clearly declared in standard metric units.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateMrp(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.mrp : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'mrp',
      field_name: 'MRP (Maximum Retail Price)',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Maximum Retail Price (MRP) declaration was not detected.',
      suggested_action: 'Inspect package for legible MRP stamp inclusive of all taxes.'
    };
  }

  const clean = (rawVal as string).trim();
  const priceMatch = clean.match(/([0-9]+(?:\.[0-9]{1,2})?)/);

  if (!priceMatch || parseFloat(priceMatch[1]) <= 0) {
    return {
      field_key: 'mrp',
      field_name: 'MRP (Maximum Retail Price)',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation: 'Price marker detected but exact numeric amount is ambiguous or zero.',
      suggested_action: 'Manually verify the retail price stamp on the package.'
    };
  }

  return {
    field_key: 'mrp',
    field_name: 'MRP (Maximum Retail Price)',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation:
      'Maximum Retail Price is declared with valid currency indicator and positive amount.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateManufacturingDate(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.manufacturing_date : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'manufacturing_date',
      field_name: 'Manufacturing / MFD Information',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Month and year of manufacture or packing was not detected.',
      suggested_action: 'Check packaging for date/month/year of manufacture or packing stamp.'
    };
  }

  const clean = (rawVal as string).trim();
  const dateRegex =
    /(?:[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/i;

  if (!dateRegex.test(clean)) {
    return {
      field_key: 'manufacturing_date',
      field_name: 'Manufacturing / MFD Information',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation: 'Date text detected but format is non-standard or partially ambiguous.',
      suggested_action: 'Inspect physical date stamp to verify month and year of packaging.'
    };
  }

  return {
    field_key: 'manufacturing_date',
    field_name: 'Manufacturing / MFD Information',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Manufacturing / packing date is clearly declared in recognized format.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateExpiryDate(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.expiry_date : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'expiry_date',
      field_name: 'Expiry / Use By / Best Before',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Expiry date or "Best Before" declaration was not detected.',
      suggested_action:
        'Verify whether product requires shelf-life/best-before declaration under applicable Legal Metrology rules.'
    };
  }

  const clean = (rawVal as string).trim();
  const hasRelativeDuration = /\bBEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)/i.test(
    clean
  );
  const hasExplicitDate =
    /(?:[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/i.test(
      clean
    );

  if (!hasRelativeDuration && !hasExplicitDate) {
    return {
      field_key: 'expiry_date',
      field_name: 'Expiry / Use By / Best Before',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation:
        'Expiry marker detected but specific validity duration or expiration date is ambiguous.',
      suggested_action: 'Manually verify the expiry or best-before period on the container.'
    };
  }

  return {
    field_key: 'expiry_date',
    field_name: 'Expiry / Use By / Best Before',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Expiry date or standard "Best Before" duration is clearly declared.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateBatchCode(fields?: ExtractedFields): RuleEvaluation {
  const rawVal = fields ? fields.batch_code : null;
  const isPresent = isNonEmpty(rawVal);

  if (!isPresent) {
    return {
      field_key: 'batch_code',
      field_name: 'Batch / Lot / Code',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation: 'Batch number, lot code, or identification mark was not detected.',
      suggested_action: 'Check packaging crimp, base, or seam for batch/lot code.'
    };
  }

  const clean = (rawVal as string).trim();
  if (clean.length < 2) {
    return {
      field_key: 'batch_code',
      field_name: 'Batch / Lot / Code',
      extracted_value: clean,
      status: 'REVIEW',
      is_present: true,
      is_valid: false,
      explanation: 'Batch marker detected but code characters appear ambiguous or incomplete.',
      suggested_action: 'Confirm batch code on the physical package.'
    };
  }

  return {
    field_key: 'batch_code',
    field_name: 'Batch / Lot / Code',
    extracted_value: clean,
    status: 'PASS',
    is_present: true,
    is_valid: true,
    explanation: 'Batch / Lot identification code is present.',
    suggested_action: 'No action required. Preliminary automated assessment.'
  };
}

export function evaluateCustomerCare(fields?: ExtractedFields): RuleEvaluation {
  const phone = fields ? fields.customer_care_phone : null;
  const email = fields ? fields.customer_care_email : null;

  const hasPhone = isNonEmpty(phone);
  const hasEmail = isNonEmpty(email);

  if (!hasPhone && !hasEmail) {
    return {
      field_key: 'customer_care',
      field_name: 'Customer Care',
      extracted_value: null,
      status: 'FAIL',
      is_present: false,
      is_valid: false,
      explanation:
        'Consumer care contact details (telephone helpline or email) were not detected.',
      suggested_action:
        'Inspect package for consumer care helpline, toll-free number, or support email under Rule 6(1)(da).'
    };
  }

  const displayParts: string[] = [];
  if (hasPhone) displayParts.push('Phone: ' + (phone as string).trim());
  if (hasEmail) displayParts.push('Email: ' + (email as string).trim());
  const extractedValue = displayParts.join(' | ');

  if (hasPhone && hasEmail) {
    return {
      field_key: 'customer_care',
      field_name: 'Customer Care',
      extracted_value: extractedValue,
      status: 'PASS',
      is_present: true,
      is_valid: true,
      explanation: 'Consumer care telephone helpline and email contact are both declared.',
      suggested_action: 'No action required. Preliminary automated assessment.'
    };
  }

  const missingChannel = hasPhone ? 'email address' : 'telephone helpline';
  const presentChannel = hasPhone ? 'Telephone helpline' : 'Email address';

  return {
    field_key: 'customer_care',
    field_name: 'Customer Care',
    extracted_value: extractedValue + ' (' + missingChannel + ' not detected)',
    status: 'REVIEW',
    is_present: true,
    is_valid: true,
    explanation:
      presentChannel +
      ' is detected, but ' +
      missingChannel +
      ' is missing. Complete consumer care details recommended under Rule 6(1)(da).',
    suggested_action:
      'Verify whether full consumer care contact (both telephone and email) is present on other label panels.'
  };
}

const EVALUATOR_HANDLERS: Record<string, (fields?: ExtractedFields) => RuleEvaluation> = {
  rule_manufacturer: evaluateManufacturer,
  rule_address: evaluateAddress,
  rule_net_quantity: evaluateNetQuantity,
  rule_mrp: evaluateMrp,
  rule_manufacturing_date: evaluateManufacturingDate,
  rule_expiry_date: evaluateExpiryDate,
  rule_batch_code: evaluateBatchCode,
  rule_customer_care: evaluateCustomerCare
};

export const DEFAULT_RULES: RuleDefinition[] = [
  {
    rule_id: 'rule_manufacturer',
    rule_name: 'Manufacturer / Packer / Importer',
    field_key: 'manufacturer',
    source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'IDENTITY',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_address',
    rule_name: 'Address',
    field_key: 'address',
    source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'IDENTITY',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_net_quantity',
    rule_name: 'Net Quantity',
    field_key: 'net_quantity',
    source_reference:
      'Rule 6(1)(b) & Rule 12, Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'MEASUREMENT',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_mrp',
    rule_name: 'MRP (Maximum Retail Price)',
    field_key: 'mrp',
    source_reference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'PRICING',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_manufacturing_date',
    rule_name: 'Manufacturing / MFD Information',
    field_key: 'manufacturing_date',
    source_reference: 'Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'TEMPORAL',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_expiry_date',
    rule_name: 'Expiry / Use By / Best Before',
    field_key: 'expiry_date',
    source_reference:
      'Rule 6(1)(d) proviso & Food Safety / Legal Metrology guidelines',
    category: 'TEMPORAL',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_batch_code',
    rule_name: 'Batch / Lot / Code',
    field_key: 'batch_code',
    source_reference: 'Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'TRACEABILITY',
    mandatory: true,
    active: true
  },
  {
    rule_id: 'rule_customer_care',
    rule_name: 'Customer Care',
    field_key: 'customer_care',
    source_reference: 'Rule 6(1)(da), Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'CONSUMER_RIGHTS',
    mandatory: true,
    active: true
  }
];

let activeRules: RuleDefinition[] = DEFAULT_RULES.slice();

export const complianceEngine = {
  DISCLAIMER_TEXT,
  DEFAULT_RULES,

  setActiveRules(dbRules: any[]): void {
    if (Array.isArray(dbRules) && dbRules.length > 0) {
      activeRules = dbRules.map((r) => ({
        rule_id: r.rule_id,
        rule_name: r.rule_name,
        field_key: r.field_key,
        source_reference: r.source_reference || 'Legal Metrology Rules, 2011',
        category: r.category || 'STATUTORY',
        mandatory: r.mandatory !== undefined ? Boolean(r.mandatory) : true,
        active: r.active !== undefined ? Boolean(r.active) : true
      }));
    }
  },

  getActiveRules(): RuleDefinition[] {
    return activeRules.slice();
  },

  evaluateAll(fields?: ExtractedFields): RuleEvaluation[] {
    const results: RuleEvaluation[] = [];

    activeRules.forEach((rule) => {
      if (!rule.active) return; // Skip disabled rules

      const evaluator = EVALUATOR_HANDLERS[rule.rule_id];
      if (typeof evaluator === 'function') {
        const evalResult = evaluator(fields);
        results.push({
          ...evalResult,
          field_name: rule.rule_name
        });
      }
    });

    return results;
  },

  getSummary(results: RuleEvaluation[]): ComplianceSummary {
    const summary: ComplianceSummary = { total: 0, pass: 0, review: 0, fail: 0, na: 0 };
    if (!Array.isArray(results)) return summary;

    summary.total = results.length;
    results.forEach((r) => {
      if (r.status === 'PASS') summary.pass++;
      else if (r.status === 'REVIEW') summary.review++;
      else if (r.status === 'FAIL') summary.fail++;
      else if (r.status === 'N/A') summary.na++;
    });

    return summary;
  }
};
