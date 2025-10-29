use tauri::{command, Window, PhysicalSize};

#[command]
pub fn force_resize(window: Window) {
    if let Ok(current_size) = window.inner_size() {
        let new_size = PhysicalSize::new(current_size.width + 1, current_size.height);
        let _ = window.set_size(new_size);
        let _ = window.set_size(current_size);
    }
}

#[command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[command]
pub fn show_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())
}

#[command]
pub fn unminimize_window(window: Window) -> Result<(), String> {
    window.unminimize().map_err(|e| e.to_string())
}






