import { createProduct, getAllProducts, deleteProduct as deleteProductModel, getProductsComplete, updateProductAndStock, activarProduct, getProductsCantidadMinima, publicarProductos } from "../models/productModel.js";
import { addStockMovement, ensureStockRow, movementType } from "../models/stockModel.js";
import { applyStockDelta } from "../models/stockModel.js";
import { getStockProductIdForUpdate } from "../models/stockModel.js";
import { imagenOptimizada } from "../utils/imagenOptimizada.js";
import { generarNanoID } from "../utils/nanoID.js";
import pool from "../config/db.js";
import { activityRecent } from "./UsersControllers.js";


export const addProduct = async (req, res) => {

    const client = await pool.connect();

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
               cantidad_minima} = req.body
        
        if (!nombre || !precio || !subcategoria_id ) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios'});
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
            barcode
        });
        // console.log('newProduct=', newProduct);

        const productId = newProduct.producto.id;

        const upserStock = await ensureStockRow(client, {
            product_id: productId,
            cantidad: 0,
            cantidad_minima: Number(cantidad_minima) || 0
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

        const asd = await activityRecent(req, {estado: 'Exitoso', accion: 'Creó un producto.'});
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


export const getProducts = async (req, res) => {

    try {
    
        const { publicado, estado, limite, stockBajo } = req.query;
        const publicadoParseado = publicado !== undefined ? parseInt(publicado) : undefined;
        const products = await getAllProducts({publicadoParseado, estado, limite, stockBajo});
        res.status(200).json({ msg:'Productos obtenidos exitosamente', products });

    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Error al obtener todos los productos'})
    }
};


export const editProducts = async (req, res) => {

    const { id } = req.params;
    const {nombre, descripcion, precio, subcategoria_id, marca, cantidad_stock} = req.body;
    console.log("Datos recibidos:", req.body);

    if (!nombre?.trim() || typeof precio !== "number" || typeof subcategoria_id !== 'number' || isNaN(subcategoria_id) || typeof cantidad_stock !== 'number') {
        return res.status(400).json({ error: 'Debes insertar los campos: nombre, precio, subcategoria_id, cantidad_stock' });
      }

      try {
        const productUpdated = await updateProductAndStock({id, nombre, descripcion, precio, subcategoria_id, marca, cantidad_stock});
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
        const products = await getProductsComplete();
        return res.status(200).json(products)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener los productos completos.'})
    }
};

export const getProductsCantidadMin = async (req, res) => {
    try {
        const productosCantidadMin = await getProductsCantidadMinima();
        if (!productosCantidadMin) {
            return res.status(400).json({ msg: 'No hay productos con cantidad minima.'})
        }
        return res.status(200).json(productosCantidadMin);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los productos con cantidad minima'});
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