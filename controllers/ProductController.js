import { createProduct, getAllProducts, updateProduct, deleteProduct as deleteProductModel } from "../models/productModel.js";



export const addProduct = async (req, res) => {
    
    const {nombre, descripcion, precio, imagen_url, category_id} = req.body
    
    if (!nombre || !precio || !category_id || !imagen_url) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios'});
    };
    
    try {

        const newProduct = await createProduct({nombre, descripcion, precio, imagen_url, category_id});

        return res.status(201).json({ msg: 'Producto creado correctamente', newProduct});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al crear el producto' });
    }

};


export const getProducts = async (req, res) => {

    try {
        const products = await getAllProducts();
        res.status(200).json({ msg:'Productos obtenidos exitosamente', products });

    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Error al obtener todos los productos'})
    }
};


export const editProducts = async (req, res) => {

    const { id } = req.params;
    const {nombre, descripcion, precio, imagen_url, category_id, activo} = req.body;

    if (!nombre || !precio || !category_id || !imagen_url) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios para editar' });
      }

      try {
        const productUpdated = await updateProduct(id, {nombre, descripcion, precio, imagen_url, category_id, activo});
        if ( !productUpdated ) {
            return res.status(400).json({ error: 'Producto no encontrado' });

        }
        return res.status(200).json({ msg: 'Producto actualizado correctamente', producto: productUpdated});

      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al actualizar el producto '});
      }
};


export const deleteProduct = async (req, res) => {

    const { id } = req.params;

    try {
        const productDelete = await deleteProductModel(id);
        if (!productDelete) {
            return res.status(404).json({ msg: 'Producto no encontrado'} );
        }

        return res.status(200).json({ msg: 'Producto eliminado exitosamente', producto: productDelete});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};