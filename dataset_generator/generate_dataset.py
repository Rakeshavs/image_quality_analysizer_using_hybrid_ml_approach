"""
DIV2K-based Dataset Generator for Image Quality Assessment
===========================================================
Takes real DIV2K high-resolution clean images and programmatically
generates 5 types of degradations per image, then extracts 10 OpenCV
features for each image and saves a labeled CSV dataset.

Pipeline:
  DIV2K_train_HR (800 images) → sample 600-700 clean images
                              ↓
  For each clean image generate:
    GOOD         → resize + minor brightness jitter (clean)
    BLUR         → Gaussian blur ksize 11-25 or Motion blur
    UNDEREXPOSED → pixel * 0.15-0.40
    OVEREXPOSED  → pixel * 1.8-3.0, clipped
    NOISY        → Gaussian noise σ=25-55 or Salt&Pepper
    CORRUPTED    → JPEG Q=2-8 or channel zeroing or block dropout
                              ↓
  Extract 10 OpenCV features per image
                              ↓
  Save: dataset_generator/data/features.csv  (one row per image)
        dataset_generator/data/labels.json
"""

import os
import sys
import cv2
import random
import numpy as np
import pandas as pd
from pathlib import Path

# ── Paths ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent  # project root
TRAIN_DIR = ROOT / "DIV2K_train_HR" / "DIV2K_train_HR"
VALID_DIR = ROOT / "DIV2K_valid_HR" / "DIV2K_valid_HR"
OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Config ───────────────────────────────────────────────────────────────
TARGET_CLEAN_IMAGES = 130   # sample N clean images (×6 classes = 780 total)
RESIZE_TO = (512, 512)      # resize all images for uniform processing
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ── Feature names (must match ml_engine.py FEATURE_NAMES) ───────────────
FEATURE_NAMES = [
    "sharpness_laplacian_var",
    "sharpness_tenengrad",
    "brightness_mean",
    "brightness_std",
    "exposure_histogram_skew",
    "noise_residual_std",
    "contrast_michelson",
    "saturation_mean",
    "entropy",
    "corruption_score"
]

# ─────────────────────────────────────────────────────────────────────────
# FEATURE EXTRACTION
# ─────────────────────────────────────────────────────────────────────────

def extract_features(img: np.ndarray) -> dict:
    """Extract 10 OpenCV features from a BGR image (uint8)."""
    if img is None or img.size == 0:
        return {f: 0.0 for f in FEATURE_NAMES} | {"corruption_score": 1.0}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, w = gray.shape

    # 1. Laplacian variance (blur detection)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 2. Tenengrad (edge sharpness)
    sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    tenengrad = float(np.mean(sx**2 + sy**2))

    # 3 & 4. Brightness mean and std
    brightness_mean = float(np.mean(gray))
    brightness_std  = float(np.std(gray))

    # 5. Histogram skew (exposure distribution)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    hist_norm = hist / (hist.sum() + 1e-7)
    bins = np.arange(256)
    mean_bin = np.sum(bins * hist_norm)
    std_bin  = float(np.sqrt(np.sum(((bins - mean_bin)**2) * hist_norm))) + 1e-7
    histogram_skew = float(np.sum(((bins - mean_bin)**3) * hist_norm) / std_bin**3)

    # 6. Noise residual std (high-frequency noise)
    blurred = cv2.medianBlur(gray, 3)
    residual = gray.astype(np.float64) - blurred.astype(np.float64)
    noise_residual_std = float(np.std(residual))

    # 7. Michelson contrast
    mn, mx = float(np.min(gray)), float(np.max(gray))
    contrast_michelson = float((mx - mn) / (mx + mn + 1e-7))

    # 8. Saturation mean
    saturation_mean = float(np.mean(hsv[:, :, 1]))

    # 9. Shannon entropy
    p = hist_norm[hist_norm > 0]
    entropy = float(-np.sum(p * np.log2(p)))

    # 10. Corruption score
    corruption_score = 0.0
    if h < 32 or w < 32 or np.isnan(gray).any() or np.isinf(gray).any():
        corruption_score = 1.0

    return {
        "sharpness_laplacian_var": laplacian_var,
        "sharpness_tenengrad":     tenengrad,
        "brightness_mean":         brightness_mean,
        "brightness_std":          brightness_std,
        "exposure_histogram_skew": histogram_skew,
        "noise_residual_std":      noise_residual_std,
        "contrast_michelson":      contrast_michelson,
        "saturation_mean":         saturation_mean,
        "entropy":                 entropy,
        "corruption_score":        corruption_score,
    }

# ─────────────────────────────────────────────────────────────────────────
# DEGRADATION FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────

def apply_good(img: np.ndarray) -> np.ndarray:
    """Clean image — minor brightness jitter only."""
    factor = random.uniform(0.95, 1.05)
    return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)

def apply_blur(img: np.ndarray) -> np.ndarray:
    """Apply Gaussian or horizontal motion blur."""
    if random.random() < 0.6:
        ksize = random.choice([11, 15, 21, 25])
        return cv2.GaussianBlur(img, (ksize, ksize), 0)
    else:
        ksize = random.choice([15, 21, 25])
        kernel = np.zeros((ksize, ksize))
        kernel[ksize // 2, :] = 1.0 / ksize
        return cv2.filter2D(img, -1, kernel)

def apply_underexposure(img: np.ndarray) -> np.ndarray:
    """Severely darken image."""
    factor = random.uniform(0.12, 0.40)
    return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)

def apply_overexposure(img: np.ndarray) -> np.ndarray:
    """Severely brighten and clip image."""
    factor = random.uniform(1.8, 3.0)
    return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)

def apply_noise(img: np.ndarray) -> np.ndarray:
    """Add Gaussian or salt-and-pepper noise."""
    noisy = img.astype(np.float32)
    if random.random() < 0.6:
        sigma = random.uniform(25.0, 55.0)
        noisy += np.random.normal(0, sigma, img.shape).astype(np.float32)
    else:
        amount = random.uniform(0.05, 0.12)
        total = int(amount * img.size)
        for _ in range(total // 3):
            r, c = random.randint(0, img.shape[0]-1), random.randint(0, img.shape[1]-1)
            noisy[r, c, :] = 255 if random.random() < 0.5 else 0
    return np.clip(noisy, 0, 255).astype(np.uint8)

def apply_corruption(img: np.ndarray) -> np.ndarray:
    """Apply JPEG compression artifacts, channel corruption, or block dropout."""
    choice = random.randint(0, 2)
    if choice == 0:
        # Severe JPEG compression
        quality = random.randint(2, 8)
        _, enc = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return cv2.imdecode(enc, cv2.IMREAD_COLOR)
    elif choice == 1:
        # Zero out one channel + amplify another
        corrupted = img.copy()
        corrupted[:, :, random.randint(0, 2)] = 0
        return corrupted
    else:
        # Block dropout — zero out a random horizontal band
        corrupted = img.copy()
        h = corrupted.shape[0]
        start = random.randint(0, h - 80)
        corrupted[start:start+80, :, :] = 0
        return corrupted

# ─────────────────────────────────────────────────────────────────────────
# DEGRADATION MAP
# ─────────────────────────────────────────────────────────────────────────

DEGRADATIONS = {
    "GOOD":         apply_good,
    "BLUR":         apply_blur,
    "UNDEREXPOSED": apply_underexposure,
    "OVEREXPOSED":  apply_overexposure,
    "NOISY":        apply_noise,
    "CORRUPTED":    apply_corruption,
}

# ─────────────────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────

def collect_clean_images(limit: int) -> list:
    """Collect PNG/JPG paths from DIV2K train+valid folders."""
    paths = []
    for folder in [TRAIN_DIR, VALID_DIR]:
        if folder.exists():
            paths += sorted(folder.glob("*.png")) + sorted(folder.glob("*.jpg"))
        else:
            print(f"  [WARNING] Folder not found: {folder}")

    if not paths:
        raise RuntimeError(
            f"No images found in DIV2K folders.\n"
            f"Expected: {TRAIN_DIR}\n"
            f"          {VALID_DIR}"
        )

    random.shuffle(paths)
    selected = paths[:limit]
    print(f"  Found {len(paths)} total DIV2K images -> using {len(selected)}")
    return selected


def generate_dataset() -> pd.DataFrame:
    print("\n" + "="*60)
    print("  DIV2K Image Quality Dataset Generator")
    print("="*60)

    # 1. Collect clean images
    print("\n[1/4] Collecting clean DIV2K images...")
    clean_paths = collect_clean_images(TARGET_CLEAN_IMAGES)

    # 2. Apply degradations + extract features
    print(f"\n[2/4] Applying 6 degradations × {len(clean_paths)} images...")
    rows = []
    total = len(clean_paths) * len(DEGRADATIONS)
    done = 0

    for img_path in clean_paths:
        # Load and resize to uniform size
        img_orig = cv2.imread(str(img_path))
        if img_orig is None:
            print(f"  [SKIP] Could not load: {img_path.name}")
            continue
        img_orig = cv2.resize(img_orig, RESIZE_TO)

        for label, fn in DEGRADATIONS.items():
            degraded = fn(img_orig)
            features = extract_features(degraded)
            features["label"] = label
            features["source_image"] = img_path.name
            rows.append(features)
            done += 1
            if done % 100 == 0 or done == total:
                pct = done / total * 100
                print(f"  Progress: {done}/{total} ({pct:.0f}%)")

    df = pd.DataFrame(rows)
    print(f"\n[3/4] Dataset complete: {len(df)} samples across {df['label'].nunique()} classes")
    print(f"  Class distribution:\n{df['label'].value_counts().to_string()}")

    # 3. Save CSV
    csv_path = OUTPUT_DIR / "features.csv"
    df.to_csv(csv_path, index=False)
    print(f"\n[4/4] Saved → {csv_path}")
    print("="*60 + "\n")
    return df


if __name__ == "__main__":
    df = generate_dataset()
    print(f"Sample features:\n{df[FEATURE_NAMES].head(3).to_string()}")
