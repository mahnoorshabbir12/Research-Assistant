# 001. Multimodal Document Ingestion
Date: 2026-08-18
Status: accepted

## Context
Standard PDF parsers (like PyPDF2) extract text sequentially but completely fail on scanned images (OCR) and destroy the structure of tabular data, rendering it useless for LLM ingestion. We needed a way to extract complex tables and image-only pages.

## Decision
We implemented the `unstructured` library using the `hi_res` strategy, alongside `markdownify`.
1. `unstructured` uses layout models (Detectron2/YOLOX) and Tesseract OCR to find bounding boxes, identifying whether an element is text, a table, or an image.
2. We then convert the HTML table representation from `unstructured` into Markdown using `markdownify` to preserve rows/columns for the LLM.

## Alternatives
- **Standard PyPDF2 / pdfplumber:** Rejected because they silently drop images and flatten tables into unreadable text runs.
- **Vision-Language Models (GPT-4o Vision) per page:** Rejected due to excessive API cost and latency for massive documents.

## Consequences
- **Pros:** Highly accurate document reconstruction; no data is silently lost.
- **Cons:** The `hi_res` strategy requires heavy local dependencies (Poppler, Tesseract, PyTorch, OpenCV) and significantly increases ingestion time (compute-heavy).
