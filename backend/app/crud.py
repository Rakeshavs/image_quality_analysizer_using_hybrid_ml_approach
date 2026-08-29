import json
from sqlalchemy.orm import Session
from . import models


def save_analysis(
    db: Session,
    filename: str,
    quality_score: float,
    quality_label: str,
    issues: list,
    statistics: dict,
    explainability: dict,
    thumbnail_base64: str,
    image_width: int,
    image_height: int,
    file_size_bytes: int
) -> models.AnalysisRecord:
    record = models.AnalysisRecord(
        filename=filename,
        quality_score=quality_score,
        quality_label=quality_label,
        issues_json=json.dumps(issues),
        statistics_json=json.dumps(statistics),
        explainability_json=json.dumps(explainability),
        thumbnail_base64=thumbnail_base64,
        image_width=image_width,
        image_height=image_height,
        file_size_bytes=file_size_bytes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_history(db: Session, skip: int = 0, limit: int = 50):
    total = db.query(models.AnalysisRecord).count()
    items = (
        db.query(models.AnalysisRecord)
        .order_by(models.AnalysisRecord.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return total, items


def get_analysis_by_id(db: Session, analysis_id: int):
    return db.query(models.AnalysisRecord).filter(models.AnalysisRecord.id == analysis_id).first()


def delete_analysis(db: Session, analysis_id: int) -> bool:
    record = get_analysis_by_id(db, analysis_id)
    if record:
        db.delete(record)
        db.commit()
        return True
    return False


def delete_all_analyses(db: Session) -> int:
    deleted_count = db.query(models.AnalysisRecord).delete()
    db.commit()
    return deleted_count

