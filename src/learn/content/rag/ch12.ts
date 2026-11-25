import type { Block, Chapter } from "../types";

// Code and expected output are copied from capstone/BUILD-ORDER.md and capstone/ by script.
const K = {
  init: "uv sync",
  addDeps: "uv tree --depth 1",
  addDev: "uv run ruff check src",
  pyproject: `[tool.ruff]
line-length = 110

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-m 'not live'"
markers = ["live: calls a paid API. Run with -m live and real keys."]`,
  gitignore: `.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
.env
node_modules/
ui/dist/
*.egg-info/
data/`,
  envExample: "# Copy to .env and fill in. Never commit .env.\nDATABASE_URL=postgresql://askpep@localhost:5432/askpep\n\n# Clients send this in the X-API-Key header. Leave it empty and every protected route returns 401.\nAPI_KEY=change-me\n\nVOYAGE_API_KEY=\nANTHROPIC_API_KEY=\n\n# Vendor model names change often. Check each vendor's model list before you rely on these.\nEMBED_MODEL=voyage-3.5\nEMBED_DIM=1024\nRERANK_MODEL=rerank-2.5\nANSWER_MODEL=claude-sonnet-5-5\n\n# \"live\" calls Voyage and Anthropic. \"fake\" uses offline stand-ins, so no keys are needed.\nPROVIDERS=live\n\nCORS_ORIGINS=http://localhost:5173",
  cpEnv: "cp -n .env.example .env",
  runPlaceholder: "uv run python -c \"import askpep; print(askpep.__doc__)\"",
  compose: "services:\n  db:\n    image: pgvector/pgvector:pg17\n    environment:\n      POSTGRES_USER: askpep\n      POSTGRES_DB: askpep\n      # Local development only. The port is bound to 127.0.0.1, so no password is needed.\n      POSTGRES_HOST_AUTH_METHOD: trust\n    ports:\n      - \"127.0.0.1:5432:5432\"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U askpep\"]\n      interval: 3s\n      timeout: 3s\n      retries: 20\n\nvolumes:\n  pgdata:",
  composeUp: "docker compose up -d db",
  pgReady: "docker compose exec db pg_isready -U askpep",
  config: `from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://askpep@localhost:5432/askpep"
    api_key: str = ""
    voyage_api_key: str = ""
    anthropic_api_key: str = ""
    providers: str = "live"  # "live" or "fake"
    store: str = "pg"  # "pg" or "local". Ingest ignores it and takes --store.
    local_store_path: str = "data/store.json"
    corpus_dir: str = "data/raw"  # pep-NNNN.rst files

    embed_model: str = "voyage-3.5"
    embed_dim: int = 1024
    rerank_model: str = "rerank-2.5"
    answer_model: str = "claude-sonnet-5-5"
    answer_max_tokens: int = 1024
    judge_model: str = "claude-sonnet-5-5"

    chunk_max_tokens: int = 400
    chunk_overlap_tokens: int = 50
    candidates: int = 30  # per retriever, and the size of the list sent to the reranker
    top_k: int = 6
    rerank_enabled: bool = True
    min_rerank_score: float = 0.2  # below this the best hit is too weak and we refuse
    context_budget_tokens: int = 3000

    cors_origins: str = "http://localhost:5173"
    ui_dist: str = "ui/dist"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()`,
  logs: "import json\nimport logging\nimport sys\n\n_STANDARD = set(logging.makeLogRecord({}).__dict__) | {\"message\", \"asctime\"}\n\n\nclass JsonFormatter(logging.Formatter):\n    def format(self, record: logging.LogRecord) -> str:\n        entry = {\n            \"ts\": self.formatTime(record, \"%Y-%m-%dT%H:%M:%S%z\"),\n            \"level\": record.levelname,\n            \"logger\": record.name,\n            \"msg\": record.getMessage(),\n        }\n        entry.update({k: v for k, v in record.__dict__.items() if k not in _STANDARD})\n        if record.exc_info:\n            entry[\"exc\"] = self.formatException(record.exc_info)\n        return json.dumps(entry, default=str)\n\n\ndef setup_logging() -> None:\n    handler = logging.StreamHandler(sys.stderr)  # stderr keeps stdout clean for MCP stdio\n    handler.setFormatter(JsonFormatter())\n    root = logging.getLogger()\n    root.handlers[:] = [handler]\n    root.setLevel(logging.INFO)\n    logging.getLogger(\"httpx\").setLevel(logging.WARNING)",
  checkConfig: "uv run python -c \"from askpep.config import get_settings; s = get_settings(); print(s.embed_model, s.embed_dim, s.rerank_model, s.answer_model)\"",
  checkLogs: "uv run python -c \"import logging; from askpep.logs import setup_logging; setup_logging(); logging.getLogger('demo').info('hello', extra={'k': 1})\"",
  mig1: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id           integer PRIMARY KEY,          -- the PEP number
    title        text        NOT NULL,
    source       text        NOT NULL,          -- the peps.python.org URL
    headers      jsonb       NOT NULL DEFAULT '{}',  -- the PEP header fields, such as Python-Version
    content_hash text        NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id       integer NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    idx          integer NOT NULL,             -- position inside the document
    heading_path text[]  NOT NULL,
    text         text    NOT NULL,
    token_count  integer NOT NULL,
    start_offset integer NOT NULL,             -- the slice of the document text this chunk is
    end_offset   integer NOT NULL,
    embedding    vector({{EMBED_DIM}}) NOT NULL,
    tsv          tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    UNIQUE (doc_id, idx)
);`,
  mig2: "CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);\nCREATE INDEX chunks_tsv_gin ON chunks USING gin (tsv);",
  mig3: "CREATE TABLE traces (\n    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    ts            timestamptz NOT NULL DEFAULT now(),\n    route         text        NOT NULL,         -- search, ask, mcp.search, mcp.ask\n    query         text        NOT NULL,\n    timings       jsonb       NOT NULL DEFAULT '{}',  -- milliseconds per stage\n    retrieved_ids bigint[]    NOT NULL DEFAULT '{}',\n    model         text,\n    tokens_in     integer,\n    tokens_out    integer,\n    refused       boolean     NOT NULL DEFAULT false,\n    latency_ms    double precision NOT NULL,\n    error         text\n);\n\nCREATE INDEX traces_ts ON traces (ts DESC);",
  db: "from pathlib import Path\n\nimport psycopg\nfrom pgvector.psycopg import register_vector\nfrom psycopg.rows import dict_row\nfrom psycopg_pool import ConnectionPool\n\nfrom askpep.config import Settings\n\nMIGRATIONS_DIR = Path(__file__).parent / \"migrations\"\n\n\ndef migrate(settings: Settings) -> list[str]:\n    \"\"\"Apply any .sql file in migrations/ that has not run yet. Returns the versions applied.\"\"\"\n    applied: list[str] = []\n    with psycopg.connect(settings.database_url) as conn:\n        conn.execute(\n            \"CREATE TABLE IF NOT EXISTS schema_migrations \"\n            \"(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())\"\n        )\n        done = {row[0] for row in conn.execute(\"SELECT version FROM schema_migrations\")}\n        for path in sorted(MIGRATIONS_DIR.glob(\"*.sql\")):\n            if path.stem in done:\n                continue\n            sql = path.read_text().replace(\"{{EMBED_DIM}}\", str(settings.embed_dim))\n            with conn.transaction():\n                conn.execute(sql)\n                conn.execute(\"INSERT INTO schema_migrations (version) VALUES (%s)\", (path.stem,))\n            applied.append(path.stem)\n    return applied\n\n\ndef _configure(conn: psycopg.Connection) -> None:\n    register_vector(conn)\n    conn.commit()  # the type lookup opens a transaction, and the pool wants an idle connection\n\n\ndef make_pool(settings: Settings) -> ConnectionPool:\n    \"\"\"Create the pool closed. Call pool.open() once the schema exists, because register_vector\n    needs the vector extension, and the first migration creates it.\"\"\"\n    return ConnectionPool(\n        settings.database_url,\n        min_size=1,\n        max_size=10,\n        configure=_configure,\n        kwargs={\"row_factory\": dict_row},\n        open=False,\n    )",
  initPy: "\"\"\"AskPEP: question answering over 18 Python PEPs.\"\"\"\n\n\ndef main() -> None:\n    from askpep.cli import app\n\n    app()",
  cli: `from typing import Annotated

import typer

from askpep.config import get_settings
from askpep.logs import setup_logging

app = typer.Typer(no_args_is_help=True, add_completion=False)


STORES = ("pg", "local")


def check_store(store: str) -> str:
    if store not in ("", *STORES):
        raise typer.BadParameter(f"{store!r} is not one of: {', '.join(STORES)}", param_hint="--store")
    return store


def open_services(store: str = ""):
    """Build the services and open the pool. Needs the schema to exist, so run \`askpep migrate\` first.
    Pass store="local" to read LOCAL_STORE_PATH instead, which needs no database."""
    from askpep.services import build_services

    settings = get_settings()
    if store:
        settings = settings.model_copy(update={"store": store})
    svc = build_services(settings)
    if svc.pool is not None:
        svc.pool.open()
    return svc


@app.callback()
def main() -> None:
    setup_logging()


@app.command()
def migrate() -> None:
    """Apply SQL migrations."""
    from askpep.db import migrate as run_migrations

    applied = run_migrations(get_settings())
    typer.echo(f"applied: {', '.join(applied)}" if applied else "up to date")`,
  help: "uv run askpep --help",
  migrate: "uv run askpep migrate",
  tables: "docker compose exec db psql -U askpep -c \"select table_name from information_schema.tables where table_schema = 'public' order by 1\"",
  indexes: "docker compose exec db psql -U askpep -c \"select indexname from pg_indexes where tablename = 'chunks' order by 1\"",
  providers: `"""The three outside services behind small protocols: embeddings, rerank and the LLM."""

import logging
import os
import time
from collections.abc import Callable, Iterator, Mapping, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

import anthropic
import httpx

from askpep.types import Chunk, EmbeddedChunk

log = logging.getLogger(__name__)

InputType = Literal["document", "query"]

VOYAGE_EMBED_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_RERANK_URL = "https://api.voyageai.com/v1/rerank"


@dataclass(frozen=True)
class Usage:
    tokens_in: int
    tokens_out: int


class Embedder(Protocol):
    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]: ...


class Reranker(Protocol):
    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        """Return (index into documents, relevance score), best first."""
        ...


class LLM(Protocol):
    def stream(self, system: str, user: str) -> Iterator[str | Usage]:
        """Yield text deltas, then one Usage as the last item."""
        ...


class ProviderError(Exception):
    """An outside call failed for good. \`status\` is the HTTP status, or 0 when no response came back."""

    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


def batched[T](items: Sequence[T], size: int) -> Iterator[list[T]]:
    """Yield successive lists of at most \`size\` items, in order."""
    if size < 1:
        raise ValueError("batch size must be a positive integer")
    for start in range(0, len(items), size):
        yield list(items[start : start + size])


def _retry_after_s(response: httpx.Response) -> float | None:
    """The Retry-After header as seconds, or None when it is missing or is not a plain number."""
    try:
        seconds = float(response.headers["retry-after"])
    except (KeyError, ValueError):
        return None
    return seconds if seconds >= 0 else None


def post_with_retry(
    client: httpx.Client,
    url: str,
    payload: dict,
    attempts: int = 5,
    base_delay_s: float = 1.0,
    sleep: Callable[[float], None] = time.sleep,
) -> dict:
    """POST JSON. Retry 429, 5xx and network errors, up to \`attempts\` tries in total.

    The wait is the Retry-After header when the server sends one. Otherwise it is base_delay_s,
    doubled after each failed try. A 4xx other than 429 is not retried. The last failure raises
    ProviderError.
    """
    for attempt in range(1, attempts + 1):
        backoff = base_delay_s * 2 ** (attempt - 1)
        try:
            response = client.post(url, json=payload)
        except httpx.TransportError as exc:
            if attempt == attempts:
                raise ProviderError(f"POST {url} failed: {type(exc).__name__}") from exc
            reason, delay = type(exc).__name__, backoff
        else:
            status = response.status_code
            if status < 400:
                return response.json()
            if (status != 429 and status < 500) or attempt == attempts:
                raise ProviderError(f"POST {url} failed with status {status}: {response.text[:300]}", status)
            retry_after = _retry_after_s(response)
            reason, delay = str(status), backoff if retry_after is None else retry_after
        log.warning("retrying", extra={"url": url, "reason": reason, "attempt": attempt, "delay_s": delay})
        sleep(delay)
    raise AssertionError("unreachable")


class VoyageEmbedder:
    def __init__(
        self, api_key: str, model: str, dim: int, *, client: httpx.Client | None = None, batch_size: int = 64
    ):
        if not api_key:
            raise ValueError("VOYAGE_API_KEY is not set")
        if not model:
            raise ValueError("EMBED_MODEL is not set")
        self.model, self.dim, self.batch_size = model, dim, batch_size
        self.client = client or httpx.Client(timeout=60)
        self.client.headers["Authorization"] = f"Bearer {api_key}"

    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]:
        vectors: list[list[float]] = []
        for batch in batched(texts, self.batch_size):
            data = post_with_retry(
                self.client,
                VOYAGE_EMBED_URL,
                {"input": batch, "model": self.model, "input_type": input_type, "output_dimension": self.dim},
            )
            items = sorted(data["data"], key=lambda item: item["index"])
            if len(items) != len(batch):
                raise ProviderError(f"expected {len(batch)} embeddings, got {len(items)}")
            vectors.extend(item["embedding"] for item in items)
        return vectors


def embedder_from_env(env: Mapping[str, str] = os.environ) -> VoyageEmbedder:
    """Build the embedder from VOYAGE_API_KEY, EMBED_MODEL and EMBED_DIM, and fail early if one is missing."""
    api_key, model = env.get("VOYAGE_API_KEY", ""), env.get("EMBED_MODEL", "")
    if not api_key:
        raise ValueError("VOYAGE_API_KEY is not set")
    if not model:
        raise ValueError("EMBED_MODEL is not set")
    return VoyageEmbedder(api_key, model, int(env.get("EMBED_DIM", "1024")))


def embed_query(embedder: Embedder, text: str) -> list[float]:
    return embedder.embed([text], "query")[0]


def embed_chunks(embedder: Embedder, chunks: Sequence[Chunk]) -> list[EmbeddedChunk]:
    """Embed each chunk's heading trail plus text, and keep the chunk beside its vector."""
    vectors = embedder.embed([c.embedding_text for c in chunks], "document")
    return [EmbeddedChunk(chunk, vector) for chunk, vector in zip(chunks, vectors, strict=True)]


class VoyageReranker:
    def __init__(self, api_key: str, model: str, *, client: httpx.Client | None = None):
        if not api_key:
            raise ValueError("VOYAGE_API_KEY is not set")
        if not model:
            raise ValueError("RERANK_MODEL is not set")
        self.model = model
        self.client = client or httpx.Client(timeout=60)
        self.client.headers["Authorization"] = f"Bearer {api_key}"

    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        if not documents:
            return []
        data = post_with_retry(
            self.client,
            VOYAGE_RERANK_URL,
            {"query": query, "documents": documents, "model": self.model, "top_k": top_k},
        )
        scored = [(item["index"], item["relevance_score"]) for item in data["data"]]
        return sorted(scored, key=lambda pair: pair[1], reverse=True)[:top_k]


class ClaudeLLM:
    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int = 1024,
        cache_system: bool = True,
        client: anthropic.Anthropic | None = None,
    ):
        self.model, self.max_tokens, self.cache_system = model, max_tokens, cache_system
        self.client = client or anthropic.Anthropic(api_key=api_key)

    def stream(self, system: str, user: str) -> Iterator[str | Usage]:
        # cache_control marks the system prompt as cacheable. The API only caches a prefix above
        # a minimum length (1024 tokens on most models), so a short prompt is simply not cached.
        block: dict = {"type": "text", "text": system}
        if self.cache_system:
            block["cache_control"] = {"type": "ephemeral"}
        with self.client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            system=[block],
            messages=[{"role": "user", "content": user}],
        ) as stream:
            yield from stream.text_stream
            usage = stream.get_final_message().usage
        yield Usage(usage.input_tokens, usage.output_tokens)`,
  fakes: "\"\"\"Offline stand-ins for the providers. Tests use them, and so can you when you have no keys.\"\"\"\n\nimport hashlib\nimport math\nimport re\nfrom collections.abc import Iterator\n\nfrom askpep.providers import InputType, Usage\n\nWORD = re.compile(r\"[a-z0-9]+\")\n\n\ndef words(text: str) -> list[str]:\n    return WORD.findall(text.lower())\n\n\nclass FakeEmbedder:\n    \"\"\"Hashes each word into one dimension, so texts that share words get similar vectors.\"\"\"\n\n    def __init__(self, dim: int = 1024):\n        self.dim = dim\n\n    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]:\n        return [self._vector(text) for text in texts]\n\n    def _vector(self, text: str) -> list[float]:\n        vector = [0.0] * self.dim\n        for word in words(text):\n            bucket = int(hashlib.md5(word.encode()).hexdigest(), 16) % self.dim\n            vector[bucket] += 1.0\n        norm = math.sqrt(sum(v * v for v in vector)) or 1.0\n        return [v / norm for v in vector]\n\n\nclass FakeReranker:\n    \"\"\"Scores a document by the share of query words it contains.\"\"\"\n\n    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:\n        query_words = set(words(query))\n        scored = [\n            (i, len(query_words & set(words(doc))) / (len(query_words) or 1))\n            for i, doc in enumerate(documents)\n        ]\n        return sorted(scored, key=lambda pair: pair[1], reverse=True)[:top_k]\n\n\nclass FakeLLM:\n    \"\"\"Answers with the first source it was given, cited as [1].\"\"\"\n\n    def __init__(self, reply: str | None = None):\n        self.reply = reply\n        self.calls: list[tuple[str, str]] = []\n\n    def stream(self, system: str, user: str) -> Iterator[str | Usage]:\n        self.calls.append((system, user))\n        reply = self.reply or \"The first source is the best match [1].\"\n        for token in reply.split(\" \"):\n            yield token + \" \"\n        yield Usage(tokens_in=len(user) // 4, tokens_out=len(reply) // 4)",
  services: `from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from psycopg_pool import ConnectionPool

from askpep.config import Settings
from askpep.db import make_pool
from askpep.fakes import FakeEmbedder, FakeLLM, FakeReranker
from askpep.local_store import LocalStore, load_store
from askpep.providers import (
    LLM,
    ClaudeLLM,
    Embedder,
    Reranker,
    VoyageEmbedder,
    VoyageReranker,
)

if TYPE_CHECKING:
    from askpep.retrieval import ChunkStore


@dataclass
class Services:
    """Everything the core functions need. Tests build one with fakes."""

    settings: Settings
    pool: ConnectionPool | None  # None in local mode, and Trace.write then skips the database
    embedder: Embedder
    reranker: Reranker
    llm: LLM
    store: "ChunkStore | None" = None

    def __post_init__(self) -> None:
        if self.store is None and self.pool is not None:
            # Imported here, because retrieval.py imports this module.
            from askpep.retrieval import PgStore

            self.store = PgStore(self.pool)


def build_providers(settings: Settings) -> tuple[Embedder, Reranker, LLM]:
    """The embedder, reranker and LLM: offline fakes when PROVIDERS=fake, else Voyage and Claude."""
    if settings.providers == "fake":
        return FakeEmbedder(settings.embed_dim), FakeReranker(), FakeLLM()
    return (
        VoyageEmbedder(settings.voyage_api_key, settings.embed_model, settings.embed_dim),
        VoyageReranker(settings.voyage_api_key, settings.rerank_model),
        ClaudeLLM(settings.anthropic_api_key, settings.answer_model, max_tokens=settings.answer_max_tokens),
    )


def build_services(settings: Settings) -> Services:
    embedder, reranker, llm = build_providers(settings)
    if settings.store == "local":
        path = Path(settings.local_store_path)
        if not path.is_file():
            raise RuntimeError(f"No local store at {path}. Run \`askpep ingest --store local\` first.")
        store = LocalStore(load_store(path, dim=settings.embed_dim))
        return Services(settings, None, embedder, reranker, llm, store)
    return Services(settings, make_pool(settings), embedder, reranker, llm)`,
  mkTests: "ls tests/rag",
  testProviders: `"""ch04 and ch07 steps 1 and 2: providers.py, the Voyage embedder and reranker behind small protocols.

    uv run pytest tests/rag/test_providers.py -k ch04_s3

No test here touches the network. They swap httpx's transport for a mock. The two live tests carry
\`@pytest.mark.live\` and run only with \`-m live\` and real keys in \`.env\`.
"""

import json
import math
from collections.abc import Callable

import httpx
import pytest

from askpep.config import Settings
from askpep.providers import (
    ProviderError,
    VoyageEmbedder,
    VoyageReranker,
    batched,
    embed_chunks,
    embed_query,
    embedder_from_env,
    post_with_retry,
)
from tests.helpers import make_chunk

EMBED_URL = "https://api.voyageai.com/v1/embeddings"
RERANK_URL = "https://api.voyageai.com/v1/rerank"


class FakeServer:
    """A mock transport that records every request and plays a script of statuses, then answers 200."""

    def __init__(self, respond: Callable[[dict], dict], script: list[int] | None = None):
        self.respond = respond
        self.script = list(script or [])
        self.requests: list[httpx.Request] = []
        self.bodies: list[dict] = []
        self.client = httpx.Client(transport=httpx.MockTransport(self.handle))

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        body = json.loads(request.content) if request.content else {}
        self.bodies.append(body)
        step = self.script[len(self.requests) - 1] if len(self.requests) <= len(self.script) else 200
        if step == 200:
            return httpx.Response(200, json=self.respond(body))
        headers = {"retry-after": "2"} if step == 429 else {}
        return httpx.Response(step, text="nope", headers=headers)


def shuffled_embeddings(body: dict) -> dict:
    """Vectors are [text length, position in the batch], returned in reverse so a test proves you sort."""
    data = [{"index": i, "embedding": [float(len(text)), float(i)]} for i, text in enumerate(body["input"])]
    return {"data": data[::-1]}


def embedder(server: FakeServer, **options: int) -> VoyageEmbedder:
    return VoyageEmbedder("test-key", "test-model", 2, client=server.client, **options)


# ch04 step 1: configuration fails early


def test_ch04_s1_the_embedder_is_built_from_the_environment() -> None:
    env = {"VOYAGE_API_KEY": "k", "EMBED_MODEL": "m", "EMBED_DIM": "256"}
    built = embedder_from_env(env)
    assert isinstance(built, VoyageEmbedder)
    assert (built.model, built.dim) == ("m", 256)


def test_ch04_s1_the_dimension_defaults_to_1024() -> None:
    assert embedder_from_env({"VOYAGE_API_KEY": "k", "EMBED_MODEL": "m"}).dim == 1024


def test_ch04_s1_a_missing_key_fails_early_and_names_the_variable() -> None:
    with pytest.raises(ValueError, match="VOYAGE_API_KEY"):
        embedder_from_env({"EMBED_MODEL": "m"})


def test_ch04_s1_a_missing_model_fails_early_and_names_the_variable() -> None:
    with pytest.raises(ValueError, match="EMBED_MODEL"):
        embedder_from_env({"VOYAGE_API_KEY": "k"})


def test_ch04_s1_an_empty_list_makes_no_request() -> None:
    server = FakeServer(shuffled_embeddings)
    assert embedder(server).embed([], "document") == []
    assert server.requests == []


# ch04 step 2: batches


def test_ch04_s2_batched_yields_lists_of_at_most_size_in_order() -> None:
    assert list(batched([1, 2, 3, 4, 5], 2)) == [[1, 2], [3, 4], [5]]


def test_ch04_s2_batched_of_nothing_yields_nothing() -> None:
    assert list(batched([], 3)) == []


def test_ch04_s2_a_batch_size_below_one_is_rejected() -> None:
    with pytest.raises(ValueError):
        list(batched([1], 0))


# ch04 step 3: the request


def test_ch04_s3_the_request_carries_the_model_the_input_type_and_the_bearer_key() -> None:
    server = FakeServer(shuffled_embeddings)
    embedder(server).embed(["x"], "query")
    request, body = server.requests[0], server.bodies[0]
    assert request.method == "POST"
    assert str(request.url) == EMBED_URL
    assert request.headers["authorization"] == "Bearer test-key"
    assert body["model"] == "test-model"
    assert body["input_type"] == "query"
    assert body["input"] == ["x"]


def test_ch04_s3_vectors_come_back_in_input_order_whatever_order_the_api_uses() -> None:
    server = FakeServer(shuffled_embeddings)
    vectors = embedder(server, batch_size=2).embed(["a", "bb", "ccc", "dddd", "eeeee"], "document")
    assert [v[0] for v in vectors] == [1, 2, 3, 4, 5]


def test_ch04_s3_the_embedder_sends_one_request_per_batch() -> None:
    server = FakeServer(shuffled_embeddings)
    embedder(server, batch_size=2).embed(["a", "bb", "ccc", "dddd", "eeeee"], "document")
    assert [len(body["input"]) for body in server.bodies] == [2, 2, 1]


def test_ch04_s3_the_default_batch_size_is_64() -> None:
    server = FakeServer(shuffled_embeddings)
    embedder(server).embed(["x"] * 130, "document")
    assert [len(body["input"]) for body in server.bodies] == [64, 64, 2]


# ch04 step 4: the wrappers


class RecordingEmbedder:
    def __init__(self) -> None:
        self.calls: list[tuple[list[str], str]] = []

    def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        self.calls.append((list(texts), input_type))
        return [[float(i), float(len(text))] for i, text in enumerate(texts)]


def test_ch04_s4_embed_query_asks_for_a_query_vector_and_returns_one_vector() -> None:
    rec = RecordingEmbedder()
    vector = embed_query(rec, "what is the walrus operator")
    assert rec.calls == [(["what is the walrus operator"], "query")]
    assert vector == [0.0, 27.0]


def test_ch04_s4_embed_chunks_embeds_the_heading_trail_and_text_as_documents() -> None:
    rec = RecordingEmbedder()
    chunks = [make_chunk(8, i, "x" * (i + 1), heading_path=["PEP 8", "Code Lay-out"]) for i in range(3)]
    embed_chunks(rec, chunks)
    assert len(rec.calls) == 1
    texts, input_type = rec.calls[0]
    assert input_type == "document"
    assert texts == [c.embedding_text for c in chunks]


def test_ch04_s4_embed_chunks_keeps_each_chunk_beside_its_own_vector() -> None:
    rec = RecordingEmbedder()
    chunks = [make_chunk(8, i, "x" * (i + 1)) for i in range(3)]
    out = embed_chunks(rec, chunks)
    assert [e.chunk for e in out] == chunks
    assert [e.vector[0] for e in out] == [0.0, 1.0, 2.0]


def test_ch04_s4_embed_chunks_through_a_real_embedder_pairs_vectors_with_chunks() -> None:
    server = FakeServer(shuffled_embeddings)
    chunks = [make_chunk(8, i, "x" * (i + 1)) for i in range(3)]
    out = embed_chunks(embedder(server, batch_size=2), chunks)
    assert all(body["input_type"] == "document" for body in server.bodies)
    assert [e.chunk.id for e in out] == ["8#0", "8#1", "8#2"]
    assert out[2].vector == [float(len(chunks[2].embedding_text)), 0.0]


def test_ch04_s4_embedding_no_chunks_gives_no_entries() -> None:
    assert embed_chunks(RecordingEmbedder(), []) == []


# ch04 step 5: retry


def post_through(statuses: list[int], **options) -> tuple[dict, FakeServer, list[float]]:
    """Run post_with_retry against a scripted server. Returns the reply, the server and the delays."""
    server = FakeServer(lambda body: {"ok": True}, script=statuses)
    delays: list[float] = []
    reply = post_with_retry(server.client, "https://example.test/x", {}, sleep=delays.append, **options)
    return reply, server, delays


def test_ch04_s5_a_429_is_retried_and_then_succeeds() -> None:
    reply, server, delays = post_through([429, 429, 200])
    assert reply == {"ok": True}
    assert len(server.requests) == 3
    assert len(delays) == 2


def test_ch04_s5_the_retry_after_header_sets_the_wait() -> None:
    _, _, delays = post_through([429, 200])
    assert delays == [2]


def test_ch04_s5_without_retry_after_the_wait_doubles_each_time() -> None:
    _, _, delays = post_through([500, 500, 500, 200], base_delay_s=0.1)
    assert delays == pytest.approx([0.1, 0.2, 0.4])


def test_ch04_s5_the_default_wait_starts_at_one_second() -> None:
    _, server, delays = post_through([503, 502, 200])
    assert len(server.requests) == 3
    assert delays == [1, 2]


def test_ch04_s5_it_gives_up_after_the_last_attempt_with_a_provider_error() -> None:
    server = FakeServer(lambda body: {}, script=[500, 500, 500])
    delays: list[float] = []
    with pytest.raises(ProviderError) as caught:
        post_with_retry(server.client, "https://example.test/x", {}, attempts=3, sleep=delays.append)
    assert caught.value.status == 500
    assert len(server.requests) == 3
    assert len(delays) == 2, "no wait after the final failure"


def test_ch04_s5_the_default_is_five_attempts() -> None:
    server = FakeServer(lambda body: {}, script=[500] * 8)
    with pytest.raises(ProviderError):
        post_with_retry(server.client, "https://example.test/x", {}, sleep=lambda s: None)
    assert len(server.requests) == 5


def test_ch04_s5_a_client_error_is_not_retried() -> None:
    server = FakeServer(lambda body: {}, script=[400])
    with pytest.raises(ProviderError) as caught:
        post_with_retry(server.client, "https://example.test/x", {}, sleep=lambda s: None)
    assert caught.value.status == 400
    assert len(server.requests) == 1


def test_ch04_s5_a_network_error_is_retried() -> None:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ConnectError("no route")
        return httpx.Response(200, json={"ok": True})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    delays: list[float] = []
    assert post_with_retry(client, "https://example.test/x", {}, sleep=delays.append) == {"ok": True}
    assert len(calls) == 2
    assert len(delays) == 1


def test_ch04_s5_a_server_error_from_embed_surfaces_as_a_provider_error() -> None:
    server = FakeServer(shuffled_embeddings, script=[401])
    with pytest.raises(ProviderError) as caught:
        embedder(server).embed(["x"], "document")
    assert caught.value.status == 401


# ch04 step 6: a real call


@pytest.mark.live
def test_ch04_s6_the_real_api_returns_vectors_of_the_configured_size() -> None:
    settings = Settings()
    if not settings.voyage_api_key:
        pytest.skip("VOYAGE_API_KEY is not set in .env")
    real = VoyageEmbedder(settings.voyage_api_key, settings.embed_model, settings.embed_dim)
    texts = ["The walrus operator assigns inside an expression.", "Limit all lines to 79 characters."]
    vectors = real.embed(texts, "document")
    query = real.embed(["how do I assign in an expression"], "query")[0]

    def cos(a: list[float], b: list[float]) -> float:
        return sum(x * y for x, y in zip(a, b, strict=True)) / (math.hypot(*a) * math.hypot(*b))

    scores = [cos(query, v) for v in vectors]
    print(f"\\n{settings.embed_model}: {len(vectors[0])} dimensions, similarity to the query {scores}")
    assert len(vectors) == 2 and all(len(v) == settings.embed_dim for v in vectors)
    assert scores[0] > scores[1]


# ch07 step 1: the reranker's options and the empty case


def reranker(server: FakeServer) -> VoyageReranker:
    return VoyageReranker("test-key", "rerank-test", client=server.client)


def rerank_reply(body: dict) -> dict:
    """Voyage replies best first, so the fake does the same."""
    scores = [(i, 1 / (i + 1) if i % 2 == 0 else 0.5 + i / 100) for i in range(len(body["documents"]))]
    ordered = sorted(scores, key=lambda pair: pair[1], reverse=True)[: body["top_k"]]
    return {"data": [{"index": i, "relevance_score": s} for i, s in ordered]}


def test_ch07_s1_a_missing_key_is_rejected_and_named() -> None:
    with pytest.raises(ValueError, match="VOYAGE_API_KEY"):
        VoyageReranker("", "rerank-test")


def test_ch07_s1_a_missing_model_is_rejected_and_named() -> None:
    with pytest.raises(ValueError, match="RERANK_MODEL"):
        VoyageReranker("test-key", "")


def test_ch07_s1_an_empty_document_list_makes_no_request() -> None:
    server = FakeServer(rerank_reply)
    assert reranker(server).rerank("q", [], 3) == []
    assert server.requests == []


# ch07 step 2: the request


def test_ch07_s2_the_request_carries_the_query_the_documents_the_model_and_top_k() -> None:
    server = FakeServer(rerank_reply)
    reranker(server).rerank("why walrus?", ["first text", "second text", "third text"], 2)
    request, body = server.requests[0], server.bodies[0]
    assert request.method == "POST"
    assert str(request.url) == RERANK_URL
    assert request.headers["authorization"] == "Bearer test-key"
    assert body["query"] == "why walrus?"
    assert body["documents"] == ["first text", "second text", "third text"]
    assert body["model"] == "rerank-test"
    assert body["top_k"] == 2


def test_ch07_s2_it_returns_index_and_score_pairs_best_first() -> None:
    server = FakeServer(
        lambda body: {
            "data": [
                {"index": 1, "relevance_score": 0.9},
                {"index": 3, "relevance_score": 0.7},
                {"index": 2, "relevance_score": 0.5},
            ]
        }
    )
    pairs = reranker(server).rerank("q", ["a", "b", "c", "d"], 3)
    assert pairs == [(1, 0.9), (3, 0.7), (2, 0.5)]


def test_ch07_s2_a_failure_surfaces_as_a_provider_error_with_its_status() -> None:
    server = FakeServer(rerank_reply, script=[401])
    with pytest.raises(ProviderError) as caught:
        reranker(server).rerank("q", ["a"], 1)
    assert caught.value.status == 401`,
  runProviders: "uv run pytest tests/rag/test_providers.py -q",
  checkFake: "uv run python -c \"from askpep.fakes import FakeEmbedder; v = FakeEmbedder().embed(['hello world'], 'query')[0]; print(len(v), round(sum(x * x for x in v), 3))\"",
  chunking: `"""Split a PEP into chunks that follow its structure.

Every chunk is an exact slice of the document, so \`chunk.text == doc.text[chunk.start:chunk.end]\`.
Sizes are in tokens, estimated as one token per four characters.
"""

import re
import sys
from dataclasses import dataclass, replace

from askpep.types import Chunk, Document

Span = tuple[int, int]

# A heading underline is one punctuation character repeated three or more times.
UNDERLINE = re.compile(r"""^([=\\-~^"'\`#*+:._])\\1{2,}\\s*$""")
PARAGRAPH_BREAK = re.compile(r"\\n(?:[ \\t]*\\n)+")
# A sentence ends at . ! or ? (plus closing quotes), then space, then a capital or a digit.
# A blank line also ends one.
SENTENCE = re.compile(r"""(?:[.!?]["')\\]]*\\s+(?=[^\\sa-z])|\\n[ \\t]*\\n\\s*)""")
LINE = re.compile(r"\\n+")
WORD = re.compile(r"\\s+")
LEVELS = (SENTENCE, LINE, WORD)  # the boundaries split_long tries, coarsest first


def estimate_tokens(text: str) -> int:
    """One token per four characters, rounded up. Good enough for English prose and budgets."""
    return -(-len(text) // 4)


@dataclass(frozen=True)
class Section:
    heading_path: list[str]  # the headings above this section, without the document title
    start: int
    end: int


def split_sections(text: str) -> list[Section]:
    """Find the section headings and return the sections they open.

    A heading is a title line over an underline of one repeated character. The first underline
    character we see is level 1, the next new one is level 2, and so on (the docutils rule).
    Text before the first heading becomes a section with an empty heading path.
    """
    lines: list[tuple[int, str]] = []  # (offset, text) per line
    pos = 0
    while pos <= len(text):
        newline = text.find("\\n", pos)
        if newline == -1:
            newline = len(text)
        lines.append((pos, text[pos:newline]))
        pos = newline + 1

    levels: list[str] = []
    stack: list[str] = []
    marks: list[tuple[int, list[str]]] = []
    for i in range(len(lines) - 1):
        title, under = lines[i][1], lines[i + 1][1]
        blank_before = i == 0 or lines[i - 1][1].strip() == ""
        if not blank_before or not title.strip() or title[0].isspace() or UNDERLINE.match(title):
            continue
        if not UNDERLINE.match(under) or len(under.strip()) < len(title.strip()):
            continue
        char = under[0]
        if char not in levels:
            levels.append(char)
        depth = levels.index(char) + 1
        del stack[depth - 1 :]
        stack.append(title.strip())
        marks.append((lines[i][0], list(stack)))

    sections: list[Section] = []
    first = marks[0][0] if marks else len(text)
    if text[:first].strip():
        sections.append(Section([], 0, first))
    for i, (start, path) in enumerate(marks):
        sections.append(Section(path, start, marks[i + 1][0] if i + 1 < len(marks) else len(text)))
    return sections


def _trim(text: str, start: int, end: int) -> Span | None:
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return (start, end) if start < end else None


def _paragraphs(text: str, start: int, end: int) -> list[tuple[int, int, bool]]:
    """Paragraphs are separated by blank lines. A paragraph ending in \`::\` (or a directive) owns the
    indented blocks after it, so a literal block with blank lines inside stays in one piece.
    Returns (start, end, is_literal)."""
    raw: list[Span] = []
    last = 0
    for match in PARAGRAPH_BREAK.finditer(text[start:end]):
        span = _trim(text, start + last, start + match.start())
        if span:
            raw.append(span)
        last = match.end()
    tail = _trim(text, start + last, end)
    if tail:
        raw.append(tail)

    out: list[list] = []
    opens = False
    for s, e in raw:
        indented = s > 0 and text[s - 1] != "\\n"
        if out and opens and indented:
            out[-1][1], out[-1][2] = e, True
            continue
        out.append([s, e, False])
        paragraph = text[s:e]
        opens = bool(re.search(r"::\\s*$", paragraph)) or paragraph.startswith(".. ")
    return [(s, e, literal) for s, e, literal in out]


def _boundaries(text: str, start: int, end: int, pattern: re.Pattern[str]) -> list[int]:
    """Start offsets of the pieces a finer level would cut [start, end) into."""
    out = [start]
    for match in pattern.finditer(text[start:end]):
        boundary = start + match.end()
        if boundary < end:
            out.append(boundary)
    return out


def split_long(text: str, start: int, end: int, max_tokens: int, level: int = 0) -> list[tuple[int, int]]:
    """Cut [start, end) into spans of at most max_tokens.

    It cuts at the coarsest boundary that exists, then recurses on each piece. \`level\` is the first
    boundary tried: 0 is sentence, 1 is line and 2 is word. A caller passes 1 for a literal block, so
    a code block is cut at line ends before it is cut at words. A span with no boundary left is cut
    at a fixed width.
    """
    if estimate_tokens(text[start:end]) <= max_tokens:
        return [(start, end)]
    if level >= len(LEVELS):
        width = max_tokens * 4
        return [(s, min(s + width, end)) for s in range(start, end, width)]
    cuts = _boundaries(text, start, end, LEVELS[level])
    if len(cuts) == 1:
        return split_long(text, start, end, max_tokens, level + 1)
    pieces: list[Span] = []
    for i, cut in enumerate(cuts):
        piece = _trim(text, cut, cuts[i + 1] if i + 1 < len(cuts) else end)
        if piece:
            pieces.extend(split_long(text, piece[0], piece[1], max_tokens, level + 1))
    return pieces


def overlap_start(
    text: str, prev: tuple[int, int], next_end: int, budget: int, max_tokens: int
) -> int | None:
    """Where the repeated tail of the closed chunk \`prev\` starts, or None.

    It is the earliest sentence start (else word start) inside prev such that the tail is within
    \`budget\` tokens and the next chunk, running from there to \`next_end\`, still fits in max_tokens.
    """
    if budget <= 0:
        return None
    for pattern in (SENTENCE, WORD):
        for boundary in _boundaries(text, prev[0], prev[1], pattern):
            if (
                boundary > prev[0]
                and estimate_tokens(text[boundary : prev[1]]) <= budget
                and estimate_tokens(text[boundary:next_end]) <= max_tokens
            ):
                return boundary
    return None


def pack(spans: list[Span], text: str, max_tokens: int, overlap_tokens: int = 0) -> list[Span]:
    """Greedily join consecutive spans into chunks of at most max_tokens.

    When the next span does not fit, the current chunk closes. The next chunk starts at
    \`overlap_start\`, so it repeats the tail of the closed one, or at the span's own start when that
    returns None. Pass the spans of one section, so overlap never crosses a heading.
    """
    out: list[Span] = []
    current: Span | None = None
    for start, end in spans:
        if current and estimate_tokens(text[current[0] : end]) <= max_tokens:
            current = (current[0], end)
            continue
        if current:
            out.append(current)
            tail = (
                overlap_start(text, current, end, overlap_tokens, max_tokens) if overlap_tokens > 0 else None
            )
            current = (start if tail is None else tail, end)
        else:
            current = (start, end)
    if current:
        out.append(current)
    return out


def _chunk_section(text: str, section: Section, max_tokens: int, overlap_tokens: int) -> list[Span]:
    paragraphs = _paragraphs(text, section.start, section.end)
    # Keep a heading attached to the first paragraph under it when the pair fits.
    if (
        section.heading_path
        and len(paragraphs) > 1
        and estimate_tokens(text[paragraphs[0][0] : paragraphs[1][1]]) <= max_tokens
    ):
        paragraphs[0:2] = [(paragraphs[0][0], paragraphs[1][1], paragraphs[1][2])]
    atoms = [
        span
        for start, end, literal in paragraphs
        for span in split_long(text, start, end, max_tokens, 1 if literal else 0)
    ]
    return pack(atoms, text, max_tokens, overlap_tokens)


def _has_body(text: str, section: Section) -> bool:
    """A section has a body when something follows its two heading lines."""
    if not section.heading_path:
        return True
    return "\\n".join(text[section.start : section.end].split("\\n")[2:]).strip() != ""


def chunk_document(doc: Document, *, max_tokens: int = 400, overlap_tokens: int = 50) -> list[Chunk]:
    """Chunk one document. Each chunk stays inside one section, and each knows its heading trail."""
    if max_tokens < 1:
        raise ValueError("max_tokens must be a positive integer")
    if overlap_tokens < 0 or overlap_tokens >= max_tokens:
        raise ValueError("overlap_tokens must be at least 0 and less than max_tokens")

    spans: list[tuple[Span, list[str]]] = []
    carry: int | None = None  # start of heading-only sections, merged into the next one
    sections = split_sections(doc.text)
    for i, section in enumerate(sections):
        start = section.start if carry is None else carry
        if not _has_body(doc.text, section) and i + 1 < len(sections):
            carry = start
            continue
        carry = None
        for span in _chunk_section(doc.text, replace(section, start=start), max_tokens, overlap_tokens):
            spans.append((span, section.heading_path))

    return [
        Chunk(
            doc_id=doc.doc_id,
            idx=idx,
            title=doc.title,
            source=doc.source,
            heading_path=[doc.title, *path],
            text=doc.text[start:end],
            token_count=estimate_tokens(doc.text[start:end]),
            start=start,
            end=end,
        )
        for idx, ((start, end), path) in enumerate(spans)
    ]


def chunk_all(docs: list[Document], **opts: int) -> list[Chunk]:
    """Chunk each document in order. \`opts\` are the keyword options of \`chunk_document\`."""
    return [chunk for doc in docs for chunk in chunk_document(doc, **opts)]


def main() -> None:
    from askpep.ingest import CORPUS_DIR, load_documents

    docs = load_documents()
    if not docs:
        sys.exit(f"No pep-*.rst files in {CORPUS_DIR}. Run \`uv run python scripts/fetch_corpus.py\` first.")
    chunks = chunk_all(docs)
    sizes = [c.token_count for c in chunks]
    print(f"{len(chunks)} chunks, mean {round(sum(sizes) / len(sizes))} tokens, max {max(sizes)}")
    for c in [c for c in chunks if c.doc_id == 8][:5]:
        print(f"{c.id:>8}  {c.token_count:4d} tok  [{' > '.join(c.heading_path)}]")


if __name__ == "__main__":
    main()`,
  testChunking: `"""ch03: chunking.py, the structure-aware chunker.

    uv run pytest tests/rag/test_chunking.py -k ch03_s4

Steps 1 to 5 each have their own helper to test. Step 6 holds the whole-document edge cases.
"""

from dataclasses import replace

import pytest

from askpep.chunking import (
    chunk_all,
    chunk_document,
    estimate_tokens,
    overlap_start,
    pack,
    split_long,
    split_sections,
)
from askpep.types import Chunk, Document


def tokens(text: str) -> int:
    """The lab's definition of a token: one per four characters, rounded up."""
    return -(-len(text) // 4)


def sentence(word: str, n: int = 8) -> str:
    """A sentence of known length. It starts with a capital and ends with a full stop."""
    return f"Sentence {word} " + " ".join(f"{word}{i}" for i in range(n)) + "."


def para(word: str, sentences: int = 3) -> str:
    return " ".join(sentence(f"{word}{i}") for i in range(sentences))


RST = "\\n".join(
    [
        "Preamble words before any heading.",
        "",
        "Abstract",
        "========",
        "",
        f"Alpha opening. {para('abs', 2)}",
        "",
        "Specification",
        "=============",
        "",
        f"Bravo opening. {para('spec', 2)}",
        "",
        "Syntax",
        "------",
        "",
        f"Charlie opening. {para('syn', 6)}",
        "",
        f"Charlie second. {para('syn2', 6)}",
        "",
        "Example::",
        "",
        "    x = 1",
        "",
        "    y = 2",
        "",
        "    print(x + y)",
        "",
        "Rationale",
        "=========",
        "",
        f"Delta opening. {para('rat', 2)}",
        "",
    ]
)

TITLE = "PEP 9000 – Test"
SOURCE = "https://peps.python.org/pep-9000/"
DOC = Document(9000, TITLE, SOURCE, RST)


def lost_offsets(text: str, chunks: list[Chunk]) -> list[int]:
    """Offsets of non-space characters that no chunk covers."""
    seen = [False] * len(text)
    for chunk in chunks:
        for i in range(chunk.start, chunk.end):
            seen[i] = True
    return [i for i, char in enumerate(text) if not seen[i] and not char.isspace()]


def spans_lost_offsets(text: str, spans: list[tuple[int, int]]) -> list[int]:
    seen = [False] * len(text)
    for start, end in spans:
        for i in range(start, end):
            seen[i] = True
    return [i for i, char in enumerate(text) if not seen[i] and not char.isspace()]


# Step 1: the token estimate and the option checks


def test_ch03_s1_a_token_is_four_characters_rounded_up() -> None:
    assert estimate_tokens("") == 0
    assert estimate_tokens("abcd") == 1
    assert estimate_tokens("abcde") == 2


def test_ch03_s1_a_max_tokens_below_one_is_rejected() -> None:
    with pytest.raises(ValueError):
        chunk_document(DOC, max_tokens=0)


def test_ch03_s1_an_overlap_that_is_not_below_max_tokens_is_rejected() -> None:
    with pytest.raises(ValueError):
        chunk_document(DOC, max_tokens=50, overlap_tokens=50)


def test_ch03_s1_a_negative_overlap_is_rejected() -> None:
    with pytest.raises(ValueError):
        chunk_document(DOC, max_tokens=50, overlap_tokens=-1)


# Step 2: sections and heading paths


def test_ch03_s2_the_heading_path_follows_the_underline_levels() -> None:
    paths = [s.heading_path for s in split_sections(RST)]
    assert paths == [[], ["Abstract"], ["Specification"], ["Specification", "Syntax"], ["Rationale"]]


def test_ch03_s2_the_first_underline_character_seen_is_level_one() -> None:
    text = "Top\\n---\\n\\nBody.\\n\\nNext\\n====\\n\\nMore.\\n\\nDeeper\\n------\\n\\nEnd."
    paths = [s.heading_path for s in split_sections(text)]
    assert paths == [["Top"], ["Top", "Next"], ["Deeper"]]


def test_ch03_s2_each_section_starts_at_its_title_line() -> None:
    for section in split_sections(RST)[1:]:
        assert RST[section.start :].startswith(section.heading_path[-1] + "\\n")


def test_ch03_s2_sections_run_to_the_next_heading_and_cover_the_text() -> None:
    sections = split_sections(RST)
    assert sections[0].start == 0
    assert sections[-1].end == len(RST)
    for before, after in zip(sections, sections[1:], strict=False):
        assert before.end == after.start


def test_ch03_s2_text_before_the_first_heading_has_an_empty_path() -> None:
    first = split_sections(RST)[0]
    assert first.heading_path == []
    assert "Preamble" in RST[first.start : first.end]


def test_ch03_s2_an_underline_shorter_than_its_title_is_not_a_heading() -> None:
    text = "A long title line\\n===\\n\\nBody."
    assert [s.heading_path for s in split_sections(text)] == [[]]


def test_ch03_s2_a_heading_must_follow_a_blank_line() -> None:
    text = "Body text\\nNot a heading\\n=============\\n\\nMore."
    assert [s.heading_path for s in split_sections(text)] == [[]]


def test_ch03_s2_an_indented_title_is_not_a_heading() -> None:
    text = "Intro\\n\\n    Indented\\n    ========\\n\\nMore."
    assert [s.heading_path for s in split_sections(text)] == [[]]


def test_ch03_s2_empty_text_has_no_sections() -> None:
    assert split_sections("") == []


# Step 3: cut a long span into pieces that fit


def test_ch03_s3_a_span_that_fits_comes_back_whole() -> None:
    text = "A short paragraph."
    assert split_long(text, 0, len(text), 100) == [(0, len(text))]


def test_ch03_s3_a_long_paragraph_is_cut_at_sentence_boundaries() -> None:
    text = para("big", 30)
    spans = split_long(text, 0, len(text), 50)
    assert len(spans) > 3
    for start, end in spans:
        piece = text[start:end]
        assert piece.startswith("Sentence "), f"starts mid-sentence: {piece[:30]!r}"
        assert piece.endswith("."), f"ends mid-sentence: {piece[-30:]!r}"
        assert tokens(piece) <= 50


def test_ch03_s3_spans_are_in_order_and_never_overlap() -> None:
    text = para("big", 30)
    spans = split_long(text, 0, len(text), 50)
    for (_, before_end), (after_start, _) in zip(spans, spans[1:], strict=False):
        assert after_start >= before_end


def test_ch03_s3_no_text_is_lost_between_spans() -> None:
    text = para("big", 30)
    assert spans_lost_offsets(text, split_long(text, 0, len(text), 50)) == []


def test_ch03_s3_a_range_inside_a_larger_text_stays_inside_the_range() -> None:
    text = "Ignored lead. " + para("mid", 12) + " Ignored tail."
    start, end = text.index("Sentence"), text.index(" Ignored tail.")
    spans = split_long(text, start, end, 40)
    assert spans[0][0] >= start and spans[-1][1] <= end


def test_ch03_s3_an_unbroken_string_is_cut_to_the_limit() -> None:
    text = "x" * 1000
    spans = split_long(text, 0, len(text), 20)
    assert len(spans) >= 12
    assert all(tokens(text[s:e]) <= 20 for s, e in spans)
    assert spans_lost_offsets(text, spans) == []


def test_ch03_s3_words_are_the_last_boundary_before_a_raw_cut() -> None:
    text = " ".join(f"word{i}" for i in range(100))
    spans = split_long(text, 0, len(text), 20)
    assert all(tokens(text[s:e]) <= 20 for s, e in spans)
    for start, end in spans:
        assert start == 0 or text[start - 1] == " ", "cut inside a word"
        assert end == len(text) or text[end] == " ", "cut inside a word"


def test_ch03_s3_level_one_cuts_a_code_block_at_line_ends() -> None:
    code = "\\n".join(f"line_{i} = {i}" for i in range(30))
    spans = split_long(code, 0, len(code), 20, level=1)
    assert len(spans) > 3
    for start, end in spans:
        assert start == 0 or code[start - 1] == "\\n"
        assert end == len(code) or code[end] == "\\n"
        assert tokens(code[start:end]) <= 20


# Step 4: pack spans into chunks, with no overlap yet


def test_ch03_s4_pack_joins_spans_while_the_slice_fits() -> None:
    text = "aaaa bbbb cccc dddd"
    spans = [(0, 4), (5, 9), (10, 14), (15, 19)]
    assert pack(spans, text, max_tokens=3) == [(0, 9), (10, 19)]


def test_ch03_s4_pack_measures_the_real_slice_including_the_gap() -> None:
    text = "aaaa" + " " * 36 + "bbbb"
    assert pack([(0, 4), (40, 44)], text, max_tokens=5) == [(0, 4), (40, 44)]


def test_ch03_s4_pack_of_no_spans_is_empty() -> None:
    assert pack([], "", 10) == []


def test_ch03_s4_a_span_that_is_already_too_big_stays_alone() -> None:
    text = "a" * 40 + " bb"
    assert pack([(0, 40), (41, 43)], text, max_tokens=10) == [(0, 40), (41, 43)]


def test_ch03_s4_every_chunk_is_an_exact_slice_of_the_document() -> None:
    for chunk in chunk_document(DOC, max_tokens=60, overlap_tokens=0):
        assert DOC.text[chunk.start : chunk.end] == chunk.text


def test_ch03_s4_chunks_carry_the_document_metadata_and_sequential_ids() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=0)
    assert len(chunks) > 4
    for i, chunk in enumerate(chunks):
        assert chunk.idx == i
        assert chunk.id == f"9000#{i}"
        assert chunk.doc_id == 9000
        assert chunk.title == TITLE
        assert chunk.source == SOURCE
        assert chunk.heading_path[0] == TITLE
        assert chunk.token_count == tokens(chunk.text)
    assert len({c.id for c in chunks}) == len(chunks)


def test_ch03_s4_no_chunk_is_larger_than_max_tokens() -> None:
    for limit in (20, 60, 150, 400):
        for chunk in chunk_document(DOC, max_tokens=limit, overlap_tokens=0):
            assert tokens(chunk.text) <= limit, f"{chunk.id} has {tokens(chunk.text)} tokens, limit {limit}"


def test_ch03_s4_no_text_is_lost_when_overlap_is_zero() -> None:
    for limit in (20, 60, 400):
        chunks = chunk_document(DOC, max_tokens=limit, overlap_tokens=0)
        assert lost_offsets(DOC.text, chunks) == [], f"lost text at max_tokens {limit}"


def test_ch03_s4_chunks_come_out_in_document_order() -> None:
    chunks = chunk_document(DOC, max_tokens=40, overlap_tokens=0)
    for before, after in zip(chunks, chunks[1:], strict=False):
        assert after.start > before.start
        assert after.end > before.end


def test_ch03_s4_with_zero_overlap_no_text_is_repeated() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=0)
    for before, after in zip(chunks, chunks[1:], strict=False):
        assert after.start >= before.end


# Step 5: overlap


def test_ch03_s5_the_overlap_is_the_earliest_sentence_start_within_budget() -> None:
    text = "Alpha one two. Beta three four. Gamma five six. Delta seven eight."
    prev = (0, text.index(" Delta"))
    assert overlap_start(text, prev, len(text), 4, 20) == text.index("Gamma")


def test_ch03_s5_a_budget_of_zero_or_less_gives_no_overlap() -> None:
    text = "Alpha one two. Beta three four. Gamma five six. Delta seven eight."
    prev = (0, text.index(" Delta"))
    assert overlap_start(text, prev, len(text), 0, 20) is None
    assert overlap_start(text, prev, len(text), -3, 20) is None


def test_ch03_s5_the_next_chunk_must_still_fit_the_limit() -> None:
    text = "Alpha one two. Beta three four. Gamma five six. Delta seven eight."
    prev = (0, text.index(" Delta"))
    assert overlap_start(text, prev, len(text), 1, 5) is None


def test_ch03_s5_a_tail_that_is_too_long_falls_back_to_a_word_start() -> None:
    text = "One very long sentence without any stops inside it. Delta seven eight."
    prev = (0, text.index(" Delta"))
    start = overlap_start(text, prev, len(text), 3, 40)
    assert start is not None and start > 0
    assert tokens(text[start : prev[1]]) <= 3
    assert text[start - 1] == " "


def test_ch03_s5_the_overlap_never_starts_before_the_previous_chunk() -> None:
    text = "Alpha one two. Beta three four. Gamma five six. Delta seven eight."
    prev = (15, text.index(" Delta"))
    start = overlap_start(text, prev, len(text), 100, 100)
    assert start is None or start > prev[0]


def test_ch03_s5_consecutive_chunks_in_one_section_overlap_within_the_budget() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=15)
    checked = 0
    for before, after in zip(chunks, chunks[1:], strict=False):
        if before.heading_path != after.heading_path:
            continue
        assert after.start < before.end, f"{before.id} and {after.id} do not overlap"
        assert after.start > before.start, f"{after.id} starts no later than {before.id}"
        shared = DOC.text[after.start : before.end]
        assert tokens(shared) <= 15, f"overlap of {tokens(shared)} tokens exceeds 15"
        assert before.text.endswith(shared) and after.text.startswith(shared)
        checked += 1
    assert checked >= 3, "the fixture should produce several same-section pairs"


def test_ch03_s5_overlap_does_not_carry_text_across_a_heading() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=15)
    for before, after in zip(chunks, chunks[1:], strict=False):
        if before.heading_path != after.heading_path:
            assert after.start >= before.end


def test_ch03_s5_overlap_never_makes_a_chunk_larger_than_the_limit() -> None:
    for limit, overlap in ((20, 4), (60, 15), (150, 30), (400, 50)):
        for chunk in chunk_document(DOC, max_tokens=limit, overlap_tokens=overlap):
            assert tokens(chunk.text) <= limit


def test_ch03_s5_no_text_is_lost_with_overlap() -> None:
    for limit, overlap in ((20, 4), (60, 15), (400, 50)):
        chunks = chunk_document(DOC, max_tokens=limit, overlap_tokens=overlap)
        assert lost_offsets(DOC.text, chunks) == [], f"lost text at max_tokens {limit}"


# Step 6: edge cases on whole documents


def path_of(chunks: list[Chunk], marker: str) -> list[str]:
    hit = next((c for c in chunks if marker in c.text), None)
    assert hit is not None, f"no chunk contains {marker}"
    return hit.heading_path


def test_ch03_s6_the_heading_path_starts_with_the_title_then_follows_the_headings() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=10)
    assert path_of(chunks, "Preamble") == [TITLE]
    assert path_of(chunks, "Alpha opening") == [TITLE, "Abstract"]
    assert path_of(chunks, "Bravo opening") == [TITLE, "Specification"]
    assert path_of(chunks, "Charlie opening") == [TITLE, "Specification", "Syntax"]
    assert path_of(chunks, "Delta opening") == [TITLE, "Rationale"]


def test_ch03_s6_a_chunk_never_spans_two_sections() -> None:
    chunks = chunk_document(DOC, max_tokens=400, overlap_tokens=50)
    markers = ["Preamble", "Alpha opening", "Bravo opening", "Charlie opening", "Delta opening"]
    for chunk in chunks:
        present = [m for m in markers if m in chunk.text]
        assert len(present) <= 1, f"chunk {chunk.id} mixes {' and '.join(present)}"
    assert len(chunks) >= 4


def test_ch03_s6_a_heading_stays_attached_to_the_text_under_it() -> None:
    chunks = chunk_document(DOC, max_tokens=60, overlap_tokens=10)
    abstract = next(c for c in chunks if c.heading_path[-1] == "Abstract")
    assert "Abstract" in abstract.text and "Alpha opening" in abstract.text


def test_ch03_s6_a_literal_block_with_blank_lines_inside_is_kept_whole_when_it_fits() -> None:
    chunks = chunk_document(DOC, max_tokens=80, overlap_tokens=10)
    assert any("x = 1" in c.text and "y = 2" in c.text and "print(x + y)" in c.text for c in chunks)


def test_ch03_s6_an_oversized_paragraph_is_cut_at_sentence_boundaries() -> None:
    big = replace(DOC, doc_id=9001, text=para("big", 30))
    chunks = chunk_document(big, max_tokens=50, overlap_tokens=0)
    assert len(chunks) > 3
    for chunk in chunks:
        assert chunk.text.startswith("Sentence "), f"starts mid-sentence: {chunk.text[:30]!r}"
        assert chunk.text.endswith("."), f"ends mid-sentence: {chunk.text[-30:]!r}"
        assert tokens(chunk.text) <= 50


def test_ch03_s6_a_single_unbroken_string_longer_than_the_limit_is_still_cut_to_size() -> None:
    blob = replace(DOC, doc_id=9002, text="x" * 1000)
    chunks = chunk_document(blob, max_tokens=20, overlap_tokens=0)
    assert len(chunks) >= 12
    assert all(tokens(c.text) <= 20 for c in chunks)
    assert lost_offsets(blob.text, chunks) == []


def test_ch03_s6_empty_and_whitespace_only_documents_give_no_chunks() -> None:
    assert chunk_document(replace(DOC, text="")) == []
    assert chunk_document(replace(DOC, text="  \\n\\n ")) == []


def test_ch03_s6_a_small_document_becomes_one_chunk_covering_its_text() -> None:
    small = replace(DOC, text="Intro\\n=====\\n\\nJust one short paragraph.")
    chunks = chunk_document(small)
    assert len(chunks) == 1
    assert chunks[0].text == small.text
    assert chunks[0].heading_path == [TITLE, "Intro"]


def test_ch03_s6_a_heading_with_no_body_of_its_own_joins_the_next_chunk() -> None:
    nested = replace(DOC, text="Parent\\n======\\n\\nChild\\n-----\\n\\nBody of the child section.")
    chunks = chunk_document(nested)
    assert lost_offsets(nested.text, chunks) == []
    joined = next(c for c in chunks if "Body of the child" in c.text)
    assert joined.heading_path == [TITLE, "Parent", "Child"]
    assert "Parent" in joined.text


def test_ch03_s6_chunk_all_joins_documents_in_order_and_keeps_ids_unique() -> None:
    other = replace(DOC, doc_id=9003)
    chunks = chunk_all([DOC, other], max_tokens=60, overlap_tokens=10)
    first_other = next(i for i, c in enumerate(chunks) if c.doc_id == 9003)
    assert first_other > 0
    assert all(c.doc_id == 9000 for c in chunks[:first_other])
    assert len({c.id for c in chunks}) == len(chunks)


def test_ch03_s6_the_defaults_are_400_tokens_with_50_overlap() -> None:
    assert chunk_document(DOC) == chunk_document(DOC, max_tokens=400, overlap_tokens=50)`,
  runChunking: "uv run pytest tests/rag/test_chunking.py -q",
  curl: "uv run python -c \"from pathlib import Path; from askpep.chunking import chunk_document; from askpep.ingest import parse_pep; doc = parse_pep(8, Path('data/raw/pep-0008.rst').read_text()); chunks = chunk_document(doc); print(doc.title); print(len(chunks), 'chunks'); print(chunks[2].heading_path); print(repr(chunks[2].text[:70]))\"",
  ingest: `"""Load PEPs from disk or the network, then chunk, embed and store them idempotently."""

import hashlib
import logging
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from pgvector import Vector
from psycopg.types.json import Jsonb

from askpep.chunking import chunk_document
from askpep.config import Settings
from askpep.services import Services
from askpep.types import Document

log = logging.getLogger(__name__)

PEP_IDS = [1, 8, 20, 257, 343, 484, 498, 526, 572, 584, 604, 612, 634, 636, 695, 701, 703, 723]
CORPUS_DIR = Path("data/raw")
RAW_URL = "https://raw.githubusercontent.com/python/peps/main/peps/pep-{id:04d}.rst"

HEADER_LINE = re.compile(r"^([\\w-]+):\\s*(.*)$")
PEP_FILE = re.compile(r"pep-(\\d+)\\.rst")


def pep_url(pep_id: int) -> str:
    return f"https://peps.python.org/pep-{pep_id:04d}/"


def fetch_pep(pep_id: int, client: httpx.Client | None = None) -> str:
    """Download one PEP as reStructuredText from the python/peps repository."""
    url = RAW_URL.format(id=pep_id)
    response = client.get(url) if client else httpx.get(url, timeout=30, follow_redirects=True)
    response.raise_for_status()
    return response.text


def parse_header(rst: str) -> tuple[dict[str, str], str]:
    """Split the RFC 822 style header from the body. Returns (fields, body).

    The header ends at the first blank line. A line that starts with a space continues the field above
    it, so \`Author\` ends up as one string. If a key repeats, the first one wins.
    """
    head, _, body = rst.partition("\\n\\n")
    fields: dict[str, str] = {}
    key = ""
    for line in head.splitlines():
        if line[:1].isspace() and key:
            fields[key] = f"{fields[key]} {line.strip()}".strip()
        elif match := HEADER_LINE.match(line):
            key = match.group(1)
            if key in fields:
                key = ""  # a repeated key: ignore it and its continuation lines
                continue
            fields[key] = match.group(2).strip()
    return fields, body


def parse_pep(doc_id: int, raw: str) -> Document:
    """One raw .rst file to a Document. The title reads "PEP 8 – Title", with an en dash."""
    fields, body = parse_header(raw.replace("\\r\\n", "\\n").replace("\\r", "\\n"))
    name = fields.get("Title")
    title = f"PEP {doc_id} – {name}" if name else f"PEP {doc_id}"
    return Document(doc_id, title, pep_url(doc_id), body.strip(), fields)


def load_documents(directory: Path = CORPUS_DIR) -> list[Document]:
    """Read every pep-NNNN.rst in a folder, sorted by file name. Other files are ignored."""
    documents: list[Document] = []
    for path in sorted(Path(directory).iterdir()):
        match = PEP_FILE.fullmatch(path.name)
        if match:
            documents.append(parse_pep(int(match.group(1)), path.read_text(encoding="utf-8")))
    return documents


def fetch_documents(
    pep_ids: Sequence[int] = PEP_IDS, fetch: Callable[[int], str] = fetch_pep
) -> list[Document]:
    """Download and parse PEPs in memory. Tests pass a dictionary lookup as \`fetch\`."""
    return [parse_pep(pep_id, fetch(pep_id)) for pep_id in pep_ids]


@dataclass
class IngestReport:
    added: list[int] = field(default_factory=list)
    updated: list[int] = field(default_factory=list)
    skipped: list[int] = field(default_factory=list)
    deleted: list[int] = field(default_factory=list)


def content_hash(doc: Document, settings: Settings) -> str:
    """Hash the text plus everything that shapes the chunks and vectors, so a changed embedding
    model or chunk size re-ingests documents whose text did not change."""
    recipe = (
        f"{settings.embed_model}|{settings.embed_dim}|"
        f"{settings.chunk_max_tokens}|{settings.chunk_overlap_tokens}\\n"
    )
    return hashlib.sha256((recipe + doc.text).encode()).hexdigest()


def ingest(svc: Services, documents: Sequence[Document]) -> IngestReport:
    """Chunk, embed and store documents. Unchanged ones are skipped, changed ones are replaced in one
    transaction each, and any stored document missing from \`documents\` is deleted."""
    if not documents:
        raise ValueError("ingest needs at least one document: an empty list would delete everything")
    s = svc.settings
    report = IngestReport()
    for doc in documents:
        digest = content_hash(doc, s)
        with svc.pool.connection() as conn:
            row = conn.execute("SELECT content_hash FROM documents WHERE id = %s", (doc.doc_id,)).fetchone()
        if row and row["content_hash"] == digest:
            report.skipped.append(doc.doc_id)
            continue

        # Embed before opening the write transaction, so a failed API call leaves the old chunks alone.
        chunks = chunk_document(doc, max_tokens=s.chunk_max_tokens, overlap_tokens=s.chunk_overlap_tokens)
        vectors = svc.embedder.embed([c.embedding_text for c in chunks], "document")

        with svc.pool.connection() as conn:  # one transaction per document
            conn.execute(
                """
                INSERT INTO documents (id, title, source, headers, content_hash)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET title = EXCLUDED.title, source = EXCLUDED.source, headers = EXCLUDED.headers,
                    content_hash = EXCLUDED.content_hash, updated_at = now()
                """,
                (doc.doc_id, doc.title, doc.source, Jsonb(doc.headers), digest),
            )
            conn.execute("DELETE FROM chunks WHERE doc_id = %s", (doc.doc_id,))
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO chunks (doc_id, idx, heading_path, text, token_count, start_offset, "
                    "end_offset, embedding) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                    [
                        (doc.doc_id, c.idx, c.heading_path, c.text, c.token_count, c.start, c.end, Vector(v))
                        for c, v in zip(chunks, vectors, strict=True)
                    ],
                )
        (report.updated if row else report.added).append(doc.doc_id)
        log.info("ingested", extra={"pep": doc.doc_id, "chunks": len(chunks), "replaced": bool(row)})

    keep = [doc.doc_id for doc in documents]
    with svc.pool.connection() as conn:
        gone = conn.execute("DELETE FROM documents WHERE id <> ALL(%s) RETURNING id", (keep,)).fetchall()
    report.deleted = [r["id"] for r in gone]
    return report


def main() -> None:
    """\`python -m askpep.ingest\` prints what is in the corpus folder."""
    import sys

    docs = load_documents() if CORPUS_DIR.is_dir() else []
    if not docs:
        sys.exit(f"No pep-*.rst files in {CORPUS_DIR}. Run \`uv run python scripts/fetch_corpus.py\` first.")
    for d in docs:
        print(f"pep-{d.doc_id:04d}  {len(d.text):7d} chars  {d.title}")
    total = sum(len(d.text) for d in docs)
    print(f"\\n{len(docs)} documents, {total} chars, ~{round(total / 4)} tokens")


if __name__ == "__main__":
    main()`,
  helpers: `"""Small builders the lab tests share. They build real \`askpep.types\` objects and touch no network."""

from collections.abc import Iterable
from pathlib import Path

from askpep.types import Chunk, EmbeddedChunk, Hit, Via

FIXTURES = Path(__file__).parent / "fixtures"


def pep(number: int, title: str, body: str) -> str:
    """The raw text of a tiny PEP: a header, then one Abstract section."""
    return f"PEP: {number}\\nTitle: {title}\\nStatus: Final\\n\\nAbstract\\n========\\n\\n{body}\\n"


def make_chunk(
    doc_id: int = 1,
    idx: int = 0,
    text: str = "",
    *,
    heading_path: Iterable[str] = (),
    title: str | None = None,
    source: str | None = None,
) -> Chunk:
    """A chunk with sensible defaults. Its offsets cover \`text\` from 0, as if it were the whole document."""
    return Chunk(
        doc_id=doc_id,
        idx=idx,
        title=title or f"PEP {doc_id}",
        source=source or f"https://peps.python.org/pep-{doc_id:04d}/",
        heading_path=list(heading_path) or [title or f"PEP {doc_id}"],
        text=text,
        token_count=-(-len(text) // 4),  # one token per four characters, as in askpep.chunking
        start=0,
        end=len(text),
    )


def make_entry(doc_id: int, idx: int, vector: list[float], text: str | None = None) -> EmbeddedChunk:
    return EmbeddedChunk(
        make_chunk(doc_id, idx, text if text is not None else f"text of {doc_id}#{idx}"), vector
    )


def make_hit(doc_id: int, idx: int = 0, score: float = 1.0, via: Via = "dense", text: str = "") -> Hit:
    return Hit(make_chunk(doc_id, idx, text or f"text of {doc_id}#{idx}"), score, via)


def ids(hits: Iterable[Hit]) -> list[str]:
    """The chunk ids of some hits, in order."""
    return [hit.chunk.id for hit in hits]`,
  conftest: `"""Fixtures for the RAG tests: fake providers, a throwaway Postgres and two tiny documents.

Three tiers use them. Unit tests need no fixture beyond fakes. Tests that take \`svc\` need Postgres with
pgvector and skip when it is down. Live tests carry \`@pytest.mark.live\` and call a paid API.
"""

import os
import uuid

import psycopg
import pytest
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from askpep.config import Settings
from askpep.db import make_pool, migrate
from askpep.fakes import FakeEmbedder, FakeLLM, FakeReranker
from askpep.local_store import build_local_store
from askpep.services import Services
from askpep.types import Document

ADMIN_URL = os.environ.get("TEST_DATABASE_URL", "postgresql://askpep@localhost:5432/askpep")
DIM = 64


def postgres_reachable() -> bool:
    try:
        psycopg.connect(ADMIN_URL, connect_timeout=2).close()
        return True
    except psycopg.OperationalError:
        return False


def drop_database(name: str) -> None:
    with psycopg.connect(ADMIN_URL, autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')


@pytest.fixture
def svc():
    """Services backed by a throwaway database and fake providers. Skips when Postgres is down."""
    if not postgres_reachable():
        pytest.skip("Postgres is not reachable. Run \`docker compose up -d db\` or set TEST_DATABASE_URL.")
    name = f"askpep_test_{uuid.uuid4().hex[:8]}"
    with psycopg.connect(ADMIN_URL, autocommit=True) as admin:
        admin.execute(f'CREATE DATABASE "{name}"')
    try:
        url = make_conninfo(**{**conninfo_to_dict(ADMIN_URL), "dbname": name})
        settings = Settings(database_url=url, embed_dim=DIM, api_key="test-key", providers="fake")
        try:
            migrate(settings)
        except psycopg.errors.UndefinedFile as exc:
            pytest.skip(f"This Postgres has no pgvector extension: {exc}")
        pool = make_pool(settings)
        pool.open()
        try:
            yield Services(settings, pool, FakeEmbedder(DIM), FakeReranker(), FakeLLM())
        finally:
            pool.close()
    finally:
        drop_database(name)


@pytest.fixture
def docs() -> list[Document]:
    """Two tiny documents. Their text holds one sentence each, so every test knows what it finds."""
    return [
        Document(
            8,
            "PEP 8 – Style Guide",
            "https://peps.python.org/pep-0008/",
            "Abstract\\n========\\n\\nLimit all lines to a maximum of 79 characters.",
            {"PEP": "8", "Title": "Style Guide", "Status": "Final"},
        ),
        Document(
            20,
            "PEP 20 – The Zen of Python",
            "https://peps.python.org/pep-0020/",
            "Abstract\\n========\\n\\nExplicit is better than implicit.",
            {"PEP": "20", "Title": "The Zen of Python", "Status": "Final"},
        ),
    ]


@pytest.fixture
def local_svc(docs: list[Document]) -> Services:
    """The same services over a \`LocalStore\`, so the retrieval code runs with no database at all."""
    settings = Settings(embed_dim=DIM, api_key="test-key", providers="fake", store="local")
    embedder = FakeEmbedder(DIM)
    store = build_local_store(docs, embedder, max_tokens=settings.chunk_max_tokens)
    return Services(settings, None, embedder, FakeReranker(), FakeLLM(), store)`,
  testIngest: `"""ch02: ingest.py, which turns PEP files into Document objects.

    uv run pytest tests/rag/test_ingest.py -k ch02_s2

The ch12 tests at the end cover the database half of ingest. They skip when Postgres is down.
"""

from dataclasses import fields as dataclass_fields
from dataclasses import replace
from pathlib import Path

import pytest

from askpep.config import Settings
from askpep.ingest import content_hash, fetch_documents, ingest, load_documents, parse_header, parse_pep
from askpep.services import Services
from askpep.types import Document
from tests.helpers import pep

PEP_8 = "\\n".join(
    [
        "PEP: 8",
        "Title: Style Guide for Python Code",
        "Author: Guido van Rossum,",
        "        Barry Warsaw,",
        "        Alyssa Coghlan",
        "Status: Active",
        "",
        "Introduction",
        "============",
        "",
        "This document gives coding conventions.",
        "",
    ]
)


def test_ch02_s2_reads_each_header_field() -> None:
    fields, _ = parse_header(PEP_8)
    assert fields["PEP"] == "8"
    assert fields["Title"] == "Style Guide for Python Code"
    assert fields["Status"] == "Active"


def test_ch02_s2_continuation_lines_are_joined_into_one_value() -> None:
    fields, _ = parse_header(PEP_8)
    assert fields["Author"] == "Guido van Rossum, Barry Warsaw, Alyssa Coghlan"


def test_ch02_s2_the_body_starts_after_the_first_blank_line() -> None:
    _, body = parse_header(PEP_8)
    assert body.startswith("Introduction")
    assert "Status: Active" not in body
    assert "Guido" not in body


def test_ch02_s2_a_colon_line_in_the_body_is_not_a_field() -> None:
    fields, body = parse_header("PEP: 1\\nTitle: Purpose\\n\\nNote: this stays in the body.\\n")
    assert "Note" not in fields
    assert body.startswith("Note: this stays")


def test_ch02_s2_the_first_of_a_repeated_key_wins() -> None:
    fields, _ = parse_header("PEP: 1\\nTitle: First\\nTitle: Second\\n\\nBody.\\n")
    assert fields["Title"] == "First"


def test_ch02_s2_a_header_with_no_body_gives_an_empty_body() -> None:
    fields, body = parse_header("PEP: 2\\nTitle: Only a header")
    assert fields == {"PEP": "2", "Title": "Only a header"}
    assert body == ""


def test_ch02_s3_the_title_names_the_pep_with_an_en_dash() -> None:
    doc = parse_pep(8, PEP_8)
    assert doc.doc_id == 8
    assert doc.title == "PEP 8 – Style Guide for Python Code"
    assert doc.source == "https://peps.python.org/pep-0008/"


def test_ch02_s3_the_text_is_the_trimmed_body() -> None:
    doc = parse_pep(8, PEP_8)
    assert doc.text.startswith("Introduction")
    assert doc.text.endswith("conventions.")
    assert "Status: Active" not in doc.text


def test_ch02_s3_the_header_fields_travel_with_the_document() -> None:
    doc = parse_pep(8, PEP_8)
    assert doc.headers["Status"] == "Active"
    assert doc.headers["Author"].startswith("Guido van Rossum")


def test_ch02_s3_crlf_line_endings_leave_no_carriage_returns() -> None:
    doc = parse_pep(8, PEP_8.replace("\\n", "\\r\\n"))
    assert doc.title == "PEP 8 – Style Guide for Python Code"
    assert "\\r" not in doc.text
    assert doc.text.startswith("Introduction")


def test_ch02_s3_a_header_without_a_title_falls_back_to_the_pep_number() -> None:
    doc = parse_pep(9999, "Status: Draft\\n\\nBody text.\\n")
    assert doc.title == "PEP 9999"
    assert doc.text == "Body text."


def test_ch02_s3_blank_lines_inside_the_body_are_kept() -> None:
    doc = parse_pep(1, "PEP: 1\\nTitle: Purpose\\n\\nOne.\\n\\nTwo.\\n")
    assert doc.text == "One.\\n\\nTwo."


def test_ch02_s3_a_header_with_no_body_gives_an_empty_text() -> None:
    doc = parse_pep(2, "PEP: 2\\nTitle: Only a header")
    assert doc.text == ""
    assert doc.title == "PEP 2 – Only a header"


def make_folder(tmp_path: Path) -> Path:
    (tmp_path / "pep-0020.rst").write_text(
        "PEP: 20\\nTitle: The Zen of Python\\n\\nBeautiful is better than ugly.\\n", encoding="utf-8"
    )
    (tmp_path / "pep-0008.rst").write_text(PEP_8, encoding="utf-8")
    (tmp_path / "notes.txt").write_text("not a pep", encoding="utf-8")
    (tmp_path / ".DS_Store").write_text("junk", encoding="utf-8")
    return tmp_path


def test_ch02_s4_reads_only_pep_files_sorted_by_name(tmp_path: Path) -> None:
    docs = load_documents(make_folder(tmp_path))
    assert [d.doc_id for d in docs] == [8, 20]


def test_ch02_s4_two_runs_give_identical_documents(tmp_path: Path) -> None:
    folder = make_folder(tmp_path)
    assert load_documents(folder) == load_documents(folder)


def test_ch02_s4_every_item_is_a_document(tmp_path: Path) -> None:
    (doc, *_) = load_documents(make_folder(tmp_path))
    assert isinstance(doc, Document)
    assert [f.name for f in dataclass_fields(doc)] == ["doc_id", "title", "source", "text", "headers"]


def test_ch02_s4_an_empty_folder_gives_an_empty_list(tmp_path: Path) -> None:
    assert load_documents(tmp_path) == []


def test_ch12_fetch_documents_parses_what_the_fetcher_returns() -> None:
    raw = {8: pep(8, "Style Guide", "Limit all lines."), 20: pep(20, "The Zen of Python", "Be explicit.")}
    docs = fetch_documents([8, 20], fetch=raw.__getitem__)
    assert [d.doc_id for d in docs] == [8, 20]
    assert docs[0].title == "PEP 8 \\u2013 Style Guide"
    assert docs[1].text.endswith("Be explicit.")


def test_ch12_content_hash_covers_the_text_and_the_recipe(docs: list[Document]) -> None:
    base = Settings(providers="fake")
    doc = docs[0]
    assert content_hash(doc, base) == content_hash(doc, base)
    assert content_hash(doc, base) != content_hash(replace(doc, text=doc.text + " More."), base)
    assert content_hash(doc, base) != content_hash(doc, base.model_copy(update={"embed_model": "other"}))
    assert content_hash(doc, base) != content_hash(doc, base.model_copy(update={"embed_dim": 512}))
    assert content_hash(doc, base) != content_hash(doc, base.model_copy(update={"chunk_max_tokens": 200}))
    assert content_hash(doc, base) != content_hash(doc, base.model_copy(update={"chunk_overlap_tokens": 10}))


def test_ch12_ingest_refuses_an_empty_list_because_it_would_delete_everything(local_svc: Services) -> None:
    with pytest.raises(ValueError, match="at least one document"):
        ingest(local_svc, [])


def count(svc: Services, table: str) -> int:
    with svc.pool.connection() as conn:
        return conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()["n"]


def test_ch12_ingest_is_idempotent_and_replaces_and_deletes(svc: Services, docs: list[Document]) -> None:
    first = ingest(svc, docs)
    assert (first.added, first.skipped) == ([8, 20], [])
    chunks_before = count(svc, "chunks")

    again = ingest(svc, docs)
    assert (again.added, again.updated, again.skipped) == ([], [], [8, 20])
    assert count(svc, "chunks") == chunks_before

    edited = replace(
        docs[0], text="Abstract\\n========\\n\\nLimit all lines to 72 characters.\\n\\nA second paragraph."
    )
    changed = ingest(svc, [edited, docs[1]])
    assert (changed.updated, changed.skipped) == ([8], [20])
    with svc.pool.connection() as conn:
        text = conn.execute("SELECT string_agg(text, ' ') AS t FROM chunks WHERE doc_id = 8").fetchone()["t"]
    assert "72 characters" in text and "79 characters" not in text

    pruned = ingest(svc, [docs[1]])
    assert pruned.deleted == [8]
    assert count(svc, "chunks") == 1  # the cascade removed PEP 8's chunks


def test_ch12_ingest_stores_the_headers_and_chunk_offsets(svc: Services, docs: list[Document]) -> None:
    ingest(svc, docs)
    with svc.pool.connection() as conn:
        headers = conn.execute("SELECT headers FROM documents WHERE id = 8").fetchone()["headers"]
        row = conn.execute("SELECT start_offset, end_offset, text FROM chunks WHERE doc_id = 8").fetchone()
    assert headers["Status"] == "Final"
    assert docs[0].text[row["start_offset"] : row["end_offset"]] == row["text"]


def test_ch12_changing_the_embedding_model_forces_a_reingest(svc: Services, docs: list[Document]) -> None:
    ingest(svc, [docs[1]])
    svc.settings.embed_model = "another-model"
    assert ingest(svc, [docs[1]]).updated == [20]`,
  runIngest: "uv run pytest tests/rag/test_ingest.py -q",
  cliIngest: `@app.command()
def ingest(
    fetch: Annotated[
        bool, typer.Option("--fetch", help="Download the PEPs instead of reading CORPUS_DIR.")
    ] = False,
    store: Annotated[str, typer.Option("--store", help="pg, or local to write LOCAL_STORE_PATH.")] = "pg",
) -> None:
    """Chunk, embed and store the 18 PEPs. Safe to re-run."""
    from pathlib import Path

    from askpep.ingest import fetch_documents, load_documents
    from askpep.ingest import ingest as run_ingest

    settings = get_settings()
    kind = check_store(store) or "pg"
    if fetch:
        documents = fetch_documents()
    else:
        corpus = Path(settings.corpus_dir)
        documents = load_documents(corpus) if corpus.is_dir() else []
        if not documents:
            typer.echo(
                f"No pep-*.rst files in {corpus}. Run \`askpep ingest --fetch\` to download them.", err=True
            )
            raise typer.Exit(code=1)

    if kind == "local":
        from askpep.local_store import build_local_store, save_store
        from askpep.services import build_providers

        embedder, _, _ = build_providers(settings)
        built = build_local_store(
            documents,
            embedder,
            max_tokens=settings.chunk_max_tokens,
            overlap_tokens=settings.chunk_overlap_tokens,
        )
        save_store(Path(settings.local_store_path), built.entries)
        typer.echo(f"wrote {len(built.entries)} chunks from {len(documents)} documents")
        return

    report = run_ingest(open_services("pg"), documents)
    typer.echo(
        f"added {len(report.added)}, updated {len(report.updated)}, "
        f"skipped {len(report.skipped)}, deleted {len(report.deleted)}"
    )`,
  ingestCmd: "uv run askpep ingest",
  counts: "docker compose exec db psql -U askpep -c \"select (select count(*) from documents) as documents, (select count(*) from chunks) as chunks\"",
  tracing: `import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field

from psycopg.types.json import Jsonb

from askpep.services import Services

log = logging.getLogger("askpep.trace")


@dataclass
class Trace:
    """One per request. Stages are timed with \`with trace.stage("dense"):\`."""

    route: str
    query: str
    timings: dict[str, float] = field(default_factory=dict)
    retrieved_ids: list[int] = field(default_factory=list)
    model: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    refused: bool = False
    error: str | None = None
    started: float = field(default_factory=time.perf_counter)

    @contextmanager
    def stage(self, name: str) -> Iterator[None]:
        start = time.perf_counter()
        try:
            yield
        finally:
            self.timings[name] = round((time.perf_counter() - start) * 1000, 1)

    @property
    def latency_ms(self) -> float:
        return round((time.perf_counter() - self.started) * 1000, 1)

    def write(self, svc: Services) -> None:
        """Persist the trace and log it as one JSON line. Never raises: tracing must not break a request."""
        log.info(
            "trace",
            extra={
                "route": self.route,
                "latency_ms": self.latency_ms,
                "timings": self.timings,
                "refused": self.refused,
                "error": self.error,
            },
        )
        if svc.pool is None:  # local mode: the log line above is the whole trace
            return
        try:
            with svc.pool.connection() as conn:
                conn.execute(
                    "INSERT INTO traces (route, query, timings, retrieved_ids, model, tokens_in, "
                    "tokens_out, refused, latency_ms, error) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        self.route,
                        self.query,
                        Jsonb(self.timings),
                        self.retrieved_ids,
                        self.model,
                        self.tokens_in,
                        self.tokens_out,
                        self.refused,
                        self.latency_ms,
                        self.error,
                    ),
                )
        except Exception:
            log.exception("trace write failed")`,
  traceCheck: "uv run python - <<'EOF'\nimport time\nfrom askpep.tracing import Trace\n\ntrace = Trace('demo', 'a question')\nwith trace.stage('work'):\n    time.sleep(0.05)\nprint(trace.timings)\nEOF",
  retrieval: `"""Find the chunks that answer a question: dense and sparse search, fusion, then a reranker."""

import re
from collections.abc import Sequence
from typing import Protocol

from pgvector import Vector
from psycopg_pool import ConnectionPool

from askpep.providers import Reranker
from askpep.services import Services
from askpep.tracing import Trace
from askpep.types import Chunk, Hit, Via

RRF_K = 60


class ChunkStore(Protocol):
    """The read side of a store. Ingest stays Postgres-only."""

    def dense_search(
        self, vector: list[float], k: int, doc_ids: Sequence[int] | None = None
    ) -> list[Hit]: ...

    def sparse_search(self, query: str, k: int, doc_ids: Sequence[int] | None = None) -> list[Hit]: ...


COLUMNS = (
    "c.id, c.doc_id, c.idx, c.heading_path, c.text, c.token_count, c.start_offset, c.end_offset, "
    "d.title, d.source"
)


def or_query(query: str) -> str:
    """websearch_to_tsquery ANDs every word, so a full question matches almost nothing.
    Joining the words with \`or\` keeps all of them as optional terms and lets ts_rank_cd order the result."""
    return " or ".join(re.findall(r"\\w+", query))


def _hit(row: dict, via: Via) -> Hit:
    chunk = Chunk(
        doc_id=row["doc_id"],
        idx=row["idx"],
        title=row["title"],
        source=row["source"],
        heading_path=row["heading_path"],
        text=row["text"],
        token_count=row["token_count"],
        start=row["start_offset"],
        end=row["end_offset"],
        chunk_id=row["id"],
    )
    return Hit(chunk, float(row["score"]), via)


class PgStore:
    """The Postgres store: pgvector for dense search and a tsvector column for sparse search."""

    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def dense_search(self, vector: list[float], k: int, doc_ids: Sequence[int] | None = None) -> list[Hit]:
        where = "" if doc_ids is None else "WHERE c.doc_id = ANY(%(ids)s::int[])"
        with self.pool.connection() as conn:
            rows = conn.execute(
                f"SELECT {COLUMNS}, 1 - (c.embedding <=> %(v)s) AS score "
                f"FROM chunks c JOIN documents d ON d.id = c.doc_id {where} "
                "ORDER BY c.embedding <=> %(v)s LIMIT %(k)s",
                {"v": Vector(vector), "k": k, "ids": None if doc_ids is None else list(doc_ids)},
            ).fetchall()
        return [_hit(row, "dense") for row in rows]

    def sparse_search(self, query: str, k: int, doc_ids: Sequence[int] | None = None) -> list[Hit]:
        where = "" if doc_ids is None else "AND c.doc_id = ANY(%(ids)s::int[])"
        with self.pool.connection() as conn:
            rows = conn.execute(
                f"SELECT {COLUMNS}, ts_rank_cd(c.tsv, q) AS score "
                "FROM chunks c JOIN documents d ON d.id = c.doc_id, "
                f"websearch_to_tsquery('english', %(q)s) AS q WHERE c.tsv @@ q {where} "
                "ORDER BY score DESC, c.id LIMIT %(k)s",
                {"q": or_query(query), "k": k, "ids": None if doc_ids is None else list(doc_ids)},
            ).fetchall()
        return [_hit(row, "sparse") for row in rows]


def rrf(rankings: Sequence[Sequence[Hit]], *, k=60, weights=None, top_k=None) -> list[Hit]:
    """Reciprocal rank fusion: each list adds weight / (k + rank) to every chunk in it.

    Only the rank matters, never the input score. A chunk repeated inside one list counts once, at
    its best rank. The result is best first, marked "hybrid", and ties keep first-seen order.
    """
    scores: dict[str, float] = {}
    first: dict[str, Chunk] = {}
    for i, ranking in enumerate(rankings):
        weight = weights[i] if weights is not None and i < len(weights) else 1.0
        seen: set[str] = set()
        for rank, hit in enumerate(ranking, start=1):
            chunk_id = hit.chunk.id
            if chunk_id in seen:
                continue
            seen.add(chunk_id)
            first.setdefault(chunk_id, hit.chunk)
            scores[chunk_id] = scores.get(chunk_id, 0.0) + weight / (k + rank)
    fused = [Hit(first[chunk_id], score, "hybrid") for chunk_id, score in scores.items()]
    fused.sort(key=lambda hit: -hit.score)  # sort is stable, and dicts keep insertion order
    return fused if top_k is None else fused[:top_k]


def rerank_hits(reranker: Reranker, query: str, hits: Sequence[Hit], top_n: int) -> list[Hit]:
    """Send the hits to the reranker and return the best \`top_n\`, scored by relevance."""
    if not hits or top_n <= 0:
        return []
    top_n = min(top_n, len(hits))
    ranked = reranker.rerank(query, [hit.chunk.text for hit in hits], top_n)
    ranked = sorted((pair for pair in ranked if 0 <= pair[0] < len(hits)), key=lambda pair: -pair[1])
    return [Hit(hits[i].chunk, score, "rerank") for i, score in ranked[:top_n]]


def retrieve_then_rerank(query, retrieve, reranker, *, fetch_k=50, final_k=5) -> list[Hit]:
    """Retrieve many, rerank few. \`retrieve\` is a function from (query, k) to hits."""
    candidates = retrieve(query, fetch_k)
    return rerank_hits(reranker, query, candidates[:fetch_k], final_k)


def retrieve(svc: Services, query: str, trace: Trace, k: int | None = None) -> list[Hit]:
    """Hybrid search: dense plus sparse, fused with RRF, then optionally reranked."""
    s = svc.settings
    k = k or s.top_k
    if svc.store is None:
        raise RuntimeError("Services has no store. Pass a pool, or pass store=LocalStore(...).")

    with trace.stage("embed"):
        vector = svc.embedder.embed([query], "query")[0]
    with trace.stage("dense"):
        dense = svc.store.dense_search(vector, s.candidates)
    with trace.stage("sparse"):
        sparse = svc.store.sparse_search(query, s.candidates)

    with trace.stage("fuse"):
        candidates = rrf([dense, sparse], top_k=s.candidates)

    if s.rerank_enabled and candidates:
        with trace.stage("rerank"):
            hits = rerank_hits(svc.reranker, query, candidates, k)
    else:
        hits = candidates[:k]

    trace.retrieved_ids = [h.chunk.chunk_id for h in hits if h.chunk.chunk_id is not None]
    return hits


def is_thin(svc: Services, hits: Sequence[Hit]) -> bool:
    """True when we should refuse: nothing found, or the best rerank score is below the threshold.
    Without a reranker there is no calibrated score, so only an empty result counts as thin."""
    if not hits:
        return True
    return svc.settings.rerank_enabled and hits[0].score < svc.settings.min_rerank_score


def search(svc: Services, query: str, k: int | None = None, route: str = "search") -> list[Hit]:
    """Traced entry point used by the API, the CLI and the MCP server."""
    trace = Trace(route, query)
    try:
        return retrieve(svc, query, trace, k)
    except Exception as exc:
        trace.error = repr(exc)
        raise
    finally:
        trace.write(svc)


def hit_json(hit: Hit) -> dict:
    """The flat record that \`/search\` returns for one hit."""
    c = hit.chunk
    return {
        "chunk_id": c.chunk_id,
        "doc_id": c.doc_id,
        "title": c.title,
        "idx": c.idx,
        "heading_path": c.heading_path,
        "text": c.text,
        "score": hit.score,
        "via": hit.via,
    }`,
  testRetrieval: `"""ch06 steps 5 and 6, and ch07 steps 3 to 5: retrieval.py, fusion and reranking.

    uv run pytest tests/rag/test_retrieval.py -k ch06_s5

Step 6 of ch06 prints rankings, so run it with \`-s\`. Step 5 of ch07 calls the real Voyage API and runs
only with \`-m live\`.
"""

import pytest

from askpep.config import Settings
from askpep.fakes import FakeEmbedder, FakeReranker
from askpep.ingest import load_documents
from askpep.local_store import build_local_store
from askpep.providers import ProviderError, VoyageEmbedder, VoyageReranker, embed_query
from askpep.retrieval import hit_json, or_query, rerank_hits, retrieve_then_rerank, rrf
from askpep.types import Hit, Via
from tests.helpers import FIXTURES, ids, make_chunk, make_hit
from tests.rag.test_providers import FakeServer

# A name stands for one chunk: the same name always gives the same chunk id.
_DOC_IDS: dict[str, int] = {}


def hit(name: str, score: float = 1.0, via: Via = "dense") -> Hit:
    doc_id = _DOC_IDS.setdefault(name, len(_DOC_IDS) + 1)
    return make_hit(doc_id, 0, score, via, text=name)


def names(hits: list[Hit]) -> list[str]:
    return [h.chunk.text for h in hits]


def close(a: float, b: float) -> None:
    assert abs(a - b) < 1e-12, f"{a} is not close to {b}"


# ch06 step 5: reciprocal rank fusion


def test_ch06_s5_a_chunk_at_rank_one_in_two_lists_scores_two_over_sixty_one() -> None:
    out = rrf([[hit("a")], [hit("a", 99, "sparse")]])
    close(out[0].score, 2 / 61)


def test_ch06_s5_ranks_start_at_one_and_k_defaults_to_sixty() -> None:
    out = rrf([[hit("a"), hit("b"), hit("c")]])
    close(out[0].score, 1 / 61)
    close(out[1].score, 1 / 62)
    close(out[2].score, 1 / 63)


def test_ch06_s5_a_chunk_found_by_both_retrievers_beats_one_that_tops_only_one() -> None:
    dense = [hit("solo"), hit("both")]
    sparse = [hit("other", 1, "sparse"), hit("both", 1, "sparse")]
    assert names(rrf([dense, sparse]))[0] == "both"


def test_ch06_s5_input_scores_are_ignored_and_only_the_order_matters() -> None:
    a = rrf([[hit("x", 0.99), hit("y", 0.98)], [hit("y", 12), hit("x", 3)]])
    b = rrf([[hit("x", 5), hit("y", 0.001)], [hit("y", 1000), hit("x", 999)]])
    assert names(a) == names(b)
    assert [h.score for h in a] == [h.score for h in b]


def test_ch06_s5_the_output_is_marked_hybrid_and_carries_the_chunk() -> None:
    first = hit("a")
    out = rrf([[first], [hit("b", 1, "sparse")]])
    assert all(h.via == "hybrid" for h in out)
    assert sorted(names(out)) == ["a", "b"]
    assert out[0].chunk == first.chunk


def test_ch06_s5_a_custom_k_changes_the_fused_scores() -> None:
    close(rrf([[hit("a")]], k=0)[0].score, 1)
    close(rrf([[hit("a")]], k=10)[0].score, 1 / 11)


def test_ch06_s5_a_small_k_lets_one_top_rank_win_and_a_large_k_lets_agreement_win() -> None:
    lists = [
        [hit("solo"), hit("x"), hit("both")],
        [hit("y", 1, "sparse"), hit("z", 1, "sparse"), hit("both", 1, "sparse")],
    ]
    assert names(rrf(lists, k=0))[0] == "solo"
    assert names(rrf(lists, k=60))[0] == "both"


def test_ch06_s5_weights_scale_each_lists_contribution() -> None:
    dense = [hit("d1"), hit("d2")]
    sparse = [hit("s1", 1, "sparse"), hit("s2", 1, "sparse")]
    assert names(rrf([dense, sparse], weights=[1, 3]))[0] == "s1"
    assert names(rrf([dense, sparse], weights=[3, 1]))[0] == "d1"


def test_ch06_s5_top_k_cuts_the_fused_list() -> None:
    out = rrf([[hit("a"), hit("b"), hit("c")], [hit("d", 1, "sparse"), hit("e", 1, "sparse")]], top_k=2)
    assert len(out) == 2


def test_ch06_s5_ties_go_to_whichever_chunk_appeared_first() -> None:
    out = rrf([[hit("first")], [hit("second", 1, "sparse")]])
    assert names(out) == ["first", "second"]


def test_ch06_s5_a_chunk_repeated_inside_one_list_counts_once_at_its_best_rank() -> None:
    out = rrf([[hit("a"), hit("b"), hit("a")]])
    close(next(h for h in out if h.chunk.text == "a").score, 1 / 61)


def test_ch06_s5_chunks_are_matched_by_id_not_by_object() -> None:
    twin_a = make_hit(7, 0, 1.0, "dense", text="same chunk")
    twin_b = make_hit(7, 0, 5.0, "sparse", text="same chunk")
    assert twin_a is not twin_b
    out = rrf([[twin_a], [twin_b]])
    assert len(out) == 1
    close(out[0].score, 2 / 61)


def test_ch06_s5_empty_inputs_give_an_empty_result() -> None:
    assert rrf([]) == []
    assert rrf([[], []]) == []


def test_ch06_s5_the_inputs_are_not_changed() -> None:
    lst = [hit("a", 0.5), hit("b", 0.4)]
    rrf([lst, lst])
    assert lst[0].score == 0.5
    assert lst[0].via == "dense"


def test_ch06_s5_a_list_that_is_shorter_than_the_other_keeps_every_chunk() -> None:
    out = rrf([[hit("a"), hit("b"), hit("c")], [hit("c", 1, "sparse")]])
    assert len(out) == 3
    assert names(out)[0] == "c"


# ch06 step 6: dense, sparse and hybrid side by side


COMPARE_QUERIES = {
    "walrus operator": 572,
    "maximum line length": 8,
    "global interpreter lock threads": 703,
    "type hints": 484,
}


def test_ch06_s6_dense_sparse_and_hybrid_rankings_on_the_fixture_corpus() -> None:
    embedder = FakeEmbedder(256)
    store = build_local_store(load_documents(FIXTURES), embedder)
    for query, expected_doc in COMPARE_QUERIES.items():
        dense = store.dense_search(embed_query(embedder, query), 5)
        sparse = store.sparse_search(query, 5)
        hybrid = rrf([dense, sparse], top_k=5)
        print(f"\\n{query!r}")
        print(f"  {'dense':<12} {'sparse':<12} {'hybrid':<12}")
        for rank in range(5):
            cells = [ids(side)[rank] if rank < len(side) else "-" for side in (dense, sparse, hybrid)]
            print(f"  {cells[0]:<12} {cells[1]:<12} {cells[2]:<12}")
        assert hybrid[0].chunk.doc_id == expected_doc
        assert {h.chunk.id for h in hybrid} <= {h.chunk.id for h in dense + sparse}


# ch07 step 3: map the reranker's scores back to hits


class ScriptedReranker:
    """Returns fixed (index, score) pairs best first, cut to top_k, and records what it was asked."""

    def __init__(self, scores: list[float]):
        self.scores = scores
        self.calls: list[tuple[str, list[str], int]] = []

    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        self.calls.append((query, list(documents), top_k))
        pairs = sorted(enumerate(self.scores), key=lambda pair: pair[1], reverse=True)
        return pairs[:top_k]


HITS = [hit("a"), hit("b"), hit("c"), hit("d")]


def test_ch07_s3_hits_are_reordered_by_relevance_and_marked_rerank() -> None:
    out = rerank_hits(ScriptedReranker([0.1, 0.9, 0.5, 0.7]), "q", HITS, 4)
    assert names(out) == ["b", "d", "c", "a"]
    assert all(h.via == "rerank" for h in out)
    assert out[0].score == 0.9


def test_ch07_s3_only_the_top_n_hits_are_kept() -> None:
    out = rerank_hits(ScriptedReranker([0.1, 0.9, 0.5, 0.7]), "q", HITS, 2)
    assert names(out) == ["b", "d"]


def test_ch07_s3_the_reranker_gets_the_query_the_chunk_texts_in_order_and_top_n() -> None:
    reranker = ScriptedReranker([1, 2, 3, 4])
    rerank_hits(reranker, "why walrus?", HITS, 2)
    assert reranker.calls == [("why walrus?", [h.chunk.text for h in HITS], 2)]


def test_ch07_s3_the_chunk_is_kept_and_only_the_score_and_via_change() -> None:
    out = rerank_hits(ScriptedReranker([0.1, 0.9, 0.5, 0.7]), "q", HITS, 1)
    assert out[0].chunk == HITS[1].chunk


def test_ch07_s3_an_empty_candidate_list_does_not_call_the_reranker() -> None:
    reranker = ScriptedReranker([])
    assert rerank_hits(reranker, "q", [], 5) == []
    assert reranker.calls == []


def test_ch07_s3_a_top_n_larger_than_the_candidates_returns_all_of_them() -> None:
    out = rerank_hits(ScriptedReranker([0.1, 0.9, 0.5, 0.7]), "q", HITS, 10)
    assert len(out) == 4


def test_ch07_s3_a_failed_call_raises_a_provider_error_with_its_status() -> None:
    server = FakeServer(lambda body: {}, script=[401])
    real = VoyageReranker("k", "rerank-test", client=server.client)
    with pytest.raises(ProviderError) as caught:
        rerank_hits(real, "q", HITS, 2)
    assert caught.value.status == 401


# ch07 step 4: retrieve many, rerank few


def test_ch07_s4_it_retrieves_fetch_k_candidates_and_returns_final_k() -> None:
    asked: list[tuple[str, int]] = []

    def retrieve(query: str, k: int) -> list[Hit]:
        asked.append((query, k))
        return HITS

    out = retrieve_then_rerank("q", retrieve, ScriptedReranker([0.2, 0.1, 0.9, 0.3]), fetch_k=4, final_k=2)
    assert asked == [("q", 4)]
    assert names(out) == ["c", "d"]


def test_ch07_s4_the_defaults_are_fifty_candidates_and_five_results() -> None:
    asked: list[int] = []
    pool = [make_hit(i, 0, 1.0, "dense", text=f"text {i}") for i in range(1, 9)]

    def retrieve(query: str, k: int) -> list[Hit]:
        asked.append(k)
        return pool

    out = retrieve_then_rerank("text", retrieve, FakeReranker())
    assert asked == [50]
    assert len(out) == 5
    assert all(h.via == "rerank" for h in out)


def test_ch07_s4_any_retrieve_function_works_dense_sparse_or_hybrid() -> None:
    embedder = FakeEmbedder(256)
    store = build_local_store(load_documents(FIXTURES), embedder)

    def hybrid(query: str, k: int) -> list[Hit]:
        dense = store.dense_search(embed_query(embedder, query), k)
        return rrf([dense, store.sparse_search(query, k)], top_k=k)

    out = retrieve_then_rerank("walrus operator", hybrid, FakeReranker(), fetch_k=10, final_k=3)
    assert len(out) == 3
    assert out[0].chunk.doc_id == 572


# ch07 step 5: plain against reranked, on the real API


@pytest.mark.live
def test_ch07_s5_plain_and_reranked_rankings_side_by_side() -> None:
    settings = Settings()
    if not settings.voyage_api_key:
        pytest.skip("VOYAGE_API_KEY is not set in .env")
    embedder = VoyageEmbedder(settings.voyage_api_key, settings.embed_model, settings.embed_dim)
    reranker = VoyageReranker(settings.voyage_api_key, settings.rerank_model)
    store = build_local_store(load_documents(FIXTURES), embedder)

    def plain(query: str, k: int) -> list[Hit]:
        return store.dense_search(embed_query(embedder, query), k)

    for query in ("how do I assign a value inside an if condition", "can threads run in parallel"):
        before = plain(query, 6)
        after = retrieve_then_rerank(query, plain, reranker, fetch_k=6, final_k=3)
        print(f"\\n{query!r}")
        print("  plain    ", ids(before[:3]))
        print("  reranked ", ids(after), [round(h.score, 2) for h in after])
        assert after and all(h.via == "rerank" for h in after)


# The old capstone tests, kept for ch12 and ch13


def test_ch12_or_query_keeps_every_word_as_an_optional_term() -> None:
    assert or_query("What is PEP 8's line length?") == "What or is or PEP or 8 or s or line or length"


def test_ch13_hit_json_is_flat_and_names_how_the_hit_was_found() -> None:
    chunk = make_chunk(8, 2, "Limit all lines to 79 characters.", heading_path=["PEP 8", "Code Lay-out"])
    record = hit_json(Hit(chunk, 0.5, "hybrid"))
    assert record == {
        "chunk_id": None,
        "doc_id": 8,
        "title": "PEP 8",
        "idx": 2,
        "heading_path": ["PEP 8", "Code Lay-out"],
        "text": "Limit all lines to 79 characters.",
        "score": 0.5,
        "via": "hybrid",
    }`,
  testSearch: `"""ch12: the traced \`search\` entry point and the \`retrieve\` function behind it.

These are not lab steps. Chapter 12 shows the code, and later courses call it. The first group runs on a
\`LocalStore\` with no database. The Postgres tests take the \`svc\` fixture and skip when it is down.
"""

import pytest

from askpep.fakes import FakeLLM, FakeReranker
from askpep.ingest import ingest
from askpep.local_store import LocalStore
from askpep.retrieval import is_thin, retrieve, search
from askpep.services import Services
from askpep.tracing import Trace
from askpep.types import Document
from tests.helpers import make_hit

QUERY = "maximum line length 79 characters"


def test_ch12_retrieve_on_a_local_store_finds_the_matching_chunk(local_svc: Services) -> None:
    hits = retrieve(local_svc, QUERY, Trace("test", QUERY), k=2)
    assert hits[0].chunk.doc_id == 8
    assert len(hits) <= 2


def test_ch12_retrieve_times_every_stage(local_svc: Services) -> None:
    trace = Trace("test", QUERY)
    retrieve(local_svc, QUERY, trace)
    assert {"embed", "dense", "sparse", "fuse", "rerank"} <= set(trace.timings)


def test_ch12_retrieve_returns_reranked_hits_when_the_reranker_is_on(local_svc: Services) -> None:
    hits = retrieve(local_svc, QUERY, Trace("test", QUERY))
    assert hits
    assert all(hit.via == "rerank" for hit in hits)


def test_ch12_retrieve_returns_fused_hits_and_skips_the_rerank_stage_when_it_is_off(
    local_svc: Services,
) -> None:
    local_svc.settings.rerank_enabled = False
    trace = Trace("test", QUERY)
    hits = retrieve(local_svc, QUERY, trace)
    assert hits
    assert all(hit.via == "hybrid" for hit in hits)
    assert "rerank" not in trace.timings


def test_ch12_k_defaults_to_the_top_k_setting(local_svc: Services) -> None:
    local_svc.settings.top_k = 1
    assert len(retrieve(local_svc, QUERY, Trace("test", QUERY))) == 1


def test_ch12_retrieve_needs_a_store(local_svc: Services) -> None:
    bare = Services(local_svc.settings, None, local_svc.embedder, FakeReranker(), FakeLLM())
    with pytest.raises(RuntimeError, match="no store"):
        retrieve(bare, QUERY, Trace("test", QUERY))


def test_ch12_search_returns_the_same_hits_as_retrieve(local_svc: Services) -> None:
    traced = search(local_svc, QUERY, k=2)
    plain = retrieve(local_svc, QUERY, Trace("test", QUERY), k=2)
    assert [h.chunk.id for h in traced] == [h.chunk.id for h in plain]


def test_ch12_an_empty_store_gives_no_hits(local_svc: Services) -> None:
    local_svc.store = LocalStore([])
    assert search(local_svc, QUERY) == []


def test_ch12_no_hits_is_thin(local_svc: Services) -> None:
    assert is_thin(local_svc, []) is True


def test_ch12_a_weak_best_hit_is_thin_and_a_strong_one_is_not(local_svc: Services) -> None:
    local_svc.settings.min_rerank_score = 0.5
    assert is_thin(local_svc, [make_hit(8, 0, 0.1, "rerank")]) is True
    assert is_thin(local_svc, [make_hit(8, 0, 0.9, "rerank")]) is False


def test_ch12_without_a_reranker_only_an_empty_result_is_thin(local_svc: Services) -> None:
    local_svc.settings.rerank_enabled = False
    assert is_thin(local_svc, [make_hit(8, 0, 0.0, "hybrid")]) is False
    assert is_thin(local_svc, []) is True


def test_ch12_search_on_postgres_finds_the_matching_chunk_and_writes_a_trace(
    svc: Services, docs: list[Document]
) -> None:
    ingest(svc, docs)
    hits = search(svc, QUERY, k=2)
    assert hits[0].chunk.doc_id == 8
    with svc.pool.connection() as conn:
        trace = conn.execute("SELECT * FROM traces").fetchone()
    assert trace["route"] == "search"
    assert {"embed", "dense", "sparse", "fuse", "rerank"} <= set(trace["timings"])
    assert trace["retrieved_ids"] == [h.chunk.chunk_id for h in hits]


def test_ch12_postgres_and_local_stores_return_the_same_documents(
    svc: Services, local_svc: Services, docs: list[Document]
) -> None:
    ingest(svc, docs)
    on_pg = [h.chunk.doc_id for h in search(svc, QUERY, k=2)]
    on_local = [h.chunk.doc_id for h in search(local_svc, QUERY, k=2)]
    assert on_pg == on_local`,
  runSearchTests: "uv run pytest tests/rag/test_retrieval.py tests/rag/test_search.py -q",
  cliSearch: `@app.command()
def search(
    query: str,
    k: int = 6,
    store: Annotated[str, typer.Option("--store", help="pg or local. Default: the STORE setting.")] = "",
) -> None:
    """Hybrid search from the command line."""
    from askpep.retrieval import search as run_search

    svc = open_services(check_store(store))
    for rank, hit in enumerate(run_search(svc, query, k, route="cli.search"), start=1):
        typer.echo(f"{rank}. [{hit.score:.3f}] {' > '.join(hit.chunk.heading_path)}")
        typer.echo(f"   {hit.chunk.text[:160]!r}")`,
  search1: "uv run askpep search \"maximum line length\" --k 3",
  search2: "uv run askpep search \"What does the walrus operator do?\" --k 3",
} as const;

const E = {
  addDeps: "askpep v0.1.0\n├── anthropic v1.15.0\n├── fastapi v0.143.2\n├── httpx v0.28.1\n├── mcp v2.3.0\n├── pgvector v0.5.1\n├── psycopg[binary, pool] v3.3.6\n├── pydantic-settings v2.16.0\n├── typer v0.19.2\n├── uvicorn[standard] v0.54.0\n├── pytest v9.1.1 (group: dev)\n└── ruff v0.17.1 (group: dev)",
  addDev: "All checks passed!",
  run: "AskPEP: question answering over 18 Python PEPs.",
  composeUp: " Container askpep-db-1  Started",
  pgReady: "/var/run/postgresql:5432 - accepting connections",
  config: "voyage-3.5 1024 rerank-2.5 claude-sonnet-5-5",
  logs: "{\"ts\": \"2026-10-16T17:04:09+0530\", \"level\": \"INFO\", \"logger\": \"demo\", \"msg\": \"hello\", \"k\": 1}",
  help: "│ --help          Show this message and exit.                                  │\n╰──────────────────────────────────────────────────────────────────────────────╯\n╭─ Commands ───────────────────────────────────────────────────────────────────╮\n│ migrate  Apply SQL migrations.                                               │\n╰──────────────────────────────────────────────────────────────────────────────╯",
  migrate: "applied: 001_documents_chunks, 002_indexes, 003_traces",
  migrate2: "up to date",
  tables: "    table_name     \n-------------------\n chunks\n documents\n schema_migrations\n traces\n(4 rows)",
  indexes: "       indexname       \n-----------------------\n chunks_doc_id_idx_key\n chunks_embedding_hnsw\n chunks_pkey\n chunks_tsv_gin\n(4 rows)",
  runProviders: "................................                                         [100%]\n32 passed, 1 deselected in 0.15s",
  checkFake: "1024 1.0",
  runChunking: "...................................................                      [100%]\n51 passed in 0.10s",
  // CHECK: 57 chunks is the capstone chunker's count on a local copy of PEP 8 fetched on 16 October 2026, not a fresh download. Re-run the step on your own data/raw and update the count if the PEP text has changed.
  curl: "PEP 8 – Style Guide for Python Code\n57 chunks\n['PEP 8 – Style Guide for Python Code', 'Code Lay-out', 'Indentation']\n'Code Lay-out\\n============\\n\\nIndentation\\n-----------\\n\\nUse 4 spaces per i'",
  // CHECK: 23 passed assumes a running Postgres with pgvector. The reference run had none, so three tests skipped and it printed 20 passed, 3 skipped. Re-run against the compose database and confirm.
  runIngest: ".......................                                                  [100%]\n23 passed in 0.52s",
  ingest1: "added 18, updated 0, skipped 0, deleted 0",
  ingest2: "added 0, updated 0, skipped 18, deleted 0",
  // CHECK: 704 chunks is the capstone chunker's count over a local copy of the 18 PEPs fetched on 16 October 2026. No Postgres ran in the reference build. Confirm it with the count query against a live database.
  counts: " documents | chunks \n-----------+--------\n        18 |    704\n(1 row)",
  traceCheck: "{'work': 56.5}",
  // CHECK: 41 passed assumes a running Postgres with pgvector. The reference run had none, so two search tests skipped and it printed 39 passed, 2 skipped, 1 deselected. Re-run against the compose database and confirm.
  runSearchTests: ".........................................                                [100%]\n41 passed, 1 deselected in 0.31s",
  // CHECK: this output came from the local store with the fake providers, because no Postgres with pgvector was available. Postgres ranks the sparse leg with ts_rank_cd, so the order and the scores may differ. Re-capture it against a real database.
  search1: "1. [1.000] PEP 8 – Style Guide for Python Code > Code Lay-out > Maximum Line Length\n   'Maximum Line Length\\n-------------------\\n\\nLimit all lines to a maximum of 79 characters.\\n\\nFor flowing long blocks of text with fewer structural restrictions\\n(doc'\n2. [1.000] PEP 584 – Add Union Operators To dict > Disadvantages\n   '-----------------------\\nsympy/parsing/maxima.py\\n-----------------------\\n\\nBefore::\\n\\n    dct = MaximaHelpers.__dict__.copy()\\n    dct.update(name_dict)\\n    obj = s'\n3. [0.667] PEP 636 – Structural Pattern Matching: Tutorial > Tutorial > Matching sequences\n   \"Matching sequences\\n------------------\\n\\nYour main loop will need to get input from the user and split it into words, let's say\\na list of strings like this::\\n\\n   \"",
  // CHECK: this output came from the local store with the fake providers, because no Postgres with pgvector was available. Postgres ranks the sparse leg with ts_rank_cd, so the order and the scores may differ. Re-capture it against a real database.
  search2: "1. [0.833] PEP 584 – Add Union Operators To dict\n   '------------------------------------------\\nDict Union Makes Code Harder To Understand\\n------------------------------------------\\n\\nDict union makes it harder to '\n2. [0.833] PEP 584 – Add Union Operators To dict\n   '- Currently, neither defines a ``copy`` method, which would be\\n  necessary for ``|`` to create a new instance.\\n\\n- Adding ``|=`` to ``MutableMapping`` (or a ``co'\n3. [0.667] PEP 636 – Structural Pattern Matching: Tutorial > Tutorial > Capturing matched sub-patterns\n   'Capturing matched sub-patterns\\n------------------------------\\n\\nThe first version of our \"go\" command was written with a ``[\"go\", direction]`` pattern.\\nThe chang'",
} as const;


const step = (
  id: string,
  title: string,
  text: string,
  o: { lang?: string; code?: string; file?: string; expect?: string } = {},
): Block => ({ kind: "step", id, title, text, ...o });

const chapter: Chapter = {
  id: "rag-12-capstone-core",
  course: "rag",
  number: 12,
  title: "Capstone part 1: scaffold, Postgres and ingestion",
  tagline: "How do you turn your lab code into a searchable AskPEP that runs on one Postgres database?",
  minutes: 120,
  objectives: [
    "Check that your lab workspace is a packaged uv project that installs, lints and imports with one command each.",
    "Start a pgvector database in Docker, and say why one Postgres is the only infrastructure the build needs.",
    "Read every setting from the environment in one class, and keep logs on stderr as JSON lines.",
    "Read the chunks table with its HNSW and GIN indexes, and say which query each index serves.",
    "Put the embedder, the reranker and the language model behind protocols, so the tests run offline.",
    "Split a PEP on its own headings, and say what is stored and what is embedded.",
    "Run ingestion that hashes the whole recipe, replaces a document in one transaction and prunes the rest.",
    "Time each stage of a request with a trace that can never break the request.",
    "Run hybrid retrieval with pgvector, Postgres full-text search, reciprocal rank fusion at k equal to 60 and a reranker.",
    "Check the build with four tests, and defend its four main decisions with a switch signal for each.",
  ],
  sections: [
    {
      id: "s1-scaffold",
      title: "A packaged uv project gives every later step one command to run",
      goal: "What must your workspace hold before any AskPEP code runs?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 11 chose the defaults: Postgres with pgvector, Postgres full-text search and your own ingestion code. Now you build with them. This chapter answers one question. How do you turn your lab code into a searchable AskPEP that runs on one Postgres database?",
        },
        {
          kind: "p",
          text: "In the labs of chapters 2 to 9 you wrote AskPEP's parts one at a time. This chapter assembles them into the first third of a real build. By the end, you can search 18 Python PEPs from the command line.",
        },
        {
          kind: "p",
          text: "The sections follow the build order. Sections one to four check the project, start the database, set up settings and logs, and create the tables. Sections five to seven connect the vendors, cut the PEPs into chunks and load them. Section eight times each request, section nine searches, and section ten checks the whole build.",
        },
        {
          kind: "p",
          text: "The finished code lives in the capstone folder of this repository. Every listing in the steps is copied from it, character for character. Your workspace already holds most of these files. You wrote some in the labs. The **starter**, the course template you copied in chapter 2, shipped the rest.",
        },
        {
          kind: "p",
          text: "Each step says what to compare, create or run, and what you should see. The outputs shown come from the **reference build**, one recorded run of every step.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The outputs come from a reference build, not from your machine",
          text: "The reference build used the **fake providers**, offline stand-ins for Voyage and Anthropic, on a local copy of the corpus. Scores, rankings and timings will differ with live keys. Docker was not run for it, so the Docker and Postgres outputs are typical ones. Yours may differ slightly. The shape should match.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Set providers to fake and you need no keys at all",
          text: "You can run every step without a Voyage key or an Anthropic key. Set the providers setting to fake in your **env file**, the `.env` file that holds your settings and keys. A fake embedder, reranker and language model then stand in for the vendors. Retrieval is crude, but every code path runs and the tests pass.",
        },
        {
          kind: "p",
          text: "You need Python 3.12, uv, Node 22, Docker and curl. Node waits for the chat page in chapter 13. In chapter 2, uv installed Python and the packages pinned in the **lock file**, which records the exact version of every package. Keep the lock file committed, because it makes the build repeatable.",
        },
        {
          kind: "p",
          text: "uv installs your code as an **editable install**. Python then imports the package straight from your source folder, so an edit needs no reinstall. The install is also what creates the askpep command.",
        },
        step("c12-s01", "The workspace from chapter 2 is already a packaged uv project", "Open a terminal in the askpep repo you started in chapter 2. It holds the starter files and the code you wrote in the labs. Run uv sync so the environment matches the lock file. It changes nothing if the packages are already in place.", { lang: "bash", code: K.init }),
        step("c12-s02", "The runtime dependencies are few and chosen on purpose", "Your pyproject lists the libraries the service needs. They are a Postgres driver with a pool, the pgvector helper, a settings library, an HTTP client, the Anthropic SDK and Typer. FastAPI, the MCP SDK and Uvicorn are installed too, for chapter 13. Typer stays below 0.20, because a later guardrails library caps it. Print the top of the tree. Versions may differ.", { lang: "bash", code: K.addDeps, expect: E.addDeps }),
        step("c12-s03", "Test and lint tools stay in the dev group", "Pytest and ruff are development dependencies, so a production install leaves them out. Run ruff over the source. It should report no problems before you add code.", { lang: "bash", code: K.addDev, expect: E.addDev }),
        step("c12-s04", "Ruff and pytest read their settings from pyproject", "Your pyproject already ends with these settings, because the starter shipped them. Ruff reads the line length and the rule set from here. Pytest learns where the tests live, and skips the tests marked live. Compare your file with this listing.", { lang: "toml", file: "pyproject.toml", code: K.pyproject }),
        step("c12-s05", "The git ignore file keeps secrets and build output out of the repository", "The starter shipped the git ignore file too. Compare yours with this listing. The line that matters most is the one that ignores your env file, because that file will hold API keys.", { lang: "text", file: ".gitignore", code: K.gitignore }),
        step("c12-s06", "The example env file documents every setting and holds no secret", "The starter also shipped the example env file. It is committed, so it holds names and safe defaults only. Model names live here because vendors rename models. Check each vendor's model list before you rely on these values.", { lang: "text", file: ".env.example", code: K.envExample }),
        step("c12-s07", "Copy the example, then fill in your own keys", "Copy the example to your real env file. The no-clobber flag keeps an env file you made in an earlier chapter. Fill in the Voyage key, the Anthropic key and an API key of your choosing. Or set providers to fake and skip the keys for now.", { lang: "bash", code: K.cpEnv }),
        step("c12-s08", "Importing the package proves the environment works", "Import the package and print its docstring. Don't run the askpep command yet. It needs the command line file, which section four creates. The import proves that the editable install points at your source.", { lang: "bash", code: K.runPlaceholder, expect: E.run }),
        {
          kind: "p",
          text: "The dependency list is short on purpose. Psycopg 3 and its pool talk to Postgres. Httpx calls Voyage directly, so you can see the whole API. Chapter 11 gave the rule: start with the smallest stack that meets the constraints, and name the signal that would make you add more.",
        },
        {
          kind: "quiz",
          id: "c12-q1",
          question: "Why does the example env file get committed while the real env file is ignored?",
          options: [
            "The example documents every setting with safe defaults, and the real file holds secrets.",
            "Git cannot store files that start with a dot.",
            "The real file is generated by uv, so it never needs saving.",
            "The example holds the production keys for the team.",
          ],
          answer: 0,
          explain: "A new teammate learns every setting from the example. The real file holds API keys, which must never reach the repository.",
        },
        {
          kind: "p",
          text: "The project installs and imports, but it has nowhere to keep data. Next you start the one database the whole build uses.",
        },
      ],
    },
    {
      id: "s2-postgres",
      title: "One Postgres container holds the vectors, the text index and the rows",
      goal: "Why is one Postgres container the only infrastructure the build needs?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 5 compared vector stores, and chapter 11 gave the rule: start with Postgres if you can. AskPEP follows it. One database holds the documents, the chunks, their vectors, a full-text index and the request traces.",
        },
        {
          kind: "p",
          text: "The biggest gain is the **transaction**, a group of writes that the database applies together or not at all. When ingestion replaces a document, its row, its chunks and its vectors change in one transaction. With a separate vector database you would reconcile two systems by hand. A crash between the two writes would leave them disagreeing.",
        },
        {
          kind: "p",
          text: "Docker runs the database in a **container**, an isolated process started from an **image**, which is a packaged file system. The pgvector image is the official Postgres image with the extension installed. A **compose file** lists the containers a project needs, so one command starts them all.",
        },
        step("c12-s09", "The compose file pins the database to a pgvector image", "The starter shipped the compose file. Compare it with this listing. The image is Postgres 17 with the extension installed. The port is bound to the **loopback address**, 127.0.0.1, which only your own machine can reach. The health check lets other tools wait until the database is ready.", { lang: "yaml", file: "docker-compose.yml", code: K.compose }),
        step("c12-s10", "One command starts the database in the background", "Start the database. Docker was not run when the reference was built, so this output is a typical one and yours may differ slightly. The first run pulls the image, so it is slower than later runs.", { lang: "bash", code: K.composeUp, expect: E.composeUp }),
        step("c12-s11", "The readiness check confirms the server accepts connections", "Ask Postgres whether it is ready. This is also Docker output from outside the reference build, so the wording may differ slightly.", { lang: "bash", code: K.pgReady, expect: E.pgReady }),
        {
          kind: "callout",
          tone: "warn",
          title: "Trust authentication is for your laptop only",
          text: "The compose file sets **trust authentication**, which lets a connection in with no password. Binding the port to the loopback address makes that safe on one machine. On a shared network, or in production, use a password and TLS. Check that your managed Postgres provider offers the pgvector extension before you commit to it.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "What you would swap in production",
          text: "A managed Postgres replaces the container, and the schema stays the same. On Google Cloud that is Cloud SQL, which offers pgvector. Chapter 14 deploys to it. If filtering or scale outgrows pgvector, chapter 11 listed the signals and the alternatives, such as Vertex AI Vector Search. Moving costs you the single transaction, so trade it only with evidence.",
        },
        {
          kind: "p",
          text: "The database is running. Before any code talks to it, the code needs one place to read the database address and every other setting.",
        },
      ],
    },
    {
      id: "s3-config",
      title: "Settings read the environment once, and logs leave through stderr as JSON",
      goal: "Where does every setting come from, and where does every log line go?",
      blocks: [
        {
          kind: "p",
          text: "Settings is one class, and it is the only code that reads environment variables. Everything else receives a settings object. Tests become easy, because you can build one with any values you like. Model names are settings too. When a vendor renames a model, you change an environment variable and not the code.",
        },
        {
          kind: "p",
          text: "Logs are one JSON object per line, written to stderr. A log search tool can parse that with no extra work. Stdout stays clean. In chapter 13 the MCP server talks to coding agents over stdout, and one stray log line there would corrupt the protocol.",
        },
        step("c12-s12", "Settings is the single class that reads the environment", "The starter shipped the config file. Compare yours with this listing. Every value has a default and an environment override. The retrieval settings live here too: candidates per retriever, the final top k, the rerank switch and the refusal threshold. So do the chunk size and overlap, counted in tokens.", { lang: "python", file: "src/askpep/config.py", code: K.config }),
        step("c12-s13", "The log formatter writes one JSON object per line to stderr", "The starter shipped the log formatter too. Compare it with this listing. Extra fields passed to a log call become keys in the JSON. That is how stage timings will appear in section eight.", { lang: "python", file: "src/askpep/logs.py", code: K.logs }),
        step("c12-s14", "A one-line check proves settings load from the environment", "Print four settings. They should match the defaults. If you changed a model in your env file, you will see your value instead.", { lang: "bash", code: K.checkConfig, expect: E.config }),
        step("c12-s15", "A second check proves the shape of a log line", "Emit one log line with an extra field. The timestamp will differ from the one shown.", { lang: "bash", code: K.checkLogs, expect: E.logs }),
        {
          kind: "fold",
          tone: "industry",
          title: "Hand-written logging versus a library",
          text: "Many teams use a structured logging library or OpenTelemetry instead of a hand-written formatter. The formatter here is about twenty lines and has no dependency, which is why the capstone uses it. Chapter 14 returns to observability and names the tools.",
        },
        {
          kind: "p",
          text: "The code can now find the database and report what it does. Next, the database needs tables to write into.",
        },
      ],
    },
    {
      id: "s4-schema",
      title: "The schema gives each retrieval path its own index",
      goal: "Which table, column and index serves each part of search?",
      blocks: [
        {
          kind: "p",
          text: "A **schema migration** is a numbered SQL file that changes the database's tables. Each one runs once, in order. Chapter 4 used migration for a move to a new embedding model. Here it means a change to the schema. Three plain migrations create everything AskPEP stores.",
        },
        {
          kind: "p",
          text: "The documents table is keyed by PEP number. That is a **natural key**, one that comes from the data itself, so re-ingesting a PEP always lands on the same row. The header fields, such as Status, sit beside it as JSON. The chunks table has a generated identity key, because chunks have no natural one.",
        },
        {
          kind: "p",
          text: "Two columns do the heavy lifting. The embedding column holds the dense vector. The tsv column holds a **tsvector**, which is Postgres's searchable form of a text: its words, reduced to their stems, with their positions. Postgres generates it from the text on every write, so you never keep two copies in sync by hand.",
        },
        step("c12-s16", "Migration one creates the documents and chunks tables", "The starter shipped all three migrations. Open the first and compare it with this listing. The embedding width is a template variable, so it matches your model. The foreign key's cascade deletes a document's chunks when the document is deleted, and ingestion relies on that. The two offset columns record which slice of the document each chunk is.", { lang: "sql", file: "src/askpep/migrations/001_documents_chunks.sql", code: K.mig1 }),
        {
          kind: "fold",
          tone: "trouble",
          title: "Changing the embedding dimension means a new database",
          text: "The vector column has a fixed width, set when the first migration runs. If you change the dimension later, inserts fail. The ingest hash notices and re-embeds, but the column cannot hold the new vectors. Remove the container and its volume, then migrate again. That deletes your data, so do it on a development database only.",
        },
        {
          kind: "p",
          text: "The second migration builds one index for each kind of search. The HNSW index is the layered graph from chapter 5. It finds near neighbours without scanning every row. It is built with an **operator class**, which names the distance the index serves. This one serves cosine distance.",
        },
        {
          kind: "p",
          text: "The operator class must match the query's operator, and the search in section nine orders by cosine distance. If they differed, Postgres could not use the index. It would fall back to a **sequential scan**, which reads every row. The answers would stay right, but slowly.",
        },
        {
          kind: "p",
          text: "GIN stands for generalised inverted index. The GIN index is an inverted index over the tsv column, the structure chapter 6 described. It maps each word to the chunks that contain it, as a BM25 engine does. It finds matches fast. It does not rank them. Ranking happens afterwards, on the rows it found.",
        },
        step("c12-s17", "Migration two builds the HNSW and GIN indexes on their own", "Open the second migration. Keeping the indexes in their own file lets you see what each one costs, and drop one without touching the tables.", { lang: "sql", file: "src/askpep/migrations/002_indexes.sql", code: K.mig2 }),
        {
          kind: "fold",
          tone: "hood",
          title: "HNSW build and search settings you did not set",
          text: "The pgvector documentation gives defaults of 16 for M and 64 for efConstruction, the build settings from chapter 5. At query time, efSearch defaults to 40. A query for more than 40 rows cannot get more from the index. AskPEP asks for 30. Check your version before raising that.",
        },
        step("c12-s18", "Migration three adds the traces table for later", "Open the third migration. Nothing writes to this table until section eight, but creating it now keeps the whole schema in one place.", { lang: "sql", file: "src/askpep/migrations/003_traces.sql", code: K.mig3 }),
        {
          kind: "p",
          text: "The migration runner is about twenty lines. It applies each missing file in filename order. Each file runs in its own transaction with its version record, so a failed file leaves nothing half-applied. Running it twice applies nothing the second time.",
        },
        step("c12-s19", "The migration runner applies each missing file in its own transaction", "The starter shipped the database helpers. Compare yours with this listing. The runner records applied versions in a table. The pool is created closed on purpose. It needs the vector extension, and the first migration creates it.", { lang: "python", file: "src/askpep/db.py", code: K.db }),
        step("c12-s20", "The package entry point imports the command line lazily", "The starter shipped the package init file. The main function is what the askpep script calls. Importing the command line inside the function keeps importing the package cheap. It also explains why the askpep command fails until the next step creates that file.", { lang: "python", file: "src/askpep/__init__.py", code: K.initPy }),
        step("c12-s21", "The command line starts with a single migrate command", "Create the command line file. The starter does not include it, so this file is new. Its open services helper builds the services, which section five describes, and opens the pool. So each later command is only a few lines.", { lang: "python", file: "src/askpep/cli.py", code: K.cli }),
        step("c12-s22", "Help lists the migrate command", "Check that the entry point reaches your command line. The output shown is the end of the help screen.", { lang: "bash", code: K.help, expect: E.help }),
        step("c12-s23", "Migrate applies all three files", "Run the migrations against the running database.", { lang: "bash", code: K.migrate, expect: E.migrate }),
        step("c12-s24", "Migrating again changes nothing", "Run it again. Nothing is left to apply. This is the property you want from every operation in this build.", { lang: "bash", code: K.migrate, expect: E.migrate2 }),
        step("c12-s25", "The database now has four tables", "List the tables. This runs inside the Docker container, and Docker was not run in the reference build, so your output may differ slightly.", { lang: "bash", code: K.tables, expect: E.tables }),
        step("c12-s26", "The chunks table has four indexes, two of them yours", "List the indexes on the chunks table. The primary key and the unique constraint made two of them. You made the HNSW and GIN ones. This is also Docker output, so it may differ slightly.", { lang: "bash", code: K.indexes, expect: E.indexes }),
        {
          kind: "widget",
          id: "c12-schema-explorer",
          intro: "Click through the columns of the chunks table, then match four queries to the structure that serves each one. Watch the delete by document. It uses an index you did not create on purpose.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Migration tools you would reach for",
          text: "Tools such as Alembic and Flyway add rollbacks, checksums and branch handling. This runner has no downgrade. For one service and one team it is enough. Move to a tool when two people change the schema on the same day.",
        },
        {
          kind: "quiz",
          id: "c12-q2",
          question: "The HNSW index uses the cosine operator class. What happens if a query orders by Euclidean distance instead?",
          options: [
            "Postgres cannot use that index, so it scans every row and still returns correct results.",
            "Postgres converts the distance on the fly and uses the index.",
            "The query fails with an error.",
            "The index returns approximate results with no warning.",
          ],
          answer: 0,
          explain: "An index only serves the operator it was built for. A different operator forces a sequential scan: exact, but slow.",
        },
        {
          kind: "p",
          text: "The tables exist, and they are empty. Filling them needs vectors, and vectors come from an outside service. So the next step puts each vendor behind an interface the code owns.",
        },
      ],
    },
    {
      id: "s5-providers",
      title: "Three small protocols keep vendors replaceable and tests offline",
      goal: "How do you call three vendors without tying the code or the tests to any of them?",
      blocks: [
        {
          kind: "p",
          text: "The code needs three outside services: an embedder, a reranker and a language model. Each hides behind a protocol, which chapter 4 described as a list of methods an object must have. Retrieval takes an Embedder. It does not know whether Voyage or a test double answers.",
        },
        {
          kind: "p",
          text: "This is dependency inversion at the one boundary where it pays. Swapping Voyage for OpenAI, Cohere or a local model means writing one class. Chapter 11 listed those alternatives. The cost is that a vendor feature outside the protocol makes you grow the protocol.",
        },
        {
          kind: "p",
          text: "The embed method takes an input type, either document or query. Chapter 4 explained why: many embedding models are trained asymmetrically, so they embed the two differently. Ingestion passes document and search passes query. Mixing them up does not crash. It quietly lowers retrieval quality, which is the worst kind of bug.",
        },
        {
          kind: "p",
          text: "Every HTTP call goes through one retry function. It retries rate limits, server errors and network failures, up to five tries in all. It waits one, two, four and then eight seconds, or as long as a Retry-After header asks.",
        },
        {
          kind: "p",
          text: "That is chapter 4's exponential backoff. It never retries a client error such as a 400, because the same bad request fails the same way.",
        },
        step("c12-s27", "The providers file holds the protocols, the retry function and the vendor clients", "Compare your providers file with the reference. You wrote the clients and the retry function across chapters 4, 7 and 8, so yours may differ in small ways. Read the retry function twice, because every outside call passes through it. The Voyage clients use raw httpx so you can see the whole request.", { lang: "python", file: "src/askpep/providers.py", code: K.providers }),
        step("c12-s28", "The fake providers make retrieval work offline, if crudely", "The starter shipped the fakes file. The fake embedder hashes each word into one dimension, so texts that share words get similar vectors. It is crude, and it is deterministic, which a real model API is not. That makes it the right tool for tests.", { lang: "python", file: "src/askpep/fakes.py", code: K.fakes }),
        step("c12-s29", "Services bundles the settings, the pool, the three providers and the store", "The starter shipped the services file. Every core function takes one Services argument. It builds the fake providers when providers is set to fake, and it holds the store that retrieval searches. Given a pool, it builds a PgStore. A test can pass a local store instead. This is a **composition root**, the one place that builds every object and wires them together. An injection framework would be overkill.", { lang: "python", file: "src/askpep/services.py", code: K.services }),
        step("c12-s30", "The lab tests already sit in tests/rag", "The starter copied every lab test into tests/rag. Each file covers one module, and each test name starts with its chapter and step. List the folder. The api and mcp files belong to chapter 13.", { lang: "bash", code: K.mkTests }),
        step("c12-s31", "Tests for the retry function run instantly with a mock transport", "Open the provider tests. They swap httpx's transport for a mock that answers from inside the test. They also pass in a fake sleep function, so no test touches the network or waits.", { lang: "python", file: "tests/rag/test_providers.py", code: K.testProviders }),
        step("c12-s32", "The provider tests pass", "Run the provider tests. One test calls the live Voyage API, and the default settings deselect it. The timing in your output will differ.", { lang: "bash", code: K.runProviders, expect: E.runProviders }),
        step("c12-s33", "The fake embedder returns unit vectors of the right width", "Embed one string and print the width and the squared length. A length near one means the vector is normalised, which is what cosine search wants.", { lang: "bash", code: K.checkFake, expect: E.checkFake }),
        {
          kind: "quiz",
          id: "c12-q3",
          question: "The retry function sees an HTTP 400 from the embedding API. What does it do?",
          options: [
            "Raises at once, because retrying the same bad request cannot succeed.",
            "Waits one second and tries again.",
            "Retries five times with backoff.",
            "Switches to the fake embedder.",
          ],
          answer: 0,
          explain: "Only rate limits, server errors and network failures are transient. A 400 means the request itself is wrong, and the test named a_client_error_is_not_retried proves it is not retried.",
        },
        {
          kind: "p",
          text: "The code can now embed text. Next you decide which text to embed, by cutting each PEP into chunks.",
        },
      ],
    },
    {
      id: "s6-chunking",
      title: "Chunking by document structure keeps each piece about one thing",
      goal: "How do you cut a PEP into chunks that each answer a question on their own?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 3 compared fixed-size, recursive and structure-aware chunking, and you built the structure-aware one. A PEP is structured text with a header block and underlined headings, so the capstone splits on that structure. Each chunk is about one subsection, so a retrieved chunk usually answers a question on its own.",
        },
        {
          kind: "p",
          text: "The splitter packs paragraphs into pieces of at most 400 tokens, which is 1600 characters at four characters per token. A longer paragraph breaks on sentence ends, then on lines, then on words. Each piece after the first repeats a tail of the previous piece, at most 50 tokens long. A sentence cut at the boundary is not lost.",
        },
        {
          kind: "p",
          text: "Each chunk keeps its heading path, the trail of section titles above it. The path is prepended to the embedded text. A short chunk under Maximum Line Length then carries the words PEP 8 and Code Lay-out into its vector. The stored text is an exact slice of the document, and only that slice reaches the full-text index.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Headings help the dense leg and mostly miss the sparse leg",
          text: "The heading path is not in the text index. The stored text holds a heading line only when the chunk opens that section, never the parent headings. A sparse query that matches only parent heading words finds nothing. The dense vector knows the whole path. Production systems often index headings too, with a higher weight.",
        },
        step("c12-s34", "The chunker finds the headings, splits long paragraphs and packs the pieces", "Compare your chunking file with the reference. It tracks heading levels by the same rule as docutils, the standard RST parser. It cuts long paragraphs on sentences, then lines, then words. It packs the pieces into chunks of at most 400 tokens, with an overlap. Each chunk is an exact slice of the text. The section splitter and the packer carry the logic.", { lang: "python", file: "src/askpep/chunking.py", code: K.chunking }),
        step("c12-s35", "Tests pin the heading levels, the size limit and the overlap", "Open the chunking tests. They cover each helper in turn, then whole documents. They pin the heading levels, the size limit, the overlap and the rule that a chunk is an exact slice of its document.", { lang: "python", file: "tests/rag/test_chunking.py", code: K.testChunking }),
        step("c12-s36", "The chunking tests pass", "Run them. These tests need no database.", { lang: "bash", code: K.runChunking, expect: E.runChunking }),
        step("c12-s37", "A real PEP splits into dozens of sectioned chunks", "Try the chunker on PEP 8, which chapter 2 saved in data/raw. The third chunk starts with its own heading lines, because a heading stays attached to the first paragraph under it. The chunk count changes if the PEP text changes.", { lang: "bash", code: K.curl, expect: E.curl }),
        {
          kind: "compare",
          caption: "Chunking choices in AskPEP and what you would swap in for other corpora.",
          columns: ["Decision", "AskPEP does", "Production swap"],
          rows: [
            ["Splitting", "Hand-written, follows the RST headings", "A library splitter or a semantic chunker when the corpus has no structure"],
            ["Parsing", "Plain Python over text files", "Docling, Unstructured or LlamaParse for PDFs and scans, from chapter 2"],
            ["Size and overlap", "400 tokens and 50 tokens, set once in settings", "Tuned against a golden set, as in chapter 9"],
            ["Context for small chunks", "Heading path added at embedding time", "Parent-child retrieval from chapter 3, or contextual retrieval from chapter 15"],
          ],
        },
        {
          kind: "quiz",
          id: "c12-q4",
          question: "AskPEP embeds the heading path plus the text, but stores only the text. Which consequence follows?",
          options: [
            "A sparse query that matches only parent heading words finds nothing, while the dense vector still knows the path.",
            "The dense leg can no longer find the chunk.",
            "The heading path is lost for citations.",
            "The stored text is twice as large.",
          ],
          answer: 0,
          explain: "The text index is generated from the stored text, which has no parent headings. The heading path is kept in its own column, so citations still work.",
        },
        {
          kind: "p",
          text: "You can cut one PEP into chunks. Next, ingestion does it for all 18 PEPs and stores the result.",
        },
      ],
    },
    {
      id: "s7-ingest",
      title: "Ingestion is safe to re-run because the hash covers the whole recipe",
      goal: "How do you make ingestion safe to run as often as you like?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 2 introduced idempotent ingestion, and chapter 10 tied it to freshness. This is the working version. For each PEP the code reads the text and computes its content hash. The hash covers the text and the **recipe**. The recipe is everything that shapes the vectors: the embedding model, the dimension, the chunk size and the overlap.",
        },
        {
          kind: "p",
          text: "If the stored hash matches, the document is skipped. Change the embedding model and every hash changes, so the next run re-embeds everything. Change nothing and the run embeds nothing. It still reads each PEP, because the hash needs the text.",
        },
        {
          kind: "p",
          text: "Order matters. The code embeds first, outside any transaction. Then it opens one transaction that upserts the document, deletes the old chunks and inserts the new ones. If Voyage fails halfway, the old chunks are untouched. If an insert fails, the transaction rolls back and the old chunks survive.",
        },
        {
          kind: "p",
          text: "The last statement prunes. It deletes any document whose id is no longer in the source list, and the cascade removes its chunks. That is how a withdrawn PEP truly disappears from search, which is the deletion problem from chapter 10. Ingesting an empty list raises an error, so a failed download cannot wipe the table.",
        },
        step("c12-s38", "The ingest function hashes, embeds, then replaces in one transaction", "Compare your ingest file with the reference. You wrote the parse functions in chapter 2. The starter shipped the hash and the ingest function. The fetch function is a parameter with a default. Tests pass in a dictionary lookup, so no test touches the network.", { lang: "python", file: "src/askpep/ingest.py", code: K.ingest }),
        step("c12-s39", "A tiny builder makes test objects readable", "Open the test helpers file. It builds real documents and chunks from a few arguments, and it touches no network.", { lang: "python", file: "tests/helpers.py", code: K.helpers }),
        step("c12-s40", "The svc fixture gives every test its own throwaway database", "Open the fixtures file. A pytest **fixture** is a function that builds what a test needs and cleans up afterwards. The root conftest loads every file in tests/plugins, so each course adds fixtures without editing it. The svc fixture creates a fresh database, runs the migrations and drops it afterwards. If Postgres is not reachable it skips the test. The local_svc fixture uses a local store and needs no database.", { lang: "python", file: "tests/plugins/rag.py", code: K.conftest }),
        step("c12-s41", "The ingest tests cover skip, replace, prune and a changed model", "Open the ingest tests. The parse tests are the ones you passed in chapter 2. The tests whose names start with test_ch12 are new. The first walks one document through every state, and the last proves that changing the embedding model forces a re-ingest. Three of them need Postgres.", { lang: "python", file: "tests/rag/test_ingest.py", code: K.testIngest }),
        step("c12-s42", "The ingest tests pass against a real Postgres", "Run them. They need the database from section two, and three of them skip without it. Docker was not run in the reference build, so the timing in your output may differ slightly.", { lang: "bash", code: K.runIngest, expect: E.runIngest }),
        step("c12-s43", "The ingest command wraps the function for the terminal", "Add the ingest command at the end of the command line file. It reads the PEP files from the corpus folder. The fetch flag downloads them instead. The store flag set to local writes a file and needs no database.", { lang: "python", file: "src/askpep/cli.py", code: K.cliIngest }),
        step("c12-s44", "The first ingest adds all 18 documents", "Run the real ingest. It reads the PEP files in data/raw, which chapter 2 saved. With no files there, it says so and exits. Add the fetch flag to download the PEPs instead. Embedding takes about a minute with live keys. The counts in your output are what to compare.", { lang: "bash", code: K.ingestCmd, expect: E.ingest1 }),
        step("c12-s45", "The second ingest skips all 18", "Run it again. Every hash matches, so nothing is re-embedded or written.", { lang: "bash", code: K.ingestCmd, expect: E.ingest2 }),
        step("c12-s46", "The database now holds the corpus", "Count the rows. The chunk count depends on the PEP text on the day you run it, and this is Docker output, so yours may differ slightly.", { lang: "bash", code: K.counts, expect: E.counts }),
        {
          kind: "callout",
          tone: "insight",
          title: "Delete and reinsert is simple, and it is not the cheapest",
          text: "When one paragraph in a long document changes, this code re-embeds the whole document. Production systems hash each chunk and re-embed only the changed ones. They also queue the work and send larger embedding batches. For 18 documents, the simple version wins.",
        },
        {
          kind: "quiz",
          id: "c12-q5",
          question: "Why does ingestion embed a document before it opens the database transaction?",
          options: [
            "A failed embedding call then leaves the old chunks untouched, and no transaction stays open during slow network calls.",
            "Postgres cannot embed inside a transaction.",
            "It makes the vectors more accurate.",
            "It lets the hash be computed from the vectors.",
          ],
          answer: 0,
          explain: "Embedding is a slow network call that can fail. Doing it first means the write transaction is short, and a failure changes nothing in the database.",
        },
        {
          kind: "p",
          text: "The corpus is in the database. Search will run five stages for every question. So before you write it, add a way to time each stage.",
        },
      ],
    },
    {
      id: "s8-tracing",
      title: "A trace per request costs a few lines and answers every later latency question",
      goal: "How will you know which stage of a request is slow?",
      blocks: [
        {
          kind: "p",
          text: "Observability starts now, before you need it. A trace, as chapter 10 put it, is the record of one request's path through the system. Here a Trace object lives for one request. A with block times each stage in milliseconds. Each timed stage is a simple span, with a name and a duration.",
        },
        {
          kind: "p",
          text: "At the end, the write method stores the timings in the traces table and logs them as one JSON line. The write is wrapped so that a failure is logged and swallowed. A broken trace table should never turn a good answer into a server error.",
        },
        {
          kind: "p",
          text: "Part 3, in chapter 14, uses these rows to answer three production questions. Chapter 10's latency budget is where the stage names pay off.",
        },
        step("c12-s47", "A Trace times named stages and never breaks the request", "The starter shipped the tracing file. Compare it with this listing. The stage method is a context manager, so any code can time itself with one extra line.", { lang: "python", file: "src/askpep/tracing.py", code: K.tracing }),
        step("c12-s48", "A quick run shows the timing in milliseconds", "Time a fifty millisecond sleep. The number in your output will be a little different, since the sleep and the timer both add overhead.", { lang: "bash", code: K.traceCheck, expect: E.traceCheck }),
        {
          kind: "fold",
          tone: "industry",
          title: "When a traces table stops being enough",
          text: "A table of timings is fine for one service. Tools such as Langfuse and Arize Phoenix add a trace viewer, prompt versions, cost tracking and evaluation hooks. OpenTelemetry carries traces across services. Adopt one when you need to browse traces, not only query them.",
        },
        {
          kind: "p",
          text: "Everything search needs is now in place: the rows, the vectors, the text index, the providers and the timer. Now you build search itself.",
        },
      ],
    },
    {
      id: "s9-retrieval",
      title: "Hybrid retrieval rewards agreement, so a chunk in both lists beats a lone first place",
      goal: "How does one question search two ways and come back as one ranked list?",
      blocks: [
        {
          kind: "p",
          text: "Now the heart of the chapter. A question runs two searches, the two legs of hybrid retrieval from chapter 6. Dense retrieval ranks chunks by cosine distance between the query vector and each chunk vector. Sparse retrieval ranks them with Postgres full-text search. Dense finds meaning, and sparse finds exact names.",
        },
        {
          kind: "p",
          text: "Reciprocal rank fusion, or RRF, merges the two lists, and you wrote it in chapter 6. A chunk scores one over sixty plus its rank in each list, and the scores add. It uses ranks only, so you never calibrate a cosine distance against a text score. The constant sixty is the default from chapter 6.",
        },
        {
          kind: "p",
          text: "One detail will bite you. Postgres turns the question into a text query with `websearch_to_tsquery`, which joins every word with AND. So a full question matches almost no chunk. The or_query helper joins the words with or instead, and every word becomes optional.",
        },
        {
          kind: "p",
          text: "Be honest about what the sparse leg is. Postgres ranks the matches with `ts_rank_cd`, which scores how many query words appear and how close together they sit. That is not BM25, because it does not weigh a word by how rare it is across the corpus. Chapter 6 built BM25 by hand to show the difference.",
        },
        {
          kind: "p",
          text: "Postgres is good enough for a first hybrid, and the swap to real BM25 is a known one. The table after the steps lists it.",
        },
        {
          kind: "p",
          text: "The retrieve function runs five timed stages: embed, dense, sparse, fuse and rerank. It takes 30 candidates from each leg, fuses them, reranks the top 30 and keeps 6. Fetching more than you keep is the rule from chapter 7. A small helper says to refuse when there are no hits or the best rerank score is under 0.2.",
        },
        {
          kind: "widget",
          id: "c12-hybrid-query",
          intro: "Predict which chunk ranks first after fusion, then run the four stages one at a time. Watch the fused list. The chunk that both lists rank high rises past the one that only the dense leg loves.",
        },
        step("c12-s49", "The retrieval file holds both searches, the fusion and the refusal rule", "Compare your retrieval file with the reference. You wrote the RRF function in chapter 6 and the rerank function in chapter 7. The starter shipped the Postgres store, the retrieve function and the traced search function. Read the dense and sparse queries first. Then find each timed stage in retrieve. Everything later calls the search function.", { lang: "python", file: "src/askpep/retrieval.py", code: K.retrieval }),
        step("c12-s50", "Unit tests pin the RRF arithmetic and the or query", "Open the retrieval tests. They check that agreement between lists wins, that the constant is sixty, and that every word in the query stays optional.", { lang: "python", file: "tests/rag/test_retrieval.py", code: K.testRetrieval }),
        step("c12-s51", "Search tests prove retrieval finds the right chunk and writes a trace", "Open the search tests. Most run over a local store, so they need no database. One uses Postgres to ingest two tiny documents, search, and read the trace row back to check that all five stages were timed. Another checks that Postgres and the local store return the same documents.", { lang: "python", file: "tests/rag/test_search.py", code: K.testSearch }),
        step("c12-s52", "The retrieval and search tests pass", "Run the retrieval and search tests. Two search tests need Postgres, so the timing may differ slightly from the reference. One live reranker test is deselected.", { lang: "bash", code: K.runSearchTests, expect: E.runSearchTests }),
        step("c12-s53", "A search command makes retrieval usable from the terminal", "Add the search command at the end of the command line file. It prints a rank, a fused or rerank score, the heading path and the first part of the text. The store flag picks Postgres or the local file.", { lang: "python", file: "src/askpep/cli.py", code: K.cliSearch }),
        step("c12-s54", "Searching for maximum line length finds PEP 8", "Run your first search. The reference output came from the fake providers over a local store, because the reference build had no pgvector Postgres. Live providers rank differently and score from zero to one by relevance.", { lang: "bash", code: K.search1, expect: E.search1 }),
        step("c12-s55", "A meaning-based question shows the limit of the fakes", "Ask about the walrus operator. The fake embedder only matches shared words, so this ranking is poor. Live Voyage vectors will rank differently, and you should judge them yourself.", { lang: "bash", code: K.search2, expect: E.search2 }),
        {
          kind: "compare",
          caption: "Each retrieval stage in AskPEP, the real alternatives and what switching costs.",
          columns: ["Stage", "AskPEP uses", "Switch to", "Cost"],
          rows: [
            ["Dense", "pgvector with HNSW", "Vertex AI Vector Search, Qdrant, Weaviate or Pinecone", "a second system to keep in sync"],
            ["Sparse", "Postgres full-text search", "ParadeDB pg_search or Elasticsearch BM25", "a new extension or cluster, for real BM25"],
            ["Fusion", "RRF with k at 60", "weighted fusion tuned on a golden set", "the evaluation work from chapter 9"],
            ["Rerank", "Voyage rerank", "Cohere Rerank or a cross-encoder you host", "a model to host, or another bill"],
          ],
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Filters and the HNSW index do not always mix",
          text: "Add a metadata filter to the dense query and pgvector post-filters by default. The index returns its candidates first, then the filter drops some, so you can get fewer rows than you asked for. Chapter 5's filter trap showed this. Iterative index scans, added in pgvector 0.8, keep searching until enough rows pass. AskPEP has no filters yet.",
        },
        {
          kind: "quiz",
          id: "c12-q6",
          question: "Chunk X is rank 2 in the dense list and rank 3 in the sparse list. What is its RRF score at k equal to 60?",
          options: [
            "1/62 plus 1/63, about 0.0320.",
            "1/60 plus 1/60, about 0.0333.",
            "2/60, about 0.0333.",
            "1/2 plus 1/3, about 0.8333.",
          ],
          answer: 0,
          explain: "Each list adds 1 over (60 plus the rank). Ranks 2 and 3 give 1/62 and 1/63. Raw scores from the two searches never enter the formula.",
        },
        {
          kind: "quiz",
          id: "c12-q7",
          question: "Why does the sparse leg join the query words with or before it calls websearch_to_tsquery?",
          options: [
            "The function ANDs every word, so a full question would match almost no chunk.",
            "Or queries run faster than and queries.",
            "Postgres rejects queries longer than three words.",
            "It stops the English stemmer from running.",
          ],
          answer: 0,
          explain: "With AND, one word missing from a chunk rules it out. With or, every chunk with any query word is a candidate, and ts_rank_cd orders them.",
        },
        {
          kind: "p",
          text: "Search now works from the terminal. One last section checks the whole build and gets you ready to defend it.",
        },
      ],
    },
    {
      id: "s10-ready",
      title: "Part 1 is done when four checks pass and you can defend four decisions",
      goal: "How do you know Part 1 is finished, and how do you defend its design?",
      blocks: [
        {
          kind: "p",
          text: "You now have a database with 18 PEPs, chunked, embedded and indexed, and a command that searches them. Before you move on, check the build. A broken Part 1 makes every step in chapter 13 harder to debug.",
        },
        {
          kind: "list",
          items: [
            "Migrate twice. The second run must print that it is up to date.",
            "Ingest twice. The second run must skip all 18 documents.",
            "Run the test files for chunking, providers, ingest and retrieval. All must pass.",
            "Search for maximum line length and see a PEP 8 chunk near the top.",
          ],
        },
        {
          kind: "p",
          text: "Then rehearse the four decisions behind the build. Each one has a cost, and a signal that would make you change it.",
        },
        {
          kind: "list",
          items: [
            "One Postgres holds the rows, the vectors and the text index, so ingestion is one transaction. Switch when filtered recall or scale outgrows pgvector.",
            "The content hash covers the whole recipe, so a model change re-embeds everything. Hash each chunk instead when re-embedding whole documents costs too much.",
            "Each vendor sits behind a protocol, so the tests run offline. Grow the protocol when you need a vendor feature it lacks.",
            "RRF fuses by rank, so no scores need calibrating. Switch to weighted fusion when a golden set shows it wins.",
          ],
        },
        {
          kind: "p",
          text: "The first decision comes up in interviews.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Be ready to defend pgvector with hybrid retrieval in one Postgres",
          text: "An interviewer will ask why you skipped a dedicated vector database. Answer with the constraints. One transaction covers rows and vectors, full-text search sits beside them, and the team already runs Postgres. Then name the switch signals: filtering that defeats the index, or scale beyond one node. Expect follow-ups on RRF and on re-embedding.",
        },
        {
          kind: "p",
          text: "Chapter 13 adds the rest of the serving path: generation with citations and refusal, a streaming FastAPI service, a chat page and an MCP server. It reuses the search function you just wrote, unchanged.",
        },
      ],
    },
  ],
  recap: [
    "One Postgres database with pgvector holds the rows, the vectors, the full-text index and the traces, so ingestion can replace a document in one transaction.",
    "Each retrieval path gets its own index. HNSW serves cosine distance, GIN serves full-text search, and a query only uses the index built for its operator.",
    "Ingestion hashes the text and the whole recipe, embeds before opening a transaction, and prunes documents that left the source list.",
    "Reciprocal rank fusion at k equal to 60 merges the lists by rank. A chunk that both lists rank high beats a lone first place.",
    "Every outside service sits behind a small protocol, which is what keeps vendors replaceable and tests offline.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the capstone core build I learned that retrieval is small, replaceable parts around one transactional store. Ingestion is idempotent and rank fusion merges the lists. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q11", "rag-q12", "rag-q13", "rag-q15", "rag-q16"],
};

export default chapter;
