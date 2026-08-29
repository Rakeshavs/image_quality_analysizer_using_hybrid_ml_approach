"""
Backend API Tests
=================
Run with: pytest tests/ -v
"""

import io
import json
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.cv_engine import extract_features, compute_quality_statistics, compute_explainability
from app.ml_engine import predict, _rule_based_fallback

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────

def make_image_bytes(width=256, height=256, brightness=128):
    """Create a simple solid-colour PNG image as bytes."""
    img = np.full((height, width, 3), brightness, dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (220, 220), (200, 100, 50), -1)
    _, buf = cv2.imencode(".png", img)
    return buf.tobytes()

def make_blurry_image_bytes():
    img = np.random.randint(50, 200, (256, 256, 3), dtype=np.uint8)
    blurred = cv2.GaussianBlur(img, (25, 25), 0)
    _, buf = cv2.imencode(".png", blurred)
    return buf.tobytes()

def make_dark_image_bytes():
    img = np.full((256, 256, 3), 20, dtype=np.uint8)
    _, buf = cv2.imencode(".png", img)
    return buf.tobytes()

def make_bright_image_bytes():
    img = np.full((256, 256, 3), 245, dtype=np.uint8)
    _, buf = cv2.imencode(".png", img)
    return buf.tobytes()

def make_noisy_image_bytes():
    img = np.random.randint(100, 160, (256, 256, 3), dtype=np.uint8)
    noise = np.random.normal(0, 40, img.shape).astype(np.int16)
    noisy = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    _, buf = cv2.imencode(".png", noisy)
    return buf.tobytes()


# ─────────────────────────────────────────────────────────────────────────
# Health Check Tests
# ─────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_has_status_field(self):
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_has_model_info(self):
        response = client.get("/health")
        data = response.json()
        assert "model_loaded" in data
        assert "model_name" in data


# ─────────────────────────────────────────────────────────────────────────
# Analyze Endpoint Tests
# ─────────────────────────────────────────────────────────────────────────

class TestAnalyzeEndpoint:
    def test_analyze_returns_200_for_valid_image(self):
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        assert response.status_code == 200

    def test_analyze_response_has_required_fields(self):
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        data = response.json()
        assert "id" in data
        assert "filename" in data
        assert "quality_score" in data
        assert "quality_label" in data
        assert "issues" in data
        assert "statistics" in data
        assert "explainability" in data
        assert "model" in data

    def test_quality_score_in_valid_range(self):
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        data = response.json()
        assert 0 <= data["quality_score"] <= 100

    def test_quality_label_is_valid(self):
        valid_labels = {"GOOD", "BLUR", "UNDEREXPOSED", "OVEREXPOSED", "NOISY", "CORRUPTED"}
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        data = response.json()
        assert data["quality_label"] in valid_labels

    def test_statistics_has_all_fields(self):
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        stats = response.json()["statistics"]
        assert "brightness" in stats
        assert "contrast" in stats
        assert "sharpness" in stats
        assert "noise_level" in stats
        assert "entropy" in stats
        assert "saturation" in stats

    def test_explainability_has_all_fields(self):
        img_bytes = make_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        explain = response.json()["explainability"]
        assert "sharpness" in explain
        assert "exposure" in explain
        assert "noise" in explain
        assert "contrast" in explain
        assert "saturation" in explain
        assert "overall" in explain

    def test_analyze_rejects_non_image(self):
        response = client.post(
            "/api/analyze",
            files={"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        )
        assert response.status_code == 400

    def test_analyze_detects_dark_image(self):
        """Underexposed images should have lower brightness mean."""
        img_bytes = make_dark_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("dark.png", io.BytesIO(img_bytes), "image/png")}
        )
        data = response.json()
        assert data["statistics"]["brightness"] < 60

    def test_analyze_detects_bright_image(self):
        """Overexposed images should have higher brightness mean."""
        img_bytes = make_bright_image_bytes()
        response = client.post(
            "/api/analyze",
            files={"file": ("bright.png", io.BytesIO(img_bytes), "image/png")}
        )
        data = response.json()
        assert data["statistics"]["brightness"] > 200

    def test_analyze_blurry_has_lower_sharpness(self):
        """Blurry images should have much lower sharpness than clear ones."""
        clear_bytes = make_image_bytes()
        blurry_bytes = make_blurry_image_bytes()

        clear_resp = client.post(
            "/api/analyze",
            files={"file": ("clear.png", io.BytesIO(clear_bytes), "image/png")}
        )
        blurry_resp = client.post(
            "/api/analyze",
            files={"file": ("blurry.png", io.BytesIO(blurry_bytes), "image/png")}
        )
        clear_sharpness  = clear_resp.json()["statistics"]["sharpness"]
        blurry_sharpness = blurry_resp.json()["statistics"]["sharpness"]
        assert blurry_sharpness < clear_sharpness


# ─────────────────────────────────────────────────────────────────────────
# History Endpoint Tests
# ─────────────────────────────────────────────────────────────────────────

class TestHistoryEndpoint:
    def test_history_returns_200(self):
        response = client.get("/api/history")
        assert response.status_code == 200

    def test_history_has_total_and_items(self):
        response = client.get("/api/history")
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)

    def test_history_grows_after_analysis(self):
        initial = client.get("/api/history").json()["total"]
        img_bytes = make_image_bytes()
        client.post(
            "/api/analyze",
            files={"file": ("new.png", io.BytesIO(img_bytes), "image/png")}
        )
        after = client.get("/api/history").json()["total"]
        assert after == initial + 1

    def test_history_item_has_required_fields(self):
        # Ensure at least one record exists
        img_bytes = make_image_bytes()
        client.post(
            "/api/analyze",
            files={"file": ("hist_test.png", io.BytesIO(img_bytes), "image/png")}
        )
        items = client.get("/api/history").json()["items"]
        assert len(items) > 0
        item = items[0]
        assert "id" in item
        assert "filename" in item
        assert "quality_score" in item
        assert "quality_label" in item
        assert "timestamp" in item

    def test_get_analysis_by_id(self):
        img_bytes = make_image_bytes()
        post_resp = client.post(
            "/api/analyze",
            files={"file": ("id_test.png", io.BytesIO(img_bytes), "image/png")}
        )
        record_id = post_resp.json()["id"]
        get_resp = client.get(f"/api/history/{record_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == record_id

    def test_get_nonexistent_id_returns_404(self):
        response = client.get("/api/history/999999")
        assert response.status_code == 404

    def test_delete_analysis(self):
        img_bytes = make_image_bytes()
        post_resp = client.post(
            "/api/analyze",
            files={"file": ("del_test.png", io.BytesIO(img_bytes), "image/png")}
        )
        record_id = post_resp.json()["id"]
        del_resp = client.delete(f"/api/history/{record_id}")
        assert del_resp.status_code == 200
        # Verify it's gone
        get_resp = client.get(f"/api/history/{record_id}")
        assert get_resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────
# CV Engine Unit Tests
# ─────────────────────────────────────────────────────────────────────────

class TestCVEngine:
    def test_extract_features_returns_10_keys(self):
        img_bytes = make_image_bytes()
        features = extract_features(img_bytes)
        # Should have 10 feature keys + 2 private keys (_image_width, _image_height)
        feature_keys = [k for k in features if not k.startswith("_")]
        assert len(feature_keys) == 10

    def test_extract_features_all_floats(self):
        img_bytes = make_image_bytes()
        features = extract_features(img_bytes)
        for k, v in features.items():
            if not k.startswith("_"):
                assert isinstance(v, float), f"{k} is not float: {type(v)}"

    def test_dark_image_has_low_brightness_mean(self):
        img_bytes = make_dark_image_bytes()
        features = extract_features(img_bytes)
        assert features["brightness_mean"] < 60

    def test_bright_image_has_high_brightness_mean(self):
        img_bytes = make_bright_image_bytes()
        features = extract_features(img_bytes)
        assert features["brightness_mean"] > 200

    def test_blurry_image_has_low_laplacian_var(self):
        blurry_bytes = make_blurry_image_bytes()
        clear_bytes = make_image_bytes()
        blurry_feats = extract_features(blurry_bytes)
        clear_feats  = extract_features(clear_bytes)
        assert blurry_feats["sharpness_laplacian_var"] < clear_feats["sharpness_laplacian_var"]

    def test_noisy_image_has_high_residual_std(self):
        noisy_bytes = make_noisy_image_bytes()
        clear_bytes = make_image_bytes()
        noisy_feats = extract_features(noisy_bytes)
        clear_feats = extract_features(clear_bytes)
        assert noisy_feats["noise_residual_std"] > clear_feats["noise_residual_std"]

    def test_compute_quality_statistics_keys(self):
        img_bytes = make_image_bytes()
        features = extract_features(img_bytes)
        features.pop("_image_width", None)
        features.pop("_image_height", None)
        stats = compute_quality_statistics(features)
        assert set(stats.keys()) == {"brightness", "contrast", "sharpness", "noise_level", "entropy", "saturation"}

    def test_compute_explainability_scores_in_range(self):
        img_bytes = make_image_bytes()
        features = extract_features(img_bytes)
        features.pop("_image_width", None)
        features.pop("_image_height", None)
        explain = compute_explainability(features, 75.0)
        for k, v in explain.items():
            assert 0 <= v <= 100, f"{k} out of range: {v}"  # overall can be up to 75


# ─────────────────────────────────────────────────────────────────────────
# ML Engine Unit Tests
# ─────────────────────────────────────────────────────────────────────────

class TestMLEngine:
    def _get_clear_features(self):
        img_bytes = make_image_bytes(brightness=128)
        features = extract_features(img_bytes)
        features.pop("_image_width", None)
        features.pop("_image_height", None)
        return features

    def test_predict_returns_three_values(self):
        features = self._get_clear_features()
        result = predict(features)
        assert len(result) == 3

    def test_predict_label_is_string(self):
        features = self._get_clear_features()
        label, score, issues = predict(features)
        assert isinstance(label, str)

    def test_predict_score_in_range(self):
        features = self._get_clear_features()
        label, score, issues = predict(features)
        assert 0 <= score <= 100

    def test_predict_issues_is_list(self):
        features = self._get_clear_features()
        label, score, issues = predict(features)
        assert isinstance(issues, list)

    def test_rule_based_detects_corruption(self):
        features = {k: 0.0 for k in [
            "sharpness_laplacian_var", "sharpness_tenengrad", "brightness_mean",
            "brightness_std", "exposure_histogram_skew", "noise_residual_std",
            "contrast_michelson", "saturation_mean", "entropy", "corruption_score"
        ]}
        features["corruption_score"] = 1.0
        label, score, issues = _rule_based_fallback(features)
        assert label == "CORRUPTED"
        assert score < 20

    def test_rule_based_detects_blur(self):
        features = {k: 50.0 for k in [
            "sharpness_laplacian_var", "sharpness_tenengrad", "brightness_mean",
            "brightness_std", "exposure_histogram_skew", "noise_residual_std",
            "contrast_michelson", "saturation_mean", "entropy"
        ]}
        features["sharpness_laplacian_var"] = 10.0  # very low = blurry
        features["brightness_mean"] = 128.0
        features["corruption_score"] = 0.0
        label, score, issues = _rule_based_fallback(features)
        assert label == "BLUR"

    def test_rule_based_detects_underexposure(self):
        features = {k: 50.0 for k in [
            "sharpness_laplacian_var", "sharpness_tenengrad", "brightness_mean",
            "brightness_std", "exposure_histogram_skew", "noise_residual_std",
            "contrast_michelson", "saturation_mean", "entropy"
        ]}
        features["sharpness_laplacian_var"] = 500.0
        features["brightness_mean"] = 20.0  # very dark
        features["corruption_score"] = 0.0
        label, score, issues = _rule_based_fallback(features)
        assert label == "UNDEREXPOSED"
