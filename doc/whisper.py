"""
Google Colab / Kaggle Script for OpenAI Whisper Transcription
Run this cell in a notebook to transcribe audio/video to highly accurate text with timestamps.

# 1. INSTALLATION CELL
!pip install --upgrade openai-whisper
!sudo apt-get install -y ffmpeg

# 2. RUN CELL
import whisper
import json
import os

def transcribe_audio(input_file, model_size="base", output_json="transcript.json"):
    print(f"Loading Whisper '{model_size}' model (this downloads weights the first time)...")
    model = whisper.load_model(model_size)
    
    print(f"Transcribing: {input_file}...")
    # fp16=False avoids warnings on CPUs/older GPUs. Remove if using powerful Colab T4/A100 GPU
    result = model.transcribe(input_file, fp16=False)
    
    # Save the output to JSON for easy parsing
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        
    print(f"✅ Success! Full transcript saved to {output_json}")
    print(f"Transcript preview: {result['text'][:200]}...")

# Example Usage:
# transcribe_audio("my_video.mp4", model_size="base")
# Use "turbo" or "large-v3" model_size for the absolute best accuracy
"""
