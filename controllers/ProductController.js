import { createProduct,
        deleteProduct as deleteProductModel,
        getProducts, 
        updateProductAndStock, 
        activarProduct, 
        publicarProductos, 
        eliminarProduct, 
        statsProductos,
        findProductById
    } from "../models/productModel.js";
import { addStockMovement, ensureStockRow, movementType } from "../models/stockModel.js";
import { applyStockDelta } from "../models/stockModel.js";
import { getStockProductIdForUpdate } from "../models/stockModel.js";
import { imagenOptimizada } from "../utils/imagenOptimizada.js";
import { generarNanoID } from "../utils/nanoID.js";
import pool from "../config/db.js";
import { activityRecent } from "./UsersControllers.js";


export const addProduct = async (req, res) => {

    const client = await pool.connect();
    const settings = req.settings;
    try {
        
        const {nombre,
               descripcion,
               precio,
               imagen_url, 
               subcategoria_id, 
               marca, 
               estado, 
               destacado, 
               descripcion_corta, 
               cantidad, 
               cantidad_minima,
               precio_costo,
               currency  } = req.body
        console.log(req.body);
        
        if (!nombre || !precio || !subcategoria_id || !precio_costo ) {
            return res.status(400).json({ error: 'Campos obligatorios: nombre, precio, subcategoria, precio costo.'});
        };

        const imagenPrincipal = req.files?.image?.[0];
        let imagenOptimizadaUrl = null;
        if (imagenPrincipal){
            imagenOptimizadaUrl = await imagenOptimizada(imagenPrincipal.path);
        };

        const imagenUrls = [];
        if (Array.isArray(req.files?.images)) {
            for (const file of req.files.images) {
                const imgOptimizada = await imagenOptimizada(file.path);
                imagenUrls.push(imgOptimizada);
            }
        }

        const barcode = generarNanoID();

        await client.query('BEGIN');
        await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
       
        const newProduct = await createProduct(client, {
            nombre,
            descripcion,
            precio,
            imagen_url: imagenOptimizadaUrl,
            subcategoria_id,
            marca,
            estado,
            destacado,
            imagenUrls,
            descripcion_corta,
            barcode,
            precio_costo,
            currency
        });
        

        const productId = newProduct.producto.id;
        const cantidadMinimaGlobal = Number(settings?.inventory?.default_min_stock);
        const upserStock = await ensureStockRow(client, {
            product_id: productId,
            cantidad: 0,
            cantidad_minima: (cantidad_minima !== undefined && cantidad_minima !== null && cantidad_minima !== "")
                                ? Number(cantidad_minima)
                                : cantidadMinimaGlobal ?? 0
        });

        const locked = await getStockProductIdForUpdate(client, productId);
        const stockAnterior = Number(locked?.cantidad ?? 0);

        const entradaType = await movementType(client, 'entrada');
        if (!entradaType) {
        throw new Error('Tipo de movimiento "entrada" no configurado (movement_types)');
        }

        const movementTypeId = entradaType.id;
        const direction = Number(entradaType.direction);
        let movimiento = null;
        let stockActual = null;

        if (Number(cantidad) > 0) {
            const delta = direction * Number(cantidad);

            const upd = await applyStockDelta(client, productId, delta);

            stockActual = Number(upd.cantidad);

            const movIns = await addStockMovement(client, {
                product_id: productId,
                movements_type_id: movementTypeId,
                fecha: null,
                cantidad,
                stock_anterior: stockAnterior,
                stock_actual: stockActual,
                direction,
                usuario_id: req.usuario?.id ?? null,
                motivo: 'Alta de producto',
                document: 'ALTA',
                costo_unitario: null,
                metadata: JSON.stringify({ origen: 'addProduct'})
            })

            movimiento = movIns;
        }

        await client.query('COMMIT');

        const asd = await activityRecent(req, {estado: 'Exitoso', accion: `Creó el producto ${nombre}`});
        // console.log(asd);
        return res.status(201).json({ msg: 'Producto creado correctamente',
            newProduct, 
            imagenUrls,
            stock: {
                stockAnterior,
                stockActual,
                cantidad_minima

            }
        
        });

    } catch (error) {
        await client.query('ROLLBACK');
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al crear un producto.'});
        console.error(error);
        return res.status(500).json({ error: 'Error al crear el producto' });
    } finally {
        client.release();
    }

};

export const editProducts = async (req, res) => {

    const { id } = req.params;
    const {nombre, descripcion, precio, subcategoria_id, marca, precio_costo, descripcion_corta} = req.body;
    // console.log("Datos recibidos:", req.body);

    if (!nombre?.trim() || typeof precio !== "number" || typeof subcategoria_id !== 'number' || isNaN(subcategoria_id) || typeof precio_costo !== "number") {
        return res.status(400).json({ error: 'Debes insertar los campos: nombre, precio, subcategoria_id' });
      }

      try {
        const productUpdated = await updateProductAndStock({id, nombre, descripcion, precio, subcategoria_id, marca, precio_costo, descripcion_corta});
        if ( !productUpdated ) {
            return res.status(400).json({ error: 'Producto no encontrado' });

        }
        await activityRecent(req, {estado: 'Exitoso', accion: 'Modificó un producto.'});
        return res.status(200).json({ msg: 'Producto actualizado correctamente', producto: productUpdated});

      } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar un producto.'});
        return res.status(500).json({ error: 'Error al actualizar el producto '});
      }
};


export const deleteProduct = async (req, res) => {

    const { id } = req.params;

    try {
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ msg: 'ID inválido' });
        }
        
        const productDelete = await deleteProductModel(id);
        if (!productDelete) {
            return res.status(404).json({ msg: 'Producto no encontrado'} );
        }
        await activityRecent(req, {estado: 'Exitoso', accion: 'Eliminó un producto.'});
        return res.status(200).json({ msg: 'Producto eliminado exitosamente', producto: productDelete});
        
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al crear un producto.'});
        return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};
export const activarProducto = async (req, res) => {

    const { id } = req.params;

    try {
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ msg: 'ID inválido' });
        }

        const productDelete = await activarProduct(id);
        if (!productDelete) {
            return res.status(404).json({ msg: 'Producto no encontrado'} );
        }

        return res.status(200).json({ msg: 'Producto activado exitosamente', producto: productDelete});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};

export const getProductsCompletos = async (req, res) => {

    try {
        const products = await getProducts(req.query);
        return res.status(200).json(products)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener los productos completos.'})
    }
};

export const getStatsProductos = async (req, res) => {
    try {
        const stats = await statsProductos(req.query);
        res.json(stats);
    } catch (error) {
        console.error(error);
    }
}


export const publicarProducto = async (req, res) => {
    try {
        const { ids, publicado } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ msg: 'El id es obligatorio en forma de Array'})
        };

        const productoPublicado = await publicarProductos(ids, publicado);
        await activityRecent(req, {estado: 'Exitoso', accion: 'Publicó un producto.'});
        return res.status(200).json(productoPublicado);
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al publicar un producto.'});
        return res.status(500).json({ msg: 'Error al publicar los productos.'})
    }
};

export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCount = await eliminarProduct(id);

    if (deletedCount === 0) {
      return res.status(404).json({ msg: 'No se encontró ningún producto.' });
    }

    return res.status(200).json({ ok: true, msg: 'Producto eliminado exitosamente' });
  } catch (e) {
    console.error('eliminarProducto error:', e);

    if (e.code === '23503') {
      return res.status(409).json({
        msg: 'Producto con ventas asociadas. Solo puedes desactivarlo.'
      });
    }

    return res.status(500).json({ msg: 'Error eliminando producto.' });
  }
};


export const getByBarcode = async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ msg: "Código inválido" });

    const { rows } = await pool.query(`
        SELECT 
            p.*,
            COALESCE(s.cantidad, 0) AS cantidad,
            COALESCE(s.cantidad_minima, 0) AS cantidad_minima
        FROM products p
        LEFT JOIN stock s ON s.product_id = p.id
        WHERE lower(p.barcode) = lower($1)
        LIMIT 1
        `, [code]);

    if (!rows.length) return res.status(404).json({ msg: "No encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Error buscando por barcode" });
  }
};

export const getProductId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) return res.status(400).json({ msg: 'Id inválido'});

        const producto = await findProductById(id);

        if (!producto) return res.status(400).json({ msg: `No se encontró un producto con el id: ${id}`})
        
        res.json(producto);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error interno'});
    }
}