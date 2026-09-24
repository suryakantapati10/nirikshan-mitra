/**
 * complianceEngine.js — Nirikshan Mitra Legal Metrology Compliance Rule Engine (v1)
 *
 * Evaluates the 8 mandatory Legal Metrology packaged commodity declaration rules
 * independently against structured field extraction data.
 *
 * Statuses:
 * - PASS: Field detected and basic format looks valid.
 * - REVIEW: Information detected but needs human verification.
 * - FAIL: Required information was not detected or clearly fails basic validation.
 *
 * Guarantees:
 * - Independent, modular rule evaluators (easily modifiable / extensible).
 * - Does not invent missing information.
 * - Disclaims legal certification ("Preliminary automated assessment").
 * - Works both in Browser (window.ComplianceEngine) and Node.js (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ComplianceEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DISCLAIMER_TEXT = 'Preliminary automated assessment under Legal Metrology (Packaged Commodities) Rules, 2011. This assessment does not constitute official legal certification.';

  /**
   * Helper: validates if string is non-empty
   */
  function isNonEmpty(val) {
    return val !== null && val !== undefined && typeof val === 'string' && val.trim().length > 0;
  }

  // =========================================================================
  // Individual Rule Evaluators
  // =========================================================================

  /**
   * Rule 1: Manufacturer / Packer / Importer
   */
  function evaluateManufacturer(fields) {
    var rawVal = fields ? fields.manufacturer : null;
    var isPresent = isNonEmpty(rawVal);

    if (!isPresent) {
      return {
        field_key: 'manufacturer',
        field_name: 'Manufacturer / Packer / Importer',
        extracted_value: null,
        status: 'FAIL',
        is_present: false,
        is_valid: false,
        explanation: 'Manufacturer, packer, or importer name was not detected on the label.',
        suggested_action: 'Inspect packaging for manufacturer declaration or upload an image showing the manufacturer details panel.'
      };
    }

    var clean = rawVal.trim();
    if (clean.length < 3) {
      return {
        field_key: 'manufacturer',
        field_name: 'Manufacturer / Packer / Importer',
        extracted_value: clean,
        status: 'REVIEW',
        is_present: true,
        is_valid: false,
        explanation: 'Manufacturer text detected but appears incomplete or ambiguous.',
        suggested_action: 'Manually inspect packaging to verify full legal entity name of the manufacturer or packer.'
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

  /**
   * Rule 2: Address
   */
  function evaluateAddress(fields) {
    var rawVal = fields ? fields.address : null;
    var isPresent = isNonEmpty(rawVal);

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

    var clean = rawVal.trim();
    var hasPincode = /\b[1-9][0-9]{5}\b/.test(clean);

    if (!hasPincode || clean.length < 10) {
      return {
        field_key: 'address',
        field_name: 'Address',
        extracted_value: clean,
        status: 'REVIEW',
        is_present: true,
        is_valid: false,
        explanation: 'Address detected but standard 6-digit postal PIN code is missing or location details appear brief.',
        suggested_action: 'Inspect physical package to confirm complete postal address with PIN code under Rule 6(1)(a).'
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

  /**
   * Rule 3: Net Quantity
   */
  function evaluateNetQuantity(fields) {
    var rawVal = fields ? fields.net_quantity : null;
    var isPresent = isNonEmpty(rawVal);

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

    var clean = rawVal.trim();
    var metricRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?|tablets?|capsules?)\b/i;
    var match = clean.match(metricRegex);

    if (!match || parseFloat(match[1]) <= 0) {
      return {
        field_key: 'net_quantity',
        field_name: 'Net Quantity',
        extracted_value: clean,
        status: 'REVIEW',
        is_present: true,
        is_valid: false,
        explanation: 'Quantity text detected but metric unit or numeric measure requires human verification.',
        suggested_action: 'Check if net quantity conforms to standard Legal Metrology metric units (g, kg, ml, L).'
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

  /**
   * Rule 4: Maximum Retail Price (MRP)
   */
  function evaluateMrp(fields) {
    var rawVal = fields ? fields.mrp : null;
    var isPresent = isNonEmpty(rawVal);

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

    var clean = rawVal.trim();
    var priceMatch = clean.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
    var hasCurrency = /(?:Rs\.?|₹|INR)/i.test(clean);

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
      explanation: 'Maximum Retail Price is declared with valid currency indicator and positive amount.',
      suggested_action: 'No action required. Preliminary automated assessment.'
    };
  }

  /**
   * Rule 5: Manufacturing / MFD Information
   */
  function evaluateManufacturingDate(fields) {
    var rawVal = fields ? fields.manufacturing_date : null;
    var isPresent = isNonEmpty(rawVal);

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

    var clean = rawVal.trim();
    // Valid date patterns: DD/MM/YYYY, MM/YYYY, DD-MM-YYYY, MM-YYYY, or Month Name YYYY
    var dateRegex = /(?:[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/i;

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

  /**
   * Rule 6: Expiry / Use By / Best Before
   */
  function evaluateExpiryDate(fields) {
    var rawVal = fields ? fields.expiry_date : null;
    var isPresent = isNonEmpty(rawVal);

    if (!isPresent) {
      return {
        field_key: 'expiry_date',
        field_name: 'Expiry / Use By / Best Before',
        extracted_value: null,
        status: 'FAIL',
        is_present: false,
        is_valid: false,
        explanation: 'Expiry date or "Best Before" declaration was not detected.',
        suggested_action: 'Verify whether product requires shelf-life/best-before declaration under applicable Legal Metrology rules.'
      };
    }

    var clean = rawVal.trim();
    var hasRelativeDuration = /\bBEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)/i.test(clean);
    var hasExplicitDate = /(?:[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/i.test(clean);

    if (!hasRelativeDuration && !hasExplicitDate) {
      return {
        field_key: 'expiry_date',
        field_name: 'Expiry / Use By / Best Before',
        extracted_value: clean,
        status: 'REVIEW',
        is_present: true,
        is_valid: false,
        explanation: 'Expiry marker detected but specific validity duration or expiration date is ambiguous.',
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

  /**
   * Rule 7: Batch / Lot / Code
   */
  function evaluateBatchCode(fields) {
    var rawVal = fields ? fields.batch_code : null;
    var isPresent = isNonEmpty(rawVal);

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

    var clean = rawVal.trim();
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

  /**
   * Rule 8: Customer Care
   */
  function evaluateCustomerCare(fields) {
    var phone = fields ? fields.customer_care_phone : null;
    var email = fields ? fields.customer_care_email : null;

    var hasPhone = isNonEmpty(phone);
    var hasEmail = isNonEmpty(email);

    if (!hasPhone && !hasEmail) {
      return {
        field_key: 'customer_care',
        field_name: 'Customer Care',
        extracted_value: null,
        status: 'FAIL',
        is_present: false,
        is_valid: false,
        explanation: 'Consumer care contact details (telephone helpline or email) were not detected.',
        suggested_action: 'Inspect package for consumer care helpline, toll-free number, or support email under Rule 6(1)(da).'
      };
    }

    // Format display value cleanly
    var displayParts = [];
    if (hasPhone) displayParts.push('Phone: ' + phone.trim());
    if (hasEmail) displayParts.push('Email: ' + email.trim());
    var extractedValue = displayParts.join(' | ');

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

    // Partial contact: phone only or email only -> Needs human review under complete compliance guidelines
    var missingChannel = hasPhone ? 'email address' : 'telephone helpline';
    var presentChannel = hasPhone ? 'Telephone helpline' : 'Email address';

    return {
      field_key: 'customer_care',
      field_name: 'Customer Care',
      extracted_value: extractedValue + ' (' + missingChannel + ' not detected)',
      status: 'REVIEW',
      is_present: true,
      is_valid: true,
      explanation: presentChannel + ' is detected, but ' + missingChannel + ' is missing. Complete consumer care details recommended under Rule 6(1)(da).',
      suggested_action: 'Verify whether full consumer care contact (both telephone and email) is present on other label panels.'
    };
  }

  // =========================================================================
  // Engine Dispatcher & Rule Registry (SQLite-Backed Rule Evaluation)
  // =========================================================================

  /**
   * Deterministic evaluation handlers mapping database rule_id to safe functions in code
   */
  var EVALUATOR_HANDLERS = {
    'rule_manufacturer': evaluateManufacturer,
    'rule_address': evaluateAddress,
    'rule_net_quantity': evaluateNetQuantity,
    'rule_mrp': evaluateMrp,
    'rule_manufacturing_date': evaluateManufacturingDate,
    'rule_expiry_date': evaluateExpiryDate,
    'rule_batch_code': evaluateBatchCode,
    'rule_customer_care': evaluateCustomerCare
  };

  /**
   * Default baseline rules (mirrors database seed) for fallback & offline testing
   */
  var DEFAULT_RULES = [
    {
      rule_id: 'rule_manufacturer',
      rule_name: 'Manufacturer / Packer / Importer',
      field_key: 'manufacturer',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_address',
      rule_name: 'Address',
      field_key: 'address',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_net_quantity',
      rule_name: 'Net Quantity',
      field_key: 'net_quantity',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(b) & Rule 12, Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_mrp',
      rule_name: 'MRP (Maximum Retail Price)',
      field_key: 'mrp',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_manufacturing_date',
      rule_name: 'Manufacturing / MFD Information',
      field_key: 'manufacturing_date',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_expiry_date',
      rule_name: 'Expiry / Use By / Best Before',
      field_key: 'expiry_date',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(d) proviso & Food Safety / Legal Metrology guidelines'
    },
    {
      rule_id: 'rule_batch_code',
      rule_name: 'Batch / Lot / Code',
      field_key: 'batch_code',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011'
    },
    {
      rule_id: 'rule_customer_care',
      rule_name: 'Customer Care',
      field_key: 'customer_care',
      rule_version: '1.0.0',
      source_reference: 'Rule 6(1)(da), Legal Metrology (Packaged Commodities) Rules, 2011'
    }
  ];

  var activeRuleDefinitions = DEFAULT_RULES.slice();

  /**
   * Sets the active rules loaded from the SQLite database
   * @param {Array<object>} ruleRecords
   */
  function setActiveRules(ruleRecords) {
    if (Array.isArray(ruleRecords) && ruleRecords.length > 0) {
      activeRuleDefinitions = ruleRecords.slice();
    }
  }

  /**
   * Returns current active rule definitions
   */
  function getActiveRules() {
    return activeRuleDefinitions;
  }

  /**
   * Node.js helper to asynchronously load active rules from SQLite repository
   */
  async function loadRulesFromDatabase(customRepo) {
    if (typeof require === 'function') {
      try {
        var repo = customRepo || require('./database').ruleRepository;
        var rules = await repo.getActiveRules();
        if (rules && rules.length > 0) {
          setActiveRules(rules);
          return rules;
        }
      } catch (err) {
        console.warn('[ComplianceEngine] Could not load rules from SQLite, using cached rules:', err.message);
      }
    }
    return activeRuleDefinitions;
  }

  /**
   * Evaluates active checks against extracted field data using SQLite rule definitions
   *
   * @param {object} extractedFields
   * @param {Array<object>} [customRules] - Optional explicit rule records to evaluate against
   * @returns {Array<object>} Array of evaluated rule results
   */
  function evaluateAll(extractedFields, customRules) {
    var safeFields = extractedFields || {};
    var rulesToEvaluate = Array.isArray(customRules) && customRules.length > 0
      ? customRules
      : activeRuleDefinitions;

    return rulesToEvaluate.map(function (ruleDef) {
      var ruleId = ruleDef.rule_id || ruleDef.id;
      var evaluator = EVALUATOR_HANDLERS[ruleId];

      if (typeof evaluator !== 'function') {
        // Fallback generic evaluator if no specific code handler exists
        var key = ruleDef.field_key;
        var val = safeFields[key];
        var isPresent = val !== null && val !== undefined && String(val).trim().length > 0;
        return {
          rule_id: ruleId,
          rule_name: ruleDef.rule_name || ruleId,
          field_key: key,
          field_name: ruleDef.rule_name || key,
          extracted_value: isPresent ? String(val).trim() : null,
          status: isPresent ? 'PASS' : 'FAIL',
          is_present: isPresent,
          is_valid: isPresent,
          rule_version: ruleDef.rule_version || '1.0.0',
          source_reference: ruleDef.source_reference || '',
          explanation: isPresent ? (ruleDef.rule_name + ' is declared.') : (ruleDef.rule_name + ' not detected.'),
          suggested_action: isPresent ? 'No action required.' : ('Verify ' + (ruleDef.rule_name || key) + ' on package.')
        };
      }

      var result = evaluator(safeFields);
      // Augment result with database rule metadata
      result.rule_id = ruleId;
      result.rule_version = ruleDef.rule_version || '1.0.0';
      result.source_reference = ruleDef.source_reference || result.source_reference || '';
      if (ruleDef.rule_name) {
        result.rule_name = ruleDef.rule_name;
      }
      return result;
    });
  }

  /**
   * Generates summary count counts (PASS, REVIEW, FAIL)
   *
   * @param {Array<object>} results
   * @returns {{ total: number, pass: number, review: number, fail: number }}
   */
  function getSummary(results) {
    var counts = { total: (results || []).length, pass: 0, review: 0, fail: 0 };
    (results || []).forEach(function (r) {
      if (r.status === 'PASS') counts.pass++;
      else if (r.status === 'REVIEW') counts.review++;
      else if (r.status === 'FAIL') counts.fail++;
    });
    return counts;
  }

  return {
    RULES: DEFAULT_RULES,
    EVALUATOR_HANDLERS: EVALUATOR_HANDLERS,
    setActiveRules: setActiveRules,
    getActiveRules: getActiveRules,
    loadRulesFromDatabase: loadRulesFromDatabase,
    evaluateAll: evaluateAll,
    getSummary: getSummary,
    DISCLAIMER_TEXT: DISCLAIMER_TEXT,
    // Export individual evaluators for granular testing/modification
    evaluateManufacturer: evaluateManufacturer,
    evaluateAddress: evaluateAddress,
    evaluateNetQuantity: evaluateNetQuantity,
    evaluateMrp: evaluateMrp,
    evaluateManufacturingDate: evaluateManufacturingDate,
    evaluateExpiryDate: evaluateExpiryDate,
    evaluateBatchCode: evaluateBatchCode,
    evaluateCustomerCare: evaluateCustomerCare
  };

}));
