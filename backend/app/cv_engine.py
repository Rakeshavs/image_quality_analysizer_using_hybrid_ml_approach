import cv2
import numpy as np
import base64

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


def extract_features(image_data, is_path=False) -> dict:
    """
    Extract 10 OpenCV features from an image.

    :param image_data: A file path (str) or raw image bytes (bytes).
    :param is_path: Boolean indicating if image_data is a file path.
    :return: Dictionary containing the extracted features plus image dimensions.
    """
    if is_path:
        img = cv2.imread(image_data)
    else:
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None or img.size == 0:
        raise ValueError("Corrupt or invalid image")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, w = gray.shape

    # 1. Laplacian variance (blur detection)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 2. Tenengrad (edge sharpness)
    sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    tenengrad = float(np.mean(sx**2 + sy**2))

    # 3 & 4. Brightness mean and std
    brightness_mean = float(np.mean(gray))
    brightness_std = float(np.std(gray))

    # 5. Histogram skew (exposure distribution)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    hist_norm = hist / (hist.sum() + 1e-7)
    bins = np.arange(256)
    mean_bin = np.sum(bins * hist_norm)
    std_bin = float(np.sqrt(np.sum(((bins - mean_bin)**2) * hist_norm))) + 1e-7
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

    result = {
        "sharpness_laplacian_var": laplacian_var,
        "sharpness_tenengrad": tenengrad,
        "brightness_mean": brightness_mean,
        "brightness_std": brightness_std,
        "exposure_histogram_skew": histogram_skew,
        "noise_residual_std": noise_residual_std,
        "contrast_michelson": contrast_michelson,
        "saturation_mean": saturation_mean,
        "entropy": entropy,
        "corruption_score": corruption_score,
        "_image_width": w,
        "_image_height": h,
    }
    return result


def compute_quality_statistics(features: dict) -> dict:
    """Compute human-readable quality statistics from raw features."""
    return {
        "brightness": round(features.get("brightness_mean", 0.0), 2),
        "contrast": round(features.get("contrast_michelson", 0.0), 4),
        "sharpness": round(features.get("sharpness_laplacian_var", 0.0), 2),
        "noise_level": round(features.get("noise_residual_std", 0.0), 2),
        "entropy": round(features.get("entropy", 0.0), 4),
        "saturation": round(features.get("saturation_mean", 0.0), 2),
    }


def compute_explainability(features: dict, quality_score: float) -> dict:
    """
    Compute per-dimension explainability scores on a 0-100 scale.
    These are heuristic normalizations providing intuitive breakdown for users.
    """
    # Sharpness: Natural images have laplacian variance ~200-2000. Blurry images < 50.
    # Log scaling maps 50 -> ~50%, 300+ -> ~85-95%, 1000+ -> 100%.
    lap_var = max(0.0, float(features.get("sharpness_laplacian_var", 0.0)))
    if lap_var <= 0:
        sharpness = 0.0
    else:
        # log2 scale normalized to 100
        sharpness = min(100.0, (np.log1p(lap_var) / np.log1p(800.0)) * 100.0)

    # Exposure: ideal brightness ~128. Penalize severe deviation.
    brightness = float(features.get("brightness_mean", 128.0))
    exposure = max(0.0, 1.0 - abs(brightness - 128.0) / 128.0) * 100.0

    # Noise: lower residual std is clearer. Typical clean is < 10.
    noise_val = float(features.get("noise_residual_std", 0.0))
    noise = max(0.0, 1.0 - noise_val / 35.0) * 100.0

    # Contrast: Michelson contrast is 0 to 1.
    contrast = min(1.0, max(0.0, float(features.get("contrast_michelson", 0.0)))) * 100.0

    # Saturation: typical color images have saturation ~40-120.
    sat = float(features.get("saturation_mean", 0.0))
    saturation = min(100.0, (sat / 80.0) * 100.0)

    overall = float(quality_score)

    return {
        "sharpness": round(sharpness, 1),
        "exposure": round(exposure, 1),
        "noise": round(noise, 1),
        "contrast": round(contrast, 1),
        "saturation": round(saturation, 1),
        "overall": round(overall, 2),
    }


def generate_thumbnail_base64(image_bytes: bytes, max_size: int = 128) -> str:
    """Generate a base64-encoded JPEG thumbnail from raw image bytes."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return ""

    h, w = img.shape[:2]
    scale = max_size / max(h, w)
    if scale < 1.0:
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return base64.b64encode(buffer.tobytes()).decode('utf-8')
