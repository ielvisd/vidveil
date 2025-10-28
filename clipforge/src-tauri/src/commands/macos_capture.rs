#[cfg(target_os = "macos")]
use core_graphics::display::{CGDisplay, CGGetActiveDisplayList, CGDirectDisplayID};
use std::ffi::{CStr, CString};
use std::sync::{Arc, Mutex};

use crate::commands::screen_capture::ScreenInfo;

// C struct from Objective-C
#[repr(C)]
struct CaptureResult {
    success: bool,
    error_message: [u8; 512],
}

// External C functions from our Objective-C wrapper
extern "C" {
    fn start_screen_recording_objc(
        display_id: u32,
        include_audio: bool,
        include_webcam: bool,
        pip_shape: i32,
        pip_x_percent: f32,
        pip_y_percent: f32,
        pip_size_percent: f32,
        output_path: *const std::os::raw::c_char,
    ) -> CaptureResult;
    
    fn stop_screen_recording_objc() -> CaptureResult;
    
    fn is_recording_objc() -> bool;
}

// Store recording state
lazy_static::lazy_static! {
    static ref RECORDING_STATE: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
}

pub fn get_screens() -> Result<Vec<ScreenInfo>, String> {
    unsafe {
        let mut display_ids: Vec<CGDirectDisplayID> = vec![0; 32];
        let mut display_count = 0u32;
        
        let result = CGGetActiveDisplayList(
            display_ids.len() as u32,
            display_ids.as_mut_ptr(),
            &mut display_count,
        );
        
        if result != 0 {
            return Err("Failed to get display list".to_string());
        }
        
        let mut screens = Vec::new();
        
        for i in 0..display_count {
            let display_id = display_ids[i as usize];
            let display = CGDisplay::new(display_id);
            let bounds = display.bounds();
            
            screens.push(ScreenInfo {
                id: format!("{}", display_id),
                name: format!("Display {}", i + 1),
                width: bounds.size.width as u32,
                height: bounds.size.height as u32,
                is_primary: i == 0,
            });
        }
        
        Ok(screens)
    }
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
    // Parse display ID
    let display_id: u32 = screen_id.parse()
        .map_err(|_| "Invalid screen ID".to_string())?;
    
    // Check if already recording
    {
        let state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        if state.is_some() {
            return Err("Recording already in progress".to_string());
        }
    }
    
    // Convert path to C string
    let c_path = CString::new(output_path.clone())
        .map_err(|_| "Invalid output path".to_string())?;
    
    // Call Objective-C wrapper (with exception handling!)
    let result = unsafe {
        start_screen_recording_objc(
            display_id, 
            include_audio, 
            include_webcam,
            pip_shape,
            pip_x,
            pip_y,
            pip_size,
            c_path.as_ptr()
        )
    };
    
    if !result.success {
        // Extract error message
        let error_cstr = unsafe {
            CStr::from_ptr(result.error_message.as_ptr() as *const i8)
        };
        let error_msg = error_cstr.to_string_lossy().into_owned();
        return Err(error_msg);
    }
    
    // Store recording path
    {
        let mut state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        *state = Some(output_path.clone());
    }
    
    println!("✅ Started native screen recording to: {}", output_path);
    Ok(())
}

pub async fn stop_recording() -> Result<(), String> {
    // Call Objective-C wrapper (with exception handling!)
    let result = unsafe {
        stop_screen_recording_objc()
    };
    
    if !result.success {
        // Extract error message
        let error_cstr = unsafe {
            CStr::from_ptr(result.error_message.as_ptr() as *const i8)
        };
        let error_msg = error_cstr.to_string_lossy().into_owned();
        return Err(error_msg);
    }
    
    // Clear recording state
    {
        let mut state = RECORDING_STATE.lock().map_err(|e| e.to_string())?;
        *state = None;
    }
    
    println!("✅ Stopped native screen recording");
    Ok(())
}

pub fn is_recording() -> bool {
    unsafe {
        is_recording_objc()
    }
}
