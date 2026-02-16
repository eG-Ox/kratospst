const assert = require('node:assert/strict');

const { AUTH_COOKIE_NAME, parseCookies, obtenerToken } = require('../src/core/middleware/auth');
const {
  isNonEmptyString,
  normalizeString,
  isEmail,
  toNumber,
  isPositiveInt,
  isNonNegative,
  validateDocumento
} = require('../src/shared/utils/validation');

let failed = 0;

const run = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
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

if (failed > 0) {
  process.exitCode = 1;
}
