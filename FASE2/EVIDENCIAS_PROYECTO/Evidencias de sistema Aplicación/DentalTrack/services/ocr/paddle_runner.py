"""Read image bytes from stdin and return text and geometry."""
import contextlib
import json
import os
from pathlib import Path
import sys

os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
os.environ.setdefault('PADDLE_PDX_CACHE_HOME', str(Path('tmp/real-ocr/models').resolve()))

with contextlib.redirect_stdout(sys.stderr):
    import cv2
    import numpy as np
    from PIL import Image
    from io import BytesIO
    from paddleocr import PaddleOCR

    data = sys.stdin.buffer.read(8 * 1024 * 1024 + 1)
    if not data or len(data) > 8 * 1024 * 1024:
        raise ValueError('Invalid image size')
    with Image.open(BytesIO(data)) as metadata:
        if metadata.width * metadata.height > 20_000_000:
            raise ValueError('Image resolution exceeds limit')
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('Invalid image')
    scale = min(2, 1800 / image.shape[1])
    if scale > 1:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    pipeline = PaddleOCR(
        text_detection_model_name='PP-OCRv5_mobile_det',
        text_recognition_model_name='latin_PP-OCRv5_mobile_rec',
        use_doc_orientation_classify=False, use_doc_unwarping=False,
        use_textline_orientation=False, enable_mkldnn=False, device='cpu',
        text_det_limit_side_len=1800, text_det_limit_type='max',
    )
    prediction = list(pipeline.predict(image))[0].json
    result = prediction.get('res', prediction)

height, width = image.shape[:2]
lines = []
for text, box, score in zip(result['rec_texts'], result['rec_polys'], result['rec_scores']):
    if not text.strip():
        continue
    xs = [point[0] / width for point in box]
    ys = [point[1] / height for point in box]
    lines.append(dict(text=text, x=sum(xs) / 4, y=sum(ys) / 4,
                      left=min(xs), right=max(xs), top=min(ys), bottom=max(ys), score=score))
print(json.dumps(dict(text='\n'.join(line['text'] for line in lines), lines=lines,
                     engine='paddleocr-v5-latin'), ensure_ascii=False))
