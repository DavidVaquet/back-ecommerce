import express from 'express';
import pool from '../config/db.js';
import { crearVenta, getVentasConDetalles } from '../models/ventasModel.js';
// import { getStockProductId } from '../models/stockModel.js';
import { insertarVentaDetalle } from '../models/ventasDetalle.js';
import { addStockMovement, applyStockDelta, getStockProductIdForUpdate, movementType } from '../models/stockModel.js';
import { activityRecent } from './UsersControllers.js';
// import { reduceStockProduct } from '../models/stockModel.js';

export const registrarVenta = async (req, res) => {

    const client =  await pool.connect();

    try {
        const usuarioId = req.usuario.id;
        const { canal, medio_pago, total, productos, cliente_id, descuento, subtotal, impuestos } = req.body;

        if (!canal || !medio_pago || !total || !subtotal || !productos) {
            return res.status(400).json({ msg: 'Los campos: medio_pago, total, subtotal y productos son obligatorios.' });
        }
        
        
        
        for (const prod of productos) {
            if (!prod.product_id || !prod.cantidad) {
                return res.status(400).json({ msg: 'El product id y la cantidad son obligatorios.' });
            }
            
        }
        
        await client.query('BEGIN');
        
        const venta = await crearVenta({client, medio_pago, total, canal, cliente_id, usuarioId, descuento, subtotal, impuestos});
        
        const salidaType = await movementType(client, 'salida');
        if (!salidaType){
            return res.status(400).json({ msg: 'Tipo de entrada "salida" no configurado.' });
        }

        const direction = Number(salidaType.direction);
        let stockActual = null;
        let stockAnterior = null;

        for (const item of productos) {
                const productId = Number(item.product_id);
                const qty = Number(item.cantidad);

                if (direction === -1) {
                    const stock = await getStockProductIdForUpdate(client, item.product_id);
                    stockAnterior = Number(stock.cantidad);
                    if (stockAnterior < qty) {
                        throw new Error(`Stock insuficiente para el producto ${productId}`)
                    }
                };

                const delta = qty * direction;
                // Reducción del stock
                const reduce = await applyStockDelta(client, item.product_id, delta);
                stockActual = Number(reduce.cantidad);
                
                // Insertamos el detalle de la venta    
                await insertarVentaDetalle({client, venta_id: venta.ventaId, producto: item});
                // Insertamos el movimiento del stock
                await addStockMovement(client, {
                    product_id: productId,
                    movements_type_id: salidaType.id,
                    cantidad: qty,
                    direction,
                    stock_actual: stockActual,
                    stock_anterior: stockAnterior,
                    usuario_id: req.usuario?.id || null,
                    motivo: 'Venta de producto',
                    document: venta.document,
                    metadata: JSON.stringify({ origen: 'registrarVenta' })

                })
            }



        await client.query('COMMIT');
        await activityRecent(req, {estado: 'Exitoso', accion: 'Registró una venta.'});
        return res.status(200).json({ msg: 'Venta registrada', venta });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al registrar una venta.'});
        res.status(500).json({ mensaje: 'Error al registrar venta', error: error.message });
    } finally {
        client.release();
    }
};

export const obtenerVentasConDetallesCompletos = async (req, res) => {
    try {
        const ventas = await getVentasConDetalles();
        if (!ventas) return res.status(400).json({ msg: 'Error al obtener las ventas'})
        return res.status(200).json(ventas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: 'Error al obtener las ventas - 500'});
    }
}