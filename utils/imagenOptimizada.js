import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

/**
 * Optimizacion de imagenes
 * @param {string} originalPath - Ruta del archivo original
 * @returns {string} Ruta final del archivo
 */


export const imagenOptimizada = async (originalPath) => {
    try {
        const filename = path.basename(originalPath);
        const folder = path.dirname(originalPath);
        const optimizedName = `opt-${filename}`;
        const optimizedPath = path.join(folder, optimizedName);

        await sharp(originalPath)
        .resize({width: 1000})
        .withMetadata()
        .toFile(optimizedPath);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const absolutePath = path.resolve(originalPath);

    try {
       fs.unlinkSync(absolutePath);
    } catch (unlinkError) {
      console.warn("No se pudo borrar la imagen original:", unlinkError.message);  
    }
    return optimizedPath;
    } catch (error) {
        throw new Error('Error al optimizar la imagen' + error.message);
    }
}