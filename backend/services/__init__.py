# EduAI Services package
from services.ai_service import AIService
from services.vector_service import VectorService

# Shared Singletons to prevent recreating models and client configurations
ai_service = AIService()
vector_service = VectorService()
