use std::fs;
use std::env;

use tauri::command;

#[command]
fn download_file(file_bytes: Vec<u8>, file_name: String) -> Result<String,String> {
    // 다운로드 폴더 경로 설정
    let output_dir = dirs::download_dir().ok_or("Failed to get home directory")?;
    let output_path = output_dir.join(file_name);

    fs::write(&output_path, file_bytes).map_err(|e| e.to_string())?;
    Ok(output_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
