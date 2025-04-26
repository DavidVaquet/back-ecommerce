import { getStockProductId, addStockProduct } from "../models/stockModel.js";

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
   
    const { productId } = req.params;
    const { cantidad } = req.body;

    try {
        const stockActualizado = await addStockProduct(productId, cantidad);

        if (!stockActualizado || isNaN(cantidad || cantidad <= 0)) {
            return res.status(400).json({ msg: 'La cantidad debe ser un numero mayor a 0'});
        }

        return res.status(200).json({ msg: 'Stock actualizado correctamente.', stock: stockActualizado});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al actualizar el stock.'});
    }
};