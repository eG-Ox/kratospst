const ExcelJS = require('exceljs');

const valueToPrimitive = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.text) return value.text;
    if (value.richText) return value.richText.map((item) => item.text).join('');
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return value.result;
    if (Object.prototype.hasOwnProperty.call(value, 'formula')) return value.result || '';
  }
  return value;
};

const addSheetFromObjects = (workbook, name, data, headers = null) => {
  const sheet = workbook.addWorksheet(name);
  const rows = Array.isArray(data) ? data : [];
  const columns = headers && headers.length
    ? headers
    : rows.length
      ? Object.keys(rows[0])
      : [];

  if (columns.length) {
    sheet.columns = columns.map((key) => ({ header: key, key }));
  }

  rows.forEach((row) => {
    if (columns.length) {
      const mapped = {};
      columns.forEach((key) => {
        mapped[key] = row[key];
      });
      sheet.addRow(mapped);
    } else {
      sheet.addRow(row);
    }
  });

  return sheet;
};

const workbookToBuffer = async (workbook) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const readFirstSheetToJson = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  let headers = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values.slice(1);
    if (rowNumber === 1) {
      headers = values.map((value) => String(valueToPrimitive(value) || '').trim());
      return;
    }
    const obj = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      obj[header] = valueToPrimitive(values[idx]);
    });
    rows.push(obj);
  });

  return rows;
};

module.exports = {
  ExcelJS,
  addSheetFromObjects,
  workbookToBuffer,
  readFirstSheetToJson
};
