import express from 'express';
import pool from '../config/db.js';
import { crearVenta } from '../models/ventasModel.js';
import { getStockProductId } from '../models/stockModel.js';
import { insertarVentaDetalle } from '../models/ventasDetalle.js';
import { reduceStockProduct } from '../models/stockModel.js';

export const registrarVenta = async (req, res) => {

    const client =  await pool.connect();

    try {
        const { canal, medio_pago, total, productos, cliente_id } = req.body;

        if (!canal || !medio_pago || !total) {
            return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
        }
        
        await client.query('BEGIN');

        const ventaId = await crearVenta({client, medio_pago, total, canal, cliente_id});

        for (const prod of productos) {
            const stock = await getStockProductId(client, prod.producto_id);

            if (stock < prod.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${prod.producto_id}`);
            }

            await insertarVentaDetalle({client, venta_id: ventaId, producto:prod});
            await reduceStockProduct({client, product_id: prod.producto_id, cantidad: prod.cantidad});

        }

        await client.query('COMMIT');
        return res.status(200).json({ msg: 'Venta registrada', ventaId});

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ mensaje: 'Error al registrar venta', error: error.message });
    } finally {
        client.release();
    }
};