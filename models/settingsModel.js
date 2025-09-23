import pool from './../config/db.js';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "empresa");


export const getCompanySettings = async (orgId) => {

    const { rows } = await pool.query(`
        SELECT op.*, os.data 
        FROM organization_profile op
        LEFT JOIN organization_settings os USING (org_id)
        WHERE op.org_id = $1;`, [orgId]);
    

    const r = rows[0];
    const data = r.data;
    const inventario = data.inventory;
    const ventas = data.sales;
    const productos = data.products;

    const out = {
        org_id: r.org_id,
        name: r.name,
        direction: r.name,
        telefono: r.telefono,
        email_empresa: r.email_empresa,
        website: r.website,
        tax_id: r.tax_id,
        timezone: r.timezone,
        date_format: r.date_format,
        logo_url: r.logo_url,
        // INVENTARIO
        show_costs: inventario.show_costs ?? true,
        low_stock_alert: inventario.low_stock_alert ?? true,
        default_min_stock: inventario.default_min_stock ?? 10,
        out_of_stock_alert: inventario.out_of_stock_alert ?? true,
        allow_negative_stock: inventario.allow_negative_stock ?? false,
        // VENTAS
        currency: ventas.currency ?? 'ARS',
        iva_default: ventas.iva_default,
        max_discount: ventas.max_discount,
        fx_rate_usd_ar: ventas.fx_rate_usd_ar,
        payment_method_default: ventas.payment_method_default,
        // PRODUCTOS
        default_money: productos.default_money,
        default_category_id: productos.default_category_id
    };

    return out;
};


export const editCompanySettings = async ({ orgId, body, file }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    
    const { rows: oldRows } = await client.query(
      `SELECT logo_url FROM organization_profile WHERE org_id = $1`,
      [orgId]
    );
    const prevUrl = oldRows?.[0]?.logo_url || null;

    const { name, direction, telefono, website, email_empresa, tax_id, timezone, date_format } = body;
    const baseNormalizada = { name, direction, telefono, website, email_empresa, tax_id, timezone, date_format };

    const baseSets = [];
    const baseParams = [];

    for (const [k, v] of Object.entries(baseNormalizada)) {
      if (v !== undefined) {
        baseParams.push(v);
        baseSets.push(`${k} = $${baseParams.length}`);
      }
    }

    
    let newLogoPublicUrl = null;
    let savedFilename = null;

    if (file) {
      const orgDir = path.join(UPLOAD_DIR, `org-${orgId}`);
      await fs.mkdir(orgDir, { recursive: true });

      const isSvg = file.mimetype === "image/svg+xml";
      savedFilename = isSvg ? `logo-${orgId}.svg` : `logo-${orgId}.png`;
      const absPath = path.join(orgDir, savedFilename);

      if (isSvg) {
        await fs.writeFile(absPath, file.buffer);
      } else {
        await sharp(file.buffer)
          .resize({ width: 512 })
          .png({ quality: 90 })
          .toFile(absPath);
      }

      newLogoPublicUrl = `${process.env.APP_PUBLIC_URL}/static/uploads/empresa/org-${orgId}/${savedFilename}`;
      baseParams.push(newLogoPublicUrl);
      baseSets.push(`logo_url = $${baseParams.length}`);
    }

    
    if (baseSets.length > 0) {
      baseParams.push(orgId);
      await client.query(
        `UPDATE organization_profile
         SET ${baseSets.join(", ")}, update_at = NOW()
         WHERE org_id = $${baseParams.length}`,
        baseParams
      );
    }

    
    if (newLogoPublicUrl && prevUrl) {
      
      const marker = `/static/uploads/empresa/org-${orgId}/`;
      if (prevUrl.includes(marker)) {
        const oldName = prevUrl.split(marker)[1];
        if (oldName) {
          const oldPath = path.join(UPLOAD_DIR, `org-${orgId}`, oldName);
          await fs.unlink(oldPath).catch(() => {});
        }
      }
    }

    
    const { rows } = await client.query(
      `SELECT *
       FROM organization_profile
       WHERE org_id = $1`,
      [orgId]
    );

    await client.query("COMMIT");

    const out = rows[0] || {};
    
    if (out.logo_url) out.logo_url = `${out.logo_url}?v=${Date.now()}`;

    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const editInventorySettings = async (orgId, body) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inventory = {
      show_costs: body.mostrarCostos,
      low_stock_alert: body.alertaBajoStock,
      default_min_stock: body.stockMinimo,
      out_of_stock_alert: body.alertaSinStock
  }

    const clean = Object.fromEntries(Object.entries(inventory).filter(([, v]) => v !== undefined));
    const partial = { inventory: clean };

    const sql = `
    UPDATE organization_settings
    SET data = jsonb_strip_nulls(COALESCE(data, '{}'::jsonb) || $1::jsonb)
    WHERE org_id = $2`;
    const values = [JSON.stringify(partial), orgId];

    const { rows: update } = await client.query(sql, values);

    // TRAER LOS DATOS PARA MOSTRARLOS
    const sqlGet = `
    SELECT
    (os.data->'inventory'->>'show_costs') as show_costs,
    (os.data->'inventory'->>'low_stock_alert') as low_stock_alert,
    (os.data->'inventory'->>'default_min_stock')::int as default_min_stock,
    (os.data->'inventory'->>'out_of_stock_alert') as out_of_stock_alert
    FROM organization_settings os
    WHERE org_id = $1
     `;

    const valuesGet = [orgId];

    const { rows } = await client.query(sqlGet, valuesGet);

    await client.query('COMMIT');

    return rows[0];
  
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const editSalesSettings = async (orgId, body) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sales = {
      iva_default: body.iva,
      max_discount: body.descuentoMaximo,
      fx_rate_usd_ar: body.fx_rate_usd_ars,
      payment_method_default: body.metodoPagoDefecto
  }

  const clear = Object.fromEntries(Object.entries(sales).filter(([, v]) => v != undefined));
  const partial = { sales: clear};

  const sql = `
  UPDATE organization_settings
  SET data = jsonb_strip_nulls(COALESCE(data, '{}'::jsonb) || $1::jsonb)
  WHERE org_id = $2`;
  const values = [JSON.stringify(partial), orgId];
  const { rows: update } = await client.query(sql, values);

  const sqlGet = `
  SELECT
  (os.data->'sales'->>'iva_default')::int as iva_default,
  (os.data->'sales'->>'max_discount')::int as max_discount,
  (os.data->'sales'->>'payment_method_default') as payment_method_default,
  (os.data->'sales'->>'fx_rate_usd_ar')::int as fx_rate_usd_ar,
  (os.data->'sales'->>'fx_rate_usd_ar')::int as fx_rate_usd_ar
  FROM organization_settings os
  WHERE org_id = $1
  `;

  const valuesGet = [orgId];
  const { rows } = await client.query(sqlGet, valuesGet);
  
  await client.query('COMMIT');
  return rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const getSettingsByOrg = async (orgId) => {
    const sql = `SELECT data from organization_settings WHERE org_id = $1`;
    const values = [orgId];

    const { rows } = await pool.query(sql, values);
    return rows[0];
};

export const setSettingsOrg = async(orgId, dataObj) => {
    const sql = `
    UPDATE organization_settings
    SET data = $2, updated_at = now()
    WHERE org_id = $1
    RETURNING data`;
    const values = [orgId, dataObj];

    const { rows } = await pool.query(sql, values);
    return rows[0];
}