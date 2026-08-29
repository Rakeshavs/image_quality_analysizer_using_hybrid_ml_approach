from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .database import Base


class AnalysisRecord(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    quality_score = Column(Float, nullable=False)
    quality_label = Column(String(50), nullable=False)
    issues_json = Column(Text, default="[]")
    statistics_json = Column(Text, default="{}")
    explainability_json = Column(Text, default="{}")
    thumbnail_base64 = Column(Text, default="")
    file_size_bytes = Column(Integer, default=0)
    image_width = Column(Integer, default=0)
    image_height = Column(Integer, default=0)
