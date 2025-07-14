import os
import json
import logging
import sys
from pathlib import Path
from io import StringIO 

# --- LangChain Document Loaders ---
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredExcelLoader,
    TextLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import AzureOpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models

# --- Specialized PDF Table Parsing ---
from unstructured.partition.pdf import partition_pdf
import pandas as pd
from langchain_core.documents import Document

# --- Centralized Configuration ---
from config import settings

# ==============================================================================
# 1. SETUP: Logging
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Mapping file extensions to their respective LangChain loader classes.
LOADER_MAPPING = {
    ".pdf": PyPDFLoader,
    ".docx": Docx2txtLoader,
    ".xlsx": UnstructuredExcelLoader,
    ".txt": TextLoader,
}

# ==============================================================================
# 2. HELPER FUNCTIONS: Encapsulated Logic
# ==============================================================================

def load_and_process_pricing_table(file_path: str) -> list[Document]:
    """
    Specialized parser for PDFs containing complex tables.
    Uses unstructured.io and pandas to extract the table and creates one
    clean Document object for each product (column).
    """
    logger.info(f"--- Starting specialized table processing for: {Path(file_path).name} ---")
    try:
        elements = partition_pdf(
            filename=file_path,
            strategy="hi_res",
            infer_table_structure=True,
            extract_images_in_pdf=False,
        )
        table_html = [el.metadata.text_as_html for el in elements if el.category == "Table"]
        if not table_html:
            logger.error(f"No table found in '{Path(file_path).name}' with unstructured.io.")
            return []

        df = pd.read_html(StringIO(table_html[0]), header=0)[0]
        logger.info("Successfully extracted table into pandas DataFrame.")

        df = df.T
        df.columns = df.iloc[0]
        df = df.drop(df.index[0])
        df.index.name = "Product Name"
        df = df.reset_index()
        df.columns = [str(col).strip().replace("\n", " ") for col in df.columns]

        structured_documents = []
        for _, row in df.iterrows():
            product_name = row["Product Name"]
            page_content = f"### Product: {product_name}\n\n"
            attributes = row.drop("Product Name").to_dict()
            for key, value in attributes.items():
                if pd.notna(value) and str(value).strip():
                    page_content += f"- **{key.strip()}**: {str(value).strip()}\n"
            doc = Document(
                page_content=page_content,
                metadata={"source": Path(file_path).name, "product_name": product_name}
            )
            structured_documents.append(doc)
        logger.info(f"Successfully created {len(structured_documents)} structured documents from the table.")
        return structured_documents
    except Exception as e:
        logger.error(f"Failed to process the pricing table PDF '{Path(file_path).name}': {e}", exc_info=True)
        return []

def load_and_chunk_documents(
    files_to_process: list[str],
    text_splitter: RecursiveCharacterTextSplitter,
    tabular_pdf_names: list[str]
) -> list[Document]:
    """
    Loads files, routing them to a specialized table parser or a generic
    loader/splitter based on the configured list of tabular PDF names.
    """
    final_chunks = []
    
    special_files = [f for f in files_to_process if Path(f).name in tabular_pdf_names]
    generic_files = [f for f in files_to_process if Path(f).name not in tabular_pdf_names]

    if special_files:
        logger.info(f"Found {len(special_files)} special document(s) for table parsing: {', '.join(Path(f).name for f in special_files)}")
        for file_path_str in special_files:
            table_chunks = load_and_process_pricing_table(file_path_str)
            final_chunks.extend(table_chunks)

    if generic_files:
        logger.info(f"Loading {len(generic_files)} generic document(s) for standard processing...")
        loaded_generic_docs = []
        for file_path_str in generic_files:
            file_path = Path(file_path_str)
            file_ext = file_path.suffix.lower()
            if file_ext in LOADER_MAPPING:
                loader_class = LOADER_MAPPING[file_ext]
                logger.info(f"-> Loading '{file_path.name}' with {loader_class.__name__}")
                try:
                    loader = loader_class(str(file_path))
                    loaded_generic_docs.extend(loader.load())
                except Exception as e:
                    logger.error(f"  - Failed to load generic file '{file_path.name}': {e}")
            else:
                logger.warning(f"  - Skipping '{file_path.name}': unsupported file type '{file_ext}'.")
        
        if loaded_generic_docs:
            logger.info("Applying text splitter to generic documents...")
            generic_chunks = text_splitter.split_documents(loaded_generic_docs)
            final_chunks.extend(generic_chunks)
            logger.info(f"Split generic documents into {len(generic_chunks)} text chunks.")

    logger.info(f"Total of {len(final_chunks)} chunks prepared for ingestion.")
    return final_chunks


# ==============================================================================
# 3. MAIN WORKFLOW: build_vector_store
# ==============================================================================

def build_vector_store():
    """Main function to orchestrate the data ingestion and indexing pipeline."""
    logger.info("--- Starting Knowledge Base Ingestion ---")
    
    # --- Load Configuration from Centralized Settings ---
    tabular_pdf_names = [name.strip() for name in settings.TABULAR_PDF_FILES.split(',') if name.strip()]
    embedding_dimensions = settings.EMBEDDING_DIMENSIONS

    # --- Identify New Documents ---
    qdrant_path_obj = Path(settings.QDRANT_PATH)
    qdrant_path_obj.mkdir(parents=True, exist_ok=True)
    manifest_path = qdrant_path_obj / "processed_files.json"
    
    processed_files = set()
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            processed_files = set(json.load(f))
    logger.info(f"Found manifest for {len(processed_files)} previously processed files.")

    all_source_files = {str(p) for p in Path(settings.DATA_PATH).rglob("*") if p.is_file()}
    files_to_process = sorted(list(all_source_files - processed_files))

    if not files_to_process:
        logger.info("Knowledge base is already up to date. No new documents to process.")
        logger.info("--- Ingestion Complete ---")
        return

    # --- Load & Chunk New Documents ---
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    chunks = load_and_chunk_documents(files_to_process, text_splitter, tabular_pdf_names)
    
    if not chunks:
        logger.error("Failed to create any chunks from the new documents. Exiting.")
        return

    # --- Initialize Clients and Embed ---
    logger.info(f"Initializing Azure embeddings model: '{settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}'")
    embeddings = AzureOpenAIEmbeddings(
        azure_deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
        api_key=settings.AZURE_OPENAI_API_KEY,
        chunk_size= settings.AZURE_OPENAI_EMBEDDING_BATCH_SIZE
    )

    logger.info(f"Initializing Qdrant client at '{settings.QDRANT_PATH}'...")
    client = QdrantClient(path=settings.QDRANT_PATH)

    try:
        client.get_collection(collection_name=settings.QDRANT_COLLECTION_NAME)
        logger.info(f"Using existing Qdrant collection: '{settings.QDRANT_COLLECTION_NAME}'")
    except Exception:
        logger.info(f"Creating new Qdrant collection: '{settings.QDRANT_COLLECTION_NAME}'")
        client.recreate_collection(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            vectors_config=models.VectorParams(size=embedding_dimensions, distance=models.Distance.COSINE),
        )

    qdrant_store = QdrantVectorStore(
        client=client,
        collection_name=settings.QDRANT_COLLECTION_NAME,
        embedding=embeddings
    )

    # --- Index Data into Qdrant ---
    logger.info(f"Adding {len(chunks)} new chunks to the '{settings.QDRANT_COLLECTION_NAME}' collection...")
    qdrant_store.add_documents(chunks)
    logger.info("Successfully added new documents to the vector store.")

    # --- Update Manifest ---
    with open(manifest_path, "w") as f:
        json.dump(sorted(list(all_source_files)), f)
    logger.info(f"Manifest file updated. Total files processed: {len(all_source_files)}.")
    
    logger.info("--- Knowledge Base Ingestion Complete ---")


# ==============================================================================
# 4. SCRIPT ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    try:
        build_vector_store()
    except Exception as e:
        logger.critical("An unexpected critical error occurred.", exc_info=True)
        sys.exit(1)
