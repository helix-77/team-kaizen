#!/bin/bash
while IFS= read -r line; do
  if [[ $line =~ ^curl ]]; then
    echo "Running: $line"
    eval "$line"
    echo -e "\n-----------------------------------\n"
    sleep 1
  fi
done < chat-test-suite.txt
