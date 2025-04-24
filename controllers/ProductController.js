import { createProduct } from "../models/productModel.js";



export const addProduct = async (req, res) => {
    
    const {nombre, descripcion, precio, imagen_url, category_id} = req.body
    
    if (!nombre || !precio || !category_id || !imagen_url) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios'});
    };
    
    try {

        const newProduct = await createProduct(nombre, descripcion, precio, imagen_url, category_id);

        return res.status(201).json({ msg: 'Producto creado correctamente', newProduct});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al crear el producto' });
    }

};