import os
import torch

from pathlib import Path
from dotenv import load_dotenv
from ultralytics import YOLO
from roboflow import Roboflow

def main():

    load_dotenv()

    # Check if GPU is available
    is_available = torch.cuda.is_available()
    print(is_available)

    # Verify and Download Roboflow training dataset.
    DOWNLOAD_PATH = "C:/datasets/ppe-project"
    if not os.path.exists(DOWNLOAD_PATH):

        os.makedirs(DOWNLOAD_PATH)

        rf_client = Roboflow(api_key=os.getenv('ROBOFLOW_API_KEY'))
        project = rf_client.workspace("twelvelabs").project("ppe-factory-bmdcj-rupp1")
        version = project.version(1)
        dataset = version.download("yolov11", location=DOWNLOAD_PATH)

    # Load pre-trained RT-DETR model.
    model = YOLO("../../models/yolo11s.pt")

    # Train pre-trained model on PPE dataset.
    dataset_path = Path(DOWNLOAD_PATH)  / 'data.yaml'
    results = model.train(

        data=dataset_path,

        epochs=80,
        patience=20,
        batch=-1,
        imgsz=640,
        device=0,

        # --- AUGMENTATIONS FOR CCTV SIMULATION ---

        # 1. To simulate camera angle and distance
        perspective=0.001,  # CRITICAL: Simulates viewing from an angle. Start small.
        degrees=20.0,       # Increased rotation for more varied angles.
        scale=0.5,          # Increased scaling range to make objects much smaller or larger.
        translate=0.1,      # Re-enable to shift subjects off-center.
        shear=1.0,          # Re-enable to slant the image, adding to the angled effect.

        # 2. To simulate poor lighting and color
        hsv_h=0.015,        # Re-enable Hue for color shifts.
        hsv_s=0.7,          # Re-enable Saturation for washed-out or vibrant colors.
        hsv_v=0.4,          # Re-enable Value for brightness/darkness variations.
        fliplr=0.5,         # Keep horizontal flipping.

        # 3. To improve robustness to clutter and small objects
        mosaic=1.0,         # CRITICAL: Combines images to teach the model about scale and partial objects.
        close_mosaic=10,  # Keep for initial epochs to stabilize training.
        mixup=0.05,          # Re-enable to blend images, improving robustness. Start with a small value.
        copy_paste=0.05      # Copies objects from one image to another. Good for increasing object density.
    )

if __name__ == '__main__':
    main()
