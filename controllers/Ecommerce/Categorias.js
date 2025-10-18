import { categoriasEcommerce } from "../../models/categoriesModel.js";

export const obtenerCategoriasEcommerce = async (req, res) => {
    try {
        const { limiteCategorias, 
                offset, 
                activo, 
                visible,
                includeCounts,
                includeSubcats,
                orderBy,
                publicadoProd,
                estadoProd } = req.query;
        const {items, total_rows} = await categoriasEcommerce({ limiteCategorias, 
                                                        offset, 
                                                        activo, 
                                                        visible,
                                                        includeCounts,
                                                        includeSubcats,
                                                        orderBy,
                                                        publicadoProd,
                                                        estadoProd });
        const withSlug = items.map(cat => ({
            ...cat,
            slug: cat.nombre.trim().toLowerCase(),
            subcategorias: Array.isArray(cat.subcategorias) ? cat.subcategorias.map(sub => ({ ...sub, slug: sub.nombre.trim().toLowerCase()})) : [],
        }));

        return res.json({ items: withSlug, total_rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener las categorias del ecommerce'});
    }
}