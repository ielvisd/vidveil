use tauri::command;
use std::path::PathBuf;
use std::fs;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MediaMetadata {
	pub duration: Option<f64>,
	pub width: Option<u32>,
	pub height: Option<u32>,
	pub codec: Option<String>,
	pub file_size: u64,
}

#[command]
pub fn get_media_files(directory: String) -> Result<Vec<String>, String> {
	let path = PathBuf::from(&directory);
	
	if !path.exists() {
		return Err(format!("Directory does not exist: {}", directory));
	}
	
	let entries = fs::read_dir(&path)
		.map_err(|e| format!("Failed to read directory: {}", e))?;
	
	let mut files = Vec::new();
	
	for entry in entries {
		let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
		let path = entry.path();
		
		if path.is_file() {
			if let Some(ext) = path.extension() {
				let ext_lower = ext.to_string_lossy().to_lowercase();
				if ext_lower == "mp4" || ext_lower == "mov" || ext_lower == "webm" || ext_lower == "avi" {
					if let Some(path_str) = path.to_str() {
						files.push(path_str.to_string());
					}
				}
			}
		}
	}
	
	Ok(files)
}

#[command]
pub fn validate_media_file(file_path: String) -> Result<bool, String> {
	let path = PathBuf::from(&file_path);
	
	if !path.exists() {
		return Err(format!("File does not exist: {}", file_path));
	}
	
	let ext = path.extension()
		.and_then(|e| e.to_str())
		.ok_or("Invalid file extension")?;
	
	let valid_extensions = ["mp4", "mov", "webm", "avi", "mkv"];
	let is_valid = valid_extensions.contains(&ext.to_lowercase().as_str());
	
	Ok(is_valid)
}

#[command]
pub fn get_file_size(file_path: String) -> Result<u64, String> {
	let path = PathBuf::from(&file_path);
	
	let metadata = fs::metadata(&path)
		.map_err(|e| format!("Failed to get file metadata: {}", e))?;
	
	Ok(metadata.len())
}

#[command]
pub fn create_temp_directory() -> Result<String, String> {
	use std::env;
	
	let temp_dir = env::temp_dir()
		.join("clipforge")
		.join(format!("recording_{}", 
			chrono::Utc::now().timestamp()));
	
	fs::create_dir_all(&temp_dir)
		.map_err(|e| format!("Failed to create temp directory: {}", e))?;
	
	temp_dir.to_str()
		.ok_or("Failed to convert path to string")?
		.to_string()
		.into()
}

#[command]
pub fn save_recording(
	content: Vec<u8>,
	file_name: String,
	output_dir: String
) -> Result<String, String> {
	let output_path = PathBuf::from(&output_dir).join(&file_name);
	
	fs::write(&output_path, content)
		.map_err(|e| format!("Failed to save recording: {}", e))?;
	
	output_path.to_str()
		.ok_or("Failed to convert path to string")?
		.to_string()
		.into()
}

#[command]
pub fn cleanup_temp_files(temp_dir: String) -> Result<(), String> {
	let path = PathBuf::from(&temp_dir);
	
	if path.exists() {
		fs::remove_dir_all(&path)
			.map_err(|e| format!("Failed to cleanup temp files: {}", e))?;
	}
	
	Ok(())
}

#[command]
pub fn get_file_metadata(file_path: String) -> Result<MediaMetadata, String> {
	let path = PathBuf::from(&file_path);
	
	if !path.exists() {
		return Err(format!("File does not exist: {}", file_path));
	}
	
	let metadata = fs::metadata(&path)
		.map_err(|e| format!("Failed to get file metadata: {}", e))?;
	
	Ok(MediaMetadata {
		duration: None,
		width: None,
		height: None,
		codec: None,
		file_size: metadata.len(),
	})
}

