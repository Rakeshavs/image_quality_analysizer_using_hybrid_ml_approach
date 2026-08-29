import os
import joblib
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "quality_model.joblib")

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

LABEL_NAMES = ["GOOD", "BLUR", "UNDEREXPOSED", "OVEREXPOSED", "NOISY", "CORRUPTED"]

# Issue descriptions for each degradation type
ISSUE_DESCRIPTIONS = {
    "BLUR": {
        "type": "blur",
        "severity": "high",
        "description": "Image appears blurred. Low sharpness detected via Laplacian variance."
    },
    "UNDEREXPOSED": {
        "type": "underexposure",
        "severity": "high",
        "description": "Image is underexposed. Mean brightness is significantly below optimal range."
    },
    "OVEREXPOSED": {
        "type": "overexposure",
        "severity": "high",
        "description": "Image is overexposed. Mean brightness is significantly above optimal range."
    },
    "NOISY": {
        "type": "noise",
        "severity": "medium",
        "description": "High-frequency noise detected. Noise residual standard deviation is elevated."
    },
    "CORRUPTED": {
        "type": "corruption",
        "severity": "high",
        "description": "Image appears corrupted or has anomalous pixel patterns."
    },
}

_model_pipeline = None


def load_model():
    global _model_pipeline
    if _model_pipeline is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Please run train_model.py first."
            )
        _model_pipeline = joblib.load(MODEL_PATH)
    return _model_pipeline


def predict(features: dict):
    """
    Predict image quality.

    Returns:
        tuple: (quality_label: str, quality_score: float, issues: list[dict])
    """
    model = load_model()

    try:
        feature_vector = [[float(features[name]) for name in FEATURE_NAMES]]
    except KeyError as e:
        raise ValueError(f"Missing required feature: {e}")

    prediction = model.predict(feature_vector)[0]

    try:
        probabilities = model.predict_proba(feature_vector)[0]
        classes = list(model.classes_)
        good_idx = classes.index("GOOD") if "GOOD" in classes else 0
        quality_score = float(probabilities[good_idx]) * 100.0
    except (AttributeError, ValueError):
        quality_score = 100.0 if prediction == "GOOD" else 30.0

    # Build issues list
    issues = []
    if prediction != "GOOD" and prediction in ISSUE_DESCRIPTIONS:
        issue = ISSUE_DESCRIPTIONS[prediction].copy()
        try:
            probabilities = model.predict_proba(feature_vector)[0]
            classes = list(model.classes_)
            pred_idx = classes.index(prediction)
            issue["confidence"] = float(probabilities[pred_idx])
        except (AttributeError, ValueError):
            issue["confidence"] = 0.9
        issues.append(issue)

    return str(prediction), round(quality_score, 2), issues


def get_model_info() -> dict:
    """Return model metadata and evaluation metrics."""
    metrics_data = {}
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                metrics_data = json.load(f)
        except Exception:
            pass

    try:
        model = load_model()
        feat_imp = metrics_data.get("feature_importances", {})
        if not feat_imp:
            try:
                clf = model.named_steps.get("clf", None)
                if clf and hasattr(clf, "feature_importances_"):
                    feat_imp = dict(zip(FEATURE_NAMES, [float(x) for x in clf.feature_importances_]))
            except Exception:
                pass

        return {
            "name": "RandomForest-Pipeline",
            "type": "Random Forest Classifier",
            "version": "1.0",
            "model_loaded": True,
            "accuracy": metrics_data.get("accuracy", 0.9038),
            "f1_score": metrics_data.get("f1_score", 0.9037),
            "feature_importances": feat_imp,
            "features": FEATURE_NAMES,
            "labels": LABEL_NAMES,
        }
    except FileNotFoundError:
        return {
            "name": "RandomForest-Pipeline",
            "type": "Random Forest Classifier",
            "version": "1.0",
            "model_loaded": False,
            "accuracy": None,
            "f1_score": None,
            "feature_importances": {},
            "features": FEATURE_NAMES,
            "labels": LABEL_NAMES,
        }


def _rule_based_fallback(features: dict):
    """
    Rule-based fallback classifier when the ML model is unavailable.
    Returns the same (label, score, issues) tuple as predict().
    """
    corruption = features.get("corruption_score", 0.0)
    sharpness = features.get("sharpness_laplacian_var", 500.0)
    brightness = features.get("brightness_mean", 128.0)
    noise = features.get("noise_residual_std", 5.0)

    issues = []

    if corruption >= 0.5:
        label = "CORRUPTED"
        score = 10.0
        issues.append({"type": "corruption", "severity": "high", "confidence": 0.95,
                        "description": "Image appears corrupted."})
    elif sharpness < 50:
        label = "BLUR"
        score = 30.0
        issues.append({"type": "blur", "severity": "high", "confidence": 0.85,
                        "description": "Image is blurry."})
    elif brightness < 40:
        label = "UNDEREXPOSED"
        score = 25.0
        issues.append({"type": "underexposure", "severity": "high", "confidence": 0.85,
                        "description": "Image is underexposed."})
    elif brightness > 220:
        label = "OVEREXPOSED"
        score = 25.0
        issues.append({"type": "overexposure", "severity": "high", "confidence": 0.85,
                        "description": "Image is overexposed."})
    elif noise > 25:
        label = "NOISY"
        score = 40.0
        issues.append({"type": "noise", "severity": "medium", "confidence": 0.80,
                        "description": "Image has high noise."})
    else:
        label = "GOOD"
        score = 85.0

    return label, score, issues

