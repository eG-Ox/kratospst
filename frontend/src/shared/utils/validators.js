import { normalizeTrimmedText } from './text';

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => password.length >= 6;

export const validateRequired = (value) => normalizeTrimmedText(value).length > 0;

export const validateNumber = (value) => !Number.isNaN(value) && value !== '';

export const validatePositiveNumber = (value) =>
  validateNumber(value) && parseFloat(value) > 0;
