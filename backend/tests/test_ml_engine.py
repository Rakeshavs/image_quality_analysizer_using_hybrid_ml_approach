import pytest
from unittest.mock import patch, MagicMock
from app.ml_engine import predict, get_model_info, FEATURE_NAMES


def test_predict_success():
    mock_model = MagicMock()
    mock_model.predict.return_value = ["GOOD"]
    mock_model.predict_proba.return_value = [[0.8, 0.05, 0.05, 0.05, 0.03, 0.02]]
    mock_model.classes_ = ["GOOD", "BLUR", "UNDEREXPOSED", "OVEREXPOSED", "NOISY", "CORRUPTED"]

    mock_features = {name: 1.0 for name in FEATURE_NAMES}

    with patch('app.ml_engine.load_model', return_value=mock_model):
        label, score, issues = predict(mock_features)

        assert label == "GOOD"
        assert isinstance(score, float)
        assert isinstance(issues, list)
        assert len(issues) == 0  # GOOD has no issues


def test_predict_with_issue():
    mock_model = MagicMock()
    mock_model.predict.return_value = ["BLUR"]
    mock_model.predict_proba.return_value = [[0.1, 0.7, 0.05, 0.05, 0.05, 0.05]]
    mock_model.classes_ = ["GOOD", "BLUR", "UNDEREXPOSED", "OVEREXPOSED", "NOISY", "CORRUPTED"]

    mock_features = {name: 1.0 for name in FEATURE_NAMES}

    with patch('app.ml_engine.load_model', return_value=mock_model):
        label, score, issues = predict(mock_features)

        assert label == "BLUR"
        assert len(issues) == 1
        assert issues[0]["type"] == "blur"


def test_predict_missing_feature():
    mock_features = {"sharpness_laplacian_var": 1.0}

    with patch('app.ml_engine.load_model', return_value=MagicMock()):
        with pytest.raises(ValueError, match="Missing required feature"):
            predict(mock_features)


def test_get_model_info():
    mock_model = MagicMock()
    with patch('app.ml_engine._model_pipeline', mock_model):
        info = get_model_info()
        assert info["model_loaded"] is True
        assert info["name"] == "RandomForest-Pipeline"
