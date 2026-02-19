import {
  agencias,
  buildMatchKey,
  estadosEnvio,
  normalizarClaveLocal
} from './ventasUtils';

describe('ventasUtils', () => {
  test('buildMatchKey prioriza producto_id', () => {
    expect(buildMatchKey({ producto_id: 15, codigo: 'AB-1' })).toBe('PID:15');
  });

  test('buildMatchKey usa codigo/descripcion normalizado cuando no hay producto_id', () => {
    expect(buildMatchKey({ codigo: 'ab-1 / x' })).toBe('KEY:AB1X');
    expect(buildMatchKey({ descripcion: 'Motor 2T' })).toBe('KEY:MOTOR2T');
  });

  test('normalizarClaveLocal remueve caracteres no alfanumericos', () => {
    expect(normalizarClaveLocal(' a-b/1 ')).toBe('AB1');
  });

  test('constantes incluyen valores esperados', () => {
    expect(agencias).toContain('SHALOM');
    expect(estadosEnvio).toContain('PENDIENTE');
  });
});
