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
    precio_costo
  }
) => {
  const query = `
    INSERT INTO products (nombre, descripcion, precio, imagen_url, subcategoria_id,
     estado, marca, publicado, destacado, descripcion_corta, barcode, precio_costo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
    precio_costo
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

export const getProductsComplete = async () => {
  const query = `SELECT 
    p.*,
    s.cantidad as stock_cantidad,
    c.nombre as categoria_nombre, 
    COALESCE(SUM(vt.cantidad)) as total_vendido
    FROM products AS p
    JOIN stock AS s ON p.id = s.product_id
    JOIN subcategories AS sb ON p.subcategoria_id = sb.id
    JOIN categories AS c ON sb.categoria_id = c.id
    LEFT JOIN ventas_detalle AS vt ON p.id = vt.producto_id
    GROUP BY p.id, s.cantidad, c.nombre 
    ORDER BY p.id DESC`;

  const result = await pool.query(query);

  return result.rows;
};

export const getProductsCantidadMinima = async () => {
  const query = `SELECT
    p.id,
    p.nombre,
    p.subcategoria_id,
    p.imagen_url,
    s.cantidad,
    s.cantidad_minima,
    sb.nombre as subcategoria_nombre
    FROM products as p
    JOIN subcategories as sb ON p.subcategoria_id = sb.id
    JOIN stock as s ON p.id = s.product_id
    WHERE s.cantidad <= s.cantidad_minima
    ORDER BY p.id DESC;`;

  const result = await pool.query(query);
  return result.rows;
};

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