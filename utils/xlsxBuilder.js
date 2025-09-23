import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";

export const BuildXslx = async ({ title, columns, rows, outPath, summary }) => {
  const wb = new ExcelJS.Workbook();
  const worksheet = wb.addWorksheet(title || "Reporte");

  worksheet.columns = columns.map(({ header, key, width, style, hidden, outlineLevel }) => ({
    header,
    key,
    width: width ?? 18,
    style,
    hidden: hidden ?? false,
    outlineLevel
  }));
  
  if (Array.isArray(rows)) worksheet.addRows(rows);
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "left" };
      });
    }
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + worksheet.columnCount)}1`,
  };

  // if (summary) {

  // }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await wb.xlsx.writeFile(outPath);
  return outPath;
};
