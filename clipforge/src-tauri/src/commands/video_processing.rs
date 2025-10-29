use serde::{Deserialize, Serialize};
use tauri::command;
use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_float};
use std::fs::File;
use std::io::Write;

#[command]
pub async fn save_blob_to_temp_file(data: Vec<u8>, file_path: String) -> Result<(), String> {
    match File::create(&file_path) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(&data) {
                return Err(format!("Failed to write data to file: {}", e));
            }
            println!("✅ Saved blob data to temporary file: {}", file_path);
            Ok(())
        }
        Err(e) => Err(format!("Failed to create file {}: {}", file_path, e))
    }
}

// External functions from Objective-C
extern "C" {
    fn export_video_native_objc(
        screen_video_path: *const c_char,
        webcam_video_path: *const c_char,
        output_path: *const c_char,
        format: *const c_char,
        quality: *const c_char,
        resolution: *const c_char,
        pip_x_percent: c_float,
        pip_y_percent: c_float,
        pip_size_percent: c_float,
        pip_shape_svg: *const c_char,
    ) -> ExportResult;
    
    fn get_export_progress_objc() -> ExportResult;
    
    fn cancel_export_objc() -> ExportResult;
}

#[repr(C)]
struct ExportResult {
    success: bool,
    progress: c_float,
    current_step: [c_char; 256],
    error_message: [c_char; 512],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoClip {
    pub path: String,
    pub start_time: f64,
    pub duration: f64,
    pub clip_type: String, // "screen" or "webcam"
    pub pip_config: Option<PipConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PipConfig {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub shape: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportSettings {
    pub resolution: String,
    pub quality: String,
    pub format: String,
    pub preset: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportProgress {
    pub progress: f64,
    pub current_step: String,
    pub total_steps: u32,
    pub current_step_number: u32,
    pub output_path: Option<String>,
}

// Helper function to convert C string to Rust string
fn c_str_to_string(c_str: &[c_char]) -> String {
    let c_str = unsafe { CStr::from_ptr(c_str.as_ptr()) };
    c_str.to_string_lossy().to_string()
}

// Helper function to convert Rust string to C string
fn string_to_c_string(s: &str) -> CString {
    CString::new(s).unwrap_or_else(|_| CString::new("").unwrap())
}

#[command]
pub async fn check_native_export_availability() -> Result<bool, String> {
    // Native export is always available on macOS with AVFoundation
    #[cfg(target_os = "macos")]
    {
        Ok(true)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn export_video_native(
    clips: Vec<VideoClip>,
    output_path: String,
    settings: ExportSettings,
) -> Result<ExportProgress, String> {
    #[cfg(target_os = "macos")]
    {
        // Debug: Log received clips
        println!("🔄 Received clips for export: {:?}", clips);
        
        // Sort clips by timeline order
        let mut sorted_clips = clips;
        sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

        // Find screen and webcam clips
        let screen_clip = sorted_clips.iter().find(|c| c.clip_type == "screen");
        let webcam_clip = sorted_clips.iter().find(|c| c.clip_type == "webcam");

        if screen_clip.is_none() {
            return Err("No screen recording found".to_string());
        }

        let screen_clip = screen_clip.unwrap();
        
        // Convert strings to C strings
        let screen_path = string_to_c_string(&screen_clip.path);
        let webcam_path = webcam_clip.map(|c| string_to_c_string(&c.path));
        
        // Ensure output path is absolute and save to Downloads folder if relative
        let absolute_output_path = if output_path.starts_with('/') {
            output_path.clone()
        } else {
            // Use Downloads folder as default save location
            let home_dir = std::env::var("HOME")
                .unwrap_or_else(|_| String::from("."));
            let downloads_path = std::path::PathBuf::from(&home_dir)
                .join("Downloads")
                .join(&output_path);
            
            // Ensure Downloads directory exists
            if let Some(parent) = downloads_path.parent() {
                if let Err(e) = std::fs::create_dir_all(parent) {
                    println!("⚠️ Warning: Could not create Downloads directory: {}", e);
                }
            }
            
            downloads_path.to_string_lossy().to_string()
        };
        
        let output_path_c = string_to_c_string(&absolute_output_path);
        let format_c = string_to_c_string(&settings.format);
        let quality_c = string_to_c_string(&settings.quality);
        let resolution_c = string_to_c_string(&settings.resolution);
        
        // Debug: Log the absolute output path
        println!("📁 Absolute output path: {}", absolute_output_path);
        
        // Get PiP configuration
        let (pip_x, pip_y, pip_size, pip_shape) = if let Some(webcam_clip) = webcam_clip {
            if let Some(pip_config) = &webcam_clip.pip_config {
                (
                    pip_config.x as f32,
                    pip_config.y as f32,
                    pip_config.width as f32,
                    string_to_c_string(&pip_config.shape)
                )
            } else {
                (0.8, 0.8, 0.2, string_to_c_string("rectangle"))
            }
        } else {
            (0.0, 0.0, 0.0, string_to_c_string("rectangle"))
        };

        // Call native Objective-C function
        let result = unsafe {
            export_video_native_objc(
                screen_path.as_ptr(),
                webcam_path.as_ref().map(|p| p.as_ptr()).unwrap_or(std::ptr::null()),
                output_path_c.as_ptr(),
                format_c.as_ptr(),
                quality_c.as_ptr(),
                resolution_c.as_ptr(),
                pip_x,
                pip_y,
                pip_size,
                pip_shape.as_ptr(),
            )
        };

        if result.success {
            Ok(ExportProgress {
                progress: result.progress as f64,
                current_step: c_str_to_string(&result.current_step),
                total_steps: 1,
                current_step_number: 1,
                output_path: Some(absolute_output_path),
            })
        } else {
            Err(c_str_to_string(&result.error_message))
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video export is only available on macOS".to_string())
    }
}

#[command]
pub async fn get_export_progress() -> Result<ExportProgress, String> {
    #[cfg(target_os = "macos")]
    {
        let result = unsafe { get_export_progress_objc() };
        
        Ok(ExportProgress {
            progress: result.progress as f64,
            current_step: c_str_to_string(&result.current_step),
            total_steps: 1,
            current_step_number: 1,
            output_path: None,
        })
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video export is only available on macOS".to_string())
    }
}

#[command]
pub async fn cancel_export() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let result = unsafe { cancel_export_objc() };
        Ok(result.success)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video export is only available on macOS".to_string())
    }
}

#[command]
pub async fn get_video_info(file_path: String) -> Result<serde_json::Value, String> {
    // For now, return basic file info without FFmpeg
    // TODO: Implement native video info extraction using AVFoundation
    
    let mut info = serde_json::Map::new();
    
    // Basic file existence check
    if std::path::Path::new(&file_path).exists() {
        info.insert("exists".to_string(), serde_json::Value::Bool(true));
        
        // Get file size
        if let Ok(metadata) = std::fs::metadata(&file_path) {
            info.insert("size".to_string(), serde_json::Value::Number(serde_json::Number::from(metadata.len())));
        }
        
        // TODO: Extract actual video metadata using AVFoundation
        info.insert("duration".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(0.0).unwrap()));
        info.insert("width".to_string(), serde_json::Value::Number(serde_json::Number::from(1920)));
        info.insert("height".to_string(), serde_json::Value::Number(serde_json::Number::from(1080)));
    } else {
        info.insert("exists".to_string(), serde_json::Value::Bool(false));
    }

    Ok(serde_json::Value::Object(info))
}

#[command]
pub async fn reveal_file_in_finder(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Use macOS 'open' command with -R flag to reveal file in Finder
        let output = Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .output()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to reveal file in Finder: {}", stderr));
        }
        
        Ok(())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Reveal in Finder is only available on macOS".to_string())
    }
}