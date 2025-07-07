import { createProduct, getAllProducts, updateProduct, deleteProduct as deleteProductModel } from "../models/productModel.js";
import { imagenOptimizada } from "../utils/imagenOptimizada.js";



export const addProduct = async (req, res) => {
    
    const {nombre, descripcion, precio, imagen_url, subcategoria_id, marca, estado, visible} = req.body
    
    if (!nombre || !precio || !subcategoria_id ) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios'});
    };
    
    try {

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
       
        const newProduct = await createProduct({
            nombre,
            descripcion,
            precio,
            imagen_url: imagenOptimizadaUrl,
            subcategoria_id,
            marca,
            estado,
            visible,
            imagenUrls
        });

        return res.status(201).json({ msg: 'Producto creado correctamente', newProduct, imagenUrls});

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