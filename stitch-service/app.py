import os
import subprocess
import tempfile
import uuid
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

app = FastAPI(title="Space Clone Stitch Service")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/stitch")
async def stitch_photos(files: list[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(400, "At least 2 images required")

    work_dir = Path(tempfile.mkdtemp())
    image_paths: list[Path] = []

    try:
        for i, f in enumerate(files):
            ext = Path(f.filename or f"img_{i}.jpg").suffix or ".jpg"
            path = work_dir / f"img_{i:02d}{ext}"
            content = await f.read()
            path.write_bytes(content)
            image_paths.append(path)

        output_path = work_dir / "panorama.jpg"

        # Try Hugin first, fallback to OpenCV
        success = _stitch_hugin(image_paths, output_path, work_dir)
        if not success:
            success = _stitch_opencv(image_paths, output_path)

        if not success:
            raise HTTPException(500, "Stitching failed with both Hugin and OpenCV")

        return FileResponse(
            str(output_path),
            media_type="image/jpeg",
            filename=f"panorama_{uuid.uuid4().hex[:8]}.jpg",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Stitching error: {str(e)}")


def _stitch_hugin(
    image_paths: list[Path], output_path: Path, work_dir: Path
) -> bool:
    try:
        pto_file = work_dir / "project.pto"

        # Generate PTO project file
        cmd_gen = ["pto_gen", "-o", str(pto_file)] + [str(p) for p in image_paths]
        subprocess.run(cmd_gen, check=True, capture_output=True, timeout=30)

        # Find control points
        subprocess.run(
            ["cpfind", "--multirow", "-o", str(pto_file), str(pto_file)],
            check=True, capture_output=True, timeout=120,
        )

        # Clean control points
        subprocess.run(
            ["cpclean", "-o", str(pto_file), str(pto_file)],
            check=True, capture_output=True, timeout=30,
        )

        # Optimize
        subprocess.run(
            ["autooptimiser", "-a", "-l", "-s", "-o", str(pto_file), str(pto_file)],
            check=True, capture_output=True, timeout=60,
        )

        # Set output to equirectangular
        subprocess.run(
            ["pano_modify", "--projection=2", "--fov=360x180", "-o", str(pto_file), str(pto_file)],
            check=True, capture_output=True, timeout=30,
        )

        # Render
        prefix = work_dir / "output"
        subprocess.run(
            ["nona", "-o", str(prefix), str(pto_file)],
            check=True, capture_output=True, timeout=120,
        )

        # Blend
        tiff_files = sorted(work_dir.glob("output*.tif"))
        if not tiff_files:
            return False

        blended = work_dir / "blended.tif"
        subprocess.run(
            ["enblend", "-o", str(blended)] + [str(f) for f in tiff_files],
            check=True, capture_output=True, timeout=120,
        )

        # Convert to JPEG
        img = cv2.imread(str(blended))
        if img is None:
            return False
        cv2.imwrite(str(output_path), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return True

    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _stitch_opencv(image_paths: list[Path], output_path: Path) -> bool:
    try:
        images = []
        for p in image_paths:
            img = cv2.imread(str(p))
            if img is not None:
                images.append(img)

        if len(images) < 2:
            return False

        stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
        status, pano = stitcher.stitch(images)

        if status != cv2.Stitcher_OK:
            return False

        cv2.imwrite(str(output_path), pano, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return True

    except Exception:
        return False
