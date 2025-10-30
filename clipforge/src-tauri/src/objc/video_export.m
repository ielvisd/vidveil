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
    } else if ([resStr isEqualToString:@"480p"] || [resStr isEqualToString:@"420p"]) {
        // Map 420p to 480p (420p is not a standard resolution, user likely meant 480p)
        return CGSizeMake(854, 480);
    } else if ([resStr isEqualToString:@"360p"]) {
        return CGSizeMake(640, 360);
    } else if ([resStr isEqualToString:@"source"]) {
        return CGSizeZero; // Indicates preserve source resolution
    }
    // Log warning for unsupported resolution
    NSLog(@"⚠️ Unsupported resolution: %@, defaulting to 1080p", resStr);
    // Default to 1080p
    return CGSizeMake(1920, 1080);
}

// Helper function to get export preset based on quality
NSString* get_export_preset(const char* quality, const char* preset) {
    // Suppress unused parameter warning - kept for API consistency
    (void)preset;
    
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
    float pip_width_percent,
    float pip_height_percent,
    const char* pip_shape_svg
) {
    // Suppress unused parameter warnings - these are kept for API consistency
    (void)pip_x_percent;
    (void)pip_y_percent;
    (void)pip_width_percent;
    (void)pip_height_percent;
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
        
        // Validate screen video path exists
        NSString* screenPath = [NSString stringWithUTF8String:screen_video_path];
        NSFileManager* fileManager = [NSFileManager defaultManager];
        if (![fileManager fileExistsAtPath:screenPath]) {
            NSLog(@"❌ Screen video file does not exist: %@", screenPath);
            return nil;
        }
        
        // Load screen video asset
        NSURL* screenURL = [NSURL fileURLWithPath:screenPath];
        AVAsset* screenAsset = [AVAsset assetWithURL:screenURL];
        
        if (screenAsset == nil) {
            NSLog(@"❌ Failed to load screen video asset from: %@", screenPath);
            return nil;
        }
        
        // Validate asset has video tracks
        NSArray<AVAssetTrack*>* screenVideoTracks = [screenAsset tracksWithMediaType:AVMediaTypeVideo];
        if (screenVideoTracks.count == 0) {
            NSLog(@"❌ Screen asset has no video tracks: %@", screenPath);
            return nil;
        }
        
        NSLog(@"📹 Screen video asset loaded: %.0fx%.0f @ %.2fs", 
            screenVideoTracks[0].naturalSize.width,
            screenVideoTracks[0].naturalSize.height,
            CMTimeGetSeconds(screenAsset.duration));
        
        // Insert screen video track (REQUIRED - composition is invalid without this)
        AVAssetTrack* screenVideoTrack = screenVideoTracks.firstObject;
        CMTimeRange timeRange = CMTimeRangeMake(kCMTimeZero, screenAsset.duration);
        BOOL inserted = [screenTrack insertTimeRange:timeRange 
                                             ofTrack:screenVideoTrack 
                                              atTime:kCMTimeZero 
                                               error:&error];
        
        if (!inserted || error != nil) {
            NSLog(@"❌ Failed to insert screen video track: %@", error.localizedDescription ?: @"Unknown error");
            return nil;
        }
        
        // Verify track was actually inserted
        if (screenTrack.segments.count == 0) {
            NSLog(@"❌ Screen video track has no segments after insertion");
            return nil;
        }
        
        NSLog(@"✅ Screen video track inserted successfully (%lu segments)", (unsigned long)screenTrack.segments.count);
        
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
        if (webcamTrack != nil && webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
            NSString* webcamPath = [NSString stringWithUTF8String:webcam_video_path];
            
            // Validate webcam path exists
            if (![fileManager fileExistsAtPath:webcamPath]) {
                NSLog(@"⚠️ Webcam video file does not exist: %@ (skipping webcam)", webcamPath);
                webcamTrack = nil;
            } else {
                NSURL* webcamURL = [NSURL fileURLWithPath:webcamPath];
                AVAsset* webcamAsset = [AVAsset assetWithURL:webcamURL];
                
                if (webcamAsset != nil) {
                    NSArray<AVAssetTrack*>* webcamVideoTracks = [webcamAsset tracksWithMediaType:AVMediaTypeVideo];
                    if (webcamVideoTracks.count > 0) {
                        AVAssetTrack* webcamVideoTrack = webcamVideoTracks.firstObject;
                        
                        // CRITICAL: Use screen duration instead of webcam duration to ensure tracks are synchronized
                        // This ensures the PiP overlay stays visible for the entire composition duration
                        CMTime screenDuration = screenAsset.duration;
                        CMTime webcamDuration = webcamAsset.duration;
                        
                        // Use the shorter of the two durations for the time range, but ensure webcam extends to screen duration
                        CMTimeRange webcamTimeRange = CMTimeRangeMake(kCMTimeZero, webcamDuration);
                        
                        NSError* webcamError = nil;
                        BOOL webcamInserted = [webcamTrack insertTimeRange:webcamTimeRange 
                                                                     ofTrack:webcamVideoTrack 
                                                                      atTime:kCMTimeZero 
                                                                       error:&webcamError];
                        
                        if (webcamInserted && webcamError == nil) {
                            NSLog(@"✅ Webcam video track inserted successfully: %.0fx%.0f @ %.2fs (screen: %.2fs)",
                                webcamVideoTrack.naturalSize.width,
                                webcamVideoTrack.naturalSize.height,
                                CMTimeGetSeconds(webcamDuration),
                                CMTimeGetSeconds(screenDuration));
                            
                            // If webcam is shorter than screen, extend it by looping
                            if (CMTimeCompare(webcamDuration, screenDuration) < 0) {
                                CMTime remainingDuration = CMTimeSubtract(screenDuration, webcamDuration);
                                NSLog(@"🔄 Extending webcam track to match screen duration (%.2fs remaining)", CMTimeGetSeconds(remainingDuration));
                                
                                // Loop the webcam video to fill the remaining duration
                                while (CMTimeCompare(remainingDuration, kCMTimeZero) > 0) {
                                    CMTime loopDuration = CMTimeCompare(remainingDuration, webcamDuration) > 0 
                                        ? webcamDuration 
                                        : remainingDuration;
                                    CMTime insertTime = webcamTrack.timeRange.duration;
                                    
                                    BOOL loopInserted = [webcamTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, loopDuration)
                                                                              ofTrack:webcamVideoTrack
                                                                               atTime:insertTime
                                                                                error:&webcamError];
                                    
                                    if (!loopInserted || webcamError != nil) {
                                        NSLog(@"⚠️ Failed to extend webcam track: %@ (continuing anyway)", 
                                            webcamError.localizedDescription ?: @"Unknown error");
                                        break;
                                    }
                                    
                                    remainingDuration = CMTimeSubtract(remainingDuration, loopDuration);
                                }
                                
                                NSLog(@"✅ Webcam track extended to match screen duration: %.2fs", 
                                    CMTimeGetSeconds(webcamTrack.timeRange.duration));
                            }
                        } else {
                            NSLog(@"⚠️ Failed to insert webcam video track: %@ (continuing without webcam)", 
                                webcamError.localizedDescription ?: @"Unknown error");
                            webcamTrack = nil;
                        }
                    } else {
                        NSLog(@"⚠️ Webcam asset has no video tracks (skipping webcam)");
                        webcamTrack = nil;
                    }
                } else {
                    NSLog(@"⚠️ Failed to load webcam asset from: %@ (skipping webcam)", webcamPath);
                    webcamTrack = nil;
                }
            }
        }
        
        // Final validation: composition must have at least the screen track
        NSArray<AVMutableCompositionTrack*>* videoTracks = [composition tracksWithMediaType:AVMediaTypeVideo];
        if (videoTracks.count == 0) {
            NSLog(@"❌ Composition has no video tracks - composition invalid");
            return nil;
        }
        
        NSLog(@"✅ Composition created successfully with %lu video track(s)", (unsigned long)videoTracks.count);
        return composition;
    }
}

// Helper function to create video composition with PiP
AVMutableVideoComposition* create_pip_composition(
    AVMutableComposition* composition,
    float pip_x_percent,
    float pip_y_percent,
    float pip_width_percent,
    float pip_height_percent,
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
        
        // Ensure screen track is first (background layer)
        // Track 0 should be screen, track 1 should be webcam (PiP overlay)
        AVMutableCompositionTrack* screenTrack = videoTracks[0];
        AVMutableCompositionTrack* webcamTrack = videoTracks.count > 1 ? videoTracks[1] : nil;
        
        NSLog(@"📹 Composition has %lu video track(s): screen=track[0], webcam=track[1]", (unsigned long)videoTracks.count);
        
        // Validate screen track has segments (content)
        if (screenTrack.segments.count == 0) {
            NSLog(@"❌ Screen track has no segments - composition invalid");
            return nil;
        }
        
        // Get video dimensions from the first segment's source track
        AVCompositionTrackSegment* firstSegment = screenTrack.segments.firstObject;
        if (firstSegment == nil) {
            NSLog(@"❌ Screen track has no segments");
            return nil;
        }
        
        // Get source URL and track ID from segment, then load the asset to get track dimensions
        NSURL* sourceURL = firstSegment.sourceURL;
        CMPersistentTrackID sourceTrackID = firstSegment.sourceTrackID;
        
        if (sourceURL == nil) {
            NSLog(@"❌ Screen track segment has no source URL");
            return nil;
        }
        
        AVAsset* sourceAsset = [AVAsset assetWithURL:sourceURL];
        if (sourceAsset == nil) {
            NSLog(@"❌ Failed to load source asset from segment");
            return nil;
        }
        
        AVAssetTrack* screenVideoTrack = [sourceAsset trackWithTrackID:sourceTrackID];
        if (screenVideoTrack == nil) {
            // Fallback: get first video track if track ID lookup fails
            NSArray<AVAssetTrack*>* videoTracks = [sourceAsset tracksWithMediaType:AVMediaTypeVideo];
            screenVideoTrack = videoTracks.firstObject;
        }
        
        if (screenVideoTrack == nil) {
            NSLog(@"❌ No source track found in screen track segment");
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
        
        
        // Calculate screen transform for CoreAnimation layer
        CGAffineTransform screenTransform = (scaleX != 1.0 || scaleY != 1.0) ? CGAffineTransformMakeScale(scaleX, scaleY) : CGAffineTransformIdentity;
        NSLog(@"✅ Screen layer instruction added (trackID: %d, transform: scale %.3fx, %.3fy)", 
            (int)screenTrack.trackID, scaleX, scaleY);
        
        // Prepare PiP variables for CoreAnimation layer (if webcam available)
        BOOL hasWebcam = (webcamTrack != nil && webcamTrack.segments.count > 0);
        CGAffineTransform pipTransform = CGAffineTransformIdentity;
        CGFloat finalPipWidth = 0, finalPipHeight = 0, pipXFromLeft = 0, pipYFromTop = 0;
        CGSize webcamSize = renderSize; // Default fallback

        if (hasWebcam) {
            // Calculate PiP dimensions and normalized position in render size coordinates
            float pipXPercentClamped = MAX(0.0f, MIN(1.0f, pip_x_percent));
            float pipYPercentClamped = MAX(0.0f, MIN(1.0f, pip_y_percent));
            float pipWidthPercentClamped = MAX(0.0f, MIN(1.0f, pip_width_percent));
            float pipHeightPercentClamped = MAX(0.0f, MIN(1.0f, pip_height_percent));

            // Get webcam track size for scaling
            if (webcamTrack.segments.count > 0) {
                AVCompositionTrackSegment* firstWebcamSegment = webcamTrack.segments.firstObject;
                if (firstWebcamSegment != nil && firstWebcamSegment.sourceURL != nil) {
                    AVAsset* webcamSourceAsset = [AVAsset assetWithURL:firstWebcamSegment.sourceURL];
                    if (webcamSourceAsset != nil) {
                        AVAssetTrack* webcamVideoTrack = [webcamSourceAsset trackWithTrackID:firstWebcamSegment.sourceTrackID];
                        if (webcamVideoTrack == nil) {
                            NSArray<AVAssetTrack*>* webcamVideoTracks = [webcamSourceAsset tracksWithMediaType:AVMediaTypeVideo];
                            webcamVideoTrack = webcamVideoTracks.firstObject;
                        }
                        if (webcamVideoTrack != nil) {
                            webcamSize = webcamVideoTrack.naturalSize;
                        }
                    }
                }
            }
            
            // Derive height from width if invalid
            if (pipHeightPercentClamped <= 0.0f || isnan(pipHeightPercentClamped) || isinf(pipHeightPercentClamped)) {
                if (pipWidthPercentClamped <= 0.0f || isnan(pipWidthPercentClamped) || isinf(pipWidthPercentClamped)) {
                    pipWidthPercentClamped = 0.2f;
                }
                if (webcamSize.width > 0 && webcamSize.height > 0) {
                    pipHeightPercentClamped = pipWidthPercentClamped * (webcamSize.height / webcamSize.width);
                } else {
                    pipHeightPercentClamped = pipWidthPercentClamped * (9.0f / 16.0f);
                }
            }
            
            // Calculate final dimensions and position
            float pipWidth = renderSize.width * pipWidthPercentClamped;
            float pipHeight = renderSize.height * pipHeightPercentClamped;
            pipXFromLeft = renderSize.width * pipXPercentClamped;
            pipYFromTop = renderSize.height * pipYPercentClamped;

            CGFloat uniformScale = MIN(pipWidth / webcamSize.width, pipHeight / webcamSize.height);
            finalPipWidth = webcamSize.width * uniformScale;
            finalPipHeight = webcamSize.height * uniformScale;

            // Ensure minimum size
            if (finalPipWidth < 120 || finalPipHeight < 120) {
                uniformScale = MAX(uniformScale, MAX(120.0 / webcamSize.width, 120.0 / webcamSize.height));
                finalPipWidth = webcamSize.width * uniformScale;
                finalPipHeight = webcamSize.height * uniformScale;
            }

            // Clamp position to bounds (top-left origin for CALayer)
            pipXFromLeft = MAX(0, MIN(pipXFromLeft, renderSize.width - finalPipWidth));
            pipYFromTop = MAX(0, MIN(pipYFromTop, renderSize.height - finalPipHeight));

            // Create transform for CALayer (top-left origin)
            pipTransform = CGAffineTransformMakeScale(uniformScale, uniformScale);
            pipTransform = CGAffineTransformTranslate(pipTransform, pipXFromLeft / uniformScale, pipYFromTop / uniformScale);

            webcamTrack.enabled = YES;
                AVCompositionTrackSegment* firstWebcamSegment = webcamTrack.segments.firstObject;
                if (firstWebcamSegment != nil && firstWebcamSegment.sourceURL != nil) {
                    AVAsset* webcamSourceAsset = [AVAsset assetWithURL:firstWebcamSegment.sourceURL];
                    if (webcamSourceAsset != nil) {
                        AVAssetTrack* webcamVideoTrack = [webcamSourceAsset trackWithTrackID:firstWebcamSegment.sourceTrackID];
                        if (webcamVideoTrack == nil) {
                            NSArray<AVAssetTrack*>* webcamVideoTracks = [webcamSourceAsset tracksWithMediaType:AVMediaTypeVideo];
                            webcamVideoTrack = webcamVideoTracks.firstObject;
                        }
                        if (webcamVideoTrack != nil) {
                            preferredTransform = webcamVideoTrack.preferredTransform;
                            // Check if there's a non-identity transform
                            if (!CGAffineTransformIsIdentity(preferredTransform)) {
                                NSLog(@"⚠️ Webcam has preferred transform - may need to account for rotation");
                            }
                        }
                    }
                }
            }
            
            // Create base transform: scale + translate
            // IMPORTANT: Transform order matters!
            // CGAffineTransformConcat(A, B) applies B first, then A
            // For PiP: we want to scale first, then translate
            // Correct order: translate * scale * preferredTransform
            // This means: apply preferredTransform first, then scale, then translate
            
            // Step 1: Start with preferred transform (rotation/orientation) if needed
            CGAffineTransform pipTransform = CGAffineTransformIdentity;
            if (!CGAffineTransformIsIdentity(preferredTransform)) {
                pipTransform = preferredTransform;
                NSLog(@"🔧 Applying preferred transform first");
            }
            
            // Step 2: Apply scale transform (uniform scale to preserve aspect ratio)
            // IMPORTANT: Concat order is backwards - we want scale AFTER preferredTransform
            // So: CGAffineTransformConcat(scaleTransform, pipTransform) applies pipTransform first, then scaleTransform
            CGAffineTransform scaleTransform = CGAffineTransformMakeScale(pipScaleXForTransform, pipScaleYForTransform);
            pipTransform = CGAffineTransformConcat(scaleTransform, pipTransform);
            
            // Step 3: Apply translation (position)
            // IMPORTANT: Concat order is backwards - we want translate AFTER scale
            // So: CGAffineTransformConcat(translateTransform, pipTransform) applies pipTransform first, then translateTransform
            // This gives us: translate * scale * preferredTransform, which is what we want
            CGAffineTransform translateTransform = CGAffineTransformMakeTranslation(pipOriginX, pipOriginY);
            pipTransform = CGAffineTransformConcat(translateTransform, pipTransform);
            
            // CRITICAL FIX: For identity preferred transform, use direct construction
            // This is more reliable than concatenating transforms
            // Also ensures the transform is exactly what we want
            if (CGAffineTransformIsIdentity(preferredTransform)) {
                pipTransform = CGAffineTransformMake(
                    pipScaleXForTransform, 0.0,
                    0.0, pipScaleYForTransform,
                    pipOriginX, pipOriginY
                );
                NSLog(@"🔧 Using direct transform construction (identity preferred transform)");
            } else {
                NSLog(@"🔧 Using concatenated transform (non-identity preferred transform)");
            }
            
            // Log the transform matrix for debugging
            NSLog(@"🔧 Transform matrix (constructed directly):");
            NSLog(@"   [%.4f, %.4f, %.4f]", pipTransform.a, pipTransform.b, pipTransform.tx);
            NSLog(@"   [%.4f, %.4f, %.4f]", pipTransform.c, pipTransform.d, pipTransform.ty);
            NSLog(@"   [%.4f, %.4f, %.4f]", 0.0, 0.0, 1.0);
            
            // Verify: track point (0,0) should map to render (pipOriginX, pipOriginY)
            CGFloat testX = pipTransform.a * 0 + pipTransform.c * 0 + pipTransform.tx;
            CGFloat testY = pipTransform.b * 0 + pipTransform.d * 0 + pipTransform.ty;
            NSLog(@"🔧 Transform verification: track(0,0) -> render(%.0f, %.0f) [expected: left %.0f, bottom %.0f]", 
                testX, testY, pipOriginX, pipOriginY);
            
            // Verify: track point (webcamSize.width, webcamSize.height) should map to render (pipOriginX+finalPipWidth, pipOriginY+finalPipHeight)
            CGFloat testX2 = pipTransform.a * webcamSize.width + pipTransform.c * webcamSize.height + pipTransform.tx;
            CGFloat testY2 = pipTransform.b * webcamSize.width + pipTransform.d * webcamSize.height + pipTransform.ty;
            NSLog(@"🔧 Transform verification: track(%.0f, %.0f) -> render(%.0f, %.0f) [expected: %.0f, %.0f]", 
                webcamSize.width, webcamSize.height, testX2, testY2, pipOriginX + finalPipWidth, pipOriginY + finalPipHeight);
            
            // Set transform for the entire duration
            // AVFoundation applies transforms at specific times
            // CRITICAL: Always use composition duration, not webcam track duration
            // This ensures the overlay stays visible for the entire video
            CMTime compositionDuration = composition.duration;
            
            // CRITICAL: Use transform ramp to ensure continuous application throughout duration
            // This is more reliable than setting discrete keyframes
            CMTimeRange fullTimeRange = CMTimeRangeMake(kCMTimeZero, compositionDuration);
            
            // Set transform ramp from start to end (same transform = constant throughout)
            [webcamLayerInstruction setTransformRampFromStartTransform:pipTransform 
                                                       toEndTransform:pipTransform 
                                                              timeRange:fullTimeRange];
            
            NSLog(@"🔧 Transform ramp set for entire composition duration (0.00s - %.2fs)", 
                CMTimeGetSeconds(compositionDuration));
            
            // Also set at specific times as backup (in case ramp doesn't work)
            [webcamLayerInstruction setTransform:pipTransform atTime:kCMTimeZero];
            if (CMTimeCompare(compositionDuration, kCMTimeZero) > 0) {
                [webcamLayerInstruction setTransform:pipTransform atTime:compositionDuration];
                NSLog(@"🔧 Transform also set at start (0.00s) and end (%.2fs) as backup", 
                    CMTimeGetSeconds(compositionDuration));
            }
            
            // Ensure opacity is set to 1.0 (fully visible) for the entire duration
            // CRITICAL: Use composition duration, not webcam track duration
            // Use opacity ramp to ensure continuous application throughout duration
            [webcamLayerInstruction setOpacityRampFromStartOpacity:1.0 
                                                    toEndOpacity:1.0 
                                                        timeRange:fullTimeRange];
            
            NSLog(@"🔧 Opacity ramp set for entire composition duration (0.00s - %.2fs)", 
                CMTimeGetSeconds(compositionDuration));
            
            // Also set at specific times as backup
            [webcamLayerInstruction setOpacity:1.0 atTime:kCMTimeZero];
            if (CMTimeCompare(compositionDuration, kCMTimeZero) > 0) {
                [webcamLayerInstruction setOpacity:1.0 atTime:compositionDuration];
                NSLog(@"🔧 Opacity also set at start (0.00s) and end (%.2fs) as backup", 
                    CMTimeGetSeconds(compositionDuration));
            }
            
            NSLog(@"🔍 Transform and opacity set for composition duration (%.2fs)", 
                CMTimeGetSeconds(compositionDuration));
            
            // CRITICAL: Ensure the webcam track is explicitly enabled
            webcamTrack.enabled = YES;
            
            // Log opacity values to verify they're set correctly
            NSLog(@"🔍 Opacity verification: set to 1.0 at multiple time points throughout duration");
            
            // Verify layer instruction is being added
            NSLog(@"📋 Adding webcam layer instruction to composition (opacity: 1.0 throughout, composition duration: %.2fs)", CMTimeGetSeconds(compositionDuration));
            
            // Additional validation: check that the layer instruction can actually be applied
            // by verifying the track has content
            if (webcamTrack.segments.count == 0) {
                NSLog(@"❌ CRITICAL ERROR: Webcam track has no segments - layer instruction will be ignored!");
            } else {
                NSLog(@"✅ Webcam track has %lu segment(s) - layer instruction should be valid", (unsigned long)webcamTrack.segments.count);
            }
            
            // Apply shape mask if provided
            if (pip_shape_svg != NULL && strlen(pip_shape_svg) > 0) {
                // For now, use rectangular mask
                // TODO: Implement SVG shape masking
                NSLog(@"📐 PiP shape: %s (rectangular mask applied)", pip_shape_svg);
            }
            
            [layerInstructions addObject:webcamLayerInstruction];
            NSLog(@"📷 PiP positioned at left %.0f, bottom %.0f with size %.0fx%.0f (uniform scale preserves aspect ratio)",
                pipOriginX, pipOriginY, finalPipWidth, finalPipHeight);
            NSLog(@"📋 Layer instructions count: %lu (screen + webcam)", (unsigned long)layerInstructions.count);
            
            // CRITICAL: Verify the layer instruction is properly set up
            NSLog(@"🔍 Webcam layer instruction final verification:");
            NSLog(@"   trackID: %d", (int)webcamLayerInstruction.trackID);
            NSLog(@"   transform at time 0: a=%.4f, b=%.4f, c=%.4f, d=%.4f, tx=%.4f, ty=%.4f", 
                pipTransform.a, pipTransform.b, pipTransform.c, pipTransform.d, pipTransform.tx, pipTransform.ty);
            
            // Verify layer order: webcam should be last (rendered on top)
            NSLog(@"🔍 Layer order verification:");
            NSLog(@"   Layer[0]: screen track (background)");
            NSLog(@"   Layer[%lu]: webcam track (PiP overlay, should be on top)", (unsigned long)layerInstructions.count - 1);
            
            // CRITICAL: Log the actual layer instruction objects to verify they're correct
            for (NSUInteger i = 0; i < layerInstructions.count; i++) {
                AVMutableVideoCompositionLayerInstruction* layer = layerInstructions[i];
                NSLog(@"   Layer[%lu]: trackID=%d", (unsigned long)i, (int)layer.trackID);
            }
        }
        
        // Switch to CoreAnimationTool for elliptical PiP masking
        // Create parent layer (render canvas, top-left origin for web-like ease)
        CALayer *parentLayer = [CALayer layer];
        parentLayer.frame = CGRectMake(0, 0, renderSize.width, renderSize.height);
        parentLayer.geometryFlipped = YES;  // Flip y-axis to match web (y=0 at top)

        // Background: Screen layer (full frame, your existing transform)
        CALayer *screenLayer = [CALayer layer];
        screenLayer.frame = CGRectMake(0, 0, renderSize.width, renderSize.height);
        screenLayer.transform = CATransform3DMakeAffineTransform(screenTransform);  // Your scale/center
        [parentLayer addSublayer:screenLayer];  // Bottom

        // Overlay: Webcam PiP layer with elliptical mask
        if (webcamTrack != nil && webcamTrack.segments.count > 0) {
            CALayer *pipLayer = [CALayer layer];
            pipLayer.frame = CGRectMake(pipXFromLeft, pipYFromTop, finalPipWidth, finalPipHeight);  // Top-left pos
            pipLayer.transform = CATransform3DMakeAffineTransform(pipTransform);  // Your scale/pos
            pipLayer.opacity = 1.0;

            // Elliptical mask: CAShapeLayer with bezier path
            CAShapeLayer *ellipseMask = [CAShapeLayer layer];
            UIBezierPath *ellipsePath = [UIBezierPath bezierPathWithOvalInRect:pipLayer.bounds];  // Circle if square; ellipse if rect
            ellipseMask.path = ellipsePath.CGPath;
            pipLayer.mask = ellipseMask;  // Applies rounded clip

            [parentLayer addSublayer:pipLayer];  // Top

            NSLog(@"🔧 Elliptical mask applied: path bounds %@ (rounded PiP ready)", NSStringFromCGRect(pipLayer.bounds));
        }

        // Tool: Binds layers to composition (replaces manual instructions)
        AVVideoCompositionCoreAnimationTool *animationTool = [AVVideoCompositionCoreAnimationTool
                                                               videoCompositionCoreAnimationToolWithPostProcessingAsVideoLayers:@[parentLayer]
                                                               inLayer:parentLayer];
        videoComposition.animationTool = animationTool;

        // No manual instructions needed with animationTool
        videoComposition.instructions = @[];

        NSLog(@"✅ Video composition created with elliptical PiP");
        
        // Verify video composition settings
        NSLog(@"📋 Video composition settings:");
        NSLog(@"   renderSize: %.0fx%.0f", videoComposition.renderSize.width, videoComposition.renderSize.height);
        NSLog(@"   frameDuration: %f seconds", CMTimeGetSeconds(videoComposition.frameDuration));
        NSLog(@"   instructions count: %lu (using animationTool for elliptical PiP)", (unsigned long)videoComposition.instructions.count);
        
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
    float pip_width_percent,
    float pip_height_percent,
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
            
            // Log PiP parameters
            if (webcam_video_path != NULL && strlen(webcam_video_path) > 0) {
                NSLog(@"🎥 PiP parameters received:");
                NSLog(@"   Position: x=%.4f (%.1f%%), y=%.4f (%.1f%%)", 
                    pip_x_percent, pip_x_percent * 100.0, pip_y_percent, pip_y_percent * 100.0);
                NSLog(@"   Size: width=%.4f (%.1f%%), height=%.4f (%.1f%%)", 
                    pip_width_percent, pip_width_percent * 100.0, pip_height_percent, pip_height_percent * 100.0);
                NSLog(@"   Shape: %s", pip_shape_svg ? pip_shape_svg : "none");
            } else {
                NSLog(@"ℹ️ No webcam video - PiP will not be applied");
            }
            
            // Get target resolution and bitrate settings
            CGSize targetResolution = get_resolution_size(resolution);
            
            // Log resolution (helpful for debugging)
            NSString* resolutionStr = [NSString stringWithUTF8String:resolution];
            NSLog(@"📏 Export resolution: %@", resolutionStr);
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
                pip_width_percent,
                pip_height_percent,
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
                AVMutableCompositionTrack* compositionTrack = videoTracks[0];
                
                // Get source size from the first segment (same method as create_pip_composition)
                if (compositionTrack.segments.count > 0) {
                    AVCompositionTrackSegment* firstSegment = compositionTrack.segments.firstObject;
                    if (firstSegment != nil && firstSegment.sourceURL != nil) {
                        NSURL* sourceURL = firstSegment.sourceURL;
                        CMPersistentTrackID sourceTrackID = firstSegment.sourceTrackID;
                        
                        AVAsset* sourceAsset = [AVAsset assetWithURL:sourceURL];
                        if (sourceAsset != nil) {
                            AVAssetTrack* sourceTrack = [sourceAsset trackWithTrackID:sourceTrackID];
                            if (sourceTrack == nil) {
                                // Fallback: get first video track
                                NSArray<AVAssetTrack*>* sourceVideoTracks = [sourceAsset tracksWithMediaType:AVMediaTypeVideo];
                                sourceTrack = sourceVideoTracks.firstObject;
                            }
                            
                            if (sourceTrack != nil) {
                                sourceSize = sourceTrack.naturalSize;
                                NSLog(@"📺 Source video size: %.0fx%.0f", sourceSize.width, sourceSize.height);
                            }
                        }
                    }
                }
            }
            
            // Validate sourceSize is valid
            if (sourceSize.width <= 0 || sourceSize.height <= 0) {
                NSLog(@"❌ Invalid source size detected: %.0fx%.0f - cannot determine scaling", sourceSize.width, sourceSize.height);
                strcpy(result.error_message, "Failed to determine source video dimensions. Export cannot proceed.");
                return result;
            }
            
            NSLog(@"📐 Source size: %.0fx%.0f, Target size: %.0fx%.0f", 
                sourceSize.width, sourceSize.height, targetResolution.width, targetResolution.height);
            
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
                        pip_width_percent,
                        pip_height_percent,
                        pip_shape_svg,
                        targetResolution
                    );
                } else {
                    // Just scaling, no PiP
                    // Validate sourceSize again before using for scaling
                    if (sourceSize.width <= 0 || sourceSize.height <= 0) {
                        NSLog(@"❌ Cannot create video composition: invalid source size %.0fx%.0f", 
                            sourceSize.width, sourceSize.height);
                        strcpy(result.error_message, "Invalid source video dimensions for scaling");
                        return result;
                    }
                    
                    videoComposition = [AVMutableVideoComposition videoComposition];
                    videoComposition.frameDuration = CMTimeMake(1, 30);
                    videoComposition.renderSize = targetResolution;
                    
                    AVMutableVideoCompositionInstruction* instruction = 
                        [AVMutableVideoCompositionInstruction videoCompositionInstruction];
                    instruction.timeRange = CMTimeRangeMake(kCMTimeZero, composition.duration);
                    
                    CGFloat scaleX = targetResolution.width / sourceSize.width;
                    CGFloat scaleY = targetResolution.height / sourceSize.height;
                    
                    NSLog(@"🔧 Applying scale transform: %.3fx, %.3fy (%.0fx%.0f -> %.0fx%.0f)", 
                        scaleX, scaleY, sourceSize.width, sourceSize.height, 
                        targetResolution.width, targetResolution.height);
                    
                    AVMutableVideoCompositionLayerInstruction* layerInstruction = 
                        [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:videoTracks[0]];
                    CGAffineTransform transform = CGAffineTransformMakeScale(scaleX, scaleY);
                    [layerInstruction setTransform:transform atTime:kCMTimeZero];
                    
                    instruction.layerInstructions = @[layerInstruction];
                    videoComposition.instructions = @[instruction];
                    
                    NSLog(@"✅ Video composition created with renderSize: %.0fx%.0f", 
                        videoComposition.renderSize.width, videoComposition.renderSize.height);
                }
                
                if (videoComposition == nil) {
                    strcpy(result.error_message, "Failed to create video composition");
                    return result;
                }
            }
            
            strcpy(result.current_step, "Setting up export session...");
            
            // Debug: Log composition details
            NSArray<AVMutableCompositionTrack*>* compVideoTracks = [composition tracksWithMediaType:AVMediaTypeVideo];
            NSArray<AVMutableCompositionTrack*>* compAudioTracks = [composition tracksWithMediaType:AVMediaTypeAudio];
            
            NSLog(@"📊 Composition details:");
            NSLog(@"   Duration: %.2f seconds", CMTimeGetSeconds(composition.duration));
            NSLog(@"   Video tracks: %lu", (unsigned long)compVideoTracks.count);
            NSLog(@"   Audio tracks: %lu", (unsigned long)compAudioTracks.count);
            
            // Validate composition has at least one video track
            if (compVideoTracks.count == 0) {
                strcpy(result.error_message, "Composition has no video tracks - cannot export");
                NSLog(@"❌ Composition validation failed: no video tracks");
                return result;
            }
            
            // Log details of each video track
            for (NSUInteger i = 0; i < compVideoTracks.count; i++) {
                AVMutableCompositionTrack* track = compVideoTracks[i];
                NSLog(@"   Video track[%lu]: %lu segments, duration: %.2fs", 
                    (unsigned long)i, (unsigned long)track.segments.count, CMTimeGetSeconds(track.timeRange.duration));
            }
            
            // When we have a custom video composition (PiP or resolution scaling), 
            // we need to use a preset that re-encodes and applies the video composition.
            // Passthrough might not apply video compositions properly.
            // HighestQuality preset should definitely apply video compositions.
            NSString* actualPreset = exportPreset;
            if (needsVideoComposition) {
                // Use HighestQuality preset which re-encodes and applies video compositions
                // This ensures the PiP overlay is actually rendered
                actualPreset = AVAssetExportPresetHighestQuality;
                NSLog(@"🔧 Using HighestQuality preset for custom video composition with PiP");
                NSLog(@"   HighestQuality re-encodes and applies videoComposition.renderSize and layer instructions");
            } else {
                NSLog(@"🔧 Using quality preset: %@", exportPreset);
            }
            
            // Create export session with appropriate preset
            AVAssetExportSession* exportSession = [AVAssetExportSession exportSessionWithAsset:composition 
                                                                                      presetName:actualPreset];
            
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
            
            // Set video composition if we have PiP or resolution scaling
            if (videoComposition != nil) {
                exportSession.videoComposition = videoComposition;
                NSLog(@"✅ Video composition assigned to export session (renderSize: %.0fx%.0f)", 
                    videoComposition.renderSize.width, videoComposition.renderSize.height);
                
                // Verify video composition is actually set (check if property is not nil)
                if (exportSession.videoComposition != nil) {
                    NSLog(@"✅ Video composition verified on export session");
                    NSLog(@"   Export session videoComposition renderSize: %.0fx%.0f",
                        exportSession.videoComposition.renderSize.width,
                        exportSession.videoComposition.renderSize.height);
                    NSLog(@"   Export session videoComposition instructions count: %lu",
                        (unsigned long)exportSession.videoComposition.instructions.count);
                } else {
                    NSLog(@"❌ ERROR: Video composition is nil on export session after assignment!");
                }
            } else {
                NSLog(@"ℹ️ No video composition needed (using presetup scaling)");
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
            
            // Check final export status (may have changed after waiting)
            AVAssetExportSessionStatus finalStatus = exportSession.status;
            NSLog(@"🔄 Final export session status: %ld", (long)finalStatus);
            
            // Re-check export success based on final status
            exportSuccess = (finalStatus == AVAssetExportSessionStatusCompleted);
            if (!exportSuccess && exportError == nil) {
                exportError = exportSession.error;
            }
            
            if (exportSuccess) {
                // Validate output file was created and has reasonable size
                NSString* outputPath = [NSString stringWithUTF8String:output_path];
                NSFileManager* fileManager = [NSFileManager defaultManager];
                NSDictionary* fileAttributes = [fileManager attributesOfItemAtPath:outputPath error:nil];
                
                if (fileAttributes == nil) {
                    // File doesn't exist
                    strcpy(result.error_message, "Export completed but output file was not created");
                    NSLog(@"❌ Export reported success but file does not exist: %@", outputPath);
                    result.success = false;
                    return result;
                }
                
                NSNumber* fileSize = fileAttributes[NSFileSize];
                unsigned long long sizeBytes = [fileSize unsignedLongLongValue];
                
                NSLog(@"📊 Exported file size: %llu bytes (%.2f KB)", sizeBytes, sizeBytes / 1024.0);
                
                // Log composition duration for reference
                NSLog(@"📊 Composition duration: %.2f seconds", CMTimeGetSeconds(composition.duration));
                
                // Minimum file size check: any valid video should be > 100KB
                const unsigned long long MIN_FILE_SIZE = 100 * 1024; // 100KB
                
                if (sizeBytes < MIN_FILE_SIZE) {
                    NSString* sizeStr = [NSByteCountFormatter stringFromByteCount:sizeBytes countStyle:NSByteCountFormatterCountStyleFile];
                    NSString* errorMsg = [NSString stringWithFormat:@"Exported file is suspiciously small (%@). Export may have failed. Composition duration: %.2fs", sizeStr, CMTimeGetSeconds(composition.duration)];
                    strncpy(result.error_message, [errorMsg UTF8String], sizeof(result.error_message) - 1);
                    result.error_message[sizeof(result.error_message) - 1] = '\0';
                    
                    NSLog(@"❌ Export file too small: %@ (%.2f KB) - minimum expected: %.2f KB", 
                        outputPath, sizeBytes / 1024.0, MIN_FILE_SIZE / 1024.0);
                    NSLog(@"❌ Composition has duration: %.2fs - file size should be much larger", CMTimeGetSeconds(composition.duration));
                    
                    // Additional diagnostics
                    NSLog(@"📊 Export session preset: %@", exportSession.presetName);
                    NSLog(@"📊 Export session outputFileType: %@", exportSession.outputFileType);
                    if (exportSession.videoComposition) {
                        NSLog(@"📊 Video composition renderSize: %.0fx%.0f", 
                            exportSession.videoComposition.renderSize.width, 
                            exportSession.videoComposition.renderSize.height);
                    }
                    
                    result.success = false;
                    return result;
                }
                
                // Log successful export with file size
                NSString* sizeStr = [NSByteCountFormatter stringFromByteCount:sizeBytes countStyle:NSByteCountFormatterCountStyleFile];
                NSLog(@"✅ Native video export completed successfully: %@ (size: %@)", outputPath, sizeStr);
                
                result.success = true;
                result.progress = 100.0;
                strcpy(result.current_step, "Export completed successfully");
            } else {
                if (exportError != nil) {
                    // Build comprehensive error message
                    NSMutableString* errorMsg = [NSMutableString string];
                    
                    // Main error description
                    if (exportError.localizedDescription) {
                        [errorMsg appendString:exportError.localizedDescription];
                    }
                    
                    // Add error domain and code for debugging
                    NSString* domain = exportError.domain;
                    NSInteger code = exportError.code;
                    
                    if (domain && ![domain isEqualToString:@""]) {
                        [errorMsg appendFormat:@" (Domain: %@, Code: %ld)", domain, (long)code];
                    }
                    
                    // Add failure reason if available
                    if (exportError.localizedFailureReason) {
                        [errorMsg appendFormat:@". Reason: %@", exportError.localizedFailureReason];
                    }
                    
                    // Add recovery suggestion if available
                    if (exportError.localizedRecoverySuggestion) {
                        [errorMsg appendFormat:@" Suggestion: %@", exportError.localizedRecoverySuggestion];
                    }
                    
                    // Log detailed error for debugging
                    NSLog(@"❌ Export failed - Domain: %@, Code: %ld", domain, (long)code);
                    NSLog(@"❌ Error description: %@", exportError.localizedDescription);
                    if (exportError.localizedFailureReason) {
                        NSLog(@"❌ Failure reason: %@", exportError.localizedFailureReason);
                    }
                    if (exportError.userInfo) {
                        NSLog(@"❌ Error userInfo: %@", exportError.userInfo);
                    }
                    
                    // Also check export session status for additional context
                    NSString* statusString = @"Unknown";
                    switch (exportSession.status) {
                        case AVAssetExportSessionStatusUnknown:
                            statusString = @"Unknown";
                            break;
                        case AVAssetExportSessionStatusWaiting:
                            statusString = @"Waiting";
                            break;
                        case AVAssetExportSessionStatusExporting:
                            statusString = @"Exporting";
                            break;
                        case AVAssetExportSessionStatusCompleted:
                            statusString = @"Completed";
                            break;
                        case AVAssetExportSessionStatusFailed:
                            statusString = @"Failed";
                            break;
                        case AVAssetExportSessionStatusCancelled:
                            statusString = @"Cancelled";
                            break;
                    }
                    NSLog(@"❌ Export session status: %@", statusString);
                    
                    // Copy error message to result (truncate if too long)
                    const char* errorCString = [errorMsg UTF8String];
                    size_t errorLen = strlen(errorCString);
                    size_t maxLen = sizeof(result.error_message) - 1;
                    
                    if (errorLen > maxLen) {
                        // Truncate but try to keep it readable
                        strncpy(result.error_message, errorCString, maxLen);
                        result.error_message[maxLen] = '\0';
                        NSLog(@"⚠️ Error message truncated to fit buffer size");
                    } else {
                        strncpy(result.error_message, errorCString, sizeof(result.error_message) - 1);
                        result.error_message[sizeof(result.error_message) - 1] = '\0';
                    }
                } else {
                    // No error object, check export session status
                    NSString* statusString = @"Unknown";
                    switch (exportSession.status) {
                        case AVAssetExportSessionStatusCancelled:
                            statusString = @"Cancelled";
                            break;
                        case AVAssetExportSessionStatusFailed:
                            statusString = @"Failed";
                            break;
                        default:
                            statusString = @"Unknown";
                            break;
                    }
                    snprintf(result.error_message, sizeof(result.error_message),
                            "Export failed with status: %s", [statusString UTF8String]);
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
