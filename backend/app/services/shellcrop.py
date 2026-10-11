# ABOUTME: Crops a turtle photo to the shell from a 0..1000 bounding box.
# ABOUTME: "crop" = box + 5% margin; "tight" = central 1/sqrt(2) of the box (all shell).

from PIL import Image

# The largest rectangle inscribed in an ellipse keeps 1/sqrt(2) of each side.
MARGINS = {"crop": 0.05, "tight": -(1 - 2**-0.5) / 2}


def crop_to_box(img: Image.Image, box, margin: float) -> Image.Image:
    y0, x0, y1, x1 = box
    w, h = img.size
    pad_x, pad_y = (x1 - x0) * margin, (y1 - y0) * margin
    left = max(0, (x0 - pad_x) / 1000 * w)
    top = max(0, (y0 - pad_y) / 1000 * h)
    right = min(w, (x1 + pad_x) / 1000 * w)
    bottom = min(h, (y1 + pad_y) / 1000 * h)
    return img.crop((round(left), round(top), round(right), round(bottom)))


def crops(img: Image.Image, box) -> dict[str, Image.Image]:
    """Both crop variants; the full frame for each when there is no box."""
    return {v: (crop_to_box(img, box, m) if box else img) for v, m in MARGINS.items()}
