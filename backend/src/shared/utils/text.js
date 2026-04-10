const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

const canonicalizeUnicode = (value) =>
  String(value === null || value === undefined ? '' : value).normalize('NFKC');

const normalizeTrimmedText = (value) => canonicalizeUnicode(value).trim();

const normalizeUpperText = (value) => normalizeTrimmedText(value).toUpperCase();

const normalizeSearchText = (value) =>
  canonicalizeUnicode(value)
    .toUpperCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS_REGEX, '')
    .replace(/[^A-Z0-9]/g, '');

const normalizeHeaderKey = (value) =>
  canonicalizeUnicode(value)
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

module.exports = {
  COMBINING_MARKS_REGEX,
  canonicalizeUnicode,
  normalizeTrimmedText,
  normalizeUpperText,
  normalizeSearchText,
  normalizeHeaderKey
};
