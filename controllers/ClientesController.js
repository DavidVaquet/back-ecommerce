import express from 'express';
import { altaCliente, buscarCliente, obtenerClienteActivo } from '../models/clientesModel.js';

export const crearCliente = async (req, res) => {

    try {
        const { nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas } = req.body
        
        if (!nombre || !apellido || !email || !telefono) {
            return res.status(400).json({msg: 'Campos obligatorios: nombre, apellido, email, telefono.'})
        }

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

export const clientesActivos = async (req, res) => {
    try {
        const clienteOn = await obtenerClienteActivo();
        return res.status(200).json(clienteOn)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener los clientes activos.'})
    }
}