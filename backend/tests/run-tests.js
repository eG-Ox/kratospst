const assert = require('node:assert/strict');

const { AUTH_COOKIE_NAME, parseCookies, obtenerToken } = require('../src/core/middleware/auth');
const pool = require('../src/core/config/database');
const { sanitizeForHistory } = require('../src/shared/utils/historial');
const {
  isNonEmptyString,
  normalizeString,
  isEmail,
  isUsuarioIdentificador,
  toNumber,
  isPositiveInt,
  isNonNegative,
  validateDocumento
} = require('../src/shared/utils/validation');
const cotizacionesController = require('../src/modules/cotizaciones/controller');
const { _test: cotizacionesTest = {} } = require('../src/modules/cotizaciones/controller');
const { validarItemsCotizacion } = cotizacionesTest;
const ventasController = require('../src/modules/ventas/controller');
const clientesController = require('../src/modules/clientes/controller');

let failed = 0;
const tests = [];

const run = (name, fn) => {
  tests.push({ name, fn });
};

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

const withMockedConnection = async (connection, fn) => {
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async () => connection;
  try {
    await fn();
  } finally {
    pool.getConnection = originalGetConnection;
  }
};

run('parseCookies decodifica pares cookie=valor', () => {
  const cookies = parseCookies(`${AUTH_COOKIE_NAME}=abc%20123; theme=light`);
  assert.equal(cookies[AUTH_COOKIE_NAME], 'abc 123');
  assert.equal(cookies.theme, 'light');
});

run('obtenerToken prioriza Authorization', () => {
  const req = {
    headers: {
      authorization: 'Bearer token-header',
      cookie: `${AUTH_COOKIE_NAME}=token-cookie`
    }
  };
  assert.equal(obtenerToken(req), 'token-header');
});

run('obtenerToken usa cookie cuando no hay Authorization', () => {
  const req = {
    headers: {
      cookie: `foo=bar; ${AUTH_COOKIE_NAME}=token-cookie`
    }
  };
  assert.equal(obtenerToken(req), 'token-cookie');
});

run('parseCookies tolera valores mal codificados', () => {
  const cookies = parseCookies(`${AUTH_COOKIE_NAME}=%E0%A4%A; foo=bar`);
  assert.equal(cookies[AUTH_COOKIE_NAME], '%E0%A4%A');
  assert.equal(cookies.foo, 'bar');
});

run('obtenerToken retorna null cuando no hay credenciales', () => {
  const req = { headers: {} };
  assert.equal(obtenerToken(req), null);
});

run('validation.isEmail valida formato basico', () => {
  assert.equal(isEmail('admin@kratos.pe'), true);
  assert.equal(isEmail('admin'), false);
});

run('validation.isUsuarioIdentificador acepta usuario y email', () => {
  assert.equal(isUsuarioIdentificador('vendedor01'), true);
  assert.equal(isUsuarioIdentificador('vendedor.01'), true);
  assert.equal(isUsuarioIdentificador('vendedor@kratos.pe'), true);
  assert.equal(isUsuarioIdentificador('vendedor con espacios'), false);
  assert.equal(isUsuarioIdentificador('vendedor@'), false);
});

run('validation.normalizeString recorta espacios', () => {
  assert.equal(normalizeString('  KRATOS  '), 'KRATOS');
});

run('validation.isNonEmptyString detecta vacios', () => {
  assert.equal(isNonEmptyString('abc'), true);
  assert.equal(isNonEmptyString('   '), false);
});

run('validation.toNumber convierte y filtra invalidos', () => {
  assert.equal(toNumber('10.5'), 10.5);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('abc'), null);
});

run('validation.isPositiveInt valida enteros positivos', () => {
  assert.equal(isPositiveInt(1), true);
  assert.equal(isPositiveInt(0), false);
  assert.equal(isPositiveInt(1.5), false);
});

run('validation.isNonNegative valida no negativos', () => {
  assert.equal(isNonNegative(0), true);
  assert.equal(isNonNegative(10), true);
  assert.equal(isNonNegative(-1), false);
});

run('validation.validateDocumento valida DNI y RUC', () => {
  assert.equal(validateDocumento('dni', '12345678'), true);
  assert.equal(validateDocumento('dni', '1234'), false);
  assert.equal(validateDocumento('ruc', '12345678901'), true);
  assert.equal(validateDocumento('ruc', '123'), false);
});

run('historial.sanitizeForHistory oculta campos sensibles', () => {
  const sanitized = sanitizeForHistory({
    nombre: 'Admin',
    contrasena: 'plaintext',
    token: 'abc',
    nested: {
      password: '123'
    }
  });
  assert.equal(sanitized.nombre, 'Admin');
  assert.equal(sanitized.contrasena, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.nested.password, '[REDACTED]');
});

run('cotizaciones.validarItemsCotizacion acepta items validos', () => {
  assert.equal(typeof validarItemsCotizacion, 'function');
  const error = validarItemsCotizacion([
    { cantidad: 1, precio_unitario: 10, precio_regular: 12 },
    { cantidad: 2, precio_unitario: 0, precio_regular: 0 }
  ]);
  assert.equal(error, null);
});

run('cotizaciones.validarItemsCotizacion rechaza cantidades invalidas', () => {
  const error = validarItemsCotizacion([{ cantidad: 0, precio_unitario: 10, precio_regular: 10 }]);
  assert.equal(error, 'Cantidad invalida en cotizacion');
});

run('cotizaciones.validarItemsCotizacion rechaza precios negativos', () => {
  const error = validarItemsCotizacion([{ cantidad: 1, precio_unitario: -1, precio_regular: 10 }]);
  assert.equal(error, 'Precio invalido en cotizacion');
});

run('cotizaciones.formularioCotizaciones filtra clientes por cartera para no-admin', async () => {
  let call = 0;
  let primeraQuery = '';
  let primeraParams = [];
  const connection = {
    execute: async (query, params = []) => {
      call += 1;
      if (call === 1) {
        primeraQuery = query;
        primeraParams = params;
        return [[{ id: 2, nombre: 'Cliente compartido' }]];
      }
      if (call === 2) {
        return [[{ id: 1, nombre: 'MOTOSIERRAS' }]];
      }
      return [[{ id: 10, total: 100 }]];
    },
    release: () => {}
  };
  const req = { usuario: { id: 5, rol: 'ventas' } };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await cotizacionesController.formularioCotizaciones(req, res);
  });

  assert.equal(res.statusCode, 200);
  assert.match(primeraQuery, /LEFT JOIN clientes_usuarios/i);
  assert.deepEqual(primeraParams, [5, 5]);
});

run('ventas.actualizarEstadoVenta retorna 404 cuando no existe venta', async () => {
  let call = 0;
  const connection = {
    execute: async () => {
      call += 1;
      if (call === 1) return [[]];
      return [{ affectedRows: 0 }];
    },
    release: () => {}
  };
  const req = {
    params: { id: '9999' },
    body: { estadoEnvio: 'PENDIENTE', fechaDespacho: null, fechaCancelacion: null, rastreoEstado: null }
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.actualizarEstadoVenta(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Venta no encontrada');
});

run('ventas.actualizarEnvioVenta retorna 404 cuando no existe venta', async () => {
  const connection = {
    execute: async () => [{ affectedRows: 0 }],
    release: () => {}
  };
  const req = {
    params: { id: '9999' },
    body: { ticket: '1', guia: '2', retiro: '3', rastreoEstado: 'pendiente' }
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.actualizarEnvioVenta(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Venta no encontrada');
});

run('ventas.listarDetalleVentas oculta precioCompra cuando no hay permiso', async () => {
  const connection = {
    execute: async () => [[{
      venta_id: 1,
      producto_id: 2,
      tipo: 'producto',
      codigo: 'P001',
      descripcion: 'Producto',
      marca: 'M1',
      cantidad: 1,
      precio_venta: 50,
      precio_compra: 30,
      proveedor: 'ABC',
      fecha_venta: '2026-02-01',
      created_at: '2026-02-01'
    }]],
    release: () => {}
  };
  const req = { query: {}, permisosCargados: true, permisos: new Set() };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.listarDetalleVentas(req, res);
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.[0]?.precioCompra, null);
});

run('ventas.listarDetalleVentas muestra precioCompra con permiso', async () => {
  const connection = {
    execute: async () => [[{
      venta_id: 1,
      producto_id: 2,
      tipo: 'producto',
      codigo: 'P001',
      descripcion: 'Producto',
      marca: 'M1',
      cantidad: 1,
      precio_venta: 50,
      precio_compra: 30,
      proveedor: 'ABC',
      fecha_venta: '2026-02-01',
      created_at: '2026-02-01'
    }]],
    release: () => {}
  };
  const req = {
    query: {},
    permisosCargados: true,
    permisos: new Set(['productos.precio_compra.ver'])
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.listarDetalleVentas(req, res);
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.[0]?.precioCompra, 30);
});

run('ventas.actualizarRequerimiento retorna 400 cuando detalle existe pero no es requerimiento', async () => {
  const connection = {
    execute: async () => {
      return [[{ id: 12, tipo: 'producto' }]];
    },
    release: () => {}
  };
  const req = {
    params: { id: '12' },
    body: { proveedor: 'ABC', precioCompra: 10, precioVenta: 20 }
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.actualizarRequerimiento(req, res);
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.error, 'Solo se pueden actualizar items de tipo requerimiento.');
});

run('ventas.actualizarRequerimiento retorna 404 cuando detalle no existe', async () => {
  const connection = {
    execute: async () => {
      return [[]];
    },
    release: () => {}
  };
  const req = {
    params: { id: '13' },
    body: { proveedor: 'ABC', precioCompra: 10, precioVenta: 20 }
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.actualizarRequerimiento(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Detalle no encontrado');
});

run('ventas.crearVenta rechaza estadoEnvio invalido', async () => {
  const req = {
    usuario: { id: 1, rol: 'ventas' },
    body: {
      documentoTipo: 'dni',
      documento: '12345678',
      agencia: 'SHALOM',
      estadoEnvio: 'INVALIDO',
      productos: [{ codigo: 'P1', cantidad: 1, precioVenta: 10, precioCompra: 5 }]
    }
  };
  const res = createMockRes();
  await ventasController.crearVenta(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.error, 'Estado de envio invalido');
});

run('ventas.actualizarEstadoVenta valida enum de estado', async () => {
  const req = {
    params: { id: '1' },
    body: { estadoEnvio: 'NO_VALIDO' }
  };
  const res = createMockRes();
  await ventasController.actualizarEstadoVenta(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.error, 'Estado de envio invalido');
});

run('ventas.cerrarPedido retorna 404 y rollback si la venta no existe', async () => {
  let rolledBack = false;
  let committed = false;
  const connection = {
    beginTransaction: async () => {},
    execute: async () => [[]],
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolledBack = true;
    },
    release: () => {}
  };
  const req = { body: { ventaId: 123 } };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await ventasController.cerrarPedido(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Venta no encontrada');
  assert.equal(rolledBack, true);
  assert.equal(committed, false);
});

run('clientes.eliminarCliente retorna 404 para no revelar existencia sin acceso', async () => {
  let call = 0;
  let rolledBack = false;
  const connection = {
    beginTransaction: async () => {},
    execute: async () => {
      call += 1;
      if (call === 1) {
        return [[{ id: 77, usuario_id: 10 }]];
      }
      if (call === 2) {
        return [[]];
      }
      return [[]];
    },
    rollback: async () => {
      rolledBack = true;
    },
    commit: async () => {},
    release: () => {}
  };
  const req = {
    params: { id: '77' },
    usuario: { id: 22, rol: 'ventas' }
  };
  const res = createMockRes();

  await withMockedConnection(connection, async () => {
    await clientesController.eliminarCliente(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Cliente no encontrado');
  assert.equal(rolledBack, true);
});

(async () => {
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
})();
