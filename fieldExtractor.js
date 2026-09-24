/**
 * fieldExtractor.js — Nirikshan Mitra Structured Field Extraction Engine
 * 
 * Extracts 10 mandatory Legal Metrology packaged commodity declaration fields
 * from raw OCR text using regex patterns, keyword matching, and date/number parsing.
 *
 * Guaranteed Behaviors:
 * 1. Strictly extracts ONLY information present in the OCR textx.
 * 2. Never invents, hallucinates, or guesses missing values.
 * 3. Unfound fields are returned as null.
 * 4. Free of side-effects; works both in browser (window.FieldExtractor) and Node.js.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FieldExtractor = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Field definitions metadata
   */
  var FIELD_DEFINITIONS = [
    { key: 'product_name', label: 'Product Name', icon: '🏷️' },
    { key: 'manufacturer', label: 'Manufacturer / Packer / Importer', icon: '🏭' },
    { key: 'address', label: 'Address', icon: '📍' },
    { key: 'net_quantity', label: 'Net Quantity', icon: '⚖️' },
    { key: 'mrp', label: 'Maximum Retail Price (MRP)', icon: '💰' },
    { key: 'manufacturing_date', label: 'Manufacturing / MFD Date', icon: '📅' },
    { key: 'expiry_date', label: 'Expiry / Use By / Best Before', icon: '⏳' },
    { key: 'batch_code', label: 'Batch / Lot / Code', icon: '🔢' },
    { key: 'customer_care_phone', label: 'Customer Care Phone', icon: '📞' },
    { key: 'customer_care_email', label: 'Customer Care Email', icon: '✉️' }
  ];

  /**
   * Cleans text lines for processing, stripping any markdown bullets or bold markers
   */
  function getLines(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    return rawText
      .split(/\r?\n/)
      .map(function (line) {
        return line.replace(/^[\s*#\-•]+/, '').replace(/\*\*/g, '').trim();
      })
      .filter(function (line) {
        return line.length > 0 &&
          !/^===.*===$/.test(line) &&
          !/^-{3,}.*-{3,}$/.test(line) &&
          !/^\[OCR (?:was unable|could not).*\]$/i.test(line);
      });
  }

  /**
   * Extracts Net Quantity
   * Examples: "200g", "1 L", "500 ml", "1 kg", "Net Qty: 200 ml"
   */
  function extractNetQuantity(text, lines) {
    // 1. Direct keyword match
    var kwRegex = /(?:NET\s*(?:WEIGHT|WT\.?|QUANTITY|QTY\.?|CONTENTS|VOLUME)?|NET\s*:)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?|tablets?|capsules?)\b(?:\s*\([^)]+\))?)/i;
    var match = text.match(kwRegex);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 2. Line by line keyword search
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/NET\s*(?:WEIGHT|WT|QUANTITY|QTY|CONTENTS|VOLUME)/i.test(line)) {
        var m = line.match(/([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?)\b)/i);
        if (m) return m[1].trim();
      }
    }

    // 3. Standalone metric quantity line pattern (e.g. "NET WEIGHT: 200g")
    var standaloneRegex = /^(?:NET\s*[:\-]?)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|ml|mL|l|ltr|litres?)\b)$/i;
    for (var j = 0; j < lines.length; j++) {
      var sm = lines[j].match(standaloneRegex);
      if (sm) return sm[1].trim();
    }

    return null;
  }

  /**
   * Extracts MRP (Maximum Retail Price)
   * Examples: "MRP: Rs 40.00", "₹60", "M.R.P. (Incl. of all taxes): Rs. 145/-"
   */
  function extractMrp(text, lines) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/\b(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE)\b/i.test(line)) {
        // Direct value on same line: e.g. "MRP: Rs 40.00" or "MRP: ₹60" or "MRP: 40.00"
        var sameLineMatch = line.match(/(?:(?:Rs\.?|₹|INR)\s*([0-9]+(?:\.[0-9]{1,2})?)|(?:[:\-]\s*(?:Rs\.?|₹|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)))/i);
        if (sameLineMatch) {
          var val = sameLineMatch[1] || sameLineMatch[2];
          if (val && !isNaN(parseFloat(val))) {
            var hasRupee = /₹/.test(line);
            return (hasRupee ? '₹' : 'Rs ') + val;
          }
        }

        // Check next 2 lines for price (often "(Incl. of all taxes) Rs 40.00" or "Rs 40.00")
        for (var offset = 1; offset <= 2 && (i + offset) < lines.length; offset++) {
          var nextLine = lines[i + offset];
          var nextMatch = nextLine.match(/(?:Rs\.?|₹|INR)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
          if (nextMatch) {
            var nVal = nextMatch[1];
            var nRupee = /₹/.test(nextLine);
            return (nRupee ? '₹' : 'Rs ') + nVal;
          }
          var taxMatch = nextLine.match(/(?:taxes\)?\s*[:\-]?\s*(?:Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?))/i);
          if (taxMatch) {
            return 'Rs ' + taxMatch[1];
          }
        }
      }
    }

    // Standalone fallback: "(Incl. of all taxes) Rs 40.00"
    var taxFallback = text.match(/(?:inclusive|incl\.?)\s*(?:of\s*all\s*taxes)?\)?\s*(?:Rs\.?|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (taxFallback) {
      return 'Rs ' + taxFallback[1];
    }

    return null;
  }

  /**
   * Extracts Manufacturing Date
   * Examples: "MFG. DATE: 12/2025", "MFD: 08/07/26", "PKD: OCT 2026"
   */
  function extractManufacturingDate(text, lines) {
    var mfgRegex = /\b(?:MFG\.?\s*DATE|MFD\.?\s*DATE|MFD|DATE\s*OF\s*MFG|DATE\s*OF\s*PACKING|PKD\.?\s*DATE|PKD|PACKED(?:\s*ON)?|PACKING\s*DATE)\b\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}[,\s]+[0-9]{2,4})/i;
    var match = text.match(mfgRegex);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Line check
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/\b(?:MFG|MFD|PKD|PACKED)\b/i.test(line) && !/BEST\s*BEFORE/i.test(line) && !/EXP/i.test(line)) {
        var dm = line.match(/([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/);
        if (dm) return dm[1].trim();
        if (i + 1 < lines.length) {
          var ndm = lines[i + 1].match(/^([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4})$/);
          if (ndm) return ndm[1].trim();
        }
      }
    }

    return null;
  }

  /**
   * Extracts Expiry / Use By / Best Before
   * Examples: "BEST BEFORE 9 MONTHS FROM PACKAGING", "EXPIRY: 07/07/27", "USE BY: 12/2026"
   */
  function extractExpiryDate(text, lines) {
    // 1. Line-by-line check for "BEST BEFORE" statements on single lines
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/\bBEST\s*BEFORE\b/i.test(line)) {
        var bbMatch = line.match(/\b(BEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)(?:\s+FROM\s+[^,;\n]+)?)/i);
        if (bbMatch) {
          return bbMatch[1].replace(/\s+/g, ' ').trim();
        }
        var bbGeneral = line.match(/\b(BEST\s*BEFORE.*$)/i);
        if (bbGeneral && bbGeneral[1].length > 11) {
          return bbGeneral[1].replace(/\s+/g, ' ').trim();
        }
      }
    }

    // 2. Multi-line relative statement with bounded stop
    var bestBeforeRelative = text.match(/\b(BEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)(?:\s+FROM\s+(?:DATE\s+OF\s+)?(?:PACKAGING|PACKING|MANUFACTURE|MFG|PRODUCTION))?)/i);
    if (bestBeforeRelative) {
      return bestBeforeRelative[1].replace(/\s+/g, ' ').trim();
    }

    // 3. Specific keywords: EXPIRY, EXP DATE, USE BY, BEST BEFORE followed by date
    var expRegex = /\b(?:EXPIRY\s*DATE|EXP\.?\s*DATE|EXPIRY|EXP|USE\s*BY(?:\s*DATE)?|BEST\s*BEFORE(?:\s*DATE)?)\b\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}[,\s]+[0-9]{2,4})/i;
    var match = text.match(expRegex);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 4. Line by line check for date
    for (var j = 0; j < lines.length; j++) {
      var l = lines[j];
      if (/\b(?:EXPIRY|USE\s*BY|BEST\s*BEFORE|EXP)\b/i.test(l)) {
        var dm = l.match(/([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/);
        if (dm) return dm[1].trim();
      }
    }

    return null;
  }

  /**
   * Extracts Batch / Lot / Code
   * Examples: "BATCH NO: GD-4412", "LOT: 7467AD8G26", "B. NO.: U2401"
   */
  function extractBatchCode(text, lines) {
    // 1. Direct keyword match
    var batchRegex = /\b(?:BATCH\s*(?:NO\.?|NUMBER|CODE)?|LOT\s*(?:NO\.?|NUMBER|CODE)?|B\.?\s*NO\.?|LOT)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/ ]{2,20})/i;
    var match = text.match(batchRegex);
    if (match && match[1]) {
      var candidate = match[1].trim();
      candidate = candidate.replace(/\s+(?:MFG|MFD|PKD|DATE|EXP|MRP).*$/i, '').trim();
      if (candidate.length >= 2 && !/^(?:DATE|OF|IS|NO)$/i.test(candidate)) {
        return candidate;
      }
    }

    // 2. Line check
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/\b(?:BATCH|LOT|B\.NO)\b/i.test(line)) {
        var m = line.match(/(?:BATCH\s*NO\.?|LOT\s*NO\.?|B\.?\s*NO\.?|BATCH|LOT)\s*[:\-]?\s*([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9\-_]+)?)/i);
        if (m && m[1]) {
          var clean = m[1].trim();
          if (clean && !/^(?:NO|NUMBER|DATE)$/i.test(clean)) {
            return clean;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extracts Manufacturer / Packer / Importer Name
   * Examples: "BRITANNIA INDUSTRIES LTD.", "ADANI WILMAR LIMITED"
   */
  function extractManufacturer(text, lines) {
    var mfgPrefixRegex = /\b(?:MANUFACTURED\s*(?:&|AND)?\s*PACKED\s*BY|MANUFACTURED\s*BY|MFD\.?\s*BY|MFG\.?\s*BY|PACKED\s*BY|PKD\.?\s*BY|MARKETED\s*BY|MKTD\.?\s*BY|IMPORTED\s*BY|PRODUCED\s*BY|PRODUCED\s*AND\s*PACKED\s*BY)\s*[:\-]?\s*(.*)/i;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var match = line.match(mfgPrefixRegex);
      if (match) {
        var company = match[1].trim();
        if (!company || company.length < 3) {
          if (i + 1 < lines.length) {
            company = lines[i + 1].trim();
          }
        }
        if (company) {
          company = company.replace(/[,;:\-]+$/, '').trim();
          var addrCut = company.match(/^([^,]+(?:LTD|LIMITED|PVT|PRIVATE|INC|CORP|LLP|CO|ENTERPRISES|FOODS|MILLS|AGRO|INDUSTRIES|PRODUCTS|BEVERAGES)[^,]*)/i);
          if (addrCut && addrCut[1]) {
            return addrCut[1].trim();
          }
          return company;
        }
      }
    }

    return null;
  }

  /**
   * Extracts Address
   * Examples: "PRESTIGE TOWERS, 9, SHAKESPEARE SARANI, KOLKATA 700017, INDIA."
   */
  function extractAddress(text, lines) {
    // 1. Explicit address keywords
    var addrKwRegex = /\b(?:REGD\.?\s*OFFICE|REGISTERED\s*OFFICE|FACTORY\s*(?:ADDRESS)?|UNIT\s*(?:ADDRESS)?|WORKS\s*(?:ADDRESS)?|ADDRESS)\s*[:\-]?\s*(.+)/i;
    for (var k = 0; k < lines.length; k++) {
      var akMatch = lines[k].match(addrKwRegex);
      if (akMatch && akMatch[1] && akMatch[1].length > 5) {
        var explicitAddr = [akMatch[1].trim()];
        for (var nextIdx = k + 1; nextIdx < Math.min(k + 4, lines.length); nextIdx++) {
          var nl = lines[nextIdx];
          if (/^(?:LIC|FSSAI|BATCH|MFG|EXP|MRP|NET|INGREDIENTS|NUTRITIONAL|CUSTOMER|CONSUMER)/i.test(nl)) break;
          if (/[0-9]{6}|INDIA|STATE|DIST/i.test(nl) || nl.includes(',')) {
            explicitAddr.push(nl.trim());
          }
        }
        return explicitAddr.join(', ').replace(/,\s*,/g, ',').trim();
      }
    }

    // 2. Check lines following "MANUFACTURED BY"
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/\b(?:MANUFACTURED|PACKED|MARKETED|IMPORTED)\s*(?:&|AND)?\s*(?:PACKED)?\s*BY\b/i.test(line)) {
        var addrLines = [];
        var startIndex = (line.replace(/.*BY\s*[:\-]?/i, '').trim().length > 3) ? i + 1 : i + 2;

        for (var j = startIndex; j < Math.min(startIndex + 4, lines.length); j++) {
          var l = lines[j];
          if (/^(?:LIC\.?|FSSAI|BATCH|MFG|EXP|MRP|NET|INGREDIENTS|NUTRITIONAL|VEG|NON-VEG|CUSTOMER|CONSUMER|BARCODE|[0-9]{12,})/i.test(l)) {
            break;
          }
          if (/[A-Za-z0-9]/.test(l)) {
            addrLines.push(l);
          }
          if (/\b[1-9][0-9]{5}\b/i.test(l) || /\bINDIA\b/i.test(l)) {
            break;
          }
        }

        if (addrLines.length > 0) {
          var fullAddr = addrLines.join(', ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
          if (fullAddr.length > 8 && (/\b[1-9][0-9]{5}\b/.test(fullAddr) || /\bINDIA\b/i.test(fullAddr) || /,/.test(fullAddr))) {
            return fullAddr;
          }
        }
      }
    }

    // 3. Fallback: Search for any line containing 6-digit Indian PIN code
    for (var p = 0; p < lines.length; p++) {
      var pLine = lines[p];
      if (/\b[1-9][0-9]{5}\b/.test(pLine) && !/^(?:LIC|FSSAI|PHONE|TEL|BATCH)/i.test(pLine)) {
        var prev = (p > 0 && lines[p - 1].includes(',') && !/BY:/i.test(lines[p - 1])) ? lines[p - 1] + ', ' : '';
        return (prev + pLine).replace(/\s+/g, ' ').trim();
      }
    }

    return null;
  }

  /**
   * Extracts Product Name
   * Examples: "Good Day Rich Butter Cookies", "Refined Sunflower Oil"
   */
  function extractProductName(text, lines) {
    // 1. Explicit keyword match
    var nameKwRegex = /\b(?:PRODUCT(?:\s*NAME)?|COMMODITY|NAME\s*OF\s*COMMODITY|NAME\s*OF\s*PRODUCT|ITEM)\s*[:\-]?\s*(.+)/i;
    for (var k = 0; k < lines.length; k++) {
      var nMatch = lines[k].match(nameKwRegex);
      if (nMatch && nMatch[1]) {
        var explicitName = nMatch[1].trim();
        if (explicitName.length > 2 && !/^(?:NAME|COMMODITY|ITEM)$/i.test(explicitName)) {
          return explicitName;
        }
      }
    }

    // 2. Look at top lines before metadata (Net Wt, MRP, Ingredients, etc.)
    var candidateLines = [];
    for (var i = 0; i < Math.min(6, lines.length); i++) {
      var line = lines[i].trim();
      if (/^(?:NET|MRP|BATCH|MFG|MFD|PKD|EXP|FSSAI|LIC|INGREDIENTS|NUTRITIONAL|VEG|CUSTOMER|CONSUMER)\b/i.test(line)) {
        break;
      }
      if (/^[0-9]+$/.test(line)) continue;

      // Filter out isolated brand registration numbers like "BRITANNIA 1918"
      var clean = line.replace(/^(?:BRITANNIA|NESTLE|AMUL|FORTUNE|PARLE|ITC|PATANJALI|DABUR|HALDIRAM'?S?)\s+[0-9]{4}$/i, '').trim();
      if (clean.length > 0) {
        candidateLines.push(clean);
      }
    }

    if (candidateLines.length > 0) {
      return candidateLines.join(' ').replace(/\s+/g, ' ').trim();
    }

    return null;
  }

  /**
   * Extracts Customer Care Phone
   * Examples: "1800 22 4550", "1800-425-4444", "080-26096800", "+91 9876543210"
   */
  function extractCustomerCarePhone(text, lines) {
    // 1. Keyword search on lines
    var phoneKw = /\b(?:CUSTOMER\s*CARE|CONSUMER\s*CARE|HELPLINE|TOLL\s*FREE|CARE\s*CELL|FEEDBACK|CONTACT(?:\s*US)?|CALL\s*US|TEL(?:EPHONE)?|PHONE)\b/i;

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (phoneKw.test(l)) {
        // Look for toll-free, mobile, or STD landline pattern
        var pm = l.match(/\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?)?[6-9][0-9]{9}|0[0-9]{2,4}[- ][0-9]{6,8}|0[0-9]{2,4}[0-9]{6,8})\b/);
        if (pm) return pm[1].trim();

        // Check if phone number is on the immediate next line
        if (i + 1 < lines.length) {
          var nextL = lines[i + 1];
          var npm = nextL.match(/\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?)?[6-9][0-9]{9}|0[0-9]{2,4}[- ][0-9]{6,8}|0[0-9]{2,4}[0-9]{6,8})\b/);
          if (npm) return npm[1].trim();
        }
      }
    }

    // 2. Global toll-free search
    var tollFreeMatch = text.match(/\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4})\b/);
    if (tollFreeMatch) {
      return tollFreeMatch[1].trim();
    }

    return null;
  }

  /**
   * Extracts Customer Care Email
   * Examples: "consumercare@britindia.com", "care@adaniwilmar.in"
   */
  function extractCustomerCareEmail(text, lines) {
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/\b(?:EMAIL|E-MAIL|MAIL|WRITE|FEEDBACK|CARE)\b/i.test(l) || l.includes('@')) {
        var emailMatch = l.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          return emailMatch[1].trim();
        }
      }
    }

    var generalMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (generalMatch) {
      return generalMatch[1].trim();
    }

    return null;
  }

  /**
   * Main entry point: Extracts all 10 fields from raw OCR text
   *
   * @param {string} rawOcrText
   * @returns {{
   *   product_name: string|null,
   *   manufacturer: string|null,
   *   address: string|null,
   *   net_quantity: string|null,
   *   mrp: string|null,
   *   manufacturing_date: string|null,
   *   expiry_date: string|null,
   *   batch_code: string|null,
   *   customer_care_phone: string|null,
   *   customer_care_email: string|null
   * }}
   */
  function extractFields(rawOcrText) {
    if (!rawOcrText || typeof rawOcrText !== 'string' || rawOcrText.trim().length === 0) {
      return {
        product_name: null,
        manufacturer: null,
        address: null,
        net_quantity: null,
        mrp: null,
        manufacturing_date: null,
        expiry_date: null,
        batch_code: null,
        customer_care_phone: null,
        customer_care_email: null
      };
    }

    var cleanText = rawOcrText.replace(/\*\*/g, '');
    var lines = getLines(rawOcrText);

    return {
      product_name: extractProductName(cleanText, lines),
      manufacturer: extractManufacturer(cleanText, lines),
      address: extractAddress(cleanText, lines),
      net_quantity: extractNetQuantity(cleanText, lines),
      mrp: extractMrp(cleanText, lines),
      manufacturing_date: extractManufacturingDate(cleanText, lines),
      expiry_date: extractExpiryDate(cleanText, lines),
      batch_code: extractBatchCode(cleanText, lines),
      customer_care_phone: extractCustomerCarePhone(cleanText, lines),
      customer_care_email: extractCustomerCareEmail(cleanText, lines)
    };
  }

  /**
   * Extracts and merges structured Legal Metrology fields across multiple panels
   * in canonical deterministic order (Front -> Back -> Side -> Top/Bottom).
   *
   * @param {Array<object>|object} panels - Array of panel objects [{key, label, text}] or map {key: text}
   * @param {string} [combinedText] - Optional pre-combined text for fallback check
   * @returns {object} Merged fields with null preserved for missing items
   */
  function extractMultiPanelFields(panels, combinedText) {
    var PANEL_PRIORITY = ['front', 'back', 'side', 'top_bottom'];

    var panelList = [];
    if (Array.isArray(panels)) {
      panelList = panels.slice();
    } else if (panels && typeof panels === 'object') {
      PANEL_PRIORITY.forEach(function (key) {
        if (panels[key]) {
          panelList.push({
            key: key,
            label: key === 'front' ? 'Front / Main' : (key === 'back' ? 'Back / Rear' : (key === 'side' ? 'Side / Other' : 'Top / Bottom')),
            text: typeof panels[key] === 'string' ? panels[key] : (panels[key].text || '')
          });
        }
      });
    }

    // Sort in deterministic canonical order
    panelList.sort(function (a, b) {
      var idxA = PANEL_PRIORITY.indexOf(a.key);
      var idxB = PANEL_PRIORITY.indexOf(b.key);
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });

    // Initialize result with all 10 fields as null
    var merged = {
      product_name: null,
      manufacturer: null,
      address: null,
      net_quantity: null,
      mrp: null,
      manufacturing_date: null,
      expiry_date: null,
      batch_code: null,
      customer_care_phone: null,
      customer_care_email: null
    };

    var fieldSources = {};
    var fieldDuplicates = {};
    var panelExtractions = {};

    // 1. Extract fields per panel in deterministic priority order
    panelList.forEach(function (p) {
      if (!p.text || typeof p.text !== 'string' || p.text.trim().length === 0) return;
      var pFields = extractFields(p.text);
      panelExtractions[p.key] = pFields;

      FIELD_DEFINITIONS.forEach(function (def) {
        var key = def.key;
        var val = pFields[key];
        if (val !== null && val !== undefined && String(val).trim().length > 0) {
          if (merged[key] === null) {
            merged[key] = val;
            fieldSources[key] = p.label || p.key;
          } else if (merged[key] !== val) {
            if (!fieldDuplicates[key]) fieldDuplicates[key] = [];
            fieldDuplicates[key].push({
              panel: p.label || p.key,
              value: val
            });
          }
        }
      });
    });

    // 2. Fallback check on combinedText for any fields still missing
    var fullText = combinedText || panelList.map(function (p) { return p.text || ''; }).join('\n\n');
    if (fullText && fullText.trim().length > 0) {
      var fallbackFields = extractFields(fullText);
      FIELD_DEFINITIONS.forEach(function (def) {
        var key = def.key;
        if (merged[key] === null && fallbackFields[key] !== null && fallbackFields[key] !== undefined) {
          merged[key] = fallbackFields[key];
          fieldSources[key] = 'Combined Panels';
        }
      });
    }

    // Attach non-enumerable metadata for auditability without disturbing complianceEngine
    Object.defineProperty(merged, '_sources', {
      value: fieldSources,
      enumerable: false,
      writable: true
    });
    Object.defineProperty(merged, '_duplicates', {
      value: fieldDuplicates,
      enumerable: false,
      writable: true
    });
    Object.defineProperty(merged, '_panelExtractions', {
      value: panelExtractions,
      enumerable: false,
      writable: true
    });

    return merged;
  }

  return {
    extractFields: extractFields,
    extractMultiPanelFields: extractMultiPanelFields,
    FIELD_DEFINITIONS: FIELD_DEFINITIONS
  };

}));
