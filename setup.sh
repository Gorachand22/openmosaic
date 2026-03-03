#!/bin/bash
echo "Installing system dependencies..."
# Update package list
sudo apt-get update

# Install SoX, ImageMagick, and FFmpeg (required for OpenMosaic nodes)
sudo apt-get install -y ffmpeg sox libsox-fmt-all imagemagick python3 python3-pip python3-venv

echo "Setting up Python virtual environment..."
# We use a virtual environment so we don't break system python packages
python3 -m venv .venv
source .venv/bin/activate

echo "Installing Python dependencies..."
# Install Demucs, Whisper, and Matplotlib inside the virtual environment
pip install -r requirements.txt

echo "Setup complete! The AI tools are now installed."
