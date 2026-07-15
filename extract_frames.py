import cv2
import os

video_path = "../Screen Recording 2026-07-08 at 12.20.39.mov"
output_dir = "extracted_frames"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print(f"Opening video: {video_path}")
vid = cv2.VideoCapture(video_path)

if not vid.isOpened():
    print("Error: Could not open video file.")
    exit(1)

fps = vid.get(cv2.CAP_PROP_FPS)
print(f"Video FPS: {fps}")

frame_count = 0
saved_count = 0
interval = int(fps * 0.5)  # Save a frame every 0.5 seconds

while True:
    ret, frame = vid.read()
    if not ret:
        break
    
    if frame_count % interval == 0:
        filename = os.path.join(output_dir, f"frame_{saved_count:03d}.png")
        cv2.imwrite(filename, frame)
        saved_count += 1
        print(f"Saved: {filename}")
        
    frame_count += 1
    
    # Let's limit to 80 frames max so we don't bloat the workspace
    if saved_count >= 80:
        break

vid.release()
print(f"Completed! Extracted {saved_count} frames to '{output_dir}'.")
