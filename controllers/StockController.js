import pool from "../config/db.js";
import { getStockProductIdForUpdate, ensureStockRow, applyStockDelta, addStockMovement, movementType, getMovementsType, getAllMovementStock, todayStockMovementEstadisticas } from "../models/stockModel.js";
import { activityRecent } from "./UsersControllers.js";


export const registrarMovimientoStock = async (req, res) => {

    const client = await pool.connect();

    try {
        let {
            product_id,
            movement_type,
            cantidad,
            motivo,
            document,
            costo_unitario,
            stock_objetivo,
            precio_venta,
            cliente
        } = req.body;

        if (!movement_type){
            return res.status(400).json({ msg: 'Movement_type es obligatorio.'})
        }

        if (!product_id) {
            return res.status(400).json({ msg: 'ProductId no especificado.'})
        }

        // console.log(req.body);
        const productoId = Number(product_id);

        await client.query('BEGIN');

        const mt = await movementType(client, movement_type);

        if (!mt) {
            return res.status(400).json({ msg: `El tipo de movimiento ${mt} no esta especificado.` });
        }

        const movements_type_id = mt.id;
        const direction = mt.direction;

        await ensureStockRow(client, {product_id:productoId, cantidad, cantidad_minima: 0});

        const locked = await getStockProductIdForUpdate(client, productoId);
        if (!locked) throw new Error(`No existe fila para el producto ${productoId}`);
        const stockAnterior = locked.cantidad;


        
        const qty   = (cantidad === '' || cantidad == null) ? null : Number(cantidad);
        const targ  = (stock_objetivo === '' || stock_objetivo == null) ? null : Number(stock_objetivo);

        let delta, rowDirection, rowCantidad;

        if (direction === 0) {
        
        if (targ != null) {
            if (!Number.isInteger(targ) || targ < 0) {
            return res.status(400).json({ msg: 'stock_objetivo inválido (entero ≥ 0).' });
            }
            delta = targ - stockAnterior; 
        } else {
            // Alternativa: delta firmado en "cantidad"
            if (qty == null || !Number.isInteger(qty) || qty === 0) {
            return res.status(400).json({ msg: 'Para ajuste enviá stock_objetivo o una cantidad (delta) entera ≠ 0.' });
            }
            delta = qty; 
        }

        if (delta === 0) {
            return res.status(400).json({ msg: 'Ajuste sin cambios.' });
        }

        rowDirection = delta > 0 ? 1 : -1;          
        rowCantidad  = Math.abs(delta);              

        } else {
        
        if (qty == null || !Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ msg: 'La cantidad debe ser un entero > 0.' });
        }
        rowDirection = direction;                    
        rowCantidad  = qty;                           
        delta        = rowDirection * rowCantidad;    
        }

        if (stockAnterior + delta < 0) {
        return res.status(400).json({ msg: 'Stock insuficiente para realizar el movimiento.' });
        }

        const upd = await applyStockDelta(client, productoId, delta);
        let stockActual = upd.cantidad;

        const mov = await addStockMovement(client, {
            product_id: Number(productoId),
            movements_type_id,
            cantidad: rowCantidad,
            direction: rowDirection,
            stock_anterior: stockAnterior,
            stock_actual: stockActual,
            usuario_id: req.usuario?.id,
            motivo: motivo,
            precio_venta: Number(precio_venta) ?? 0,
            cliente,
            document,
            costo_unitario,
            metadata: JSON.stringify({ origen: 'registrarMovimientoStock'}
        )});

        await client.query('COMMIT');
        await activityRecent(req, {estado: 'Exitoso', accion: 'Registró un movimiento de stock.'});

        return res.status(200).json({
            msg: 'Movimiento registrado',
            mov_id: mov?.id,
            product_id: productoId,
            movement_type_id: movements_type_id,
            direction,
            stockAnterior: mov.stock_anterior,
            stockActual: mov.stock_actual
        })

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al registrar un movimiento de stock.'});
        return res.status(500).json({ msg: 'Error al registrar movimiento', error: error.message });        
    } finally {
        await client.release();
    }
}

export const getMovementTypes = async (req, res) => {

    try {
        const movements = await getMovementsType();
        if (!movements) {
            return res.status(400).json({ msg: 'No hay movimientos activos '});
        };

        return res.status(200).json(movements);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los movimientos '});
    }

}

export const getMovementStock = async (req, res) => {

    try {
        const { limite, fechaDesde, fechaHasta } = req.query;
        // console.log('[BE query]', req.query);

        const movimientos = await getAllMovementStock({limite, fechaDesde, fechaHasta});

        if (!movimientos) {
            return res.status(400).json({ msg: 'No hay movimientos registrados.'});
        }

        return res.status(200).json(movimientos);


    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al encontrar movimientos de stock. '});
    }
}

export const getTodayStockMovementEstadistics = async (req, res) => {

    try {
        const { hoy } = req.query;

        const estadisticasToday = await todayStockMovementEstadisticas({hoy});
        
        if (!estadisticasToday) {
            return res.status(400).json({ msg: 'No se encontraron estadisticas para hoy.'});
        }

        return res.status(200).json(estadisticasToday);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al encontrar las estadisticas del día de hoy'});
    }
}