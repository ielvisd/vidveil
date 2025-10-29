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
    const char* pip_shape_svg
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
        
        // Create video composition
        AVMutableVideoComposition* videoComposition = [AVMutableVideoComposition videoComposition];
        videoComposition.frameDuration = CMTimeMake(1, 30); // 30 fps
        videoComposition.renderSize = screenSize;
        
        // Create instruction
        AVMutableVideoCompositionInstruction* instruction = [AVMutableVideoCompositionInstruction videoCompositionInstruction];
        instruction.timeRange = CMTimeRangeMake(kCMTimeZero, composition.duration);
        
        NSMutableArray* layerInstructions = [NSMutableArray array];
        
        // Screen layer (background)
        AVMutableVideoCompositionLayerInstruction* screenLayerInstruction = 
            [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:screenTrack];
        [layerInstructions addObject:screenLayerInstruction];
        
        // Webcam layer (PiP) if available
        if (webcamTrack != nil) {
            AVMutableVideoCompositionLayerInstruction* webcamLayerInstruction = 
                [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:webcamTrack];
            
            // Calculate PiP dimensions and position
            float pipWidth = screenSize.width * pip_size_percent;
            float pipHeight = screenSize.height * pip_size_percent;
            float pipX = screenSize.width * pip_x_percent;
            float pipY = screenSize.height * pip_y_percent;
            
            // Create transform for PiP positioning
            CGAffineTransform pipTransform = CGAffineTransformMakeScale(pip_size_percent, pip_size_percent);
            pipTransform = CGAffineTransformTranslate(pipTransform, 
                (pipX / pip_size_percent) - (screenSize.width * pip_x_percent), 
                (pipY / pip_size_percent) - (screenSize.height * pip_y_percent));
            
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
    
    // Suppress unused parameter warning - resolution is kept for API consistency
    (void)resolution;
    
    @autoreleasepool {
        @try {
            NSLog(@"🚀 Starting native video export");
            NSLog(@"📺 Screen video: %s", screen_video_path);
            NSLog(@"📷 Webcam video: %s", webcam_video_path ? webcam_video_path : "none");
            NSLog(@"📁 Output: %s", output_path);
            
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
            
            // Create video composition with PiP
            AVMutableVideoComposition* videoComposition = nil;
            if (webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
                videoComposition = create_pip_composition(
                    composition,
                    pip_x_percent,
                    pip_y_percent,
                    pip_size_percent,
                    pip_shape_svg
                );
                
                if (videoComposition == nil) {
                    strcpy(result.error_message, "Failed to create PiP video composition");
                    return result;
                }
            }
            
            strcpy(result.current_step, "Setting up export session...");
            
            // Debug: Log composition details
            NSLog(@"📊 Composition duration: %f seconds", CMTimeGetSeconds(composition.duration));
            NSLog(@"📊 Composition tracks: %lu", (unsigned long)composition.tracks.count);
            
            // Create export session with a more compatible preset
            AVAssetExportSession* exportSession = [AVAssetExportSession exportSessionWithAsset:composition 
                                                                                      presetName:AVAssetExportPresetPassthrough];
            
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
