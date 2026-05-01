#!/bin/bash
echo "Testing POST /chat through Gateway (Port 8000)"
curl -s -X POST "http://127.0.0.1:8000/chat" -H "Content-Type: application/json" -d '{"message":"What are the trending products?"}'
echo -e "\n"
