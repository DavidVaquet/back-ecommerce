import { newSubcategory, getAllSubcategories, findSubcategoryName, updateSubcategory, deleteSubcategory } from "../models/subcategoriesModel.js";
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


export const editarSubcategory = async (req, res) => {

    const id = Number(req.params.id);
    const { nombre, descripcion, visible, activo } = req.body;

    try {
        const categoriaExistente = await findSubcategoryName(nombre);

        if (categoriaExistente && categoriaExistente.id != id) {
            return res.status(400).json({ msg: 'Ya existe una subcategoria con ese nombre.'})
        };

        const result = await updateSubcategory({id, nombre, descripcion, visible, activo});

        if (result && result.changed === false) {
            return res.status(400).json({ msg: 'No hay cambios para aplicar'});
        }

        
        await activityRecent(req, {estado: 'Exitoso', accion: `Modifico la subcategoría ${result.nombre}`});

        return res.status(200).json({ ok: true, result});

    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar una subcategoría.'});
        return res.status(500).json({ msg: 'Error al actualizar la categoria'});
    }
};


export const eliminarSubcategoria = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await deleteSubcategory(id);

        return res.status(200).json({ ok: true, msg: 'Subcategoría eliminada correctamente'});
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
        return res.status(409).json({
            msg: 'Subcategoría con productos asociados. Solo puedes desactivarla.'
        });
        }
        return res.status(500).json({ msg: 'Error al eliminar la categoría' });
    }
}