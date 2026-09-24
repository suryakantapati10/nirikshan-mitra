const { db: defaultDb } = require('./db');
const RiskEngine = require('../riskEngine');

class BrandProductRepository {
  constructor(database = defaultDb) {
    this.db = database;
  }

  async findOrCreate(data) {
    const brandName = (data.brand_name || 'Generic / Unspecified').trim();
    const productName = (data.product_name || 'Packaged Product').trim();
    const category = (data.product_category || 'General').trim();
    const packageType = (data.package_type || 'Other').trim();

    const existing = await this.db.get(
      'SELECT * FROM brands_products WHERE LOWER(brand_name) = LOWER(?) AND LOWER(product_name) = LOWER(?)',
      [brandName, productName]
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const result = await this.db.run(
      `INSERT INTO brands_products (brand_name, product_name, product_category, package_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [brandName, productName, category, packageType, now, now]
    );

    return {
      id: result.lastID,
      brand_name: brandName,
      product_name: productName,
      product_category: category,
      package_type: packageType,
      created_at: now,
      updated_at: now
    };
  }

  async getById(id) {
    return await this.db.get(
      'SELECT * FROM brands_products WHERE id = ?',
      [id]
    );
  }

  async getAll() {
    return await this.db.all(
      'SELECT * FROM brands_products ORDER BY brand_name ASC, product_name ASC'
    );
  }

  /**
   * Retrieves deterministic risk profile for a brand (or specific product of a brand)
   *
   * @param {string|number} brandIdentifier - Brand ID, Brand Name, or Product Name
   * @param {string}        [productName]   - Optional specific product name for product-scoped history
   * @param {Date|string}   [referenceDate] - Optional reference date for recency decay
   * @returns {Promise<object>} Complete risk calculation metrics and level
   */
  async getBrandRiskProfile(brandIdentifier, productName = null, referenceDate = null) {
    let brandProducts = [];
    const isNumericId = typeof brandIdentifier === 'number' || (!isNaN(brandIdentifier) && !isNaN(parseInt(brandIdentifier, 10)) && String(parseInt(brandIdentifier, 10)) === String(brandIdentifier).trim());

    if (isNumericId) {
      const bId = parseInt(brandIdentifier, 10);
      const bp = await this.getById(bId);
      if (bp) {
        brandProducts = [bp];
      }
    } else {
      const term = String(brandIdentifier || '').trim();
      if (productName) {
        brandProducts = await this.db.all(
          'SELECT * FROM brands_products WHERE LOWER(brand_name) = LOWER(?) AND LOWER(product_name) = LOWER(?)',
          [term, productName.trim()]
        );
      } else {
        brandProducts = await this.db.all(
          'SELECT * FROM brands_products WHERE LOWER(brand_name) = LOWER(?) OR LOWER(product_name) = LOWER(?)',
          [term, term]
        );
      }
    }

    if (!brandProducts || brandProducts.length === 0) {
      const baseMetrics = RiskEngine.calculateRiskMetrics([], [], referenceDate);
      return {
        brand: String(brandIdentifier || 'Unknown'),
        product: productName || null,
        brand_product_id: null,
        brand_name: String(brandIdentifier || 'Unknown'),
        product_name: productName || null,
        product_category: 'Unregistered',
        package_type: 'Other',
        ...baseMetrics
      };
    }

    const bpIds = brandProducts.map(bp => bp.id);
    const placeholders = bpIds.map(() => '?').join(',');

    const inspections = await this.db.all(
      `SELECT * FROM inspections WHERE brand_product_id IN (${placeholders}) ORDER BY inspected_at DESC`,
      bpIds
    );

    const violations = await this.db.all(
      `SELECT v.*, r.rule_name, r.source_reference
       FROM violations v
       JOIN rules r ON v.rule_id = r.rule_id
       WHERE v.brand_product_id IN (${placeholders})
       ORDER BY v.detected_at DESC`,
      bpIds
    );

    const riskMetrics = RiskEngine.calculateRiskMetrics(inspections, violations, referenceDate);
    const primaryBp = brandProducts[0];

    return {
      brand: primaryBp.brand_name,
      product: productName || (brandProducts.length === 1 ? primaryBp.product_name : 'Multiple Products (' + brandProducts.length + ')'),
      brand_product_id: brandProducts.length === 1 ? primaryBp.id : null,
      brand_name: primaryBp.brand_name,
      product_name: primaryBp.product_name,
      product_category: primaryBp.product_category,
      package_type: primaryBp.package_type,
      ...riskMetrics
    };
  }
}

module.exports = {
  BrandProductRepository,
  brandProductRepository: new BrandProductRepository()
};
