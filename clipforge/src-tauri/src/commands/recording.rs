use tauri::command;
use std::fs;

#[command]
pub fn save_screen_recording(
	content: Vec<u8>,
	file_name: String,
	output_dir: String
) -> Result<String, String> {
	let output_path = std::path::PathBuf::from(&output_dir).join(&file_name);
	
	fs::write(&output_path, content)
		.map_err(|e| format!("Failed to save recording: {}", e))?;
	
	Ok(output_path.to_str()
		.ok_or("Failed to convert path to string")?
		.to_string())
}

#[command]
pub fn get_recording_devices() -> Result<Vec<String>, String> {
	// Return list of available devices
	// For now, return placeholder
	Ok(vec![
		"Entire Screen".to_string(),
		"Window".to_string(),
		"Browser Tab".to_string()
	])
}

