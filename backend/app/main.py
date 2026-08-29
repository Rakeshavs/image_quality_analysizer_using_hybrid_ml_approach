import json
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import engine, get_db
from . import models, crud, schemas
from .cv_engine import extract_features, compute_quality_statistics, compute_explainability, generate_thumbnail_base64
from .ml_engine import predict, get_model_info

# Create all database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Image Quality Inspector API",
    description="Local hybrid CV + ML pipeline for image quality assessment and defect detection.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff", "image/webp"}
MAX_FILE_SIZE_MB = 20


@app.get("/health")
def health_check():
    model_info = get_model_info()
    return {
        "status": "healthy",
        "model_loaded": model_info["model_loaded"],
        "model_name": model_info["name"],
        "version": model_info["version"]
    }


@app.post("/api/analyze", response_model=schemas.AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPEG, PNG, BMP, TIFF, WebP."
        )

    # Read file bytes
    image_bytes = await file.read()

    # Validate file size
    if len(image_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE_MB}MB.")

    # Extract OpenCV features
    features = extract_features(image_bytes)
    image_width = int(features.pop("_image_width", 0))
    image_height = int(features.pop("_image_height", 0))

    # Run ML prediction
    quality_label, quality_score, issues = predict(features)

    # Compute display statistics and explainability
    statistics = compute_quality_statistics(features)
    explainability = compute_explainability(features, quality_score)

    # Generate thumbnail for history
    thumbnail_b64 = generate_thumbnail_base64(image_bytes)

    # Save to database
    record = crud.save_analysis(
        db=db,
        filename=file.filename or "upload.jpg",
        quality_score=quality_score,
        quality_label=quality_label,
        issues=issues,
        statistics=statistics,
        explainability=explainability,
        thumbnail_base64=thumbnail_b64,
        image_width=image_width,
        image_height=image_height,
        file_size_bytes=len(image_bytes)
    )

    return schemas.AnalysisResponse(
        id=record.id,
        filename=record.filename,
        quality_score=quality_score,
        quality_label=quality_label,
        issues=[schemas.IssueDetail(**i) for i in issues],
        statistics=schemas.QualityStatistics(**statistics),
        explainability=schemas.ExplainabilityScore(**explainability),
        model={
            "name": "HybridImageQualityClassifier",
            "version": "1.0"
        },
        image_width=image_width,
        image_height=image_height,
        timestamp=record.timestamp
    )


@app.get("/api/history", response_model=schemas.HistoryResponse)
def get_history(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    total, items = crud.get_history(db, skip=skip, limit=limit)
    return schemas.HistoryResponse(
        total=total,
        items=[
            schemas.AnalysisHistoryItem(
                id=r.id,
                filename=r.filename,
                quality_score=r.quality_score,
                quality_label=r.quality_label,
                timestamp=r.timestamp,
                thumbnail_base64=r.thumbnail_base64,
                image_width=r.image_width,
                image_height=r.image_height
            ) for r in items
        ]
    )


@app.get("/api/history/{analysis_id}")
def get_analysis_detail(analysis_id: int, db: Session = Depends(get_db)):
    record = crud.get_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    return {
        "id": record.id,
        "filename": record.filename,
        "quality_score": record.quality_score,
        "quality_label": record.quality_label,
        "issues": json.loads(record.issues_json),
        "statistics": json.loads(record.statistics_json),
        "explainability": json.loads(record.explainability_json),
        "thumbnail_base64": record.thumbnail_base64,
        "image_width": record.image_width,
        "image_height": record.image_height,
        "file_size_bytes": record.file_size_bytes,
        "timestamp": record.timestamp
    }


@app.delete("/api/history/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    success = crud.delete_analysis(db, analysis_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    return {"message": "Analysis record deleted successfully."}


@app.delete("/api/history")
def clear_all_history(db: Session = Depends(get_db)):
    deleted_count = crud.delete_all_analyses(db)
    return {"message": f"Successfully deleted {deleted_count} analysis records.", "deleted_count": deleted_count}


@app.get("/api/model/info")
def model_info():
    return get_model_info()
