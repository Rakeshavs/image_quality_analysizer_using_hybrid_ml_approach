import os
import pandas as pd
import joblib
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(ROOT, "dataset_generator", "data", "features.csv")
MODELS_DIR = os.path.join(ROOT, "backend", "models")
MODEL_PATH = os.path.join(MODELS_DIR, "quality_model.joblib")
REPORT_PATH = os.path.join(MODELS_DIR, "classification_report.txt")
CM_PATH = os.path.join(MODELS_DIR, "confusion_matrix.png")

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

def train():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    
    X = df[FEATURE_NAMES]
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    print("Evaluating...")
    y_pred = pipeline.predict(X_test)
    
    # Generate and save classification report
    report = classification_report(y_test, y_pred)
    print(report)
    with open(REPORT_PATH, "w") as f:
        f.write(report)
    print(f"Classification report saved to {REPORT_PATH}")
    
    # Generate and save confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=pipeline.classes_)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=pipeline.classes_)
    
    plt.figure(figsize=(10, 8))
    disp.plot(cmap=plt.cm.Blues, ax=plt.gca(), xticks_rotation='vertical')
    plt.tight_layout()
    plt.savefig(CM_PATH)
    print(f"Confusion matrix saved to {CM_PATH}")
    
    # Generate and save metrics JSON for frontend
    clf = pipeline.named_steps['clf']
    feat_imp = dict(zip(FEATURE_NAMES, [float(x) for x in clf.feature_importances_]))
    from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
    metrics_payload = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_score": float(f1_score(y_test, y_pred, average='weighted')),
        "precision": float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, average='weighted')),
        "feature_importances": feat_imp,
        "n_train_samples": len(X_train),
        "n_test_samples": len(X_test)
    }
    import json
    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"Metrics JSON saved to {os.path.join(MODELS_DIR, 'metrics.json')}")
    
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train()
