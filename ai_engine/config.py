import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama

load_dotenv()

server_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

print(f"Connect Server a IP: {server_url}")

llm_qwen_student = ChatOllama(
    base_url=server_url,
    # model="qwen3.5:0.8b",
    model="llama3.2:1b",
    temperature=0.7,
    num_ctx=4096,
    think=False,
    client_kwargs={"timeout": 120.0}
)

llm_llama_prof = ChatOllama(
    base_url=server_url,
    model="llama3.2:1b",
    temperature=0.0,
    client_kwargs={"timeout": 120.0}
)
