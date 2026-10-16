# Notebooks

## movies_distribution.ipynb

Plots movie release decade and runtime distributions via the Cinémathèque HTTP API.

### Prerequisites

- Backend reachable (`GET /api/movies` must return `year` and `length`)
- `API_URL` in `.env` or `notebooks/.env` (overrides), or `API_PORT` (default `8000`)
- No PostgreSQL access, no Django setup, no `API_WRITE_KEY` (read-only)

### Setup

```bash
cd notebooks
uv sync
uv run python -m ipykernel install --user --name notebooks --display-name "notebooks"
```

### Run

Open `notebooks/movies_distribution.ipynb` in Cursor/VS Code.

The kernel picker does not list a nested `.venv` the same way as a root one. Choose **Select Another Kernel… → Jupyter Kernel → notebooks**.

If **notebooks** is missing, pick **Select Another Kernel… → Python Environments → Enter interpreter path…** and set:

`notebooks/.venv/bin/python`

Then reload the window if the picker is stale.

### Missing length data

If most movies have no `length`, probe video files on the server:

```bash
cd backend
uv run manage.py sync_drive --movies --with-length
```
