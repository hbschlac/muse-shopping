/**
 * Brand Import Service
 * Imports brands and retailers from CSV files with comprehensive metadata
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const pool = require('../db/pool');
const logger = require('../utils/logger');

class BrandImportService {
  /**
   * Import retailers from CSV
   * @param {string} csvPath - Path to retailer CSV file
   * @returns {Promise<Object>} Import results
   */
  static async importRetailers(csvPath) {
    const retailers = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          retailers.push({
            name: row.retailer,
            region: row.region || 'US/CA',
            catalogScale: row.catalog_scale,
            accessMethod: row.access_method,
            accessNotes: row.access_notes,
            priority: row.priority,
            apiType: this.parseApiType(row.access_method),
            requiresPartnership: row.access_method?.includes('Partner') || row.access_method?.includes('partner'),
          });
        })
        .on('end', async () => {
          try {
            const results = await this.bulkUpsertRetailers(retailers);
            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Import brands from CSV
   * @param {string} csvPath - Path to brand CSV file
   * @param {string} phase - Integration phase (top100, top300, top1000, longtail)
   * @returns {Promise<Object>} Import results
   */
  static async importBrands(csvPath, phase = 'top100') {
    const brands = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          brands.push({
            name: row.brand,
            categoryFocus: row.category_focus,
            region: row.region || 'US/Canada',
            primaryRetailers: this.parseArrayField(row.primary_retailers),
            marketplacePresence: this.parseArrayField(row.marketplaces),
            priorityScore: parseInt(row.priority_score) || 50,
            distributionStatus: row.distribution_status || 'unverified',
            integrationPhase: phase,
            notes: row.notes,
          });
        })
        .on('end', async () => {
          try {
            const results = await this.bulkUpsertBrands(brands, phase);
            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Bulk upsert retailers into database
   * @param {Array} retailers - Array of retailer objects
   * @returns {Promise<Object>} Results
   */
  static async bulkUpsertRetailers(retailers) {
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const retailer of retailers) {
      try {
        // Generate slug from name
        const slug = this.generateSlug(retailer.name);

        const result = await pool.query(
          `INSERT INTO stores (
            name,
            slug,
            display_name,
            website_url,
            logo_url,
            is_active,
            
            supports_checkout,
            integration_type,
            api_type,
            requires_partnership,
            catalog_scale,
            priority,
            integration_notes
          )
          VALUES ($1, $2, $3, $4, $5, true, false, 'redirect', $6, $7, $8, $9, $10)
          ON CONFLICT (slug)
          DO UPDATE SET
            api_type = EXCLUDED.api_type,
            requires_partnership = EXCLUDED.requires_partnership,
            catalog_scale = EXCLUDED.catalog_scale,
            priority = EXCLUDED.priority,
            integration_notes = EXCLUDED.integration_notes,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted`,
          [
            retailer.name,
            slug,
            retailer.name,
            this.generateWebsiteUrl(retailer.name),
            this.generateLogoUrl(slug),
            retailer.apiType,
            retailer.requiresPartnership,
            retailer.catalogScale,
            retailer.priority,
            retailer.accessNotes,
          ]
        );

        if (result.rows[0].inserted) {
          inserted++;
        } else {
          updated++;
        }

        logger.debug(`Upserted retailer: ${retailer.name}`);
      } catch (error) {
        failed++;
        logger.error(`Failed to upsert retailer ${retailer.name}:`, error.message);
      }
    }

    return {
      total: retailers.length,
      inserted,
      updated,
      failed,
    };
  }

  /**
   * Bulk upsert brands into database
   * @param {Array} brands - Array of brand objects
   * @param {string} phase - Integration phase
   * @returns {Promise<Object>} Results
   */
  static async bulkUpsertBrands(brands, phase) {
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const brand of brands) {
      try {
        // Generate slug from name
        const slug = this.generateSlug(brand.name);

        const result = await pool.query(
          `INSERT INTO brands (
            name,
            slug,
            description,
            website_url,
            logo_url,
            is_active,
            category_focus,
            primary_retailers,
            marketplace_presence,
            priority_score,
            distribution_status,
            region,
            integration_phase,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (slug)
          DO UPDATE SET
            primary_retailers = EXCLUDED.primary_retailers,
            marketplace_presence = EXCLUDED.marketplace_presence,
            priority_score = EXCLUDED.priority_score,
            distribution_status = EXCLUDED.distribution_status,
            integration_phase = EXCLUDED.integration_phase,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted`,
          [
            brand.name,
            slug,
            `${brand.name} - ${brand.categoryFocus || 'Fashion brand'}`,
            this.generateBrandWebsiteUrl(brand.name),
            this.generateBrandLogoUrl(slug),
            brand.categoryFocus,
            brand.primaryRetailers,
            brand.marketplacePresence,
            brand.priorityScore,
            brand.distributionStatus,
            brand.region,
            phase,
            JSON.stringify({ notes: brand.notes }),
          ]
        );

        if (result.rows[0].inserted) {
          inserted++;
        } else {
          updated++;
        }

        if (inserted % 100 === 0) {
          logger.info(`Progress: ${inserted + updated} brands processed`);
        }
      } catch (error) {
        failed++;
        logger.error(`Failed to upsert brand ${brand.name}:`, error.message);
      }
    }

    return {
      total: brands.length,
      inserted,
      updated,
      failed,
      phase,
    };
  }

  /**
   * Import all brand phases sequentially
   * @param {string} dataDir - Directory containing CSV files
   * @returns {Promise<Object>} Combined results
   */
  static async importAllBrands(dataDir = '~/Documents/Muse Shopping') {
    const expandedDir = dataDir.replace('~', require('os').homedir());
    const results = {};

    // Import in priority order
    const phases = [
      { file: 'brand_phase_top100.csv', phase: 'top100' },
      { file: 'brand_phase_top300.csv', phase: 'top300' },
      { file: 'brand_priority_1000.csv', phase: 'top1000' },
      { file: 'brand_phase_longtail.csv', phase: 'longtail' },
    ];

    for (const { file, phase } of phases) {
      const csvPath = path.join(expandedDir, file);

      if (fs.existsSync(csvPath)) {
        logger.info(`Importing ${phase} brands from ${file}...`);
        results[phase] = await this.importBrands(csvPath, phase);
        logger.info(`${phase}: ${results[phase].inserted} inserted, ${results[phase].updated} updated`);
      } else {
        logger.warn(`File not found: ${csvPath}`);
      }
    }

    return results;
  }

  /**
   * Parse array field from CSV (semicolon-separated)
   * @param {string} value - CSV value
   * @returns {Array} Parsed array
   */
  static parseArrayField(value) {
    if (!value || value === '') return [];
    return value.split(';').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Parse API type from access method description
   * @param {string} accessMethod - Access method description
   * @returns {string} API type
   */
  static parseApiType(accessMethod) {
    if (!accessMethod) return null;

    const lower = accessMethod.toLowerCase();

    if (lower.includes('public api') || lower.includes('marketplace api')) {
      return 'public_api';
    } else if (lower.includes('partner api') || lower.includes('partner feed')) {
      return 'partner_api';
    } else if (lower.includes('affiliate')) {
      return 'affiliate';
    } else if (lower.includes('monitor') || lower.includes('scraping')) {
      return 'monitoring';
    }

    return 'unknown';
  }

  /**
   * Generate slug from name
   * @param {string} name - Entity name
   * @returns {string} URL-safe slug
   */
  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate website URL for retailer
   * @param {string} name - Retailer name
   * @returns {string} Website URL
   */
  static generateWebsiteUrl(name) {
    const slug = this.generateSlug(name);

    // Special cases
    const urlMap = {
      'rakuten-ichiba': 'https://www.rakuten.co.jp',
      'net-a-porter-the-outnet': 'https://www.net-a-porter.com',
      'the-outnet': 'https://www.theoutnet.com',
      'the-realreal': 'https://www.therealreal.com',
      'the-iconic': 'https://www.theiconic.com.au',
    };

    if (urlMap[slug]) return urlMap[slug];

    // Default: https://www.{slug}.com
    return `https://www.${slug.replace(/-/g, '')}.com`;
  }

  /**
   * Generate brand website URL
   * @param {string} name - Brand name
   * @returns {string} Website URL
   */
  static generateBrandWebsiteUrl(name) {
    const slug = this.generateSlug(name);
    return `https://www.${slug}.com`;
  }

  /**
   * Generate logo URL using Clearbit
   * @param {string} slug - Entity slug
   * @returns {string} Logo URL
   */
  static generateLogoUrl(slug) {
    const domain = slug.replace(/-/g, '') + '.com';
    return `https://logo.clearbit.com/${domain}`;
  }

  /**
   * Generate brand logo URL
   * @param {string} slug - Brand slug
   * @returns {string} Logo URL
   */
  static generateBrandLogoUrl(slug) {
    return this.generateLogoUrl(slug);
  }

  /**
   * Get import statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getImportStats() {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM stores WHERE category = 'fashion') as total_retailers,
        (SELECT COUNT(*) FROM stores WHERE category = 'fashion' AND priority = 'P0') as p0_retailers,
        (SELECT COUNT(*) FROM stores WHERE category = 'fashion' AND priority = 'P1') as p1_retailers,
        (SELECT COUNT(*) FROM brands) as total_brands,
        (SELECT COUNT(*) FROM brands WHERE integration_phase = 'top100') as top100_brands,
        (SELECT COUNT(*) FROM brands WHERE integration_phase = 'top300') as top300_brands,
        (SELECT COUNT(*) FROM brands WHERE integration_phase = 'top1000') as top1000_brands,
        (SELECT COUNT(*) FROM brands WHERE integration_phase = 'longtail') as longtail_brands
    `);

    return stats.rows[0];
  }
}

module.exports = BrandImportService;
