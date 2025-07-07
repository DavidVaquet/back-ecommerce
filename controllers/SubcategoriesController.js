import { newSubcategory, getAllSubcategories, findSubcategoryName } from "../models/subcategoriesModel.js";

export const addSubcategoria = async (req, res) => {

    const {nombre, descripcion, activo, categoria_id} = req.body;

    if (!nombre || !categoria_id || isNaN(categoria_id)) {
        return res.status(400).json({error: 'El nombre y la categoría son obligatorios, y la categoría debe ser un número válido.'});
    }

    const subcategoriaExistente = await findSubcategoryName(nombre);

    if (subcategoriaExistente){
        return res.status(400).json({msg: 'Ya existe una subcategoria con ese nombre.'})
    }

    try {
        const addSubcategory = await newSubcategory({nombre, descripcion, activo, categoria_id});
        return res.status(201).json(addSubcategory);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: 'Error al crear una subcategoria.'});
    }

};

export const getAllSubcategorias = async (req, res) => {
    try {
        const subcategories = await getAllSubcategories();
        return res.status(201).json(subcategories);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: 'Error al obtener las subcategorias.'})
    }
};