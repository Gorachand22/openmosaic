#!/usr/bin/env python3
"""
OpenMosaic Video Processing Module
Handles video download, trimming, effects, subtitles, and clip generation
"""

import sys
import json
import os
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
import tempfile

# Add venv to path
venv_path = Path(__file__).parent.parent.parent / "venv"
if venv_path.exists():
    sys.path.insert(0, str(venv_path / "lib" / "python3.12" / "site-packages"))

# Import yt_dlp separately (doesn't require moviepy)
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError as e:
    YT_DLP_AVAILABLE = False
    print(f"Warning: yt-dlp not available: {e}", file=sys.stderr)

try:
    from moviepy.editor import (
        VideoFileClip, AudioFileClip, TextClip, CompositeVideoClip,
        concatenate_videoclips, ColorClip
    )
    from moviepy.video.fx.all import resize, crop, fadein, fadeout
    MOVIEPY_AVAILABLE = True
except ImportError as e:
    MOVIEPY_AVAILABLE = False
    print(f"Warning: MoviePy not fully available: {e}", file=sys.stderr)

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent.parent / "download"
OUTPUT_DIR.mkdir(exist_ok=True)


def download_youtube_video(url: str, output_path: str = None) -> Dict[str, Any]:
    """Download a YouTube video"""
    if not YT_DLP_AVAILABLE:
        return {"success": False, "error": "yt-dlp not available. Install with: pip install yt-dlp"}
    
    if output_path is None:
        output_path = str(OUTPUT_DIR / "%(title)s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return {
                "success": True,
                "file_path": filename,
                "title": info.get("title", ""),
                "duration": info.get("duration", 0),
                "description": info.get("description", ""),
                "thumbnail": info.get("thumbnail", ""),
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_video_info(file_path: str) -> Dict[str, Any]:
    """Get video metadata using ffprobe"""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        video_stream = next(
            (s for s in data.get("streams", []) if s["codec_type"] == "video"), {}
        )
        audio_stream = next(
            (s for s in data.get("streams", []) if s["codec_type"] == "audio"), {}
        )
        
        return {
            "success": True,
            "duration": float(data.get("format", {}).get("duration", 0)),
            "size": int(data.get("format", {}).get("size", 0)),
            "width": int(video_stream.get("width", 0)),
            "height": int(video_stream.get("height", 0)),
            "fps": eval(video_stream.get("r_frame_rate", "0/1")),
            "video_codec": video_stream.get("codec_name", ""),
            "audio_codec": audio_stream.get("codec_name", ""),
            "bit_rate": int(data.get("format", {}).get("bit_rate", 0)),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def trim_video(input_path: str, output_path: str, start: float, end: float) -> Dict[str, Any]:
    """Trim video using FFmpeg"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / f"trimmed_{Path(input_path).stem}.mp4")
    
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ss", str(start), "-to", str(end),
        "-c:v", "libx264", "-c:a", "aac",
        "-preset", "fast", output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return {"success": True, "output_path": output_path}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr.decode() if e.stderr else str(e)}


def split_video_for_instagram(input_path: str, clips: List[Dict]) -> List[Dict[str, Any]]:
    """Split video into Instagram-ready clips (9:16 aspect ratio)"""
    results = []
    
    # Get video info first
    info = get_video_info(input_path)
    if not info.get("success"):
        return [{"success": False, "error": "Could not read video info"}]
    
    src_width = info.get("width", 1920)
    src_height = info.get("height", 1080)
    src_aspect = src_width / src_height
    target_aspect = 9 / 16
    
    for i, clip in enumerate(clips):
        start = clip.get("start", 0)
        end = clip.get("end", 30)
        output_path = str(OUTPUT_DIR / f"instagram_clip_{i+1}.mp4")
        
        # Choose the best method based on source aspect ratio
        if src_aspect > target_aspect:
            # Source is wider than target - crop sides and scale
            # Calculate crop dimensions
            crop_height = src_height
            crop_width = int(src_height * target_aspect)
            x_offset = (src_width - crop_width) // 2
            
            vf = f"crop={crop_width}:{crop_height}:{x_offset}:0,scale=1080:1920"
        else:
            # Source is taller/narrower than target - use blurred background
            # Scale video to fit height, add blurred/padded background
            vf = (
                f"split[original][bg];"
                f"[bg]scale=1080:1920:force_original_aspect_ratio=increase,"
                f"boxblur=20:20,gblur=sigma=20[blurred];"
                f"[original]scale=1080:1920:force_original_aspect_ratio=decrease[scaled];"
                f"[blurred][scaled]overlay=(W-w)/2:(H-h)/2"
            )
        
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-ss", str(start), "-to", str(end),
            "-vf", vf,
            "-c:v", "libx264", "-c:a", "aac",
            "-preset", "fast", 
            "-t", str(end - start),
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, check=True)
            results.append({
                "success": True,
                "output_path": output_path,
                "clip_number": i + 1,
                "duration": end - start,
                "method": "blurred_bg" if src_aspect <= target_aspect else "crop"
            })
        except subprocess.CalledProcessError as e:
            # Fallback to simpler method
            fallback_vf = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
            fallback_cmd = [
                "ffmpeg", "-y", "-i", input_path,
                "-ss", str(start), "-to", str(end),
                "-vf", fallback_vf,
                "-c:v", "libx264", "-c:a", "aac",
                "-preset", "fast",
                "-t", str(end - start),
                output_path
            ]
            try:
                subprocess.run(fallback_cmd, capture_output=True, check=True)
                results.append({
                    "success": True,
                    "output_path": output_path,
                    "clip_number": i + 1,
                    "duration": end - start,
                    "method": "fallback",
                    "original_error": e.stderr.decode() if e.stderr else str(e)
                })
            except subprocess.CalledProcessError as e2:
                results.append({
                    "success": False,
                    "clip_number": i + 1,
                    "error": e2.stderr.decode() if e2.stderr else str(e2),
                })
    
    return results


def add_subtitles(input_path: str, srt_path: str, output_path: str = None,
                  font_size: int = 24, font_color: str = "white") -> Dict[str, Any]:
    """Burn subtitles into video using FFmpeg"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / f"subtitled_{Path(input_path).stem}.mp4")
    
    # Escape the SRT path for FFmpeg
    srt_escaped = srt_path.replace(":", "\\:").replace("'", "'\\''")
    
    # Use the subtitles filter
    vf = f"subtitles='{srt_escaped}':force_style='FontSize={font_size},PrimaryColour=&H{font_color}'"
    
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", vf,
        "-c:v", "libx264", "-c:a", "copy",
        "-preset", "fast", output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return {"success": True, "output_path": output_path}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr.decode() if e.stderr else str(e)}


def create_srt_file(segments: List[Dict], output_path: str = None) -> str:
    """Create SRT subtitle file from segments"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / "subtitles.srt")
    
    def format_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(segments, 1):
            start = format_time(seg.get("start", 0))
            end = format_time(seg.get("end", 0))
            text = seg.get("text", "")
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")
    
    return output_path


def apply_video_effects(input_path: str, output_path: str = None,
                        brightness: float = 1.0, contrast: float = 1.0,
                        saturation: float = 1.0) -> Dict[str, Any]:
    """Apply color effects to video"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / f"effects_{Path(input_path).stem}.mp4")
    
    # Build FFmpeg filter
    filters = []
    if brightness != 1.0:
        filters.append(f"eq=brightness={(brightness - 1.0):.2f}")
    if contrast != 1.0:
        filters.append(f"eq=contrast={contrast:.2f}")
    if saturation != 1.0:
        filters.append(f"eq=saturation={saturation:.2f}")
    
    vf = ",".join(filters) if filters else "null"
    
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", vf,
        "-c:v", "libx264", "-c:a", "copy",
        "-preset", "fast", output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return {"success": True, "output_path": output_path}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr.decode() if e.stderr else str(e)}


def add_text_overlay(input_path: str, text: str, output_path: str = None,
                     position: str = "bottom", font_size: int = 48,
                     color: str = "white", bg_color: str = "black@0.5") -> Dict[str, Any]:
    """Add text overlay to video"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / f"overlay_{Path(input_path).stem}.mp4")
    
    # Position mapping
    positions = {
        "top": "x=(w-text_w)/2:y=h*0.1",
        "center": "x=(w-text_w)/2:y=(h-text_h)/2",
        "bottom": "x=(w-text_w)/2:y=h*0.9-text_h",
    }
    
    pos = positions.get(position, positions["bottom"])
    
    # Build drawtext filter
    vf = f"drawtext=text='{text}':fontsize={font_size}:fontcolor={color}:" \
         f"box=1:boxcolor={bg_color}:boxborderw=10:{pos}"
    
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", vf,
        "-c:v", "libx264", "-c:a", "copy",
        "-preset", "fast", output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return {"success": True, "output_path": output_path}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr.decode() if e.stderr else str(e)}


def concatenate_videos(video_paths: List[str], output_path: str = None) -> Dict[str, Any]:
    """Concatenate multiple videos"""
    if output_path is None:
        output_path = str(OUTPUT_DIR / "concatenated.mp4")
    
    # Create a file list for FFmpeg
    list_file = str(OUTPUT_DIR / "concat_list.txt")
    with open(list_file, 'w') as f:
        for path in video_paths:
            f.write(f"file '{path}'\n")
    
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c:v", "libx264", "-c:a", "aac",
        "-preset", "fast", output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return {"success": True, "output_path": output_path}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr.decode() if e.stderr else str(e)}
    finally:
        # Clean up list file
        if os.path.exists(list_file):
            os.remove(list_file)


def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        return
    
    command = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    result = {"error": f"Unknown command: {command}"}
    
    if command == "download":
        result = download_youtube_video(args.get("url"), args.get("output_path"))
    elif command == "info":
        result = get_video_info(args.get("file_path"))
    elif command == "trim":
        result = trim_video(
            args.get("input_path"),
            args.get("output_path"),
            args.get("start", 0),
            args.get("end", 30)
        )
    elif command == "split_instagram":
        result = split_video_for_instagram(
            args.get("input_path"),
            args.get("clips", [])
        )
    elif command == "add_subtitles":
        result = add_subtitles(
            args.get("input_path"),
            args.get("srt_path"),
            args.get("output_path")
        )
    elif command == "create_srt":
        result = {"success": True, "srt_path": create_srt_file(
            args.get("segments", []),
            args.get("output_path")
        )}
    elif command == "effects":
        result = apply_video_effects(
            args.get("input_path"),
            args.get("output_path"),
            args.get("brightness", 1.0),
            args.get("contrast", 1.0),
            args.get("saturation", 1.0)
        )
    elif command == "text_overlay":
        result = add_text_overlay(
            args.get("input_path"),
            args.get("text"),
            args.get("output_path"),
            args.get("position", "bottom"),
            args.get("font_size", 48),
            args.get("color", "white"),
            args.get("bg_color", "black@0.5")
        )
    elif command == "concatenate":
        result = concatenate_videos(
            args.get("video_paths", []),
            args.get("output_path")
        )
    
    print(json.dumps(result))


if __name__ == "__main__":
    main()
