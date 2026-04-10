const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

export const canonicalizeUnicode = (value) =>
  String(value === null || value === undefined ? '' : value).normalize('NFKC');

export const normalizeTrimmedText = (value) => canonicalizeUnicode(value).trim();

export const normalizeUpperText = (value) => normalizeTrimmedText(value).toUpperCase();

export const normalizeSearchText = (value) =>
  canonicalizeUnicode(value)
    .toUpperCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS_REGEX, '')
    .replace(/[^A-Z0-9]/g, '');
