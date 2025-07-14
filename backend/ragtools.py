import logging
from pydantic import BaseModel, Field
from typing import List

# Import the ToolResult classes from rtmt
from rtmt import ToolResult, ToolResultDirection

from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda
from qdrant_client import QdrantClient


# Configure a logger for this module
logger = logging.getLogger("voicerag.ragtools")
# ==============================================================================
# 1. Pydantic Tool Definitions
# ==============================================================================
# These classes define the "schema" for our tools. The AI model will use the
# class names, field names, and docstrings to decide when to call them.

class SearchInput(BaseModel):
    """Searches the knowledge base to answer a user's question."""
    query: str = Field(description="A detailed question to search for in the knowledge base.")

class ReportGroundingInput(BaseModel):
    """Reports the sources from the knowledge base that were used to form an answer."""
    source_ids: List[str] = Field(
        description="A list of the unique 'chunk_id' strings from the search results that were used to construct the answer."
    )

# ==============================================================================
# 2. RAG Chain Construction
# ==============================================================================

def format_docs_with_sources(docs: List[Document]) -> str:
    """
    Formats a list of retrieved documents into a single string,
    prefixing each with its source ID. This is the "evidence" that will be
    sent to the main conversational model.
    """
    # This will print the raw documents returned by the retriever to your terminal.
    print(f"DEBUG: Documents received by formatter: {docs}")
    # ----------------------------

    formatted_chunks = []
    for doc in docs:
        source_id = doc.metadata.get("_id", "unknown_source")
        formatted_chunks.append(f"[{source_id}]: {doc.page_content}")
    return "\n-----\n".join(formatted_chunks)

def create_rag_chain(retriever):
    """
    Creates a Retrieval and Formatting chain using LCEL.
    
    This chain's ONLY job is to retrieve relevant documents and format them
    into a string of evidence for the main model. The final answer synthesis
    is handled by the main real-time model, not this chain.
    """
    # THE FIX: The chain now stops after retrieving and formatting documents.
    # It no longer calls the 'base_llm' to synthesize an answer.
    rag_chain = (
        retriever
        | RunnableLambda(format_docs_with_sources)

    )
    return rag_chain

# ==============================================================================
# 3. Tool Implementation Functions
# ==============================================================================
# These are the actual Python functions that will be executed when the AI decides to use one of our tools. 
# They must be asynchronous.

async def search_implementation(query: str, retriever) -> ToolResult:
    """
    Executes the RAG chain for a given query and returns a ToolResult.
    """
    logger.info(f"Executing RAG search for query: '{query}'")

    # --- START of logging block ---
    try:
        # Directly query the vector store to get documents WITH their scores for debugging.
        # This gives us insight into the retriever's confidence.
        retrieved_docs_with_scores = await retriever.vectorstore.asimilarity_search_with_relevance_scores(
            query,
            k=retriever.search_kwargs.get("k", 3)
        )

        logger.info("--- [DEBUG] Top Retrieved Documents with Scores ---")
        if not retrieved_docs_with_scores:
            logger.warning("  - Retriever returned NO documents.")
        else:
            for doc, score in retrieved_docs_with_scores:
                # Log the relevance score (higher is better for most stores)
                logger.info(f"  - Score: {score:.4f}")
                logger.info(f"  - Source: {doc.metadata.get('source', 'N/A')}, Page: {doc.metadata.get('page', 'N/A')}")
                # Log a snippet of the content to see what the retriever "thought" was relevant
                logger.info(f"  - Content Snippet: {doc.page_content[:150].replace('\n', ' ')}...")
        logger.info("-------------------------------------------------")

    except Exception as e:
        # If the debug logging fails for any reason, we log the error but don't crash the main RAG flow.
        logger.error(f"  - [DEBUG] Error during direct similarity search: {e}")
    # --- END of logging block ---

    try:
        retrieved_docs = await retriever.ainvoke(query)
        result = format_docs_with_sources(retrieved_docs)
        return ToolResult(result, ToolResultDirection.TO_SERVER)
    except Exception as e:
        logger.error(f"Error during RAG chain execution: {e}", exc_info=True)
        error_message = "I encountered an error while searching the knowledge base."
        return ToolResult(error_message, ToolResultDirection.TO_SERVER)

async def report_grounding_implementation(source_ids: List[str], qdrant_client: QdrantClient, collection_name: str) -> ToolResult:
    """
    Retrieves document chunks from Qdrant and returns a ToolResult.
    """
    logger.info(f"Retrieving grounding sources for IDs: {source_ids}")
    docs = {"sources": []}
    if not source_ids:
        return ToolResult(docs, ToolResultDirection.TO_CLIENT)
    
    try:
        points = qdrant_client.retrieve(
            collection_name=collection_name,
            ids=source_ids,
            with_payload=True
        )
        
        formatted_points = [
            {
                "chunk_id": point.id,
                "title": point.payload.get("metadata", {}).get("source", "Unknown Source"),
                "chunk": point.payload.get("page_content", "")
            }
            for point in points
        ]
        docs = {"sources": formatted_points}
    except Exception as e:
        logger.error(f"Error retrieving grounding sources from Qdrant: {e}", exc_info=True)
    
    return ToolResult(docs, ToolResultDirection.TO_CLIENT)