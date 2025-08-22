import { customAlphabet } from 'nanoid';

export const generarNanoID = () => {
    const nanoIdGenerator = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
    return nanoIdGenerator();
}