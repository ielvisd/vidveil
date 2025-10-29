use tauri::{command, AppHandle};
use std::sync::{Arc, Mutex};

// Recording state management
pub struct RecordingState {
    pub is_recording: bool,
    pub output_path: Option<String>,
}

lazy_static::lazy_static! {
    static ref RECORDING_STATE: Arc<Mutex<RecordingState>> = Arc::new(Mutex::new(RecordingState {
        is_recording: false,
        output_path: None,
    }));
}

/// Get available screens/displays for recording
#[command]
pub async fn get_available_screens() -> Result<Vec<ScreenInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        macos::get_screens().await
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Screen capture not implemented for this platform yet".to_string())
    }
}

/// Start native screen recording
#[command]
pub async fn start_screen_recording(
    _app: AppHandle,
    screen_id: String,
    include_audio: bool,
    include_webcam: bool,
    pip_shape: Option<i32>,
    pip_x: Option<f32>,
    pip_y: Option<f32>,
    pip_size: Option<f32>,
    output_path: String,
) -> Result<String, String> {
    // Check state first, then release mutex before await
    {
        let state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        if state.is_recording {
            return Err("Recording already in progress".to_string());
        }
    }
    
    // Perform the recording start (releases mutex before await)
    #[cfg(target_os = "macos")]
    {
        macos::start_recording(
            screen_id, 
            include_audio,
            include_webcam,
            pip_shape.unwrap_or(0),
            pip_x.unwrap_or(0.8),
            pip_y.unwrap_or(0.8),
            pip_size.unwrap_or(0.2),
            output_path.clone()
        ).await?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        return Err("Screen capture not implemented for this platform yet".to_string());
    }
    
    // Update state after recording started
    {
        let mut state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        state.is_recording = true;
        state.output_path = Some(output_path.clone());
    }
    
    // Note: Menu item enabling disabled for now due to type complexity
    // Users can still stop recording via global shortcut (Cmd/Ctrl+Shift+S) or tray menu
    // The stop button will work if clicked, but may appear disabled in some cases
    
    Ok(output_path)
}

/// Stop native screen recording
#[command]
pub async fn stop_screen_recording(_app: AppHandle) -> Result<String, String> {
    // Check state first, then release mutex before await
    {
        let state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        if !state.is_recording {
            return Err("No recording in progress".to_string());
        }
    }
    
    // Perform the recording stop (releases mutex before await)
    #[cfg(target_os = "macos")]
    {
        macos::stop_recording().await?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        return Err("Screen capture not implemented for this platform yet".to_string());
    }
    
    // Update state after recording stopped
    let output_path = {
        let mut state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        state.is_recording = false;
        state.output_path.take().unwrap_or_default()
    };
    
    // Note: Menu item disabling handled automatically when recording stops
    
    Ok(output_path)
}

/// Check if recording is in progress
#[command]
pub fn is_recording() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(macos::check_is_recording())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        let state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        Ok(state.is_recording)
    }
}

/// Check screen recording permission status
#[command]
pub fn check_screen_recording_permission(screen_id: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        macos::check_screen_recording_permission(screen_id)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, assume permission is granted (no permission system)
        Ok(true)
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ScreenInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

// Platform-specific implementations
#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    
    // Import the macOS capture implementation
    use crate::commands::macos_capture;
    
    pub async fn get_screens() -> Result<Vec<ScreenInfo>, String> {
        macos_capture::get_screens()
    }
    
    pub async fn start_recording(
        screen_id: String,
        include_audio: bool,
        include_webcam: bool,
        pip_shape: i32,
        pip_x: f32,
        pip_y: f32,
        pip_size: f32,
        output_path: String,
    ) -> Result<(), String> {
        macos_capture::start_recording(
            screen_id, 
            include_audio, 
            include_webcam,
            pip_shape,
            pip_x,
            pip_y,
            pip_size,
            output_path
        ).await
    }
    
    pub async fn stop_recording() -> Result<(), String> {
        macos_capture::stop_recording().await
    }
    
    pub fn check_is_recording() -> bool {
        macos_capture::is_recording()
    }
    
    pub fn check_screen_recording_permission(screen_id: String) -> Result<bool, String> {
        macos_capture::check_screen_recording_permission(screen_id)
    }
}

