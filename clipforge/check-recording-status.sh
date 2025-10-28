#!/bin/bash

# Quick Native Recording Test
echo "🔍 Checking VidVeil Native Recording Status..."
echo "=============================================="

# Check if VidVeil is running
if pgrep -f "nuxtor" > /dev/null; then
    echo "✅ VidVeil app is running"
else
    echo "❌ VidVeil app is not running"
    echo "💡 Start it with: cd clipforge && bun run tauri:dev"
    exit 1
fi

# Check screen recording permissions using a different method
echo ""
echo "🔐 Checking Screen Recording Permissions..."
echo "=========================================="

# Check if we can see the permission status
if command -v tccutil > /dev/null 2>&1; then
    echo "📋 Screen Recording Permission Status:"
    tccutil reset ScreenCapture com.vidveil.nuxtor 2>/dev/null || echo "⚠️  Cannot check permission status"
else
    echo "⚠️  tccutil not available"
fi

echo ""
echo "📋 Manual Permission Check Required:"
echo "===================================="
echo "1. Open System Settings (System Preferences)"
echo "2. Go to Privacy & Security"
echo "3. Click on Screen Recording"
echo "4. Look for 'VidVeil' or 'nuxtor' in the list"
echo "5. If present, ensure it's checked/enabled"
echo "6. If not present, the app needs to request permission first"

echo ""
echo "🧪 Testing Steps:"
echo "================"
echo "1. Open VidVeil app"
echo "2. Navigate to the recorder page (/recorder)"
echo "3. Click 'Start Recording' button"
echo "4. If permission dialog appears, click 'Allow'"
echo "5. Wait 5-10 seconds"
echo "6. Click 'Stop Recording'"
echo "7. Check if file was created in /tmp/"

echo ""
echo "🔍 Expected Behavior:"
echo "===================="
echo "- First time: macOS should show permission dialog"
echo "- After permission granted: Recording should start immediately"
echo "- Console should show: 'Starting native recording...'"
echo "- File should be created: /tmp/vidveil-recording-[timestamp].mp4"

echo ""
echo "🐛 If Recording Fails:"
echo "===================="
echo "1. Check Console.app for error messages"
echo "2. Look for 'AVFoundation' or 'screen capture' errors"
echo "3. Verify app is running in Tauri mode (not browser mode)"
echo "4. Try restarting the app after granting permissions"

echo ""
echo "📁 Check for existing recordings:"
echo "================================"
ls -la /tmp/vidveil-recording-*.mp4 2>/dev/null || echo "No existing recordings found"

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Grant screen recording permission if prompted"
echo "2. Test recording functionality manually"
echo "3. Check console logs for any errors"
echo "4. Report results back"
