import { getAllCategories, findCategoryByName, createCategory, updateCategory, toggleCategoryState, getCategoriasSubcategorias, statsCategoriaSubcategorias } from "../models/categoriesModel.js";
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

    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ msg: 'El nombre es obligatorio.' });
    };

    try {
        const categoriaExistente = await findCategoryByName(nombre);

        if (categoriaExistente && categoriaExistente.id != id) {
            return res.status(400).json({ msg: 'Ya existe una categoria con ese nombre.'})
        };

        const categoriaActualizada = await updateCategory(id, nombre, descripcion);

        if (!categoriaActualizada) {
            return res.status(400).json({ msg: 'Categoria no encontrada'});
        };
        await activityRecent(req, {estado: 'Exitoso', accion: 'Modifico una categoría.'});

        return res.status(200).json({ msg: 'Categoria actualizada correctamente', categoriaActualizada});

    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar una categoría.'});
        return res.status(500).json({ msg: 'Error al actualizar la categoria'});
    }
};



export const categoryState = async (req, res) => {


    const { id } = req.params;
    const { activo } = req.body;

    if (!activo) {
        return res.status(404).json({ msg: 'Debes definir un estado para la categoria'} );
    }
    try {
        const updateCategoryState = await toggleCategoryState(id, activo);

        if (!updateCategory) {
            return res.status(404).json({ msg: 'Categoria no encontrada.'});
        }
        await activityRecent(req, {estado: 'Exitoso', accion: 'Modifico una categoría.'});
        return res.status(200).json({ msg: 'El estado de la categoria fue actualizado exitosamente.', updateCategoryState});
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al modificar una categoría.'});
        return res.status(500).json({ msg: 'Error al actualizar el estado de la categoria.'});
    }
};

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