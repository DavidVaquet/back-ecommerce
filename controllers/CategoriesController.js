import { getAllCategories, findCategoryByName, createCategory, updateCategory, toggleCategoryState, getCategoriasSubcategorias, statsCategoriaSubcategorias, deleteCategory } from "../models/categoriesModel.js";
import { activityRecent } from "./UsersControllers.js";


export const getCategories = async (req, res) => {

    try {
        const { activo } = req.query;
        
        const categories = await getAllCategories({activo});

        if (!categories) {
            return res.status(404).json({ msg: 'La categoria no existe'});
        }

        return res.json(categories);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener las categorias'} );
    }
};


export const newCategory = async (req, res) => {

    const { nombre, descripcion, activo } = req.body;


    try {
        
        const categoriaExistente = await findCategoryByName(nombre);

        if (categoriaExistente) {
            return res.status(400).json({ msg: 'Ya existe una categoria con ese nombre' });
        };

        const nuevaCategoria = await createCategory({nombre, descripcion, activo});
        await activityRecent(req, {estado: 'Exitoso', accion: 'Creo una categoría.'});

        return res.status(200).json({ msg: 'Categoria creada exitosamente', ok: true, categoria: nuevaCategoria});

    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Fallo al crear la categoría.'});
        return res.status(500).json({ msg: 'Error al crear la categoria.'});
    }
};

export const editCategory = async (req, res) => {

    const id = Number(req.params.id);
    const { nombre, descripcion, visible, activo } = req.body;

    try {
        const categoriaExistente = await findCategoryByName(nombre);

        if (categoriaExistente && categoriaExistente.id != id) {
            return res.status(400).json({ msg: 'Ya existe una categoria con ese nombre.'})
        };

        const result = await updateCategory({id, nombre, descripcion, visible, activo});

        if (result && result.changed === false) {
            return res.status(400).json({ msg: 'No hay cambios para aplicar'});
        }

        
        await activityRecent(req, {estado: 'Exitoso', accion: `Modifico la categoría ${result.nombre}`});

        return res.status(200).json({ ok: true, result});

    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar una categoría.'});
        return res.status(500).json({ msg: 'Error al actualizar la categoria'});
    }
};



export const categoryState = async (req, res) => {


    const { id } = req.params;
    const { activo } = req.body;

    try {
        const updateCategoryState = await toggleCategoryState({id, activo});

        await activityRecent(req, {estado: 'Exitoso', accion: 'Modifico una categoría.'});
        return res.status(200).json({ msg: 'El estado de la categoria fue actualizado exitosamente.', updateCategoryState});
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar una categoría.'});
        return res.status(500).json({ msg: 'Error al actualizar el estado de la categoria.'});
    }
};


export const eliminarCategoria = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await deleteCategory(id);

        return res.status(200).json({ ok: true, msg: 'Categoria eliminada correctamente'});
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
        return res.status(409).json({
            msg: 'Categoría con productos asociados. Solo puedes desactivarla.'
        });
        }
        return res.status(500).json({ msg: 'Error al eliminar la categoría' });
    }
}

export const obtenerCategoriasSubcategorias = async (req, res) => {
    try {
        const { limit, offset, search, visible, estado, visibleSub, estadoSub } = req.query;
        const categorias = await getCategoriasSubcategorias({limit, offset, search, visible, estado, visibleSub, estadoSub});

        return res.json(categorias);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener las categorias.' });
    }
}


export const statsCategorias = async (req, res) => {
    try {
        const categorias = await statsCategoriaSubcategorias();

        return res.json(categorias);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los stats de categorias.'});
    };
};