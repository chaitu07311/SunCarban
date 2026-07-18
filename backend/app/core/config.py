from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SunCarbon Proposal Co-Pilot API"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./suncarban.db"
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    enable_langgraph: bool = False
    enable_chroma_retrieval: bool = False
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection: str = "suncarban_docs"
    retrieval_top_k: int = 3
    retrieval_confidence_threshold: float = 0.60
    enable_langfuse: bool = False
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"
    route_model_router_enabled: bool = True
    route_model_complexity_threshold: float = 0.45
    route_model_confidence_threshold: float = 0.70
    route_model_cascade_enabled: bool = True
    route_model_lite_name: str = "deterministic-lite"
    route_model_strong_name: str = "deterministic-strong"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
