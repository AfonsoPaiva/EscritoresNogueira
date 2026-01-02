#!/bin/sh

# Load environment variables from .env file if it exists
if [ -f /secrets/.env ]; then
    echo "Loading environment variables from /secrets/.env"
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        case "$key" in
            '#'*) continue ;;
            '') continue ;;
        esac
        
        # Remove potential carriage return from Windows-style line endings
        value=$(echo "$value" | tr -d '\r')
        key=$(echo "$key" | tr -d '\r')
        
        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        if [ -n "$key" ]; then
            export "$key=$value"
        fi
    done < /secrets/.env
fi

# Run the Java application
exec java -jar /opt/app/app.jar
