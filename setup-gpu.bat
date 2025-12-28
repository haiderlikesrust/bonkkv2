@echo off
REM Setup script for GPU-accelerated vanity mint generation (Windows)
REM For RTX 4070 with CUDA support

echo 🚀 Setting up GPU acceleration for vanity mint generation...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    exit /b 1
)

echo ✅ Python found
python --version

REM Check CUDA
nvcc --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  CUDA compiler (nvcc) not found in PATH
    echo    Make sure CUDA Toolkit is installed
    echo    Download from: https://developer.nvidia.com/cuda-downloads
)

REM Install Python dependencies
echo.
echo 📦 Installing Python dependencies...
pip install pycuda numpy pynacl base58
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo    Try: pip install --user pycuda numpy pynacl base58
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo To generate vanity mints with GPU acceleration:
echo   npm run vanity-mints-cuda
echo.
echo Or run Python directly:
echo   python generate-vanity-mints-cuda.py

