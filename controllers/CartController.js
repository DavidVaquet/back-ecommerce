import { addCart } from "../models/cartModel.js";


export const addItemCart = async (req, res) => {

    const { product_id, cantidad } = req.body;
    const user_id = req.usuario?.id; 

    if (!product_id || !cantidad || !user_id) {
        return res.status(400).json({ msg: 'Todos los campos son obligatorios.' })
    };

    try {
        const item = await addCart(user_id, product_id, cantidad);
        return res.status(200).json({ msg: 'Producto agregado al carrito.', item});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al agregar el producto al carrito.' });
    }
};