#!/bin/bash
curl -s -X POST "http://127.0.0.1:8004/chat" -H "Content-Type: application/json" -d '{"message":"Which category had the most rentals?"}'
