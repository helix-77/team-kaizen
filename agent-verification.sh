#!/bin/bash
echo "Test 1: Availability"
curl -s -X POST "http://127.0.0.1:8004/chat" -H "Content-Type: application/json" -d '{"message":"Is product 42 available?"}'
echo -e "\n-------------------\n"

echo "Test 2: Surge"
curl -s -X POST "http://127.0.0.1:8004/chat" -H "Content-Type: application/json" -d '{"message":"Tell me about the busy days this month."}'
echo -e "\n-------------------\n"

echo "Test 3: Discounts"
curl -s -X POST "http://127.0.0.1:8004/chat" -H "Content-Type: application/json" -d '{"message":"What is the discount for user 42?"}'
echo -e "\n"

echo "Test 4:Multiple"
curl -s -X POST "http://127.0.0.1:8004/chat" -H "Content-Type: application/json" -d '{"message":"Give me trending recommendations and check the discount for user 42"}'
echo -e "\n"