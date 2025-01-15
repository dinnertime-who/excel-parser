use std::fs;
use std::env;
use tauri::command;

#[command]
fn download_file(file_bytes: Vec<u8>, file_name: String) -> Result<(), String> {
    // 다운로드 폴더 경로 설정
    let output_path = env::var("HOME").unwrap_or_else(|_| "./".to_string()) + "/Downloads/" + &file_name;
    fs::write(output_path, file_bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
