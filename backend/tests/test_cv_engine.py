import pytest
import numpy as np
import cv2
from app.cv_engine import extract_features, compute_quality_statistics, compute_explainability, generate_thumbnail_base64, FEATURE_NAMES


def create_dummy_image():
    return np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)


def test_extract_features_valid_bytes():
    dummy_img = create_dummy_image()
    _, buffer = cv2.imencode('.jpg', dummy_img)

    features = extract_features(buffer.tobytes(), is_path=False)

    assert isinstance(features, dict)
    for key in FEATURE_NAMES:
        assert key in features
        assert isinstance(features[key], float)
    assert "_image_width" in features
    assert "_image_height" in features


def test_extract_features_invalid_bytes():
    with pytest.raises(ValueError, match="Corrupt or invalid image"):
        extract_features(b"invalid data", is_path=False)


def test_compute_quality_statistics():
    features = {name: 1.0 for name in FEATURE_NAMES}
    stats = compute_quality_statistics(features)
    assert "brightness" in stats
    assert "contrast" in stats
    assert "sharpness" in stats
    assert "noise_level" in stats
    assert "entropy" in stats
    assert "saturation" in stats


def test_compute_explainability():
    features = {
        "sharpness_laplacian_var": 2500.0,
        "brightness_mean": 128.0,
        "noise_residual_std": 10.0,
        "contrast_michelson": 0.9,
        "saturation_mean": 80.0,
    }
    result = compute_explainability(features, 0.85)
    assert "sharpness" in result
    assert "exposure" in result
    assert "overall" in result
    assert result["overall"] == 0.85


def test_generate_thumbnail_base64():
    dummy_img = create_dummy_image()
    _, buffer = cv2.imencode('.jpg', dummy_img)
    thumb = generate_thumbnail_base64(buffer.tobytes())
    assert isinstance(thumb, str)
    assert len(thumb) > 0
