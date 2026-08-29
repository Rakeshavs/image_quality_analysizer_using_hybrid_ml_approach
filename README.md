# AI Image Quality Inspector

A full-stack, **locally-run** image quality assessment and defect detection system built with a hybrid Computer Vision + Machine Learning pipeline. No external AI APIs are used — all inference runs locally on your machine.

---

## Architecture

```mermaid
flowchart LR
    subgraph FE[Frontend]
        UI[React (Vite) UI]
    end
    subgraph BE[Backend]
        API[FastAPI REST API]
        CV[OpenCV CV Engine]
        ML[Random Forest ML Engine]
        DB[SQLite DB]
    end
    UI -->|POST /api/analyze| API
    API --> CV
    API --> ML
    CV -->|Features| ML
    ML -->|Prediction| API
    API --> DB
    DB -->|History CRUD| API
    style FE fill:#0d6efd,color:#fff,stroke:#2c3e50,stroke-width:2px
    style BE fill:#6c757d,color:#fff,stroke:#2c3e50,stroke-width:2px
    classDef default font-family:"Inter",sans-serif;
```

## Detected Defect Classes

| Label | Description |
|-------|-------------|
| `GOOD` | No significant issues |
| `BLUR` | Gaussian / motion blur (Laplacian variance) |
| `UNDEREXPOSED` | Image too dark (brightness mean < 60) |
| `OVEREXPOSED` | Image too bright / clipped highlights |
| `NOISY` | High-frequency noise (residual std > 25) |
| `CORRUPTED` | JPEG artifacts, channel corruption, decode failure |

## Engineered OpenCV Features

| Feature | Detects |
|---------|---------|
| Laplacian Variance | Blur / sharpness |
| Tenengrad (Sobel) | Edge sharpness |
| Brightness Mean | Under/overexposure |
| Brightness Std | Global contrast |
| Histogram Skew | Exposure distribution |
| Noise Residual Std | High-frequency noise |
| Michelson Contrast | Local contrast |
| Saturation Mean | Color vibrancy |
| Shannon Entropy | Image information density |
| Corruption Score | Decode integrity |
## Dataset

The training data is sourced from the **DIV2K** high‑resolution image dataset (publicly available at https://data.vision.ee.ethz.ch/cvl/DIV2K/). The repository contains the `DIV2K_train_HR` and `DIV2K_valid_HR` folders.

### Synthetic degradation pipeline

Because a large manually‑labeled defect dataset is not available, we generate a **synthetic** training set by applying controlled degradations to the pristine DIV2K images:

- **Blur** – Gaussian and motion blur with varying kernel sizes.
- **Noise** – Gaussian noise with different standard deviations.
- **Exposure shifts** – Under‑exposure and over‑exposure adjustments.
- **JPEG compression artifacts** – Varying quality factors to simulate corruption.
- **Color saturation changes** – To mimic wash‑out or oversaturated scenes.

Each original image is duplicated multiple times, each copy receiving one of the above defect types (or a combination), and labeled accordingly (`GOOD`, `BLUR`, `NOISY`, `UNDEREXPOSED`, `OVEREXPOSED`, `CORRUPTED`).

### Split strategy

- **Training set** – 70 % of the generated images.
- **Validation set** – 15 % (used during model selection).
- **Test set** – 15 % (held‑out for final evaluation; metrics reported in the README).

The synthetic approach ensures a balanced representation of each defect class while keeping the data generation fully reproducible.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- `pip` and `npm`

### 1. Install Backend
```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the ML Model (one-time setup)
```bash
cd backend
pip install -r requirements.txt
python train_model.py
```
This generates `backend/models/quality_model.joblib` (which contains the unified standard scaling and RandomForestClassifier pipeline), along with `classification_report.txt` and `confusion_matrix.png`.

### 3. Start Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Model Performance & Evaluation

The ML model is evaluated on a holdout test set (20% split) from the synthetically generated DIV2K dataset:

- **Overall Accuracy:** 90%
- **Confusion Matrix:** Saved to `backend/models/confusion_matrix.png`
- **Class-Level Metrics:**

| Defect Class | Precision | Recall | F1-Score |
|--------------|-----------|--------|----------|
| `GOOD`       | 0.75      | 0.86   | 0.80     |
| `BLUR`       | 1.00      | 0.96   | 0.98     |
| `NOISY`      | 0.83      | 0.90   | 0.86     |
| `UNDEREXPOSED`| 1.00      | 1.00   | 1.00     |
| `OVEREXPOSED`| 0.86      | 0.79   | 0.83     |
| `CORRUPTED`  | 0.96      | 0.87   | 0.92     |

---

## Docker Deployment

```bash
# First train the model to generate model artifacts
cd backend
python train_model.py

# Then start full stack with Docker Compose from the root directory
cd ..
docker compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + model status |
| `POST` | `/api/analyze` | Upload image → quality analysis |
| `GET` | `/api/history` | List past analyses |
| `GET` | `/api/history/{id}` | Detailed analysis record |
| `DELETE` | `/api/history/{id}` | Delete analysis record |
| `GET` | `/api/model/info` | Model metadata + feature importances |

### Sample `/api/analyze` Response

```json
{
  "id": 42,
  "filename": "sample.jpg",
  "quality_score": 82.4,
  "quality_label": "GOOD",
  "issues": [],
  "statistics": {
    "brightness": 126.4,
    "contrast": 48.2,
    "sharpness": 421.8,
    "noise_level": 0.12,
    "entropy": 6.84,
    "saturation": 89.1
  },
  "explainability": {
    "sharpness": 91.0,
    "exposure": 82.0,
    "noise": 76.0,
    "contrast": 88.0,
    "saturation": 69.5,
    "overall": 82.4
  },
  "model": {
    "name": "HybridImageQualityClassifier",
    "version": "1.0"
  }
}
```

---

## Limitations

- The ML model is trained on **synthetically generated** degradations. Real-world photographic defects may exhibit slightly different feature distributions.
- The rule-based fallback is used when no trained model is present — it provides reasonable results but is less accurate than the trained RandomForest model.
- Very large images (>20MB) are rejected by the API to prevent out-of-memory errors.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | FastAPI, Uvicorn, Python 3.11 |
| CV Engine | OpenCV, NumPy |
| ML Model | scikit-learn RandomForest |
| Database | SQLite, SQLAlchemy |
| Deployment | Docker, Docker Compose, Nginx |
