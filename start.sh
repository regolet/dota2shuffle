#!/bin/bash
# Initialize database
python - <<EOF
from app import init_database
init_database()
EOF

# Start gunicorn with gevent worker
exec gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:$PORT app:app
