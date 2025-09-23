import pool from '../config/db.js';

export const getVentasDataset = async ({ fromUtc, toUtc, filters = {} }) => {
  
  const params = [];
  const where = [];

  if (fromUtc != null) {
    params.push(fromUtc);
    where.push(`fecha_utc >= $${params.length}`);
  }
  if (toUtc != null) {
    params.push(toUtc);
    where.push(`fecha_utc <= $${params.length}`);
  }
  
  if (filters?.categoria_id != null) {
    params.push(filters.categoria_id);
    where.push(`categoria_id = $${params.length}`);
  }
  
  if (filters?.subcategoria_id != null) {
    params.push(filters.subcategoria_id);
    where.push(`subcategoria_id = $${params.length}`);
  }
  
  console.log(params);
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
  SELECT 
  fecha_utc,
  fecha_local,
  producto_id,
  venta_id,
  producto_nombre,
  categoria_nombre,
  subcategoria_nombre,
  cantidad,
  impuestos,
  descuento,
  precio_unitario,
  importe_bruto,
  margen_unitario,
  margen_total,
  total_item
  FROM reporting.ventas_detalles_completo
  ${whereSql}
  ORDER BY fecha_utc DESC;
  `;

  const { rows: data } = await pool.query(sql, params);
  const rows = data.map(d => ({
    ...d,
    descuento: d.descuento ? Number(d.descuento) : null,
    impuestos: d.impuestos ? Number(d.impuestos) : null,
    importe_bruto: d.importe_bruto ? Number(d.importe_bruto) : null,
    precio_unitario: d.precio_unitario ? Number(d.precio_unitario) : null,
    margen_unitario: d.margen_unitario ? Number(d.margen_unitario) : null,
    margen_total: d.margen_total ? Number(d.margen_total) : null,
    total_item: d.total_item ? Number(d.total_item) : null,
  }))
  const totalsSql = `
    SELECT 
      COALESCE(SUM(cantidad), 0)        AS cantidad,
      COALESCE(SUM(importe_bruto), 0)   AS importe_bruto,
      COALESCE(SUM(margen_total), 0)    AS margen_total,
      COALESCE(SUM(total_item), 0)      AS total_item,
      COALESCE(SUM(venta_id), 0)        AS total_ventas
    FROM reporting.ventas_detalles_completo
    ${whereSql};
  `;
  const { rows: sumRows } = await pool.query(totalsSql, params);
  const totals = sumRows[0];

  const COLUMNS_VENTAS = [
    { header: 'Fecha',            key: 'fecha_local',         width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'ID Venta',         key: 'venta_id',       width: 12, style: { numFmt: '0' } },
    { header: 'ID Producto',      key: 'producto_id',       width: 14, style: { numFmt: '0' } },
    { header: 'Producto',         key: 'producto_nombre',   width: 24 },
    { header: 'Categoría',        key: 'categoria_nombre',  width: 16 },
    { header: 'Subcategoría',     key: 'subcategoria_nombre', width: 16 },
    { header: 'Cantidad',         key: 'cantidad',          width: 12, style: { numFmt: '0' } },
    { header: 'Precio Unitario',  key: 'precio_unitario',   width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Descuento',        key: 'descuento',     width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Impuestos',        key: 'impuestos',     width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Importe Bruto',    key: 'importe_bruto',     width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Total Ítem',       key: 'total_item',        width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Margen Unitario',  key: 'margen_unitario',   width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Margen Total',     key: 'margen_total',      width: 16, style: { numFmt: '#,##0.00' } },
  ];

  return {
    title: 'Ventas detalladas',    
    columns: COLUMNS_VENTAS,
    rows,
    summary: {
      label: 'TOTAL',
      values: {
        cantidad:       Number(totals.cantidad),
        importe_bruto:  Number(totals.importe_bruto),
        margen_total:   Number(totals.margen_total),
        total_item:     Number(totals.total_item),
        venta_id:       Number(totals.total_ventas)
      }
    },
    meta: { fromUtc, toUtc, filters }
  };
};


export const getClientesDataset = async ({ fromUtc, toUtc, filters = {} }) => {

    const params = [fromUtc, toUtc];
    const where = [`fecha_utc BETWEEN $1 AND $2`];

    if (filters.categoria_id !== null && filters.categoria_id !== undefined) {
      params.push(filters.categoria_id);
      where.push(`EXISTS (
        SELECT 1
        FROM ventas_detalle vd
        JOIN products p        ON p.id = vd.producto_id
        JOIN subcategories sb  ON sb.id = p.subcategoria_id
        JOIN categories ct     ON ct.id = sb.categoria_id
        WHERE vd.venta_id = vb.venta_id
          AND ct.id = $${params.length}
      )`);
    }

    const sql = `
      SELECT *
      FROM reporting.clientes_ventas_base vb
      WHERE ${where.join(' AND ')}
      ORDER BY vb.fecha_utc DESC, vb.venta_id DESC
    `;

    const { rows } = await pool.query(sql, params);
    const data = rows.map(r =>({
      ...r,
      origen: r.origen === 'manual' ? 'Tienda' : 'Ecommerce',
      total_venta: r.total_venta ? Number(r.total_venta) : null
    }));

    const COLUMNS_CLIENTES_COMPRAS = [
        { header: 'Fecha', key: 'fecha_utc', width: 12, style: {numFmt: 'dd/mm/yyyy'}},
        { header: 'ID', key: 'cliente_id', width: 10, style: { numFmt: '0' }},
        { header: 'Nombre', key: 'cliente_nombre', width: 24},
        { header: 'Email', key: 'email', width: 24},
        { header: 'Telefono', key: 'telefono', width: 24},
        { header: 'Venta ID', key: 'venta_id', width: 12, style: { numFmt: '0' }},
        { header: 'Origen', key: 'origen', width: 24},
        { header: 'Total', key: 'total_venta', width: 20, style: { numFmt: '#,##0.00' }}
    ];

    const totalPeriodo = data.reduce((acc, r) => acc + Number(r.total_venta || 0), 0)

    return {
        title: 'Clientes con compras',
        columns: COLUMNS_CLIENTES_COMPRAS,
        rows: data,
        summary: {
            label: 'TOTAL DEL PERÍODO',
            values: { total_venta: totalPeriodo }
        }
    };

}

export const getProductosCriticosDataset = async ({ filters = {} }) => {

    const params = [];
    const where = [];
    let i = 1;

    if (filters.categoria_id) {
        where.push(`categoria_id = $${i++}`);
        params.push(filters.categoria_id);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
    SELECT 
    producto_id, 
    nombre, 
    precio_costo, 
    categoria_nombre, 
    subcategoria_nombre, 
    cantidad_actual, 
    cantidad_minima
    FROM reporting.productos_criticos
    ${whereSql}
    ORDER BY producto_id ASC;
    `;
    
    const { rows: data } = await pool.query(sql, params);
    const rows = data.map(d => ({
      ...d,
      precio_costo: d.precio_costo ? Number(d.precio_costo) : null
    }))

    const { rows: sumRows} = await pool.query(`
        SELECT COALESCE(SUM(valor_inventario), 0)
        FROM reporting.productos_criticos
        ${whereSql}`, params);
    let totalInv = Number(sumRows[0].valor_inventario);

    const COLUMNS_PRODUCTOS_CRITICOS = [
        { header: 'ID', key: 'producto_id', width: 10, style: { numFmt: '0' }},
        { header: 'Producto', key: 'nombre', width: 24},
        { header: 'Categoría', key: 'categoria_nombre', width: 20},
        { header: 'Subcategoría', key: 'subcategoria_nombre', width: 20},
        { header: 'Stock Minimo', key: 'cantidad_minima', width: 16, style: { numFmt: '0'} },
        { header: 'Stock Actual', key: 'cantidad_actual', width: 16, style: { numFmt: '0'} },
        { header: 'Costo', key: 'precio_costo', width: 18, style: {numFmt: '#,##0.00'}}
    ];

    return {
        title: 'Productos críticos',
        columns: COLUMNS_PRODUCTOS_CRITICOS,
        rows,
        summary: {
            label: where.length > 0 ? 'TOTAL (filtrados)' : 'TOTAL',
            values: { valor_inventario: totalInv }
        }
    };
}

export const getValorTotalInventarioDataset = async ({ filters = {} }) => {
    
    const where = [];
    const params = [];

    if (filters.categoria_id != null ) {
        params.push(filters.categoria_id);
        where.push(`categoria_id = $${params.length}`);

    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
    SELECT
    producto_id,
    nombre,
    precio_costo,
    categoria_nombre,
    categoria_id,
    subcategoria_nombre,
    cantidad_actual,
    cantidad_minima,
    valor_inventario
    FROM reporting.valor_total_inventario
    ${whereSql}
    `;

    const { rows: data } = await pool.query(sql, params);
    const rows = data.map(d => ({
      ...d,
      precio_costo: d.precio_costo ? Number(d.precio_costo) : null,
      valor_inventario: d.valor_inventario ? Number(d.valor_inventario) : null,
    }))

    const { rows: sumRows } = await pool.query(`SELECT COALESCE(SUM(valor_inventario), 0) as valor_total_inventario
         FROM reporting.valor_total_inventario
         ${whereSql}`, params);

    const totalInv = Number(sumRows[0].valor_total_inventario);

    const COLUMNS_VALOR_INVENTARIO = [
        { header: 'ID', key: 'producto_id', width: 10, style: { numFmt: '0' }},
        { header: 'Producto', key: 'nombre', width: 24},
        { header: 'Categoría', key: 'categoria_nombre', width: 20},
        { header: 'Subcategoría', key: 'subcategoria_nombre', width: 20},
        { header: 'Stock Minimo', key: 'cantidad_minima', width: 16, style: { numFmt: '0'}},
        { header: 'Stock Actual', key: 'cantidad_actual', width: 16, style: { numFmt: '0'} },
        { header: 'Costo', key: 'precio_costo', width: 18, style: { numFmt: '#,##0.00' }},
        { header: 'Valor', key: 'valor_inventario', width: 18, style: { numFmt: '#,##0.00' }}
    ];

    return {
        title: 'Valor del inventario',
        columns: COLUMNS_VALOR_INVENTARIO, 
        rows,
        summary: {
            label: where.length > 0 ? 'TOTAL (filtrado)' : 'TOTAL',
            values: { valor_inventario: totalInv }
        }
    };

};

export const getMovimientosDataset = async ({ fromUtc, toUtc, filters = {} }) => {

    const params = [fromUtc, toUtc];
    const where = ['fecha BETWEEN $1 AND $2'];

    if (filters.tipo_id) {
        params.push(filters.tipo_id);
        where.push(`tipo_id = $${params.length}`);
    };

    const sql = `
    SELECT
    fecha,
    movimiento_id,
    user_nombre,
    nombre,
    movimiento,
    cantidad_movimiento::int as cantidad_movimiento,
    stock_anterior::int as stock_anterior,
    stock_actual::int as stock_actual,
    documento,
    cliente
    FROM reporting.movimientos_stock
    WHERE ${where.join(' AND ')}
    ORDER BY fecha DESC, movimiento_id DESC;
    `

    const { rows } = await pool.query(sql, params);

    const COLUMNS_MOVIMIENTOS = [
        { header: 'Fecha', key: 'fecha', width: 12, type: 'date'},
        { header: 'ID', key: 'movimiento_id', width: 10, style: { numFmt: '0' }},
        { header: 'Producto', key: 'nombre', width: 24},
        { header: 'Tipo', key: 'movimiento', width: 20},
        { header: 'Cantidad', key: 'cantidad_movimiento', width: 12, style: { numFmt: '0' }},
        { header: 'Stock Anterior', key: 'stock_anterior', width: 16, style: { numFmt: '0' }},
        { header: 'Stock Actual', key: 'stock_actual', width: 16, style: { numFmt: '0' }},
        { header: 'Documento', key: 'documento', width: 14},
        { header: 'Cliente', key: 'cliente', width: 20},
        { header: 'Usuario', key: 'user_nombre', width: 20}
    ];

    return {
        title: 'Movimientos de stock',
        columns: COLUMNS_MOVIMIENTOS,
        rows
    };
}

