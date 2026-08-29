from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class IssueDetail(BaseModel):
    type: str
    severity: str  # "low", "medium", "high"
    confidence: float
    description: str


class QualityStatistics(BaseModel):
    brightness: float
    contrast: float
    sharpness: float
    noise_level: float
    entropy: float
    saturation: float


class ExplainabilityScore(BaseModel):
    sharpness: float
    exposure: float
    noise: float
    contrast: float
    saturation: float
    overall: float


class AnalysisResponse(BaseModel):
    id: int
    filename: str
    quality_score: float
    quality_label: str
    issues: List[IssueDetail]
    statistics: QualityStatistics
    explainability: ExplainabilityScore
    model: Dict[str, str]
    image_width: int
    image_height: int
    timestamp: datetime

    class Config:
        from_attributes = True


class AnalysisHistoryItem(BaseModel):
    id: int
    filename: str
    quality_score: float
    quality_label: str
    timestamp: datetime
    thumbnail_base64: str
    image_width: int
    image_height: int

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    total: int
    items: List[AnalysisHistoryItem]
