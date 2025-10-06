import express from 'express';
import pool from '../config/db.js';
import { crearVenta, getVentasConDetalles, getVentasEstadisticas } from '../models/ventasModel.js';
// import { getStockProductId } from '../models/stockModel.js';
import { insertarVentaDetalle } from '../models/ventasDetalle.js';
import { addStockMovement, applyStockDelta, getStockProductIdForUpdate, movementType } from '../models/stockModel.js';
import { activityRecent } from './UsersControllers.js';
import { getPriceProduct } from '../models/productModel.js';
import { toNumber } from '../utils/numeros.js';

export const registrarVenta = async (req, res) => {
   
    const client = await pool.connect();
    const settings = req.settings;
    let responseSent = false;
    
    try {
        const usuarioId = req.usuario.id;
        const { canal, medio_pago, productos, cliente_id, descuento, impuestos, currency } = req.body;
        const ventaCurrency = currency ?? settings?.sales?.currency;
        const fxRate = toNumber(settings?.sales?.fx_rate_usd_ar, null);

        
        if (canal == null || canal === "") {
            responseSent = true;
            return res.status(400).json({ msg: "El campo canal es obligatorio." });
        }
        if (medio_pago == null || medio_pago === "") {
            responseSent = true;
            return res.status(400).json({ msg: "El campo medio de pago es obligatorio." });
        }
        if (!Array.isArray(productos) || productos.length === 0) {
            responseSent = true;
            return res.status(400).json({ msg: "Debe enviar productos con al menos un ítem." });
        }


        let subtotal = 0;
        
        for (const prod of productos) {
            const p = await getPriceProduct(prod.product_id);
            const lineCurrency = p.currency;
            const precioUnitario = toNumber(p.precio, null);
            const descProducto = toNumber(prod.descuento);
            
            let precioConvertido = precioUnitario;
            
            if (ventaCurrency === 'ARS' && lineCurrency === 'USD') {
                precioConvertido = precioUnitario * fxRate;
            }
            
            // DESCUENTOS INDIVIDUALES POR PRODUCTO
            const precioConDesc = precioConvertido * (1 - descProducto/100);
            const subLinea = precioConDesc * Number(prod.cantidad);
            
            subtotal = subtotal + subLinea;
        }
        
        // DESCUENTO GLOBAL, IMPUESTOS Y EL TOTAL
        const descuentoPorcentaje = descuento === undefined ? 0 : Number(descuento);
        const impuestosPorcentaje = impuestos === undefined ? 0 : Number(impuestos);
        const descuentoMaxGlobal = Number(settings?.sales?.max_discount);

        if (descuentoMaxGlobal !== null && descuentoPorcentaje > descuentoMaxGlobal) {
            responseSent = true;
            return res.status(400).json({ 
                msg: `El descuento (${descuentoPorcentaje}%) excede el máximo permitido (${descuentoMaxGlobal}%)`
            });
        }

        const descGlobalMonto = subtotal * (descuentoPorcentaje/100);
        const base = subtotal - descGlobalMonto;
        const impuesto = base * (impuestosPorcentaje/100);
        const total = base + impuesto;
        
        await client.query('BEGIN');
        
        const venta = await crearVenta({
            client, 
            medio_pago, 
            total, 
            canal, 
            cliente_id, 
            usuarioId, 
            descuento: descGlobalMonto,
            descuento_porcentaje: descuentoPorcentaje,
            impuestos_porcentaje: impuestosPorcentaje, 
            subtotal, 
            impuestos: impuesto,
            currency
        });
        
        
        const salidaType = await movementType(client, 'salida');
        if (!salidaType) {
            await client.query('ROLLBACK');
            responseSent = true;
            return res.status(400).json({ msg: 'Tipo de movimiento "salida" no configurado.' });
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
                    await client.query('ROLLBACK');
                    responseSent = true;         
                    return res.status(400).json({ 
                        msg: `Stock insuficiente para el producto ID: ${productId}` 
                    });
                }
            }

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
                costo_unitario: Number(item.precio_costo),
                precio_venta: Number(item.precio),
                metadata: JSON.stringify({ origen: 'registrarVenta' })
            });
        }

        await client.query('COMMIT');
        try { 
            await activityRecent(req, { estado: 'Exitoso', accion: 'Registró una venta.' });
        } catch (e) { 
            console.error('activityRecent falló:', e); 
        }

        responseSent = true;
        return res.status(200).json({ msg: 'Venta registrada', venta });

    } catch (error) {
        console.log('❌ ERROR capturado en catch:', error.message);
        try { 
            await client.query('ROLLBACK'); 
        } catch (rollbackError) {
            console.error('Error en rollback:', rollbackError);
        }
        
        
        try {
            await activityRecent(req, {estado: 'Fallido', accion: 'Falló al registrar una venta.'});
        } catch (activityError) {
            console.error('Error en activityRecent:', activityError);
        }
    
        if (!res.headersSent && !responseSent) {
            responseSent = true;
            return res.status(500).json({ 
                mensaje: 'Error al registrar venta', 
                error: error.message 
            });
        }
    } finally {
        client.release();
    }
};

export const obtenerVentasConDetallesCompletos = async (req, res) => {
    try {
        const ventas = await getVentasConDetalles(req.query);
        if (!ventas) return res.status(400).json({ msg: 'Error al obtener las ventas'})
        return res.status(200).json(ventas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: 'Error al obtener las ventas - 500'});
    }
}

export const obtenerTotalesVentas = async (req, res) => {
    try {
        const ventas = await getVentasEstadisticas();
        return res.json(ventas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error interno'});
    }
}