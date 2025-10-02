import express from 'express';
import { altaCliente, buscarCliente, editarClientes, getClientesEstado, obtenerClientesCompras, obtenerEstadisticasClientes, suspenderCuenta } from '../models/clientesModel.js';
import { activityRecent } from './UsersControllers.js';

export const crearCliente = async (req, res) => {

    try {
        const { nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas } = req.body
        

        const existeCliente = await buscarCliente(email);
        if (existeCliente) {
            return res.status(400).json({ msg: 'Ya existe un cliente registrado con ese email.'})
        }

        const cliente = await altaCliente({nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas});
        return res.status(201).json(cliente);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al crear el cliente.' });       
    }

}

export const clientesEstado = async (req, res) => {
    try {
        
         let { activo, limite, offset, search, origen, tipo_cliente } = req.query;

        const clienteOn = await getClientesEstado({activo, limite, offset, search, origen, tipo_cliente});

        return res.status(200).json(clienteOn)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los clientes activos.'})
    }
}

export const clientesConCompras = async (req, res) => {
    try {
        const clientes = await obtenerClientesCompras(req.query);
        return res.status(200).json(clientes);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los clientes con compras realizadas.'})
    }
}

export const suspenderCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const {email, estado } = req.body;

        const clienteExiste = await buscarCliente(email);
        if (!clienteExiste) {
            return res.status(400).json({msg: 'El cliente que deseas suspender, ya no existe!'});
        }
        const cliente = await suspenderCuenta({id, activo: estado});
        await activityRecent(req, {estado: 'Exitoso', accion: 'Suspendió el estado de un cliente.'});
        return res.status(200).json(cliente);

    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Fallido', accion: 'Falló al suspender el estado de un cliente.'});
        return res.status(500).json({msg: 'Error al suspender el cliente.'})
    }
};

export const modificarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, telefono, tipo_cliente, direccion, ciudad, pais, codigo_postal, notas, es_vip, provincia } = req.body

        if (!nombre || !apellido || !telefono || !tipo_cliente || !direccion || !ciudad || !pais || !codigo_postal || !provincia) {
           return res.status(400).json({msg: 'No debes envíar ningun campo vacío.'}); 
        }

        const clienteModificado = await editarClientes({id, nombre, apellido, telefono, tipo_cliente, direccion, ciudad, pais, codigo_postal, notas, es_vip})
        await activityRecent(req, {estado: 'Exitoso', accion: 'Modificó el estado de un cliente.'});
        return res.status(200).json({msg: 'Cliente modificado exitosamente.', clienteModificado});
    } catch (error) {
        console.error(error);
        await activityRecent(req, {estado: 'Exitoso', accion: 'Falló al modificar un cliente.'});
        return res.status(500).json({msg: 'Error al editar el cliente.'});
        
    }
}

export const estadisticasClientes = async (req, res) => {

    try {
        const { scope } = req.query;
        const alta = scope === 'alta';
        const gestion = scope === 'gestion';
        
        const estadisticas = await obtenerEstadisticasClientes({ alta, gestion })
    
        if (!estadisticas) throw new Error('Error al obtener las estadisticas');
    
        res.json(estadisticas);
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error interno'});
    }
}