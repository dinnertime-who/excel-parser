import { useRef } from 'react';
import './App.css';
import ExcelJS from 'exceljs';
import { invoke } from '@tauri-apps/api/core';

function worksheetToJson(worksheet: ExcelJS.Worksheet) {
  const data: Record<string, any>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowData: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const header = worksheet.getRow(1).getCell(colNumber).value;
      if (typeof header === 'string') {
        rowData[header] = cell.value;
      }
    });
    data.push(rowData);
  });

  return data;
}

const DILIVERY_CODE_MAP: Record<string, any> = {
  CJ대한통운: 2,
  우체국택배: 3,
  한진택배: 4,
  롯데택배: 5,
  로젠택배: 6,
  KG로지스: 7,
  CVSnet: 8,
  KGB택배: 9,
  경동택배: 10,
  대신택배: 11,
  일양로지스: 12,
  GTX로지스: 13,
  천일택배: 15,
  건영택배: 14,
  ['직접배송/수령']: 29,
  합동택배: 28,
  농협택배: 27,
};

async function getWorksheetFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  const readResult = await workbook.xlsx.load(arrayBuffer);

  const worksheet = readResult.getWorksheet(1);
  return worksheet;
}

function App() {
  const bosExcelInput = useRef<HTMLInputElement>(null);
  const erpExcelInput = useRef<HTMLInputElement>(null);

  async function processExcel() {
    if (!bosExcelInput.current || !bosExcelInput.current.files) return;
    if (!erpExcelInput.current || !erpExcelInput.current.files) return;

    const bosExcelFile = bosExcelInput.current.files[0];
    if (!bosExcelFile) return;

    const erpExcelFile = erpExcelInput.current.files[0];
    if (!erpExcelFile) return;

    const bosWorkSheet = await getWorksheetFromFile(bosExcelFile);
    const erpWorkSheet = await getWorksheetFromFile(erpExcelFile);

    if (!bosWorkSheet || !erpWorkSheet) return;

    const bosExcelData = worksheetToJson(bosWorkSheet);
    const erpExcelData = worksheetToJson(erpWorkSheet);

    const newWorkBook = new ExcelJS.Workbook();
    const worksheet = newWorkBook.addWorksheet('Sheet 1');
    worksheet.columns = Object.keys(bosExcelData[0]).map((key) => ({
      header: key,
      key,
    }));

    for (const row of bosExcelData) {
      const lookuped = erpExcelData.find((data, i) => {
        return `${data['주문상세번호']}` === `${row['품목별주문번호']}`;
      });

      if (!lookuped) {
        continue;
      }
      row['운송장번호'] = `${lookuped['송장번호']}`;
      row['배송사코드'] = DILIVERY_CODE_MAP[`${lookuped['택배사']}`] || 0;
      worksheet.addRow(row);
    }

    // 워크북을 ArrayBuffer로 변환
    const buffer = await newWorkBook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);

    await invoke('download_file', {
      fileBytes: uint8Array,
      fileName: `김해온몰_송장번호_매칭엑셀_${new Date().toLocaleString()}.xlsx`,
    });
  }

  return (
    <main className="container">
      <h1>송장 번호 매칭기</h1>

      <form
        className=""
        onSubmit={(e) => {
          e.preventDefault();
          processExcel();
        }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="">
          <label htmlFor="">BOS 주문엑셀</label>
          <input type="file" ref={bosExcelInput} />
        </div>
        <div className="">
          <label htmlFor="">ERP 주문엑셀</label>
          <input type="file" ref={erpExcelInput} />
        </div>
        <button type="submit">엑셀 처리하기</button>
      </form>
    </main>
  );
}

export default App;
