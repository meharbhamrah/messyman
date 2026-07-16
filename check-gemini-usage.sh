#!/bin/bash
echo "Checking Gemini API usage..."
echo "Your daily request count:"
gcloud services describe generativelanguage.googleapis.com --project=$(gcloud config get-value project) --format="value(config.usage)"
