import { ExtractedFields } from '../types/compliance';
import { PanelKey } from '../types/package';

export interface FieldDefinition {
  key: string;
  label: string;
  icon: string;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
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

function getLines(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return [];
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*#\-•]+/, '').replace(/\*\*/g, '').trim())
    .filter((line) => {
      return (
        line.length > 0 &&
        !/^===.*===$/.test(line) &&
        !/^-{3,}.*-{3,}$/.test(line) &&
        !/^\[OCR (?:was unable|could not).*\]$/i.test(line)
      );
    });
}

function extractNetQuantity(text: string, lines: string[]): string | null {
  const kwRegex =
    /(?:NET\s*(?:WEIGHT|WT\.?|QUANTITY|QTY\.?|CONTENTS|VOLUME)?|NET\s*:)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?|tablets?|capsules?)\b(?:\s*\([^)]+\))?)/i;
  const match = text.match(kwRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/NET\s*(?:WEIGHT|WT|QUANTITY|QTY|CONTENTS|VOLUME)/i.test(line)) {
      const m = line.match(
        /([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|gram|grams|ml|mL|l|ltr|litres?|liters?|N|units?|pieces?)\b)/i
      );
      if (m) return m[1].trim();
    }
  }

  const standaloneRegex =
    /^(?:NET\s*[:\-]?)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|ml|mL|l|ltr|litres?)\b)$/i;
  for (let j = 0; j < lines.length; j++) {
    const sm = lines[j].match(standaloneRegex);
    if (sm) return sm[1].trim();
  }

  return null;
}

function extractMrp(text: string, lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE)\b/i.test(line)) {
      const sameLineMatch = line.match(
        /(?:(?:Rs\.?|₹|INR)\s*([0-9]+(?:\.[0-9]{1,2})?)|(?:[:\-]\s*(?:Rs\.?|₹|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)))/i
      );
      if (sameLineMatch) {
        const val = sameLineMatch[1] || sameLineMatch[2];
        if (val && !isNaN(parseFloat(val))) {
          const hasRupee = /₹/.test(line);
          return (hasRupee ? '₹' : 'Rs ') + val;
        }
      }

      for (let offset = 1; offset <= 2 && i + offset < lines.length; offset++) {
        const nextLine = lines[i + offset];
        const nextMatch = nextLine.match(/(?:Rs\.?|₹|INR)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
        if (nextMatch) {
          const nVal = nextMatch[1];
          const nRupee = /₹/.test(nextLine);
          return (nRupee ? '₹' : 'Rs ') + nVal;
        }
        const taxMatch = nextLine.match(
          /(?:taxes\)?\s*[:\-]?\s*(?:Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?))/i
        );
        if (taxMatch) {
          return 'Rs ' + taxMatch[1];
        }
      }
    }
  }

  const taxFallback = text.match(
    /(?:inclusive|incl\.?)\s*(?:of\s*all\s*taxes)?\)?\s*(?:Rs\.?|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i
  );
  if (taxFallback) {
    return 'Rs ' + taxFallback[1];
  }

  return null;
}

function extractManufacturingDate(text: string, lines: string[]): string | null {
  const mfgRegex =
    /\b(?:MFG\.?\s*DATE|MFD\.?\s*DATE|MFD|DATE\s*OF\s*MFG|DATE\s*OF\s*PACKING|PKD\.?\s*DATE|PKD|PACKED(?:\s*ON)?|PACKING\s*DATE)\b\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}[,\s]+[0-9]{2,4})/i;
  const match = text.match(mfgRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /\b(?:MFG|MFD|PKD|PACKED)\b/i.test(line) &&
      !/BEST\s*BEFORE/i.test(line) &&
      !/EXP/i.test(line)
    ) {
      const dm = line.match(
        /([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/
      );
      if (dm) return dm[1].trim();
      if (i + 1 < lines.length) {
        const ndm = lines[i + 1].match(
          /^([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4})$/
        );
        if (ndm) return ndm[1].trim();
      }
    }
  }

  return null;
}

function extractExpiryDate(text: string, lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bBEST\s*BEFORE\b/i.test(line)) {
      const bbMatch = line.match(
        /\b(BEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)(?:\s+FROM\s+[^,;\n]+)?)/i
      );
      if (bbMatch) {
        return bbMatch[1].replace(/\s+/g, ' ').trim();
      }
      const bbGeneral = line.match(/\b(BEST\s*BEFORE.*$)/i);
      if (bbGeneral && bbGeneral[1].length > 11) {
        return bbGeneral[1].replace(/\s+/g, ' ').trim();
      }
    }
  }

  const bestBeforeRelative = text.match(
    /\b(BEST\s*BEFORE\s+[0-9]+\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)(?:\s+FROM\s+(?:DATE\s+OF\s+)?(?:PACKAGING|PACKING|MANUFACTURE|MFG|PRODUCTION))?)/i
  );
  if (bestBeforeRelative) {
    return bestBeforeRelative[1].replace(/\s+/g, ' ').trim();
  }

  const expRegex =
    /\b(?:EXPIRY\s*DATE|EXP\.?\s*DATE|EXPIRY|EXP|USE\s*BY(?:\s*DATE)?|BEST\s*BEFORE(?:\s*DATE)?)\b\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}[,\s]+[0-9]{2,4})/i;
  const match = text.match(expRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  for (let j = 0; j < lines.length; j++) {
    const l = lines[j];
    if (/\b(?:EXPIRY|USE\s*BY|BEST\s*BEFORE|EXP)\b/i.test(l)) {
      const dm = l.match(
        /([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4}|(?:[0-9]{1,2}\s+)?[a-zA-Z]{3,9}\s+[0-9]{2,4})/
      );
      if (dm) return dm[1].trim();
    }
  }

  return null;
}

function extractBatchCode(text: string, lines: string[]): string | null {
  const batchRegex =
    /\b(?:BATCH\s*(?:NO\.?|NUMBER|CODE)?|LOT\s*(?:NO\.?|NUMBER|CODE)?|B\.?\s*NO\.?|LOT)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/ ]{2,20})/i;
  const match = text.match(batchRegex);
  if (match && match[1]) {
    let candidate = match[1].trim();
    candidate = candidate.replace(/\s+(?:MFG|MFD|PKD|DATE|EXP|MRP).*$/i, '').trim();
    if (candidate.length >= 2 && !/^(?:DATE|OF|IS|NO)$/i.test(candidate)) {
      return candidate;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:BATCH|LOT|B\.NO)\b/i.test(line)) {
      const m = line.match(
        /(?:BATCH\s*NO\.?|LOT\s*NO\.?|B\.?\s*NO\.?|BATCH|LOT)\s*[:\-]?\s*([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9\-_]+)?)/i
      );
      if (m && m[1]) {
        const clean = m[1].trim();
        if (clean && !/^(?:NO|NUMBER|DATE)$/i.test(clean)) {
          return clean;
        }
      }
    }
  }

  return null;
}

function extractManufacturer(_text: string, lines: string[]): string | null {
  const mfgPrefixRegex =
    /\b(?:MANUFACTURED\s*(?:&|AND)?\s*PACKED\s*BY|MANUFACTURED\s*BY|MFD\.?\s*BY|MFG\.?\s*BY|PACKED\s*BY|PKD\.?\s*BY|MARKETED\s*BY|MKTD\.?\s*BY|IMPORTED\s*BY|PRODUCED\s*BY|PRODUCED\s*AND\s*PACKED\s*BY)\s*[:\-]?\s*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(mfgPrefixRegex);
    if (match) {
      let company = match[1].trim();
      if (!company || company.length < 3) {
        if (i + 1 < lines.length) {
          company = lines[i + 1].trim();
        }
      }
      if (company) {
        company = company.replace(/[,;:\-]+$/, '').trim();
        const addrCut = company.match(
          /^([^,]+(?:LTD|LIMITED|PVT|PRIVATE|INC|CORP|LLP|CO|ENTERPRISES|FOODS|MILLS|AGRO|INDUSTRIES|PRODUCTS|BEVERAGES)[^,]*)/i
        );
        if (addrCut && addrCut[1]) {
          return addrCut[1].trim();
        }
        return company;
      }
    }
  }

  return null;
}

function extractAddress(_text: string, lines: string[]): string | null {
  const addrKwRegex =
    /\b(?:REGD\.?\s*OFFICE|REGISTERED\s*OFFICE|FACTORY\s*(?:ADDRESS)?|UNIT\s*(?:ADDRESS)?|WORKS\s*(?:ADDRESS)?|ADDRESS)\s*[:\-]?\s*(.+)/i;
  for (let k = 0; k < lines.length; k++) {
    const akMatch = lines[k].match(addrKwRegex);
    if (akMatch && akMatch[1] && akMatch[1].length > 5) {
      const explicitAddr = [akMatch[1].trim()];
      for (let nextIdx = k + 1; nextIdx < Math.min(k + 4, lines.length); nextIdx++) {
        const nl = lines[nextIdx];
        if (/^(?:LIC|FSSAI|BATCH|MFG|EXP|MRP|NET|INGREDIENTS|NUTRITIONAL|CUSTOMER|CONSUMER)/i.test(nl))
          break;
        if (/[0-9]{6}|INDIA|STATE|DIST/i.test(nl) || nl.includes(',')) {
          explicitAddr.push(nl.trim());
        }
      }
      return explicitAddr.join(', ').replace(/,\s*,/g, ',').trim();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:MANUFACTURED|PACKED|MARKETED|IMPORTED)\s*(?:&|AND)?\s*(?:PACKED)?\s*BY\b/i.test(line)) {
      const addrLines: string[] = [];
      const startIndex = line.replace(/.*BY\s*[:\-]?/i, '').trim().length > 3 ? i + 1 : i + 2;

      for (let j = startIndex; j < Math.min(startIndex + 4, lines.length); j++) {
        const l = lines[j];
        if (
          /^(?:LIC\.?|FSSAI|BATCH|MFG|EXP|MRP|NET|INGREDIENTS|NUTRITIONAL|VEG|NON-VEG|CUSTOMER|CONSUMER|BARCODE|[0-9]{12,})/i.test(
            l
          )
        ) {
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
        const fullAddr = addrLines.join(', ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
        if (
          fullAddr.length > 8 &&
          (/\b[1-9][0-9]{5}\b/.test(fullAddr) || /\bINDIA\b/i.test(fullAddr) || /,/.test(fullAddr))
        ) {
          return fullAddr;
        }
      }
    }
  }

  for (let p = 0; p < lines.length; p++) {
    const pLine = lines[p];
    if (/\b[1-9][0-9]{5}\b/.test(pLine) && !/^(?:LIC|FSSAI|PHONE|TEL|BATCH)/i.test(pLine)) {
      const prev =
        p > 0 && lines[p - 1].includes(',') && !/BY:/i.test(lines[p - 1]) ? lines[p - 1] + ', ' : '';
      return (prev + pLine).replace(/\s+/g, ' ').trim();
    }
  }

  return null;
}

function extractProductName(_text: string, lines: string[]): string | null {
  const nameKwRegex =
    /\b(?:PRODUCT(?:\s*NAME)?|COMMODITY|NAME\s*OF\s*COMMODITY|NAME\s*OF\s*PRODUCT|ITEM)\s*[:\-]?\s*(.+)/i;
  for (let k = 0; k < lines.length; k++) {
    const nMatch = lines[k].match(nameKwRegex);
    if (nMatch && nMatch[1]) {
      const explicitName = nMatch[1].trim();
      if (explicitName.length > 2 && !/^(?:NAME|COMMODITY|ITEM)$/i.test(explicitName)) {
        return explicitName;
      }
    }
  }

  const candidateLines: string[] = [];
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const line = lines[i].trim();
    if (
      /^(?:NET|MRP|BATCH|MFG|MFD|PKD|EXP|FSSAI|LIC|INGREDIENTS|NUTRITIONAL|VEG|CUSTOMER|CONSUMER)\b/i.test(
        line
      )
    ) {
      break;
    }
    if (/^[0-9]+$/.test(line)) continue;

    const clean = line
      .replace(
        /^(?:BRITANNIA|NESTLE|AMUL|FORTUNE|PARLE|ITC|PATANJALI|DABUR|HALDIRAM'?S?)\s+[0-9]{4}$/i,
        ''
      )
      .trim();
    if (clean.length > 0) {
      candidateLines.push(clean);
    }
  }

  if (candidateLines.length > 0) {
    return candidateLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  return null;
}

function extractCustomerCarePhone(text: string, lines: string[]): string | null {
  const phoneKw =
    /\b(?:CUSTOMER\s*CARE|CONSUMER\s*CARE|HELPLINE|TOLL\s*FREE|CARE\s*CELL|FEEDBACK|CONTACT(?:\s*US)?|CALL\s*US|TEL(?:EPHONE)?|PHONE)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (phoneKw.test(l)) {
      const pm = l.match(
        /\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?)?[6-9][0-9]{9}|0[0-9]{2,4}[- ][0-9]{6,8}|0[0-9]{2,4}[0-9]{6,8})\b/
      );
      if (pm) return pm[1].trim();

      if (i + 1 < lines.length) {
        const nextL = lines[i + 1];
        const npm = nextL.match(
          /\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?)?[6-9][0-9]{9}|0[0-9]{2,4}[- ][0-9]{6,8}|0[0-9]{2,4}[0-9]{6,8})\b/
        );
        if (npm) return npm[1].trim();
      }
    }
  }

  const tollFreeMatch = text.match(/\b(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4})\b/);
  if (tollFreeMatch) {
    return tollFreeMatch[1].trim();
  }

  return null;
}

function extractCustomerCareEmail(text: string, lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/\b(?:EMAIL|E-MAIL|MAIL|WRITE|FEEDBACK|CARE)\b/i.test(l) || l.includes('@')) {
      const emailMatch = l.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        return emailMatch[1].trim();
      }
    }
  }

  const generalMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (generalMatch) {
    return generalMatch[1].trim();
  }

  return null;
}

export function extractFields(rawOcrText: string): ExtractedFields {
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

  const cleanText = rawOcrText.replace(/\*\*/g, '');
  const lines = getLines(rawOcrText);

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

export function extractMultiPanelFields(
  panels: Array<{ key: PanelKey | string; label?: string; text?: string }> | Record<string, string>,
  combinedText?: string
): ExtractedFields {
  const PANEL_PRIORITY: PanelKey[] = ['front', 'back', 'side', 'top_bottom'];

  let panelList: Array<{ key: string; label: string; text: string }> = [];
  if (Array.isArray(panels)) {
    panelList = panels.map((p) => ({
      key: p.key,
      label: p.label || p.key,
      text: p.text || ''
    }));
  } else if (panels && typeof panels === 'object') {
    PANEL_PRIORITY.forEach((key) => {
      if ((panels as any)[key]) {
        panelList.push({
          key,
          label:
            key === 'front'
              ? 'Front / Main'
              : key === 'back'
              ? 'Back / Rear'
              : key === 'side'
              ? 'Side / Other'
              : 'Top / Bottom',
          text:
            typeof (panels as any)[key] === 'string'
              ? (panels as any)[key]
              : (panels as any)[key].text || ''
        });
      }
    });
  }

  panelList.sort((a, b) => {
    const idxA = PANEL_PRIORITY.indexOf(a.key as PanelKey);
    const idxB = PANEL_PRIORITY.indexOf(b.key as PanelKey);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const merged: ExtractedFields = {
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

  const fieldSources: Record<string, string> = {};
  const fieldDuplicates: Record<string, Array<{ panel: string; value: string }>> = {};
  const panelExtractions: Record<string, ExtractedFields> = {};

  panelList.forEach((p) => {
    if (!p.text || typeof p.text !== 'string' || p.text.trim().length === 0) return;
    const pFields = extractFields(p.text);
    panelExtractions[p.key] = pFields;

    FIELD_DEFINITIONS.forEach((def) => {
      const key = def.key;
      const val = pFields[key];
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

  const fullText = combinedText || panelList.map((p) => p.text || '').join('\n\n');
  if (fullText && fullText.trim().length > 0) {
    const fallbackFields = extractFields(fullText);
    FIELD_DEFINITIONS.forEach((def) => {
      const key = def.key;
      if (merged[key] === null && fallbackFields[key] !== null && fallbackFields[key] !== undefined) {
        merged[key] = fallbackFields[key];
        fieldSources[key] = 'Combined Panels';
      }
    });
  }

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

export const fieldExtractor = {
  FIELD_DEFINITIONS,
  extractFields,
  extractMultiPanelFields
};
