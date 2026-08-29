#!/bin/bash

# 1. Navigate into the backend directory
cd backend

# 2. Check if the local virtual environment or binary path exists, then run production server
if [ -f "/root/.venv/bin/uvicorn" ]; then
    /root/.venv/bin/uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
else
    # Fallback to global uvicorn if path differs
    uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
fi
