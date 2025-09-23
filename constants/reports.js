import { getClientesDataset, getMovimientosDataset, getProductosCriticosDataset, getVentasDataset, getValorTotalInventarioDataset } from "../models/reports-datasets.js";

export const REPORT_TYPES = new Set(['inventario', 'ventas', 'productos_criticos', 'movimientos', 'rentabilidad', 'clientes']);

export const REPORT_MAX_RANGE = 370;

export const REPORT_FORMAT = new Set(['pdf', 'xlsx']);

export const DATASETS = {
    inventario: getValorTotalInventarioDataset,
    clientes: getClientesDataset,
    movimientos: getMovimientosDataset,
    productos_criticos: getProductosCriticosDataset,
    ventas: getVentasDataset
};

export const TYPE_LABELS = {
  inventario: "Reporte de Inventario",
  ventas: "Reporte de Ventas",
  productos_criticos: "Productos Críticos",
  rentabilidad: "Análisis de Rentabilidad",
  clientes: "Reporte de Clientes",
  movimientos: "Movimientos del inventario",
};