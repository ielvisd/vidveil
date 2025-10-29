#[cfg_attr(mobile, tauri::mobile_entry_point)]

// Removed tray icon for now - can be added back later with tray-icon feature
// use tauri::{
// 	menu::{Menu, MenuItem},
// 	tray::TrayIconBuilder
// };

// Removed unused imports: Window, PhysicalSize

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
			crate::commands::window::force_resize,
			crate::commands::video_processing::check_native_export_availability,
			crate::commands::video_processing::export_video_native,
			crate::commands::video_processing::get_export_progress,
			crate::commands::video_processing::cancel_export,
			crate::commands::video_processing::get_video_info,
			crate::commands::video_processing::save_blob_to_temp_file
		])
		// Tray icon setup removed - can be added back later with tray-icon feature
		// .setup(|app| {
		// 	let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
		// 	let menu = Menu::with_items(app, &[&quit_i])?;
		//
		// 	let _tray = TrayIconBuilder::new()
		// 		.menu(&menu)
		// 		.show_menu_on_left_click(true)
		// 		.icon(app.default_window_icon().unwrap().clone())
		// 		.on_menu_event(|app, event| match event.id.as_ref() {
		// 			"quit" => {
		// 				app.exit(0);
		// 			}
		// 			other => {
		// 				println!("menu item {} not handled", other);
		// 			}
		// 		})
		// 		.build(app)?;
		//
		// 	Ok(())
		// })
		.plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_notification::init())
		.plugin(tauri_plugin_os::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
