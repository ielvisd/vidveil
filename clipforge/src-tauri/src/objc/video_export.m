#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <QuartzCore/QuartzCore.h>

// C-compatible struct to return export progress
typedef struct {
    bool success;
    float progress;
    char current_step[256];
    char error_message[512];
} ExportResult;

// Global export session reference
static AVAssetExportSession* g_export_session = nil;
static AVAssetWriter* g_asset_writer = nil;

// Helper function to convert quality string to video bitrate (bits per second)
NSInteger get_video_bitrate(const char* quality) {
    NSString* qualityStr = [NSString stringWithUTF8String:quality];
    if ([qualityStr isEqualToString:@"high"]) {
        return 8000000; // 8 Mbps
    } else if ([qualityStr isEqualToString:@"medium"]) {
        return 4000000; // 4 Mbps
    } else if ([qualityStr isEqualToString:@"low"]) {
        return 2000000; // 2 Mbps
    }
    return 4000000; // Default to medium
}

// Helper function to convert quality string to audio bitrate (bits per second)
NSInteger get_audio_bitrate(const char* quality) {
    NSString* qualityStr = [NSString stringWithUTF8String:quality];
    if ([qualityStr isEqualToString:@"high"]) {
        return 192000; // 192 kbps
    } else if ([qualityStr isEqualToString:@"medium"]) {
        return 128000; // 128 kbps
    } else if ([qualityStr isEqualToString:@"low"]) {
        return 96000; // 96 kbps
    }
    return 128000; // Default to medium
}

// Helper function to convert resolution string to CGSize
// Returns CGSizeZero for "source" to indicate preserve original resolution
CGSize get_resolution_size(const char* resolution) {
    NSString* resStr = [NSString stringWithUTF8String:resolution];
    if ([resStr isEqualToString:@"1080p"]) {
        return CGSizeMake(1920, 1080);
    } else if ([resStr isEqualToString:@"720p"]) {
        return CGSizeMake(1280, 720);
    } else if ([resStr isEqualToString:@"480p"]) {
        return CGSizeMake(854, 480);
    } else if ([resStr isEqualToString:@"360p"]) {
        return CGSizeMake(640, 360);
    } else if ([resStr isEqualToString:@"source"]) {
        return CGSizeZero; // Indicates preserve source resolution
    }
    // Default to 1080p
    return CGSizeMake(1920, 1080);
}

// Helper function to get export preset based on quality
NSString* get_export_preset(const char* quality, const char* preset) {
    NSString* qualityStr = [NSString stringWithUTF8String:quality];
    
    // Map quality to export presets
    // Target bitrates: high=8Mbps, medium=4Mbps, low=2Mbps
    // AVAssetExportPresetHighestQuality uses roughly 20-30 Mbps (too high for our target)
    // AVAssetExportPresetMediumQuality uses roughly 10-15 Mbps (closest to our "high" target)
    // AVAssetExportPresetLowQuality uses roughly 5-8 Mbps (closest to our "medium" target)
    // AVAssetExportPreset640x480 uses lower bitrate (suitable for "low")
    
    if ([qualityStr isEqualToString:@"high"]) {
        // Use MediumQuality preset - closer to our 8 Mbps target than HighestQuality
        return AVAssetExportPresetMediumQuality;
    } else if ([qualityStr isEqualToString:@"medium"]) {
        // Use LowQuality preset - closer to our 4 Mbps target than MediumQuality
        return AVAssetExportPresetLowQuality;
    } else if ([qualityStr isEqualToString:@"low"]) {
        // Use LowQuality for low as well, or consider 640x480 if available
        return AVAssetExportPresetLowQuality;
    }
    return AVAssetExportPresetMediumQuality;
}

// Helper function to create composition from clips
AVMutableComposition* create_composition_from_clips(
    const char* screen_video_path,
    const char* webcam_video_path,
    float pip_x_percent,
    float pip_y_percent,
    float pip_size_percent,
    const char* pip_shape_svg
) {
    // Suppress unused parameter warnings - these are kept for API consistency
    (void)pip_x_percent;
    (void)pip_y_percent;
    (void)pip_size_percent;
    (void)pip_shape_svg;
    
    @autoreleasepool {
        // Create composition
        AVMutableComposition* composition = [AVMutableComposition composition];
        
        // Create video track for screen recording
        AVMutableCompositionTrack* screenTrack = [composition addMutableTrackWithMediaType:AVMediaTypeVideo 
                                                                           preferredTrackID:kCMPersistentTrackID_Invalid];
        
        // Create video track for webcam (if provided)
        AVMutableCompositionTrack* webcamTrack = nil;
        if (webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
            webcamTrack = [composition addMutableTrackWithMediaType:AVMediaTypeVideo 
                                                   preferredTrackID:kCMPersistentTrackID_Invalid];
        }
        
        // Create audio track
        AVMutableCompositionTrack* audioTrack = [composition addMutableTrackWithMediaType:AVMediaTypeAudio 
                                                                          preferredTrackID:kCMPersistentTrackID_Invalid];
        
        NSError* error = nil;
        
        // Load screen video asset
        NSURL* screenURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:screen_video_path]];
        AVAsset* screenAsset = [AVAsset assetWithURL:screenURL];
        
        if (screenAsset == nil) {
            NSLog(@"❌ Failed to load screen video asset");
            return nil;
        }
        
        // Insert screen video track
        AVAssetTrack* screenVideoTrack = [[screenAsset tracksWithMediaType:AVMediaTypeVideo] firstObject];
        if (screenVideoTrack != nil) {
            CMTimeRange timeRange = CMTimeRangeMake(kCMTimeZero, screenAsset.duration);
            [screenTrack insertTimeRange:timeRange 
                                 ofTrack:screenVideoTrack 
                                  atTime:kCMTimeZero 
                                   error:&error];
            if (error != nil) {
                NSLog(@"❌ Failed to insert screen video track: %@", error.localizedDescription);
                return nil;
            }
        }
        
        // Insert screen audio track
        AVAssetTrack* screenAudioTrack = [[screenAsset tracksWithMediaType:AVMediaTypeAudio] firstObject];
        if (screenAudioTrack != nil) {
            CMTimeRange timeRange = CMTimeRangeMake(kCMTimeZero, screenAsset.duration);
            [audioTrack insertTimeRange:timeRange 
                                ofTrack:screenAudioTrack 
                                 atTime:kCMTimeZero 
                                  error:&error];
            if (error != nil) {
                NSLog(@"⚠️ Failed to insert screen audio track: %@", error.localizedDescription);
                // Continue without audio
            }
        }
        
        // Handle webcam video if provided
        if (webcamTrack != nil) {
            NSURL* webcamURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:webcam_video_path]];
            AVAsset* webcamAsset = [AVAsset assetWithURL:webcamURL];
            
            if (webcamAsset != nil) {
                AVAssetTrack* webcamVideoTrack = [[webcamAsset tracksWithMediaType:AVMediaTypeVideo] firstObject];
                if (webcamVideoTrack != nil) {
                    CMTimeRange timeRange = CMTimeRangeMake(kCMTimeZero, webcamAsset.duration);
                    [webcamTrack insertTimeRange:timeRange 
                                         ofTrack:webcamVideoTrack 
                                          atTime:kCMTimeZero 
                                           error:&error];
                    if (error != nil) {
                        NSLog(@"⚠️ Failed to insert webcam video track: %@", error.localizedDescription);
                        // Continue without webcam
                        webcamTrack = nil;
                    }
                }
            }
        }
        
        NSLog(@"✅ Composition created successfully");
        return composition;
    }
}

// Helper function to create video composition with PiP
AVMutableVideoComposition* create_pip_composition(
    AVMutableComposition* composition,
    float pip_x_percent,
    float pip_y_percent,
    float pip_size_percent,
    const char* pip_shape_svg,
    CGSize targetResolution
) {
    @autoreleasepool {
        // Get video tracks
        NSArray<AVMutableCompositionTrack*>* videoTracks = [composition tracksWithMediaType:AVMediaTypeVideo];
        
        if (videoTracks.count < 1) {
            NSLog(@"❌ No video tracks found in composition");
            return nil;
        }
        
        AVMutableCompositionTrack* screenTrack = videoTracks[0];
        AVMutableCompositionTrack* webcamTrack = videoTracks.count > 1 ? videoTracks[1] : nil;
        
        // Get video dimensions
        AVAssetTrack* screenVideoTrack = [[screenTrack.asset tracksWithMediaType:AVMediaTypeVideo] firstObject];
        if (screenVideoTrack == nil) {
            NSLog(@"❌ No screen video track found");
            return nil;
        }
        
        CGSize screenSize = screenVideoTrack.naturalSize;
        NSLog(@"📺 Screen size: %.0fx%.0f", screenSize.width, screenSize.height);
        
        // Use target resolution if specified, otherwise use source size
        CGSize renderSize;
        if (CGSizeEqualToSize(targetResolution, CGSizeZero)) {
            renderSize = screenSize; // Preserve source resolution
        } else if (targetResolution.width > 0 && targetResolution.height > 0) {
            renderSize = targetResolution;
        } else {
            renderSize = screenSize; // Fallback to source
        }
        NSLog(@"📐 Target render size: %.0fx%.0f", renderSize.width, renderSize.height);
        
        // Calculate scale factor if resolution is different
        CGFloat scaleX = renderSize.width / screenSize.width;
        CGFloat scaleY = renderSize.height / screenSize.height;
        
        // Create video composition
        AVMutableVideoComposition* videoComposition = [AVMutableVideoComposition videoComposition];
        videoComposition.frameDuration = CMTimeMake(1, 30); // 30 fps
        videoComposition.renderSize = renderSize;
        
        // Create instruction
        AVMutableVideoCompositionInstruction* instruction = [AVMutableVideoCompositionInstruction videoCompositionInstruction];
        instruction.timeRange = CMTimeRangeMake(kCMTimeZero, composition.duration);
        
        NSMutableArray* layerInstructions = [NSMutableArray array];
        
        // Screen layer (background) - apply scale if resolution changed
        AVMutableVideoCompositionLayerInstruction* screenLayerInstruction = 
            [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:screenTrack];
        
        // Scale screen track to target resolution if needed
        if (scaleX != 1.0 || scaleY != 1.0) {
            CGAffineTransform screenTransform = CGAffineTransformMakeScale(scaleX, scaleY);
            [screenLayerInstruction setTransform:screenTransform atTime:kCMTimeZero];
        }
        
        [layerInstructions addObject:screenLayerInstruction];
        
        // Webcam layer (PiP) if available
        if (webcamTrack != nil) {
            AVMutableVideoCompositionLayerInstruction* webcamLayerInstruction = 
                [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:webcamTrack];
            
            // Calculate PiP dimensions and position in render size coordinates
            float pipWidth = renderSize.width * pip_size_percent;
            float pipHeight = renderSize.height * pip_size_percent;
            float pipX = renderSize.width * pip_x_percent;
            float pipY = renderSize.height * pip_y_percent;
            
            // Get webcam track size for scaling
            AVAssetTrack* webcamVideoTrack = [[webcamTrack.asset tracksWithMediaType:AVMediaTypeVideo] firstObject];
            CGSize webcamSize = webcamVideoTrack ? webcamVideoTrack.naturalSize : renderSize;
            
            // Calculate scale to fit PiP size
            CGFloat pipScaleX = pipWidth / webcamSize.width;
            CGFloat pipScaleY = pipHeight / webcamSize.height;
            
            // Create transform for PiP positioning and scaling
            CGAffineTransform pipTransform = CGAffineTransformMakeScale(pipScaleX, pipScaleY);
            pipTransform = CGAffineTransformTranslate(pipTransform, pipX / pipScaleX, pipY / pipScaleY);
            
            [webcamLayerInstruction setTransform:pipTransform atTime:kCMTimeZero];
            
            // Apply shape mask if provided
            if (pip_shape_svg != NULL && strlen(pip_shape_svg) > 0) {
                // For now, use rectangular mask
                // TODO: Implement SVG shape masking
                NSLog(@"📐 PiP shape: %s (rectangular mask applied)", pip_shape_svg);
            }
            
            [layerInstructions addObject:webcamLayerInstruction];
            NSLog(@"📷 PiP positioned at (%.0f, %.0f) with size %.0fx%.0f", pipX, pipY, pipWidth, pipHeight);
        }
        
        instruction.layerInstructions = layerInstructions;
        videoComposition.instructions = @[instruction];
        
        NSLog(@"✅ Video composition created with PiP");
        return videoComposition;
    }
}

// Export video using native AVFoundation
ExportResult export_video_native_objc(
    const char* screen_video_path,
    const char* webcam_video_path,
    const char* output_path,
    const char* format,
    const char* quality,
    const char* resolution,
    float pip_x_percent,
    float pip_y_percent,
    float pip_size_percent,
    const char* pip_shape_svg
) {
    ExportResult result;
    result.success = false;
    result.progress = 0.0;
    memset(result.current_step, 0, sizeof(result.current_step));
    memset(result.error_message, 0, sizeof(result.error_message));
    
    @autoreleasepool {
        @try {
            NSLog(@"🚀 Starting native video export");
            NSLog(@"📺 Screen video: %s", screen_video_path);
            NSLog(@"📷 Webcam video: %s", webcam_video_path ? webcam_video_path : "none");
            NSLog(@"📁 Output: %s", output_path);
            NSLog(@"⚙️ Quality: %s, Resolution: %s", quality, resolution);
            
            // Get target resolution and bitrate settings
            CGSize targetResolution = get_resolution_size(resolution);
            NSInteger videoBitrate = get_video_bitrate(quality);
            NSInteger audioBitrate = get_audio_bitrate(quality);
            NSString* exportPreset = get_export_preset(quality, NULL);
            
            NSLog(@"📐 Target resolution: %.0fx%.0f", targetResolution.width, targetResolution.height);
            NSLog(@"📊 Video bitrate: %ld bps (%.2f Mbps)", (long)videoBitrate, videoBitrate / 1000000.0);
            NSLog(@"🔊 Audio bitrate: %ld bps (%.2f kbps)", (long)audioBitrate, audioBitrate / 1000.0);
            NSLog(@"🎯 Export preset: %@", exportPreset);
            
            strcpy(result.current_step, "Creating composition...");
            
            // Create composition from clips
            AVMutableComposition* composition = create_composition_from_clips(
                screen_video_path,
                webcam_video_path,
                pip_x_percent,
                pip_y_percent,
                pip_size_percent,
                pip_shape_svg
            );
            
            if (composition == nil) {
                strcpy(result.error_message, "Failed to create video composition");
                return result;
            }
            
            strcpy(result.current_step, "Creating video composition...");
            
            // Get source video size to determine if we need a video composition
            NSArray<AVMutableCompositionTrack*>* videoTracks = [composition tracksWithMediaType:AVMediaTypeVideo];
            CGSize sourceSize = CGSizeZero;
            if (videoTracks.count > 0) {
                AVAssetTrack* sourceTrack = [[videoTracks[0].asset tracksWithMediaType:AVMediaTypeVideo] firstObject];
                if (sourceTrack) {
                    sourceSize = sourceTrack.naturalSize;
                }
            }
            
            // Determine if we need to scale resolution or have PiP
            BOOL needsVideoComposition = NO;
            if (webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
                needsVideoComposition = YES; // PiP requires video composition
            } else if (targetResolution.width > 0 && targetResolution.height > 0 && 
                      (targetResolution.width != sourceSize.width || targetResolution.height != sourceSize.height)) {
                needsVideoComposition = YES; // Resolution scaling requires video composition
            } else if (CGSizeEqualToSize(targetResolution, CGSizeZero)) {
                // Source resolution - don't create video composition unless PiP is needed
                needsVideoComposition = NO;
            }
            
            // Create video composition with PiP and/or resolution scaling
            AVMutableVideoComposition* videoComposition = nil;
            if (needsVideoComposition) {
                if (webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
                    videoComposition = create_pip_composition(
                        composition,
                        pip_x_percent,
                        pip_y_percent,
                        pip_size_percent,
                        pip_shape_svg,
                        targetResolution
                    );
                } else {
                    // Just scaling, no PiP
                    videoComposition = [AVMutableVideoComposition videoComposition];
                    videoComposition.frameDuration = CMTimeMake(1, 30);
                    videoComposition.renderSize = targetResolution;
                    
                    AVMutableVideoCompositionInstruction* instruction = 
                        [AVMutableVideoCompositionInstruction videoCompositionInstruction];
                    instruction.timeRange = CMTimeRangeMake(kCMTimeZero, composition.duration);
                    
                    CGFloat scaleX = targetResolution.width / sourceSize.width;
                    CGFloat scaleY = targetResolution.height / sourceSize.height;
                    
                    AVMutableVideoCompositionLayerInstruction* layerInstruction = 
                        [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:videoTracks[0]];
                    CGAffineTransform transform = CGAffineTransformMakeScale(scaleX, scaleY);
                    [layerInstruction setTransform:transform atTime:kCMTimeZero];
                    
                    instruction.layerInstructions = @[layerInstruction];
                    videoComposition.instructions = @[instruction];
                }
                
                if (videoComposition == nil) {
                    strcpy(result.error_message, "Failed to create video composition");
                    return result;
                }
            }
            
            strcpy(result.current_step, "Setting up export session...");
            
            // Debug: Log composition details
            NSLog(@"📊 Composition duration: %f seconds", CMTimeGetSeconds(composition.duration));
            NSLog(@"📊 Composition tracks: %lu", (unsigned long)composition.tracks.count);
            
            // Create export session with compression preset (not Passthrough)
            AVAssetExportSession* exportSession = [AVAssetExportSession exportSessionWithAsset:composition 
                                                                                      presetName:exportPreset];
            
            if (exportSession == nil) {
                strcpy(result.error_message, "Failed to create export session");
                NSLog(@"❌ Failed to create export session");
                return result;
            }
            
            // Debug: Check if export session can export
            NSArray* supportedFileTypes = [exportSession supportedFileTypes];
            NSLog(@"📋 Supported file types: %@", supportedFileTypes);
            
            BOOL canExport = [exportSession canPerformMultiplePassesOverSourceMediaData];
            NSLog(@"🔄 Can perform multiple passes: %@", canExport ? @"YES" : @"NO");
            
            // Check if the preset is compatible
            NSString* presetName = [exportSession presetName];
            NSLog(@"🎯 Export preset: %@", presetName);
            
            NSLog(@"✅ Export session setup complete");
            
            // Set output URL
            NSURL* outputURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:output_path]];
            exportSession.outputURL = outputURL;
            
            // Debug: Log output URL
            NSLog(@"📁 Output URL: %@", outputURL);
            
            // Check if output directory exists and is writable
            NSString* outputDir = [outputURL.path stringByDeletingLastPathComponent];
            NSFileManager* fileManager = [NSFileManager defaultManager];
            BOOL isDirectory;
            BOOL exists = [fileManager fileExistsAtPath:outputDir isDirectory:&isDirectory];
            
            if (!exists || !isDirectory) {
                strcpy(result.error_message, "Output directory does not exist");
                NSLog(@"❌ Output directory does not exist: %@", outputDir);
                return result;
            }
            
            BOOL isWritable = [fileManager isWritableFileAtPath:outputDir];
            if (!isWritable) {
                strcpy(result.error_message, "Output directory is not writable");
                NSLog(@"❌ Output directory is not writable: %@", outputDir);
                return result;
            }
            
            NSLog(@"✅ Output directory is valid and writable: %@", outputDir);
            
            // Set output file type based on format
            if (strcmp(format, "mp4") == 0) {
                exportSession.outputFileType = AVFileTypeMPEG4;
            } else if (strcmp(format, "mov") == 0) {
                exportSession.outputFileType = AVFileTypeQuickTimeMovie;
            } else {
                exportSession.outputFileType = AVFileTypeMPEG4; // Default to MP4
            }
            
            // Set video composition if we have PiP
            if (videoComposition != nil) {
                exportSession.videoComposition = videoComposition;
            }
            
            // Configure quality settings
            NSMutableArray* metadataItems = [NSMutableArray array];
            
            // Add quality metadata
            AVMutableMetadataItem* qualityItem = [AVMutableMetadataItem metadataItem];
            qualityItem.key = AVMetadataCommonKeyDescription;
            qualityItem.keySpace = AVMetadataKeySpaceCommon;
            qualityItem.value = [NSString stringWithUTF8String:quality];
            [metadataItems addObject:qualityItem];
            
            exportSession.metadata = metadataItems;
            
            strcpy(result.current_step, "Starting export...");
            
            // Store global reference for progress tracking
            g_export_session = exportSession;
            
            // Start export synchronously
            dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
            __block BOOL exportSuccess = NO;
            __block NSError* exportError = nil;
            
            [exportSession exportAsynchronouslyWithCompletionHandler:^{
                NSLog(@"🔄 Export session status: %ld", (long)exportSession.status);
                exportSuccess = (exportSession.status == AVAssetExportSessionStatusCompleted);
                if (!exportSuccess) {
                    exportError = exportSession.error;
                    if (exportError) {
                        NSLog(@"❌ Export error: %@", exportError.localizedDescription);
                        NSLog(@"❌ Export error domain: %@", exportError.domain);
                        NSLog(@"❌ Export error code: %ld", (long)exportError.code);
                    }
                }
                dispatch_semaphore_signal(semaphore);
            }];
            
            // Wait for export to complete with progress updates
            while (exportSession.status == AVAssetExportSessionStatusExporting) {
                result.progress = exportSession.progress * 100.0;
                strcpy(result.current_step, "Exporting video...");
                
                // Sleep briefly to avoid busy waiting
                [NSThread sleepForTimeInterval:0.1];
            }
            
            // Wait for completion
            dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
            
            if (exportSuccess) {
                result.success = true;
                result.progress = 100.0;
                strcpy(result.current_step, "Export completed successfully");
                NSLog(@"✅ Native video export completed successfully");
            } else {
                if (exportError != nil) {
                    strncpy(result.error_message, [exportError.localizedDescription UTF8String], sizeof(result.error_message) - 1);
                } else {
                    strcpy(result.error_message, "Export failed with unknown error");
                }
                NSLog(@"❌ Export failed: %s", result.error_message);
            }
            
            // Clear global reference
            g_export_session = nil;
            
            return result;
            
        } @catch (NSException* exception) {
            const char* reason = [[exception reason] UTF8String];
            snprintf(result.error_message, sizeof(result.error_message), 
                    "Objective-C exception: %s", reason);
            
            // Clear global reference
            g_export_session = nil;
            
            return result;
        }
    }
}

// Get current export progress
ExportResult get_export_progress_objc() {
    ExportResult result;
    result.success = false;
    result.progress = 0.0;
    memset(result.current_step, 0, sizeof(result.current_step));
    memset(result.error_message, 0, sizeof(result.error_message));
    
    if (g_export_session != nil) {
        result.success = true;
        result.progress = g_export_session.progress * 100.0;
        
        switch (g_export_session.status) {
            case AVAssetExportSessionStatusWaiting:
                strcpy(result.current_step, "Waiting to export...");
                break;
            case AVAssetExportSessionStatusExporting:
                strcpy(result.current_step, "Exporting video...");
                break;
            case AVAssetExportSessionStatusCompleted:
                strcpy(result.current_step, "Export completed");
                break;
            case AVAssetExportSessionStatusFailed:
                strcpy(result.current_step, "Export failed");
                if (g_export_session.error != nil) {
                    strncpy(result.error_message, [g_export_session.error.localizedDescription UTF8String], sizeof(result.error_message) - 1);
                }
                break;
            case AVAssetExportSessionStatusCancelled:
                strcpy(result.current_step, "Export cancelled");
                break;
            default:
                strcpy(result.current_step, "Unknown status");
                break;
        }
    } else {
        strcpy(result.current_step, "No export in progress");
    }
    
    return result;
}

// Cancel current export
ExportResult cancel_export_objc() {
    ExportResult result;
    result.success = false;
    result.progress = 0.0;
    memset(result.current_step, 0, sizeof(result.current_step));
    memset(result.error_message, 0, sizeof(result.error_message));
    
    if (g_export_session != nil) {
        [g_export_session cancelExport];
        result.success = true;
        strcpy(result.current_step, "Export cancelled");
        NSLog(@"🛑 Export cancelled by user");
    } else {
        strcpy(result.error_message, "No export in progress to cancel");
    }
    
    return result;
}
