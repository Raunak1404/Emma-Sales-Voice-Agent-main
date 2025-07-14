# AI Sales Voice Agent: Langchain RAG + Qdrant Vector Database + Azure OpenAI GPT-4o-mini-realtime

This project is a full-stack application featuring "Emma," an AI-powered sales voice agent. Emma is designed to engage in real-time, human-like conversations to make outbound sales calls, answer questions about Microsoft 365 products, and convert potential customers into clients.

The application leverages a Retrieval-Augmented Generation (RAG) architecture, allowing the AI to provide responses grounded in a local knowledge base of documents. It uses a Python backend with `aiohttp` and `langchain` for the core AI logic and a React/TypeScript frontend for the user interface.

Credits to [VoiceRAG](https://github.com/Azure-Samples/aisearch-openai-rag-audio/tree/main?tab=readme-ov-file#voicerag-an-application-pattern-for-rag--voice-using-azure-ai-search-and-the-gpt-4o-realtime-api-for-audio) for the inspiration.

## Key Features

-   **Real-Time Voice Interaction:** Employs Azure Speech Service for low-latency, speech-to-speech conversation with "barge-in" capability, allowing users to interrupt the agent for a more natural conversational flow.
-   **Customizable AI Persona:** The agent's personality, instructions, and core behaviors are defined in a plain text file (`backend/system_prompt.md`), making it easy to customize and experiment with different personas.
-   **RAG-Powered Knowledge Base:** The agent's knowledge is derived from documents you provide in the `backend/knowledge_base` directory. It uses LangChain and a Qdrant vector database to retrieve relevant information and generate contextually aware answers.
-   **Azure AI Services Integration:** Utilizes a suite of Azure services, including Azure OpenAI's gpt-4o-mini-realtime-preview and embeddings model, as well as Azure Speech Service for real-time transcription and voice synthesis.
-   **Structured Tool Use:** The agent's behavior is made reliable and predictable through a structured toolset (`SearchInput`, `ReportGroundingInput`) that governs how it accesses information and reports its sources.
-   **Full-Stack Architecture:** A clear separation of concerns between the Python backend (handling AI, WebSocket communication, and serving files) and the modern React frontend (providing a responsive UI and handling user interaction).
-   **Advanced & Efficient Data Ingestion:** The ingestion pipeline (`ingest.py`) uses a sophisticated hybrid approach. While standard documents are processed normally, it features a specialized workflow for complex, table-heavy PDFs. By leveraging `unstructured.io` and `pandas`, it accurately parses tables, transforms the data, and creates highly structured, per-item documents for the vector store. The process is also highly efficient, using a manifest to only process new or changed files on subsequent runs.

## Getting Started (Prerequisites)

Follow these steps to set up the development environment.

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

#### 2. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create and activate a Python virtual environment:**
    ```bash
    python -m venv venv
    # On Windows
    .\venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```
3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Install External Dependencies:** For parsing documents, this project requires Poppler and Tesseract.
    *   **Poppler:** [Download for Windows](https://github.com/oschwartz10612/poppler-windows/releases) or install via a package manager (e.g., `brew install poppler` on macOS).
    *   **Tesseract:** [Download for Windows](https://github.com/tesseract-ocr/tesseract/releases) or install via a package manager (e.g., `brew install tesseract` on macOS).
    *   **IMPORTANT:** After installation, you must add the `bin` directories of both Poppler and Tesseract to your system's PATH environment variable.

#### 3. Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```
2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

## Deploying the App (Execution)

Follow these steps sequentially to run the application.

#### Step 1: Configure Environment Variables

1.  In the `backend` directory, make a copy of the example environment file:
    ```bash
    # In the backend/ directory
    cp .env.example .env
    ```
2.  Open the newly created `.env` file and fill in your Azure credentials. At a minimum, you must provide:
    *   `AZURE_OPENAI_ENDPOINT`
    *   `AZURE_OPENAI_API_KEY`
    *   `AZURE_OPENAI_REALTIME_DEPLOYMENT`
    *   `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`

#### Step 2: Populate the Knowledge Base

Place your source documents (e.g., product manuals, pricing sheets, FAQs) into the `backend/knowledge_base` directory. The application supports PDF, DOCX, XLSX, and TXT file formats.

**For PDFs with Complex Tables:**

This application includes a specialized parser for PDFs containing structured data like pricing tables. To use it:
1.  Open your `backend/.env` file.
2.  Locate the `TABULAR_PDF_FILES` variable.
3.  Add the exact filenames of your tabular PDFs, separated by commas. For example:
    `TABULAR_PDF_FILES="product_comparison.pdf,pricing_sheet_v2.pdf"`

This will ensure these specific files are parsed with high accuracy. All other documents will be processed normally.

#### Step 3: Ingest Data into the Vector Store

This step processes your documents, creates vector embeddings, and stores them in the Qdrant database for the RAG model to use.

From the `backend` directory, run:
```bash
python ingest.py
```

#### Step 4: Build the Frontend

The React application must be compiled into static assets to be served by the backend.

From the `frontend` directory, run:
```bash
npm run build
```

#### Step 5: Run the Application

Start the backend server, which will serve the frontend and handle all AI processing.

From the `backend` directory, run:
```bash
python app.py
```

#### Step 6: Access the UI

Open your web browser and navigate to **`http://localhost:8765`**. You can now start a conversation with Emma by clicking the '🎙️' button.

## Guidance

### How It Works

The application follows a clear request-response lifecycle:
1.  **User Speaks:** The user clicks the "🎙️" button, and the frontend captures microphone audio.
2.  **Frontend to Backend:** The audio is streamed to the Python backend via a WebSocket.
3.  **Backend to Azure:** The backend forwards the audio to Azure Speech Service for transcription.
4.  **AI Processing:** The transcribed text is sent to the LangChain agent. The agent uses the RAG chain to retrieve relevant documents from Qdrant and generates an response using the Azure OpenAI GPT-4o-realtime-preview model.
5.  **Backend to Frontend:** The audio response and grounding documents are streamed back to the frontend via the WebSocket.
6.  **User Hears:** The frontend plays the audio response, and the UI is updated with the conversation history and source documents.

### Customization

-   **AI Persona:** Modify the agent's personality, instructions, and tone by editing `backend/system_prompt.md`.
-   **Agent Tools:** Add or change the agent's capabilities by editing the Pydantic models and implementation functions in `backend/ragtools.py`.
-   **Voice Selection:** Change the agent's voice by updating the `AZURE_OPENAI_VOICE_CHOICE` variable in the `.env` file. A list of available voices can be found in the Azure Speech Service documentation.
