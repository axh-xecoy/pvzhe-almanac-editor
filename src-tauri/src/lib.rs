// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use rfd::FileDialog;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct OpenFileResult {
    path: String,
    content: String,
}

#[tauri::command]
async fn open_csv_file() -> Result<Option<OpenFileResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = FileDialog::new().add_filter("CSV", &["csv"]).pick_file();
        let Some(path) = path else {
            return Ok(None);
        };

        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(Some(OpenFileResult {
            path: path.to_string_lossy().to_string(),
            content,
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_csv_file(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || fs::write(path, content))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_csv_file_as(content: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = FileDialog::new().add_filter("CSV", &["csv"]).save_file();
        let Some(path) = path else {
            return Ok(None);
        };

        fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_png_file_as(content_base64: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = FileDialog::new().add_filter("PNG", &["png"]).save_file();
        let Some(path) = path else {
            return Ok(None);
        };

        let bytes = general_purpose::STANDARD
            .decode(content_base64)
            .map_err(|e| e.to_string())?;
        fs::write(&path, bytes).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_csv_file,
            save_csv_file,
            save_csv_file_as,
            save_png_file_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
