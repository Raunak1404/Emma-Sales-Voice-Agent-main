import logging
import os
import asyncio
from pathlib import Path

from aiohttp import web
from azure.identity import DefaultAzureCredential

from rtmt import RTMiddleTier, Tool
from ragtools import (
    SearchInput,
    ReportGroundingInput,
    create_rag_chain,
    search_implementation,
    report_grounding_implementation,
)
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langchain_openai import AzureOpenAIEmbeddings

# --- Centralized Configuration ---
from config import settings


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("voicerag")


async def create_app():
    """
    Creates and configures the main web application and its components.
    This function is called once at startup.
    """
    logger.info("Starting application setup...")
    if not settings.RUNNING_IN_PRODUCTION:
        logger.info("Running in development mode, loading from .env file")

    # --- 1. Initialize Qdrant and Retriever ---
    qdrant_client = QdrantClient(path=settings.QDRANT_PATH)
    
    embedding_model = AzureOpenAIEmbeddings(
        azure_deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
        api_key=settings.AZURE_OPENAI_API_KEY,
        chunk_size=settings.AZURE_OPENAI_EMBEDDING_BATCH_SIZE,
        show_progress_bar= True
    )
    
    # Use the recommended QdrantVectorStore class
    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name=settings.QDRANT_COLLECTION_NAME,
        embedding=embedding_model,
    )
    
    retriever = vector_store.as_retriever(search_kwargs={"k": 1})
    logger.info("Qdrant retriever initialized successfully.")

    # --- 2. Initialize LLM, Bind Tools, and Create RAG Chain ---

    rag_chain = create_rag_chain(retriever)
    logger.info("RAG chain created successfully.")
    
    # --- 3. Configure the Real-Time Middle Tier (RTMiddleTier) ---
    app = web.Application()

    # Register a graceful shutdown handler
    async def on_shutdown(app_instance):
        logger.info("Application shutting down. Closing web server...")
    app.on_shutdown.append(on_shutdown)
    
    # Use DefaultAzureCredential for robust authentication (managed identity, CLI, etc.)
    credential = DefaultAzureCredential()
    
    turn_detection_config = {
    "type": "server_vad",
    "interrupt_response": True,
    # Give the agent more time to pause and think without being cut off
    "silence_duration_ms": 250,
    "threshold": 0.6
    }
    
    rtmt = RTMiddleTier(
        credentials=credential,
        endpoint=settings.AZURE_OPENAI_ENDPOINT,
        deployment=settings.AZURE_OPENAI_REALTIME_DEPLOYMENT,
        turn_detection_config=turn_detection_config,
        voice_choice=settings.AZURE_OPENAI_VOICE_CHOICE
    )

    # This system message is critical and is now loaded from an external file.
    try:
        prompt_path = Path(__file__).parent / "system_prompt.md"
        with open(prompt_path, "r", encoding="utf-8") as f:
            rtmt.system_message = f.read().strip()
        logger.info("System prompt loaded successfully from system_prompt.md")
    except FileNotFoundError:
        logger.critical("CRITICAL ERROR: system_prompt.md not found. The application cannot start without it.")
        raise
    except Exception as e:
        logger.critical(f"CRITICAL ERROR: Failed to read system_prompt.md: {e}")
        raise

    # --- 4. Attach Tool Implementations to RTMiddleTier (Definitive Fix) ---

    def format_tool_schema(pydantic_model, description: str):
        """
        Takes a Pydantic model and a description, and returns a dictionary
        in the flat structure expected by the Azure real-time API.

        Args:
            pydantic_model: The Pydantic BaseModel class for the tool's inputs.
            description: A string describing what the tool does.

        Returns:
            A dictionary formatted correctly for the Azure real-time tool calling API.
        """
        # Generate the JSON schema from the Pydantic model.
        # This is the standard way to get schema details from a Pydantic V2 model.
        schema = pydantic_model.model_json_schema()

        # The Azure real-time API requires a flat structure where 'name', 'description',
        # and 'parameters' are all at the top level of the function definition.
        # This helper function constructs that exact structure.
        return {
            "type": "function",
            # The 'name' is now at the top level, which is what the API expects.
            "name": schema.get("title", pydantic_model.__name__),
            "description": description,
            "parameters": {
                "type": "object",
                # We safely get the properties and required fields. If they don't exist,
                # we provide empty defaults to ensure the schema is always valid.
                "properties": schema.get("properties", {}),
                "required": schema.get("required", []),
            },
        }

    # Use the corrected helper function to create the tool schemas.
    search_schema = format_tool_schema(
        SearchInput,
        "Searches the knowledge base to answer a user's question."
    )
    grounding_schema = format_tool_schema(
        ReportGroundingInput,
        "Reports the sources from the knowledge base that were used to form an answer."
    )

    # Attach the tools to the RTMiddleTier instance using the perfectly formatted schemas.
    rtmt.tools["SearchInput"] = Tool(
        schema=search_schema,
        target=lambda args: search_implementation(args["query"], retriever)
    )
    rtmt.tools["ReportGroundingInput"] = Tool(
        schema=grounding_schema,
        target=lambda args: report_grounding_implementation(args["source_ids"], qdrant_client, settings.QDRANT_COLLECTION_NAME)
    )

    # This line now populates the list with the correctly structured schemas.
    rtmt.tool_schemas = [tool.schema for tool in rtmt.tools.values()]

    # This conditional log will now confirm that the correctly structured tools
    # have been prepared for the RTMiddleTier.
    if rtmt.tools and rtmt.tool_schemas:
        logger.info("Tool implementations successfully attached to RTMiddleTier.")
    else:
        logger.warning("Tool attachment was unsuccessful. No tools were attached to RTMiddleTier.")

    # Attach the WebSocket handler to the application.
    rtmt.attach_to_app(app, "/realtime")

    # ==============================================================================
    # 5. Serve Frontend (No background tasks needed anymore)
    # ==============================================================================
    
    # This path navigates from the current file's directory (backend/) up one level (..),
    # then down into frontend/ and finally into dist/. This is the correct, robust path.
    backend_dir = Path(__file__).parent
    frontend_build_dir = backend_dir.parent / "frontend" / "dist"

    logger.info(f"Configured to serve frontend from: {frontend_build_dir}")

    # This check prevents the server from starting with a broken frontend. It provides a
    # clear, actionable error if the frontend hasn't been built yet.
    if not frontend_build_dir.exists() or not (frontend_build_dir / "index.html").exists():
        error_message = (
            f"Frontend build directory not found at '{frontend_build_dir}'. "
            "Please run 'npm install && npm run build' inside the 'frontend' directory."
        )
        logger.critical(error_message)
        raise FileNotFoundError(error_message)

    # This route serves the main index.html file for any initial visit to the site.
    app.add_routes([web.get('/', lambda _: web.FileResponse(frontend_build_dir / 'index.html'))])

    # This route serves all other static assets (JS, CSS, images) from the build directory.
    app.router.add_static('/', path=frontend_build_dir, name='dist')
    
    logger.info("Application setup complete. Starting web server...")
    return app

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║        Azure GPT-4o-mini RAG Speech-to-Speech Model Starting     ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    host = "localhost"
    port = 8765
    web.run_app(create_app(), host=host, port=port)