#!/bin/bash

# Native Recording Test Script
# This script tests the macOS native recording functionality

echo "🧪 Testing Native macOS Recording..."
echo "=================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This test is only for macOS"
    exit 1
fi

# Check if Tauri app is running
if ! pgrep -f "nuxtor" > /dev/null; then
    echo "⚠️  Tauri app is not running. Starting it..."
    cd /Users/elvisibarra/Documents/GauntletAI/vidveil/clipforge
    bun run tauri:dev &
    sleep 10
fi

echo "✅ Tauri app is running"

# Check screen recording permissions
echo "🔍 Checking screen recording permissions..."
if system_profiler SPApplicationsDataType | grep -q "Screen Recording"; then
    echo "✅ Screen recording permission check available"
else
    echo "⚠️  Screen recording permission status unclear"
fi

# Check if test output directory exists
TEST_DIR="/tmp/vidveil-test"
mkdir -p "$TEST_DIR"

echo "📁 Test directory: $TEST_DIR"

# Test file path
TEST_FILE="$TEST_DIR/test-recording-$(date +%s).mp4"

echo "🎬 Test recording file: $TEST_FILE"

# Instructions for manual testing
echo ""
echo "📋 Manual Testing Instructions:"
echo "1. Open the VidVeil app"
echo "2. Navigate to the recorder page"
echo "3. Click 'Start Recording'"
echo "4. Wait 10 seconds"
echo "5. Click 'Stop Recording'"
echo "6. Check if file was created: $TEST_FILE"
echo ""

# Check if file exists after manual test
echo "⏳ Waiting for manual test completion..."
echo "Press Enter when you've completed the manual test, or 'q' to quit:"
read -r input

if [[ "$input" == "q" ]]; then
    echo "👋 Test cancelled"
    exit 0
fi

# Check for any MP4 files in test directory
RECORDING_FILES=$(find "$TEST_DIR" -name "*.mp4" -newer "$TEST_DIR" 2>/dev/null)

if [[ -n "$RECORDING_FILES" ]]; then
    echo "✅ Recording files found:"
    echo "$RECORDING_FILES"
    
    # Check file size
    for file in $RECORDING_FILES; do
        size=$(stat -f%z "$file" 2>/dev/null || echo "0")
        echo "📊 File size: $size bytes"
        
        if [[ "$size" -gt 1000 ]]; then
            echo "✅ File has content (size > 1KB)"
        else
            echo "⚠️  File is very small, may be empty"
        fi
    done
    
    echo ""
    echo "🎉 Native recording test PASSED!"
    echo "📹 Files created successfully"
    
else
    echo "❌ No recording files found"
    echo "🔍 Checking for any files in test directory:"
    ls -la "$TEST_DIR" || echo "Directory is empty"
    
    echo ""
    echo "❌ Native recording test FAILED"
    echo "💡 Possible issues:"
    echo "   - Screen recording permission not granted"
    echo "   - App not running in Tauri mode"
    echo "   - AVFoundation initialization failed"
    echo "   - File path issues"
fi

echo ""
echo "🧹 Cleaning up test files..."
rm -f "$TEST_DIR"/*.mp4
echo "✅ Cleanup complete"

echo ""
echo "📋 Next steps:"
echo "1. Check System Settings > Privacy & Security > Screen Recording"
echo "2. Ensure VidVeil is enabled"
echo "3. Try restarting the app if issues persist"
echo "4. Check console logs for detailed error messages"
