use calamine::{open_workbook_auto, Reader};
use xlsxwriter::*;
use std::fs;
use std::env;
use tauri::command;

#[command]
fn process_excel_from_upload(file_bytes: Vec<u8>, file_name: String) -> Result<String, String> {
    // 업로드된 파일을 임시 파일로 저장
    let temp_file_path = env::temp_dir().join(file_name);
    if let Err(e) = fs::write(&temp_file_path, file_bytes) {
        return Err(format!("파일 저장 실패: {}", e));
    }

    // 다운로드 폴더 경로 설정
    let output_path = env::var("HOME").unwrap_or_else(|_| "./".to_string()) + "/Downloads/gimhae_members_valid.xlsx";

    // 첫 번째 시트를 가져오기
    let sheet = get_first_sheet(temp_file_path.to_str().unwrap()).ok_or_else(|| "파일을 읽을 수 없습니다.".to_string())?;

    // 필터링된 행 가져오기
    let rows = filter_rows(sheet);

    // 결과 엑셀 파일 생성
    match make_excel_from_json(rows, &output_path) {
        Ok(_) => Ok(output_path),
        Err(e) => Err(format!("엑셀 파일 생성 중 오류 발생: {}", e)),
    }
}

fn get_first_sheet(file_path: &str) -> Option<Vec<Vec<String>>> {
    // 파일 존재 여부 확인
    if !fs::metadata(file_path).is_ok() {
        eprintln!("파일이 존재하지 않습니다: {}", file_path);
        return None;
    }

    // 엑셀 파일 읽기
    let mut workbook = match open_workbook_auto(file_path) {
        Ok(wb) => wb,
        Err(e) => {
            eprintln!("엑셀 파일을 읽는 도중 오류가 발생했습니다: {}", e);
            return None;
        }
    };

    if let Some(Ok(range)) = workbook.worksheet_range_at(0) {
        // 데이터를 2D 벡터로 변환
        let data = range
            .rows()
            .map(|row| row.iter().map(|cell| cell.to_string()).collect::<Vec<String>>())
            .collect();
        return Some(data);
    }

    eprintln!("엑셀 시트가 없습니다.");
    None
}

fn filter_rows(rows: Vec<Vec<String>>) -> Vec<Vec<String>> {
    if rows.is_empty() {
        return vec![];
    }

    // 첫 번째 행(헤더)에서 "휴대폰번호" 컬럼의 인덱스 찾기
    let header = &rows[0];
    let phone_column_index = header.iter().position(|col| col == "휴대폰번호");

    match phone_column_index {
        Some(index) => rows
            .into_iter()
            .skip(1) // 헤더 제외
            .filter(|row| {
                if let Some(phone) = row.get(index) {
                    phone.starts_with("01")
                } else {
                    false
                }
            })
            .collect(),
        None => {
            eprintln!("'휴대폰번호' 컬럼을 찾을 수 없습니다.");
            vec![]
        }
    }
}

fn make_excel_from_json(data: Vec<Vec<String>>, output_path: &str) -> Result<(), XlsxError> {
    let workbook_result = Workbook::new(output_path);
    let workbook = match workbook_result {
        Ok(wb) => wb,
        Err(e) => return Err(e),
    };

    let mut sheet = workbook.add_worksheet(None)?;

    for (row_idx, row) in data.iter().enumerate() {
        for (col_idx, cell) in row.iter().enumerate() {
            sheet.write_string(row_idx as u32, col_idx as u16, cell, None)?;
        }
    }

    workbook.close()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![process_excel_from_upload])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
