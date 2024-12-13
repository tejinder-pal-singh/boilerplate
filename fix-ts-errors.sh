#!/bin/bash

# Function to fix TypeScript errors in a file
fix_file() {
    local file=$1
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Read the file line by line
    while IFS= read -r line; do
        # Fix React component declarations
        if [[ $line =~ ^export[[:space:]]+const[[:space:]]+([A-Za-z]+):[[:space:]]*React\.FC ]]; then
            echo "$line" >> "$temp_file"
        elif [[ $line =~ ^export[[:space:]]+function[[:space:]]+([A-Za-z]+)\({ ]]; then
            component_name="${BASH_REMATCH[1]}"
            echo "export const $component_name: React.FC<{" >> "$temp_file"
        # Fix component props closing
        elif [[ $line =~ ^\}\)\s*\{ ]]; then
            echo "}> = ({ children, ...props }) => {" >> "$temp_file"
        # Fix return statement with JSX
        elif [[ $line =~ ^[[:space:]]*return[[:space:]]*\([[:space:]]*$ ]]; then
            echo "$line" >> "$temp_file"
        # Fix component type declarations
        elif [[ $line =~ ^export[[:space:]]+const[[:space:]]+([A-Za-z]+)[[:space:]]*=[[:space:]]*\({ ]]; then
            component_name="${BASH_REMATCH[1]}"
            echo "export const $component_name: React.FC<{" >> "$temp_file"
        else
            echo "$line" >> "$temp_file"
        fi
    done < "$file"
    
    # Replace original file with fixed version
    mv "$temp_file" "$file"
}

# Find all TypeScript files in packages directory
find packages -name "*.ts" -type f | while read -r file; do
    if grep -q "React" "$file"; then
        echo "Fixing React components in $file..."
        fix_file "$file"
    fi
done
