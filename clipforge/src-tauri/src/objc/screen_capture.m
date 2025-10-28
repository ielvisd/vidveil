#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <QuartzCore/QuartzCore.h>

// C-compatible struct to return errors
typedef struct {
    bool success;
    char error_message[512];
} CaptureResult;

// Global error storage
static NSError* g_last_recording_error = nil;

// Delegate for AVCaptureFileOutput
@interface RecordingDelegate : NSObject <AVCaptureFileOutputRecordingDelegate>
@end

@implementation RecordingDelegate

- (void)captureOutput:(AVCaptureFileOutput *)output 
didFinishRecordingToOutputFileAtURL:(NSURL *)outputFileURL 
      fromConnections:(NSArray<AVCaptureConnection *> *)connections 
                error:(NSError *)error {
    if (error) {
        NSLog(@"❌ Recording finished with error: %@", error.localizedDescription);
        NSLog(@"❌ Error domain: %@, code: %ld", error.domain, (long)error.code);
        g_last_recording_error = error;
    } else {
        NSLog(@"✅ Recording finished successfully: %@", outputFileURL.path);
        g_last_recording_error = nil;
    }
}

- (void)captureOutput:(AVCaptureFileOutput *)output 
didStartRecordingToOutputFileAtURL:(NSURL *)outputFileURL 
      fromConnections:(NSArray<AVCaptureConnection *> *)connections {
    NSLog(@"🎬 Delegate: Recording started to %@", outputFileURL.path);
}

@end

// Global session reference
static AVCaptureSession* g_session = nil;
static AVCaptureMovieFileOutput* g_output = nil;
static RecordingDelegate* g_delegate = nil;
static AVCaptureDeviceInput* g_cameraInput = nil;

// Webcam recording session (separate from screen recording)
static AVCaptureSession* g_webcam_session = nil;
static AVCaptureMovieFileOutput* g_webcam_output = nil;
static RecordingDelegate* g_webcam_delegate = nil;
static AVCaptureDeviceInput* g_webcam_input = nil;

// Helper function to get camera device
AVCaptureDevice* get_camera_device() {
    AVCaptureDeviceDiscoverySession* session = 
        [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:@[AVCaptureDeviceTypeBuiltInWideAngleCamera]
                                                               mediaType:AVMediaTypeVideo
                                                                position:AVCaptureDevicePositionUnspecified];
    return session.devices.firstObject;
}

// Helper function to check camera permission
bool check_camera_permission() {
    AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
    return status == AVAuthorizationStatusAuthorized;
}

// Helper function to request camera permission (synchronous wait)
bool request_camera_permission_sync() {
    @autoreleasepool {
        __block BOOL granted = NO;
        __block BOOL finished = NO;
        
        [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo 
                                  completionHandler:^(BOOL allowed) {
            granted = allowed;
            finished = YES;
        }];
        
        // Wait for response (max 10 seconds)
        NSDate* timeout = [NSDate dateWithTimeIntervalSinceNow:10.0];
        while (!finished && [timeout timeIntervalSinceNow] > 0) {
            [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
        }
        
        return granted;
    }
}

// NOTE: PiP with custom shapes will be implemented in Phase 2 (post-recording compositing)
// For now, we record screen + webcam as separate sources and composite during export

// Start screen recording with exception handling
CaptureResult start_screen_recording_objc(
    uint32_t display_id,
    bool include_audio,
    bool include_webcam,
    int pip_shape __attribute__((unused)),
    float pip_x_percent __attribute__((unused)),
    float pip_y_percent __attribute__((unused)),
    float pip_size_percent __attribute__((unused)),
    const char* output_path
) {
    CaptureResult result;
    result.success = false;
    memset(result.error_message, 0, sizeof(result.error_message));
    
    @autoreleasepool {
        @try {
            NSLog(@"🚀 Starting new recording session to: %s", output_path);
            NSLog(@"📷 include_webcam parameter received: %d", include_webcam);
            
            // FORCE complete cleanup of any existing session
            if (g_output != nil) {
                NSLog(@"⚠️ Stopping existing output");
                if ([g_output isRecording]) {
                    [g_output stopRecording];
                    NSLog(@"⏳ Waiting for recording to stop...");
                    [NSThread sleepForTimeInterval:3.0];  // Increased from 2.0
                }
                g_output = nil;
            }
            
            if (g_session != nil) {
                NSLog(@"⚠️ Stopping existing session");
                if ([g_session isRunning]) {
                    [g_session stopRunning];
                    NSLog(@"⏳ Waiting for session to stop...");
                    // Wait LONGER for session to FULLY stop
                    [NSThread sleepForTimeInterval:3.0];  // Increased from 2.0
                }
                
                // Remove all inputs and outputs
                for (AVCaptureInput *input in [g_session inputs]) {
                    [g_session removeInput:input];
                }
                for (AVCaptureOutput *output in [g_session outputs]) {
                    [g_session removeOutput:output];
                }
                
                g_session = nil;
            }
            
            // Clear delegate
            g_delegate = nil;
            
            NSLog(@"✅ Cleanup complete, letting AVFoundation settle...");
            // CRITICAL: Wait for AVFoundation to fully release resources
            [NSThread sleepForTimeInterval:1.0];
            NSLog(@"✅ Ready for fresh session");
            
            // Clear any previous delegate errors
            g_last_recording_error = nil;
            
            // TEMPORARILY SKIP PERMISSION CHECK - macOS permission cache is buggy
            // Just proceed and let AVFoundation fail if permission is missing
            NSLog(@"⏭️ Skipping permission check, will proceed with recording attempt");
            
            // Create a FRESH delegate every time
            g_delegate = [[RecordingDelegate alloc] init];
            NSLog(@"✅ Created fresh delegate for this recording");
            
            // Create capture session (ARC manages memory automatically)
            g_session = [[AVCaptureSession alloc] init];
            if (g_session == nil) {
                strncpy(result.error_message, "Failed to create AVCaptureSession", sizeof(result.error_message) - 1);
                return result;
            }
            
            [g_session beginConfiguration];
            
            // NOTE: Do NOT set session preset for AVCaptureScreenInput
            // Screen input doesn't use presets and it can cause issues
            
            // Create screen input
            AVCaptureScreenInput* screenInput = [[AVCaptureScreenInput alloc] initWithDisplayID:display_id];
            if (screenInput == nil) {
                strncpy(result.error_message, "Failed to create screen input", sizeof(result.error_message) - 1);
                g_session = nil;  // ARC will deallocate
                return result;
            }
            
            // Set screen input properties
            screenInput.capturesCursor = YES;
            screenInput.capturesMouseClicks = YES;
            
            // CRITICAL: Set minimum frame rate for screen capture
            // Without this, AVFoundation may not capture any frames
            screenInput.minFrameDuration = CMTimeMake(1, 30); // 30 fps minimum
            NSLog(@"✅ Screen input configured: cursor=%d, clicks=%d, fps=30", YES, YES);
            
            // Add screen input to session
            if ([g_session canAddInput:screenInput]) {
                [g_session addInput:screenInput];
            } else {
                strncpy(result.error_message, "Cannot add screen input to session", sizeof(result.error_message) - 1);
                g_session = nil;  // ARC will deallocate
                return result;
            }
            
            // TODO: Webcam recording temporarily disabled - need to fix permission flow
            // The camera permission prompt was interfering with the screen recording session
            if (include_webcam) {
                NSLog(@"📷 Setting up webcam recording...");
                
                // Check camera permission first
                AVAuthorizationStatus cameraStatus = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
                if (cameraStatus == AVAuthorizationStatusNotDetermined) {
                    NSLog(@"📷 Camera permission not determined - requesting...");
                    // Request permission asynchronously
                    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
                        if (granted) {
                            NSLog(@"✅ Camera permission granted");
                        } else {
                            NSLog(@"❌ Camera permission denied");
                        }
                    }];
                } else if (cameraStatus == AVAuthorizationStatusAuthorized) {
                    NSLog(@"✅ Camera permission already granted");
                } else {
                    NSLog(@"⚠️ Camera permission denied or restricted");
                }
            }
            
            // Add audio input if requested
            if (include_audio) {
                AVCaptureDevice* audioDevice = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeAudio];
                if (audioDevice != nil) {
                    NSError* audioError = nil;
                    AVCaptureDeviceInput* audioInput = [[AVCaptureDeviceInput alloc] initWithDevice:audioDevice error:&audioError];
                    if (audioError != nil) {
                        NSLog(@"⚠️ Failed to create audio input: %@", audioError.localizedDescription);
                    } else if ([g_session canAddInput:audioInput]) {
                        [g_session addInput:audioInput];
                        NSLog(@"✅ Microphone audio input added");
                    } else {
                        NSLog(@"⚠️ Cannot add microphone audio input to session");
                    }
                } else {
                    NSLog(@"⚠️ No default audio device found");
                }
            }
            
            // Setup webcam recording if requested
            if (include_webcam) {
                // Create separate webcam session
                g_webcam_session = [[AVCaptureSession alloc] init];
                if (g_webcam_session == nil) {
                    NSLog(@"⚠️ Failed to create webcam session");
                } else {
                    [g_webcam_session beginConfiguration];
                    
                    // Get default camera
                    AVCaptureDevice* camera = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
                    if (camera == nil) {
                        NSLog(@"⚠️ No camera device found");
                        g_webcam_session = nil;
                    } else {
                        // Create camera input
                        NSError* cameraError = nil;
                        g_webcam_input = [[AVCaptureDeviceInput alloc] initWithDevice:camera error:&cameraError];
                        if (cameraError != nil) {
                            NSLog(@"⚠️ Failed to create camera input: %@", cameraError.localizedDescription);
                            g_webcam_session = nil;
                        } else if ([g_webcam_session canAddInput:g_webcam_input]) {
                            [g_webcam_session addInput:g_webcam_input];
                            NSLog(@"✅ Camera input added to webcam session");
                            
                            // Create webcam output
                            g_webcam_output = [[AVCaptureMovieFileOutput alloc] init];
                            if (g_webcam_output != nil && [g_webcam_session canAddOutput:g_webcam_output]) {
                                [g_webcam_session addOutput:g_webcam_output];
                                NSLog(@"✅ Webcam output added to session");
                            } else {
                                NSLog(@"⚠️ Failed to add webcam output");
                                g_webcam_session = nil;
                            }
                        } else {
                            NSLog(@"⚠️ Cannot add camera input to webcam session");
                            g_webcam_session = nil;
                        }
                    }
                    
                    [g_webcam_session commitConfiguration];
                    
                    // Start webcam session
                    if (g_webcam_session != nil) {
                        [g_webcam_session startRunning];
                        NSLog(@"✅ Webcam session started");
                    }
                }
            }
            
            // Create movie file output
            g_output = [[AVCaptureMovieFileOutput alloc] init];
            if (g_output == nil) {
                strncpy(result.error_message, "Failed to create movie output", sizeof(result.error_message) - 1);
                g_session = nil;  // ARC will deallocate
                return result;
            }
            
            // Add output to session
            if ([g_session canAddOutput:g_output]) {
                [g_session addOutput:g_output];
            } else {
                strncpy(result.error_message, "Cannot add output to session", sizeof(result.error_message) - 1);
                g_output = nil;
                g_session = nil;  // ARC will deallocate
                return result;
            }
            
            // Commit configuration FIRST before accessing connections
            [g_session commitConfiguration];
            
            // CRITICAL: Enable the connection between screen input and output
            // Without this, AVFoundation won't capture any frames
            AVCaptureConnection* connection = [g_output connectionWithMediaType:AVMediaTypeVideo];
            if (connection != nil) {
                if ([connection isActive]) {
                    NSLog(@"✅ Video connection is active and enabled");
                } else {
                    NSLog(@"⚠️ Video connection exists but is not active");
                }
            } else {
                NSLog(@"❌ WARNING: No video connection found between input and output!");
                strncpy(result.error_message, "No video connection between screen input and output", sizeof(result.error_message) - 1);
                g_output = nil;
                g_session = nil;
                return result;
            }
            
            // Start the session
            [g_session startRunning];
            
            // Wait a moment for session to fully start
            [NSThread sleepForTimeInterval:0.5];
            
            // Check if session is actually running
            if (![g_session isRunning]) {
                strncpy(result.error_message, "Session failed to start - check screen recording permissions in System Settings > Privacy & Security > Screen Recording", sizeof(result.error_message) - 1);
                g_session = nil;
                g_output = nil;
                return result;
            }
            
            // Create file URL
            NSString* pathString = [NSString stringWithUTF8String:output_path];
            NSURL* fileURL = [NSURL fileURLWithPath:pathString];
            
            // Verify output can record
            if (![g_output isRecording]) {
                NSLog(@"📹 About to start recording to: %@", fileURL.path);
            }
            
            // Start BOTH recordings simultaneously for perfect sync
            NSLog(@"🎬 Starting synchronized recordings...");
            
            // Start screen recording
            [g_output startRecordingToOutputFileURL:fileURL recordingDelegate:g_delegate];
            NSLog(@"📺 Screen recording started");
            
            // Start webcam recording simultaneously if available
            if (g_webcam_output != nil && g_webcam_session != nil) {
                // Create webcam file path
                NSString* webcamPath = [pathString stringByReplacingOccurrencesOfString:@".mp4" withString:@"-webcam.mp4"];
                NSURL* webcamURL = [NSURL fileURLWithPath:webcamPath];
                
                // Create webcam delegate
                g_webcam_delegate = [[RecordingDelegate alloc] init];
                
                // Start webcam recording IMMEDIATELY after screen recording
                [g_webcam_output startRecordingToOutputFileURL:webcamURL recordingDelegate:g_webcam_delegate];
                NSLog(@"📹 Webcam recording started simultaneously");
            }
            
            // Wait LONGER and verify recording actually started
            NSLog(@"⏳ Waiting for recording to initialize...");
            [NSThread sleepForTimeInterval:1.5];  // Increased from 0.5
            
            if (![g_output isRecording]) {
                NSLog(@"❌ Recording did NOT start - isRecording returned NO");
                strncpy(result.error_message, 
                    "Failed to start recording - macOS may not have granted screen recording permission. "
                    "Check System Settings > Privacy & Security > Screen Recording and ensure the app is enabled. "
                    "You may need to remove and re-add the app, or restart your Mac.",
                    sizeof(result.error_message) - 1);
                
                [g_session stopRunning];
                g_session = nil;
                g_output = nil;
                return result;
            }
            
            NSLog(@"✅ Recording started successfully - isRecording returned YES");
            NSLog(@"✅ File should be writing to: %@", fileURL.path);
            result.success = true;
            return result;
            
        } @catch (NSException* exception) {
            // Caught an Objective-C exception!
            const char* reason = [[exception reason] UTF8String];
            snprintf(result.error_message, sizeof(result.error_message), 
                    "Objective-C exception: %s", reason);
            
            // Clean up (ARC handles memory automatically)
            g_output = nil;
            g_session = nil;
            
            return result;
        }
    }
}

// Stop screen recording with exception handling
CaptureResult stop_screen_recording_objc() {
    CaptureResult result;
    result.success = false;
    memset(result.error_message, 0, sizeof(result.error_message));
    
    @autoreleasepool {
        @try {
            if (g_output == nil || g_session == nil) {
                strncpy(result.error_message, "No recording in progress", sizeof(result.error_message) - 1);
                return result;
            }
            
            // Stop recording
            [g_output stopRecording];
            
            // Stop webcam recording if active
            if (g_webcam_output != nil) {
                NSLog(@"📹 Stopping webcam recording");
                [g_webcam_output stopRecording];
            }
            
            // Wait longer for file to finalize (AVFoundation needs time to write)
            [NSThread sleepForTimeInterval:2.0];
            
            // Stop session
            [g_session stopRunning];
            
            // Stop webcam session if active
            if (g_webcam_session != nil) {
                NSLog(@"📹 Stopping webcam session");
                [g_webcam_session stopRunning];
            }
            
            // Give extra time for cleanup
            [NSThread sleepForTimeInterval:0.5];
            
            // Clear references (ARC handles deallocation)
            g_output = nil;
            g_session = nil;
            g_webcam_output = nil;
            g_webcam_session = nil;
            g_webcam_delegate = nil;
            
            result.success = true;
            return result;
            
        } @catch (NSException* exception) {
            const char* reason = [[exception reason] UTF8String];
            snprintf(result.error_message, sizeof(result.error_message), 
                    "Objective-C exception: %s", reason);
            
            // Clean up on error
            g_output = nil;
            g_session = nil;
            
            return result;
        }
    }
}

// Check if currently recording
bool is_recording_objc() {
    return (g_session != nil && g_output != nil && [g_session isRunning]);
}

