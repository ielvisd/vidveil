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
        println!("🔄 Received {} clip(s) for export", clips.len());
        for (i, clip) in clips.iter().enumerate() {
            println!("  Clip {}: type={}, path={}, duration={}s, start_time={}", 
                i, clip.clip_type, clip.path, clip.duration, clip.start_time);
        }
        
        // Sort clips by timeline order
        let mut sorted_clips = clips;
        sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());
        
        println!("📊 Clips sorted by timeline order");

        // Find screen and webcam clips
        let screen_clip = sorted_clips.iter().find(|c| c.clip_type == "screen");
        let webcam_clip = sorted_clips.iter().find(|c| c.clip_type == "webcam");

        // Validate screen clip exists
        if screen_clip.is_none() {
            println!("❌ No screen recording found in clips");
            println!("   Available clip types: {:?}", 
                sorted_clips.iter().map(|c| c.clip_type.as_str()).collect::<Vec<_>>());
            return Err("No screen recording found. At least one screen recording is required for export.".to_string());
        }

        let screen_clip = screen_clip.unwrap();
        
        // Validate screen clip path exists
        let screen_path_buf = std::path::Path::new(&screen_clip.path);
        if !screen_path_buf.exists() {
            println!("❌ Screen clip path does not exist: {}", screen_clip.path);
            return Err(format!("Screen recording file not found: {}", screen_clip.path));
        }
        
        println!("✅ Screen clip found: {}", screen_clip.path);
        
        // Validate webcam clip path if it exists
        if let Some(ref webcam) = webcam_clip {
            let webcam_path_buf = std::path::Path::new(&webcam.path);
            if !webcam_path_buf.exists() {
                println!("⚠️ Webcam clip path does not exist: {} (will continue without webcam)", webcam.path);
            } else {
                println!("✅ Webcam clip found: {}", webcam.path);
            }
        } else {
            println!("ℹ️ No webcam clip found (exporting screen only)");
        }
        
        // Convert strings to C strings
        let screen_path = string_to_c_string(&screen_clip.path);
        let webcam_path = webcam_clip.map(|c| string_to_c_string(&c.path));
        
        // Sanitize filename to remove invalid characters
        fn sanitize_filename(filename: &str) -> String {
            filename
                .chars()
                .map(|c| match c {
                    '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                    _ => c,
                })
                .collect::<String>()
                .trim()
                .to_string()
        }
        
        // Ensure output path is absolute and save to Downloads folder if relative
        let absolute_output_path = if output_path.starts_with('/') {
            // Validate absolute path exists
            let mut path = std::path::PathBuf::from(&output_path);
            if let Some(parent) = path.parent() {
                if !parent.exists() {
                    return Err(format!("Output directory does not exist: {}", parent.display()));
                }
            }
            
            // Generate unique filename if file already exists
            let mut counter = 1;
            while path.exists() {
                // Extract base name and extension
                let file_name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("export");
                
                let (base_name, ext) = if let Some(dot_pos) = file_name.rfind('.') {
                    (&file_name[..dot_pos], &file_name[dot_pos..])
                } else {
                    (file_name, "")
                };
                
                let unique_filename = format!("{}_({}){}", base_name, counter, ext);
                
                if let Some(parent) = path.parent() {
                    path = parent.join(&unique_filename);
                } else {
                    path = std::path::PathBuf::from(&unique_filename);
                }
                
                counter += 1;
                
                // Safety limit to prevent infinite loop
                if counter > 1000 {
                    return Err(format!(
                        "Could not find available filename after 1000 attempts. Please delete existing files."
                    ));
                }
            }
            
            if counter > 1 {
                println!("📁 File already exists, using unique filename: {}", path.display());
            }
            
            path.to_string_lossy().to_string()
        } else {
            // Use Downloads folder as default save location
            let home_dir = std::env::var("HOME")
                .map_err(|e| format!("Failed to get HOME directory: {}", e))?;
            
            let downloads_dir = std::path::PathBuf::from(&home_dir).join("Downloads");
            
            // Ensure Downloads directory exists
            if !downloads_dir.exists() {
                std::fs::create_dir_all(&downloads_dir)
                    .map_err(|e| format!("Failed to create Downloads directory: {}", e))?;
                println!("✅ Created Downloads directory: {}", downloads_dir.display());
            }
            
            // Check if Downloads directory is writable
            let metadata = std::fs::metadata(&downloads_dir)
                .map_err(|e| format!("Failed to access Downloads directory: {}", e))?;
            
            if !metadata.permissions().readonly() {
                // Try creating a test file to verify writability
                let test_file = downloads_dir.join(".clipforge_test_write");
                if std::fs::write(&test_file, b"test").is_err() {
                    return Err(format!("Downloads directory is not writable: {}", downloads_dir.display()));
                }
                let _ = std::fs::remove_file(&test_file);
            } else {
                return Err(format!("Downloads directory is read-only: {}", downloads_dir.display()));
            }
            
            // Sanitize the filename and ensure it has the correct extension
            let sanitized_name = sanitize_filename(&output_path);
            let filename = if sanitized_name.is_empty() {
                "clipforge-export.mp4".to_string()
            } else {
                sanitized_name
            };
            
            // Ensure filename has proper extension based on format
            let extension = match settings.format.as_str() {
                "mp4" | "mpeg4" => "mp4",
                "mov" | "quicktime" => "mov",
                "webm" => "webm",
                "gif" => "gif",
                "mp3" => "mp3",
                _ => "mp4",
            };
            
            let final_filename = if filename.ends_with(&format!(".{}", extension)) {
                filename
            } else {
                // Remove any existing extension and add the correct one
                if let Some(dot_pos) = filename.rfind('.') {
                    format!("{}.{}", &filename[..dot_pos], extension)
                } else {
                    format!("{}.{}", filename, extension)
                }
            };
            
            // Generate unique filename if file already exists
            let mut downloads_path = downloads_dir.join(&final_filename);
            let mut counter = 1;
            
            // Keep trying with incremented suffix until we find a filename that doesn't exist
            while downloads_path.exists() {
                // Extract base name and extension
                let base_name = if let Some(dot_pos) = final_filename.rfind('.') {
                    &final_filename[..dot_pos]
                } else {
                    &final_filename
                };
                let ext = if let Some(dot_pos) = final_filename.rfind('.') {
                    &final_filename[dot_pos..]
                } else {
                    ""
                };
                
                let unique_filename = format!("{}_({}){}", base_name, counter, ext);
                downloads_path = downloads_dir.join(&unique_filename);
                counter += 1;
                
                // Safety limit to prevent infinite loop
                if counter > 1000 {
                    return Err(format!(
                        "Could not find available filename after 1000 attempts. Please delete existing files in {}",
                        downloads_dir.display()
                    ));
                }
            }
            
            if counter > 1 {
                println!("📁 File already exists, using unique filename: {}", downloads_path.display());
            } else {
                println!("📁 Output will be saved to: {}", downloads_path.display());
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