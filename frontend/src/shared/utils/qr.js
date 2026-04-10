import { normalizeTrimmedText, normalizeUpperText } from './text';

export const parseQRPayload = (value) => {
  const raw = normalizeTrimmedText(value);
  if (!raw) {
    return { ok: false, error: 'QR vacio' };
  }

  const normalized = raw.replace(/\r/g, '');
  const parts = normalized.split(',');
  const tokens = parts
    .map((item) => normalizeTrimmedText(item).replace(/,+$/, ''))
    .filter((item) => item.length > 0);

  if (tokens.length === 1) {
    return {
      ok: true,
      partial: true,
      data: { codigo: normalizeUpperText(tokens[0]) }
    };
  }

  if (tokens.length < 5) {
    return {
      ok: false,
      error: 'QR invalido: se esperan 5 campos (codigo, tipo_maquina, marca, descripcion, ubicacion)'
    };
  }

  const codigo = normalizeUpperText(tokens[0]);
  const tipo_maquina = normalizeUpperText(tokens[1]);
  const marca = normalizeUpperText(tokens[2]);
  const ubicacion = normalizeUpperText(tokens[tokens.length - 1]);
  const descripcion = normalizeUpperText(tokens.slice(3, tokens.length - 1).join(','));

  if (!codigo || !tipo_maquina || !marca || !descripcion || !ubicacion) {
    return { ok: false, error: 'QR invalido: campos vacios' };
  }

  const ubicacionMatch = ubicacion.match(/^([A-H])\s*(\d+)$/);
  if (!ubicacionMatch) {
    return { ok: false, error: 'Ubicacion invalida. Usa A1, A2, B1...' };
  }

  const numero = Number(ubicacionMatch[2]);
  if (!Number.isInteger(numero) || numero <= 0) {
    return { ok: false, error: 'Numero de ubicacion invalido' };
  }

  const letra = ubicacionMatch[1];
  return {
    ok: true,
    data: {
      codigo,
      tipo_maquina,
      marca,
      descripcion,
      ubicacion: `${letra}${numero}`,
      ubicacion_letra: letra,
      ubicacion_numero: numero
    }
  };
};
