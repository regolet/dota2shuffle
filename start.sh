#!/bin/bash
# Initialize database
python - <<EOF
from app import init_database
init_database()
EOF

# Start gunicorn with threading worker for WebSocket support
exec gunicorn --worker-class gthread --workers 1 --threads 100 --bind 0.0.0.0:$PORT app:app
