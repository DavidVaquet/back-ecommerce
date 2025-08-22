import { obtenerInformacionPrintUSB } from '../models/productModel.js';

export const tsplController = async (req, res, next) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const copies = parseInt(req.body.copies, 10) || 1;
        if (!productId){
            return res.status(400).json({ msg: 'No se especifico el id del producto.'});
        }
        if (copies <= 0) {
            return res.status(400).json({ msg: 'El número de copias es menor o igual a 0'});
        }
        const producto = await obtenerInformacionPrintUSB(productId);
        if (!producto){
            return res.status(400).json({ msg: 'No se encontro el producto.'});
        }
        const tspl = `
        SIZE 60 mm,30 mm
        GAP 3 mm,0 mm
        DENSITY 8
        SPEED 4
        CLS
        TEXT 10,10,"3",0,1,1,"Marca: ${producto.marca}"
        TEXT 10,40,"3",0,1,1,"Producto: ${producto.nombre}"
        BARCODE 10,70,"128",80,1,0,2,2,"${producto.barcode}"
        TEXT 10,160,"3",0,1,1,"Cantidad: ${producto.cantidad}"
        TEXT 10,220,"3",0,1,1,"Fecha: ${new Date().toLocaleDateString()}"
        PRINT ${copies}
        `;
        return res.json({tspl});
    } catch (error) {
        next(error);
    }
}