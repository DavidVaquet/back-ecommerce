import { newSubcategory, getAllSubcategories, findSubcategoryName } from "../models/subcategoriesModel.js";
import { activityRecent } from "./UsersControllers.js";

export const addSubcategoria = async (req, res) => {

    try {

        const {nombre, descripcion, activo, categoria_id} = req.body;
    
        const subcategoriaExistente = await findSubcategoryName(nombre);
    
        if (subcategoriaExistente){
            return res.status(400).json({msg: 'Ya existe una subcategoria con ese nombre.'})
        }
        const addSubcategory = await newSubcategory({nombre, descripcion, activo, categoria_id});
        await activityRecent(req, {estado: 'Exitoso', accion: 'Creó una subcategoría.'});
        return res.status(201).json({ ok: true, msg: 'Subcategoría creada con éxito'});
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al crear una subcategoría.'});
        return res.status(500).json({error: 'Error al crear una subcategoria.'});
    }

};

export const getAllSubcategorias = async (req, res) => {
    try {
        const { activo } = req.query;

        const subcategories = await getAllSubcategories({ activo });
        
        return res.status(201).json(subcategories);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: 'Error al obtener las subcategorias.'})
    }
};