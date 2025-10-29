#!/bin/bash

# dbuild - Build, copy, and run VidVeil desktop app
# Usage: dbuild [target-folder]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"
BUILD_OUTPUT="$PROJECT_DIR/src-tauri/target/release/bundle/macos/VidVeil.app"

# Target folder - default to ~/Applications, or use provided argument
TARGET_FOLDER="${1:-$HOME/Applications}"

echo -e "${GREEN}🚀 Building VidVeil desktop app...${NC}"
cd "$PROJECT_DIR"

# Build the app
bun run tauri:build

if [ ! -d "$BUILD_OUTPUT" ]; then
    echo -e "${YELLOW}❌ Build failed - app not found at $BUILD_OUTPUT${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "${YELLOW}📦 Copying to $TARGET_FOLDER...${NC}"

# Create target folder if it doesn't exist
mkdir -p "$TARGET_FOLDER"

# Remove old version if it exists
if [ -d "$TARGET_FOLDER/VidVeil.app" ]; then
    echo -e "${YELLOW}🗑️  Removing old version...${NC}"
    rm -rf "$TARGET_FOLDER/VidVeil.app"
fi

# Copy the new app
cp -R "$BUILD_OUTPUT" "$TARGET_FOLDER/VidVeil.app"

echo -e "${GREEN}✅ App copied to $TARGET_FOLDER/VidVeil.app${NC}"
echo -e "${GREEN}🚀 Launching VidVeil...${NC}"

# Launch the app
open "$TARGET_FOLDER/VidVeil.app"

echo -e "${GREEN}✨ Done! VidVeil is running.${NC}"

