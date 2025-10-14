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
    pretrained_model_path = 'C:\\Users\\natha\\OneDrive\\Desktop\\Coding\\Projects\\Consulting\\TwelveLabs\\nvidia_gtc\\stream-worker\\modules\\cv_pipeline\\runs\\detect\\train3\\weights\\best.pt'
    model = YOLO(pretrained_model_path)

    # Train pre-trained model on PPE dataset.
    dataset_path = Path(DOWNLOAD_PATH)  / 'data.yaml'
    results = model.train(

        data=dataset_path,

        device=0,
        imgsz=1280,  # The key change to improve small object detection.
        batch=4,     # A safe batch size for 1280px on a 4090 mobile GPU.

        # --- Experiment Tracking ---
        project="ppe_training_runs",
        name="yolo11m_finetune_imgsz1280_run1", # New name for the fine-tuning run.

        # --- CRITICAL CHANGE: Reduced training duration for fine-tuning ---
        epochs=30,   # We only need 20-30 epochs to adapt the model.
        patience=10, # Can be reduced for a shorter fine-tuning run.

        # --- Augmentations (can be kept the same) ---
        mosaic=1.0,
        close_mosaic=5, # Reduced as we have fewer total epochs.

        perspective=0.001,
        degrees=20.0,
        scale=0.5,
        translate=0.1,
        shear=1.0,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        fliplr=0.5,
        mixup=0.05,
        copy_paste=0.05
    )

if __name__ == '__main__':
    main()
