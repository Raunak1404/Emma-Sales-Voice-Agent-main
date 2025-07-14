from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Centralized application configuration using Pydantic.
    Loads variables from a .env file and the environment.
    """
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # --- Azure OpenAI ---
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_API_VERSION: str
    AZURE_OPENAI_REALTIME_DEPLOYMENT: str
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str
    AZURE_OPENAI_EMBEDDING_API_VERSION: str
    AZURE_OPENAI_EMBEDDING_BATCH_SIZE: int = 16
    AZURE_OPENAI_VOICE_CHOICE: str = "sage"

    # --- Qdrant ---
    QDRANT_PATH: str
    QDRANT_COLLECTION_NAME: str

    # --- Ingestion ---
    DATA_PATH: str
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    EMBEDDING_DIMENSIONS: int
    # A comma-separated string of PDF filenames that require special table parsing.
    TABULAR_PDF_FILES: str = ""  # e.g., "product_comparison.pdf,pricing_sheet_v2.pdf"

    # --- Application ---
    RUNNING_IN_PRODUCTION: bool = False
    
# Create a single, reusable instance of the settings
settings = Settings()
