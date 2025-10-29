#[cfg_attr(mobile, tauri::mobile_entry_point)]

use tauri::{
	Emitter,
	Manager,
	menu::{Menu, MenuItem},
	tray::{MouseButton, TrayIconBuilder, TrayIconEvent}
};

pub mod commands;

pub fn run() {
    tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			crate::commands::media::get_media_files,
			crate::commands::media::validate_media_file,
			crate::commands::media::get_file_size,
			crate::commands::media::create_temp_directory,
			crate::commands::media::save_recording,
			crate::commands::media::cleanup_temp_files,
            crate::commands::media::get_file_metadata,
            crate::commands::media::read_video_file,
            crate::commands::media::get_username,
            crate::commands::media::create_recordings_directory,
            crate::commands::screen_capture::get_available_screens,
            crate::commands::screen_capture::start_screen_recording,
			crate::commands::screen_capture::stop_screen_recording,
			crate::commands::screen_capture::is_recording,
			crate::commands::screen_capture::check_screen_recording_permission,
			crate::commands::window::force_resize,
			crate::commands::window::minimize_window,
			crate::commands::window::show_window,
			crate::commands::window::unminimize_window,
			crate::commands::video_processing::check_native_export_availability,
			crate::commands::video_processing::export_video_native,
			crate::commands::video_processing::get_export_progress,
			crate::commands::video_processing::cancel_export,
			crate::commands::video_processing::get_video_info,
			crate::commands::video_processing::save_blob_to_temp_file,
			crate::commands::video_processing::reveal_file_in_finder
		])
		.setup(|app| {
			// Create tray icon
			let show_i = MenuItem::with_id(app, "show", "Show VidVeil", true, None::<&str>)?;
			let stop_i = MenuItem::with_id(app, "stop_recording", "Stop Recording", true, None::<&str>)?;
			// Keep stop button enabled - it will emit event that frontend can handle appropriately
			let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
			let menu = Menu::with_items(app, &[&show_i, &stop_i, &quit_i])?;

			let _tray = TrayIconBuilder::with_id("default")
				.menu(&menu)
				.show_menu_on_left_click(true)
				.icon(app.default_window_icon().unwrap().clone())
				.tooltip("VidVeil - Screen Recorder")
				.on_menu_event(move |app, event| {
					match event.id.as_ref() {
						"show" => {
							if let Some(window) = app.get_webview_window("main") {
								let _ = window.show();
								let _ = window.unminimize();
								let _ = window.set_focus();
							}
						}
						"stop_recording" => {
							// Emit event to frontend to stop recording
							if let Some(window) = app.get_webview_window("main") {
								let _ = window.emit("tray-stop-recording", ());
							}
						}
						"quit" => {
							app.exit(0);
						}
						_ => {}
					}
				})
				.on_tray_icon_event(move |_tray, event| {
					// Handle tray icon clicks - restore window on left click
					if let TrayIconEvent::Click {
						button: MouseButton::Left,
						button_state: _,
						..
					} = event
					{
						// Note: App handle not available in tray event, so we'll handle this from frontend
					}
				})
				.build(app)?;

			Ok(())
		})
		.plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_notification::init())
		.plugin(tauri_plugin_os::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
