fn main() {
    // Compile Objective-C code on macOS
    #[cfg(target_os = "macos")]
    {
        cc::Build::new()
            .file("src/objc/screen_capture.m")
            .file("src/objc/video_export.m")
            .flag("-fmodules")
            .flag("-fobjc-arc")
            .flag("-mmacosx-version-min=10.15")
            .compile("native_video_objc");
        
        // Link frameworks
        println!("cargo:rustc-link-lib=framework=AVFoundation");
        println!("cargo:rustc-link-lib=framework=CoreMedia");
        println!("cargo:rustc-link-lib=framework=CoreVideo");
        println!("cargo:rustc-link-lib=framework=CoreGraphics");
        println!("cargo:rustc-link-lib=framework=Foundation");
        
        // Tell cargo to rerun if the Objective-C files change
        println!("cargo:rerun-if-changed=src/objc/screen_capture.m");
        println!("cargo:rerun-if-changed=src/objc/video_export.m");
    }
    
    tauri_build::build()
}
