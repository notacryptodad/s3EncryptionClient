#!/bin/bash

npm install --save-dev rimraf @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint

# Exit on error
set -e
# Print commands
set -x
# Clean dist directory
npm run clean
# Run linting
npm run lint
# Run tests
npm run test
# Build TypeScript
npm run build
# Show contents of dist directory
ls -la ../dist/
echo "Build completed successfully!"