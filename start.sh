#!/bin/bash
# Initialize database
python - <<EOF
from app import init_database
init_database()
EOF

# Start gunicorn
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
