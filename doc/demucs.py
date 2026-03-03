"""
Google Colab / Kaggle Script for Demucs Vocal Separation
Run this cell in a notebook to quickly separate vocals/music from any audio or video file.

# 1. INSTALLATION CELL
!pip install --upgrade demucs torchcodec

# 2. RUN CELL
import os
import subprocess

def separate_audio(input_file, output_dir="separated_audio"):
    os.makedirs(output_dir, exist_ok=True)
    print(f"Starting Demucs separation on: {input_file}")
    
    # htdemucs is the default high-quality model
    cmd = [
        "python", "-m", "demucs",
        "--out", output_dir,
        "-n", "htdemucs", 
        input_file
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        print(f"✅ Success! Files are located in {output_dir}/htdemucs/{base_name}/")
        print("You will find: vocals.wav, drums.wav, bass.wav, other.wav")
    else:
        print(f"❌ Error: {result.stderr}")

# Example Usage:
# separate_audio("my_song.mp3")
"""
