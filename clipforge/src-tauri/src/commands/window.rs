use tauri::{command, Window, PhysicalSize};

#[command]
pub fn force_resize(window: Window) {
    if let Ok(current_size) = window.inner_size() {
        let new_size = PhysicalSize::new(current_size.width + 1, current_size.height);
        let _ = window.set_size(new_size);
        let _ = window.set_size(current_size);
    }
}





