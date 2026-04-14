import sys
import json
import re
from docling.document_converter import DocumentConverter

def extrair_issn(caminho_pdf):
    try:
        converter = DocumentConverter()
        result = converter.convert(caminho_pdf)
        # Exporta para markdown para facilitar a busca via Regex
        texto = result.document.export_to_markdown()
        
        # Regex para ISSN (0000-0000)
        padrao_issn = r"\d{4}-\d{3}[\dX]"
        issns = re.findall(padrao_issn, texto)
        
        if issns:
            return {"status": "sucesso", "issn": issns[0]}
        return {"status": "erro", "mensagem": "ISSN nao encontrado."}
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(json.dumps(extrair_issn(sys.argv[1])))