import pool from "../config/db.js";

export const createProduct = async (
  client,
  {
    nombre,
    descripcion,
    precio,
    imagen_url,
    subcategoria_id,
    estado,
    marca,
    publicado = 0,
    imagenUrls,
    destacado,
    descripcion_corta,
    barcode,
    precio_costo,
    currency
  }
) => {
  const query = `
    INSERT INTO products (nombre, descripcion, precio, imagen_url, subcategoria_id,
     estado, marca, publicado, destacado, descripcion_corta, barcode, precio_costo, currency)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;    `;

  const values = [
    nombre,
    descripcion,
    precio,
    imagen_url,
    subcategoria_id,
    estado,
    marca,
    publicado,
    destacado,
    descripcion_corta,
    barcode,
    precio_costo,
    currency
  ];

  const result = await client.query(query, values);
  // console.log("Resultado del insert:", result.rows[0]);

  const product = result.rows[0];
  const imagenesGuardadas = [];

  if (Array.isArray(imagenUrls) && imagenUrls.length >= 1) {
    for (const imagenes_url of imagenUrls) {
      const imageResult = await client.query(
        "INSERT INTO product_images (product_id, imagenes_url) VALUES ($1, $2) RETURNING *;",
        [product.id, imagenes_url]
      );
      imagenesGuardadas.push(imageResult.rows[0]);
    }
  }
  // console.log("Producto retornado:", product);
  // console.log("IMG retornado:", imagenesGuardadas);
  return {
    producto: product,
    imagenes: imagenesGuardadas,
  };
};

export const getAllProducts = async ({ publicado, estado, limite, stockBajo } = {}) => {
  let query = `SELECT 
         p.*,
         COALESCE(s.cantidad, 0) as cantidad,
         COALESCE(s.cantidad_minima, 0) as cantidad_minima,
         COALESCE(array_agg(pimg.imagenes_url) FILTER (WHERE pimg.imagenes_url IS NOT NULL), '{}') AS imagenes,
         ct.nombre AS categoria_nombre,
         ct.id AS categoria_id,
         sb.id AS subcategoria_id,
         sb.nombre AS subcategoria_nombre
         FROM products AS p
         LEFT JOIN stock AS s ON p.id = s.product_id
         LEFT JOIN product_images AS pimg ON p.id = pimg.product_id
         JOIN subcategories AS sb ON p.subcategoria_id = sb.id
         JOIN categories AS ct ON sb.categoria_id = ct.id
         WHERE 1=1`;

  const values = [];
  let i = 1;

  if (publicado !== undefined && publicado != null) {
    query += ` AND p.publicado = $${i++}`;
    values.push(publicado);
  }

  if (estado !== undefined && estado != null) {
    query += ` AND p.estado = $${i++}`;
    values.push(estado);
  }

  if (stockBajo !== undefined && stockBajo !== null) {
    const stockParse = Number(stockBajo);
    query += ` AND s.cantidad <= $${i++}`;
    values.push(stockParse);
  }

  query += ` GROUP BY 
         p.id, 
         s.cantidad, 
         s.cantidad_minima,
         ct.nombre, 
         ct.id, 
         sb.id, 
         sb.nombre 
         ORDER BY p.id DESC`;

  if (limite !== undefined && limite != null) {
    const lim = Number(limite);
    query += ` LIMIT $${i++}`;
    values.push(lim);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

export const getPriceProduct = async (id) => {
  
  const sql = `SELECT
               precio,
               precio_costo,
               currency
               FROM products
               WHERE id = $1`;
  const values = [id];

  const { rows } = await pool.query(sql, values);
  return rows[0];
};
 
export const updateProductAndStock = async ({
  id,
  nombre,
  descripcion,
  precio,
  subcategoria_id,
  marca,
  precio_costo,
  descripcion_corta
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
        UPDATE products
        SET nombre = $1,
        descripcion = $2,
        precio = $3,
        subcategoria_id = $4,
        marca = $5,
        precio_costo = $6,
        descripcion_corta = $7
        WHERE id = $8
        RETURNING *;`;

    const values = [nombre, descripcion, precio, subcategoria_id, marca, precio_costo, descripcion_corta, id];

    const { rows } = await client.query(query, values);
    await client.query("COMMIT");

    return rows[0];


    // console.log("Producto actualizado:", productoActualizado);
    // return productoActualizado;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteProduct = async (id) => {
  const query = `UPDATE products SET estado = 0 WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
export const activarProduct = async (id) => {
  const query = `UPDATE products SET estado = 1 WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const getProducts = async ({ 
  limit, 
  offset, 
  publicado, 
  estado, 
  stockBajo, 
  categoria_id, 
  subcategoria_id,
  search,
  include,
  orderBy,
  orderDir,
  stockCantidadMin
} = {}) => {


  const INCLUDES_PERMITIDOS = ['imagenes', 'ventas'];
  const DIRECCIONES_PERMITIDAS = ['DESC', 'ASC'];
  const raw = Array.isArray(include) ? include : String(include ?? '').split(',');
  const includes = new Set(
        raw.map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
        .filter((s) => s && INCLUDES_PERMITIDOS.includes(s))
  );

  const orderDirNormalizado = String(orderDir ?? '').trim();
  const orderByNormalizado = String(orderBy ?? "").trim();

  const safeOrderBy = orderByNormalizado ? orderByNormalizado : 'p.id';
  const safeOrderDir = DIRECCIONES_PERMITIDAS.includes(orderDirNormalizado) ? orderDirNormalizado : 'DESC';
  
  const selects = [
    'COUNT(*) OVER() as total_rows',
    'p.*',
    'COALESCE(s.cantidad, 0) as cantidad',
    'COALESCE(s.cantidad_minima, 0) as cantidad_minima',
    'ct.id as categoria_id',
    'ct.nombre as categoria_nombre',
    'sb.id as subcategoria_id',
    'sb.nombre as subcategoria_nombre'
  ];

  const joins = [
    'LEFT JOIN stock s ON s.product_id = p.id',
    'LEFT JOIN subcategories sb ON sb.id = p.subcategoria_id',
    'LEFT JOIN categories ct ON ct.id = sb.categoria_id'
  ];

  if (includes.has('imagenes')) {
    selects.push(`COALESCE(i.imagenes, '{}') AS imagenes`);
    joins.push(`
      LEFT JOIN LATERAL ( 
      SELECT array_agg(DISTINCT pimg.imagenes_url) AS imagenes
      FROM product_images pimg
      WHERE pimg.product_id = p.id
      ) i ON TRUE`);
  };

  if (includes.has('ventas')) {
    selects.push('COALESCE(v.total_vendido, 0)::int as total_vendido');
    joins.push(`
      LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(vt.cantidad), 0) as total_vendido
      FROM ventas_detalle vt
      WHERE vt.producto_id = p.id
      ) v ON TRUE`)
  };

  const where = [];
  const params = [];
  let i = 1;

  if (publicado != null) {
    where.push(`p.publicado = $${i++}`);
    params.push(Number(publicado));
  }

  if (estado != null) {
    where.push(`p.estado = $${i++}`);
    params.push(Number(estado));
  }

  if (categoria_id != null) {
    where.push(`ct.id = $${i++}`);
    params.push(Number(categoria_id));
  }

  if (subcategoria_id != null) {
    where.push(`sb.id = $${i++}`);
    params.push(Number(subcategoria_id));
  }

  if (stockBajo != null) {
    where.push(`COALESCE(s.cantidad, 0) <= $${i++}`);
    params.push(Number(stockBajo));
  }

  if (String(stockCantidadMin).toLowerCase() === 'min') {
    where.push(`COALESCE(s.cantidad, 0) < COALESCE(s.cantidad_minima, 0)`);
  }

  if (search != null && String(search).trim() !== '') {
    where.push(`
      (
        unaccent(lower(p.nombre))   LIKE unaccent(lower('%' || $${i} || '%'))
        OR unaccent(lower(p.barcode))  LIKE unaccent(lower('%' || $${i} || '%'))
      )
    `);
    params.push(String(search).trim());
    i++;
  }


  let sql = `
    SELECT
    ${selects.join(',\n  ')}
    FROM products p
    ${joins.join('\n  ')}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${safeOrderBy} ${safeOrderDir}
    `;

    const lim = Number(limit);
    const off = Number(offset);

    const tail = [];
    if (lim !== null && lim > 0) {
      tail.push(`LIMIT $${i++}`);
      params.push(lim);

      if (off !== null && off >= 0) {
        tail.push(`OFFSET $${i++}`);
        params.push(off);
      }
    } else {
      if (off !== null && off >= 0) {
        tail.push(`OFFSET $${i++}`);
        params.push(off);
      }
    }

    if (tail.length) {
      sql += `\n${tail.join(' ')}`;
    }

    const { rows } = await pool.query(sql, params);
    const total = rows[0]?.total_rows ? Number(rows[0].total_rows) : 0;
    for (const r of rows) delete r.total_rows;
    return { total, rows };
};

export const statsProductos = async ({ lowStockMin }) => {

  const lowStock = lowStockMin ? Number(lowStockMin) : null;

  const sql = `
  SELECT
  COUNT(*) as total_productos,
  COUNT(*) FILTER(WHERE p.estado = 1) as productos_activos,
  COUNT(*) FILTER(WHERE COALESCE(s.cantidad, 0) = 0) as productos_sin_stock,
  COUNT(*) FILTER(WHERE COALESCE(s.cantidad, 0) > 0 AND COALESCE(s.cantidad, 0) < COALESCE($1::int, 10)) as producto_bajo_stock
  FROM products p
  LEFT JOIN stock s ON s.product_id = p.id`;
  const params = [lowStock];

  const { rows: [row] } = await pool.query(sql, params);
  return {
    total: Number(row.total_productos),
    activos: Number(row.productos_activos),
    sin_stock: Number(row.productos_sin_stock),
    bajo_stock: Number(row.producto_bajo_stock)
  };
}

export const publicarProductos = async (ids, publicado = 1) => {
  const query = `UPDATE productos SET publicado = $1 WHERE id = ANY($2::int[])`;
  const values = [publicado, ids];

  const result = await pool.query(query, values);
  return result.rows;
};

export const obtenerInformacionPrintUSB = async (productId) => {
  const query = `SELECT
  p.nombre,
  p.barcode,
  p.marca,
  s.cantidad
  FROM products AS p
  JOIN stock AS s ON p.id = s.product_id
  WHERE p.id = $1`;

  const values = [productId];
  const result = await pool.query(query, values);

  return result.rows[0];
};

export const eliminarProduct = async (id) => {

  const query = `
  DELETE FROM products WHERE id = $1
  RETURNING *;`;

  const values = [id];

  const { rowCount } = await pool.query(query, values);

  return rowCount;
}

export const findProductById = async (id) => {

  const sql = `
  SELECT
  p.nombre,
  p.barcode,
  c.nombre as categoria_nombre,
  s.cantidad,
  p.precio,
  p.precio_costo,
  p.id
  FROM products p
  JOIN stock s ON s.product_id = p.id
  JOIN subcategories sb ON sb.id = p.subcategoria_id
  JOIN categories c ON c.id = sb.categoria_id
  WHERE p.id = $1`;

  const values = [id];
  const { rows } = await pool.query(sql, values)
  
  return rows[0];
}