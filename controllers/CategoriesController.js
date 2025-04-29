import { getAllCategories, findCategoryByName, createCategory, updateCategory, toggleCategoryState } from "../models/categoriesModel.js";


export const getCategories = async (req, res) => {

    try {
        const categories = await getAllCategories();

        if (!categories) {
            return res.status(404).json({ msg: 'La categoria no existe'});
        }

        return res.status(200).json({ msg: 'Categorias obtenidas correctamente', categories});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener las categorias'} );
    }
};


export const newCategory = async (req, res) => {

    const { nombre, descripcion } = req.body;

    try {
        
        const categoriaExistente = await findCategoryByName(nombre);

        if (categoriaExistente) {
            return res.status(400).json({ msg: 'Ya existe una categoria con ese nombre' });
        };

        const nuevaCategoria = await createCategory(nombre, descripcion);

        return res.status(200).json({ msg: 'Categoria creada exitosamente', categoria: nuevaCategoria});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al crear la categoria.'});
    }
};

export const editCategory = async (req, res) => {

    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (!nombre || !descripcion) {
        return res.status(400).json({ msg: 'El nombre y la descripcion son obligatorios.' });
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

        return res.status(200).json({ msg: 'Categoria actualizada correctamente', categoriaActualizada});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al actualizar la categoria'});
    }
};



export const categoryState = async (req, res) => {


    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
        return res.status(404).json({ msg: 'Debes definir un estado para la categoria'} );
    }
    try {
        const updateCategoryState = await toggleCategoryState(id, activo);

        if (!updateCategory) {
            return res.status(404).json({ msg: 'Categoria no encontrada.'});
        }

        return res.status(200).json({ msg: 'El estado de la categoria fue actualizado exitosamente.', updateCategoryState});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al actualizar el estado de la categoria.'});
    }
};