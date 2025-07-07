import { getStockProductId, addStockProduct, reduceStockProduct } from "../models/stockModel.js";

export const getStockId = async (req, res) => {

    const { productId } = req.params;

    try {
        const stock = await getStockProductId(productId);
        if (!stock) {
            return res.status(404).json({ msg: 'No se encontro stock para este producto' });
        }

        return res.status(200).json({ msg: 'Stock encontrado', stock});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener el stock' });
    }
};

export const addStock = async (req, res) => {
   
    const { product_id } = req.params;
    const { cantidad } = req.body;

    try {

        if (!cantidad || isNaN(cantidad) || Number(cantidad) <= 0) {
            return res.status(400).json({ msg: 'La cantidad debe ser un número mayor a 0.' });
        }

        if (!product_id || isNaN(product_id)) {
            return res.status(400).json({ msg: 'ID del producto invalido.'});
        }

        const stockActualizado = await addStockProduct({product_id, cantidad});
        return res.status(200).json({ msg: 'Stock actualizado correctamente.', stock: stockActualizado});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al actualizar el stock.'});
    }
};


export const reduceStock = async (req, res) => {

    const { productId } = req.params;
    const { cantidad } = req.body;

    const cantidadNumerica = Number(cantidad);

    if (!productId || isNaN(productId)) {
        return res.status(400).json({ msg: 'El productId no es valido'})
    };

    if (!cantidad || isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
        return res.status(400).json({ msg: 'La cantidad debe ser un mayor a 0'});
    };

    try {
        const stockActualizado = await reduceStockProduct(productId, cantidad);
        return res.status(200).json({ msg: 'Stock reducido correctamente', stock: stockActualizado});

    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Error al actualizar el stock'});
    }
};