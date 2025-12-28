#!/bin/bash
# Setup script for GPU-accelerated vanity mint generation
# For RTX 4070 with CUDA support

echo "🚀 Setting up GPU acceleration for vanity mint generation..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check CUDA
if ! command -v nvcc &> /dev/null; then
    echo "⚠️  CUDA compiler (nvcc) not found in PATH"
    echo "   Make sure CUDA Toolkit is installed"
    echo "   Download from: https://developer.nvidia.com/cuda-downloads"
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install pycuda numpy pynacl base58 || {
    echo "❌ Failed to install dependencies"
    echo "   Try: pip3 install --user pycuda numpy pynacl base58"
    exit 1
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "To generate vanity mints with GPU acceleration:"
echo "  npm run vanity-mints-cuda"
echo ""
echo "Or run Python directly:"
echo "  python3 generate-vanity-mints-cuda.py"

