import pool from '../config/db.js';


export const createProduct = async ({nombre, descripcion, precio, imagen_url, subcategoria_id, estado, marca, visible, imagenUrls}) => {

    const query = `
    INSERT INTO products (nombre, descripcion, precio, imagen_url, subcategoria_id, estado, marca, visible)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;    `

    const values = [nombre, descripcion, precio, imagen_url, subcategoria_id, estado, marca, visible];

    const result = await pool.query(query, values);
    console.log("Resultado del insert:", result.rows[0]);

    const product = result.rows[0];
    const imagenesGuardadas = [];

    if (Array.isArray(imagenUrls) && imagenUrls.length >= 1) {
        for (const imagenes_url of imagenUrls) {
            const imageResult = await pool.query("INSERT INTO product_images (product_id, imagenes_url) VALUES ($1, $2) RETURNING *;", [product.id, imagenes_url])
            imagenesGuardadas.push(imageResult.rows[0]);
        }
    }
    console.log("Producto retornado:", product);
    console.log("IMG retornado:", imagenesGuardadas);
    return {
        producto: product,
        imagenes: imagenesGuardadas
    };
};

export const getAllProducts = async () => {

    const result = await pool.query(`SELECT 
         p.*,
         COALESCE(s.cantidad, 0) as cantidad,
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
         GROUP BY 
         p.id, 
         s.cantidad, 
         ct.nombre, 
         ct.id, 
         sb.id, 
         sb.nombre
         ORDER BY p.id DESC`);
    return result.rows;
};


export const updateProduct = async (id, {nombre, descripcion, precio, imagen_url, activo, category_id}) => {

    const query = `
    UPDATE products
    SET nombre = $1,
    descripcion = $2,
    precio = $3,
    imagen_url = $4,
    category_id = $5,
    activo = $6
    WHERE id = $7
    RETURNING *;`

    const values = [nombre, descripcion, precio, imagen_url, category_id, activo, id];
   
    const result = await pool.query(query, values);
    return result.rows[0];
 
};


export const deleteProduct = async (id) => {

    const query = `UPDATE products SET activo = false WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};