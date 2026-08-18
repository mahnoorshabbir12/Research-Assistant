import os
from typing import Dict, Any, List
from langchain_community.document_loaders import Docx2txtLoader, TextLoader
from unstructured.partition.pdf import partition_pdf
import markdownify

async def process_uploaded_file(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Parses an uploaded file and returns its extracted text and metadata.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        elements_data = []
        page_count = 1
        
        if ext == '.pdf':
            # Use unstructured for PDF with high resolution to get tables
            elements = partition_pdf(
                filename=file_path,
                strategy="hi_res",
                infer_table_structure=True
            )
            
            pages = set()
            for el in elements:
                if hasattr(el.metadata, 'page_number') and el.metadata.page_number:
                    pages.add(el.metadata.page_number)
                
                content_type = "text"
                text_content = str(el)
                
                # Identify if content is OCR'd by checking detection_origin
                if hasattr(el.metadata, 'detection_origin') and el.metadata.detection_origin:
                    if 'ocr' in el.metadata.detection_origin.lower() or 'tesseract' in el.metadata.detection_origin.lower():
                        content_type = "ocr"
                
                if "Table" in str(type(el)):
                    content_type = "table"
                    if hasattr(el.metadata, 'text_as_html') and el.metadata.text_as_html:
                        text_content = markdownify.markdownify(el.metadata.text_as_html).strip()
                        
                if text_content.strip():
                    elements_data.append({
                        "content": text_content,
                        "metadata": {
                            "content_type": content_type
                        }
                    })
            page_count = len(pages) if pages else 1
            
        elif ext == '.docx':
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
            for doc in docs:
                elements_data.append({"content": doc.page_content, "metadata": {"content_type": "text"}})
        elif ext == '.txt':
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
            for doc in docs:
                elements_data.append({"content": doc.page_content, "metadata": {"content_type": "text"}})
        else:
            raise ValueError(f"Unsupported file type: {ext}")
            
        full_text = "\n\n".join([el["content"] for el in elements_data])
        
        metadata = {
            "filename": filename,
            "type": ext.replace('.', '').upper(),
            "pages": page_count,
            "character_count": len(full_text)
        }
        
        return {
            "content": full_text,
            "elements": elements_data,
            "metadata": metadata
        }
    except Exception as e:
        raise RuntimeError(f"Error processing document: {str(e)}")
