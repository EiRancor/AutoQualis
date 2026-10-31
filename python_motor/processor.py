import sys
import json
import re
import os
import csv
import datetime
from docling.document_converter import DocumentConverter

# Caminho do CSV Qualis — funciona tanto em dev quanto no executável PyInstaller
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

QUALIS_CSV = os.path.join(BASE_DIR, 'qualis.csv')


def log(mensagem: str):
    """Emite uma linha de log no stderr para a interface capturar em tempo real."""
    agora = datetime.datetime.now().strftime('%H:%M:%S')
    print(f"LOG|{agora}|{mensagem}", file=sys.stderr, flush=True)


def extrair_issns(texto: str) -> list[str]:
    """Extrai todos os ISSNs únicos do texto, priorizando os precedidos pelo termo ISSN."""
    padrao_prefixado = r'(?:ISSN|eISSN|pISSN|e-ISSN|p-ISSN)[:\s]+(\d{4}-\d{3}[\dXx])'
    padrao_generico  = r'\b(\d{4}-\d{3}[\dXx])\b'

    issns_pref = re.findall(padrao_prefixado, texto, re.IGNORECASE)
    issns_gen  = re.findall(padrao_generico, texto)

    # Remove falsos positivos comuns (ex: anos com hífen)
    def valido(issn):
        issn = issn.upper()
        parte1, parte2 = issn.split('-')
        if parte1 in ('1900', '2000', '2024', '2025', '2026'):
            return False
        return True

    vistos = set()
    resultado = []
    for issn in (issns_pref + issns_gen):
        issn = issn.upper()
        if issn not in vistos and valido(issn):
            vistos.add(issn)
            resultado.append(issn)

    return resultado


def consultar_qualis(issn: str) -> list[dict]:
    """Consulta o CSV Qualis e retorna todas as classificações para o ISSN."""
    if not os.path.exists(QUALIS_CSV):
        return []

    issn_norm = issn.upper().strip()
    resultados = []
    with open(QUALIS_CSV, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row.get('ISSN', '').strip().upper() == issn_norm:
                resultados.append({
                    'area':       row.get('Area', '').strip(),
                    'estrato':    row.get('Estrato', '').strip(),
                    'titulo':     row.get('Titulo', '').strip(),
                    'quadrienio': row.get('Quadrienio', '').strip(),
                })
    return resultados


def analisar_pdf(caminho_pdf: str) -> dict:
    """Fluxo principal: extrai ISSN e consulta Qualis, emitindo logs no stderr."""
    log("Iniciando análise do PDF...")

    if not os.path.exists(caminho_pdf):
        return {"status": "erro", "mensagem": "Arquivo não encontrado."}

    log("Carregando motor Docling...")
    try:
        converter = DocumentConverter()
        log("Motor carregado. Convertendo documento...")
        result = converter.convert(caminho_pdf)
        texto = result.document.export_to_markdown()
        log(f"Texto extraído com sucesso ({len(texto)} caracteres).")
    except Exception as e:
        return {"status": "erro", "mensagem": f"Erro ao processar PDF: {str(e)}"}

    log("Buscando ISSN no texto...")
    issns = extrair_issns(texto)

    if not issns:
        log("Nenhum ISSN encontrado no documento.")
        return {"status": "erro", "mensagem": "ISSN não encontrado no documento."}

    issn_principal = issns[0]
    log(f"ISSN encontrado: {issn_principal}" + (f" (+{len(issns)-1} alternativo(s))" if len(issns) > 1 else ""))

    log("Consultando banco de dados Qualis (Ciência da Computação)...")
    classificacoes = consultar_qualis(issn_principal)

    # Tenta ISSNs alternativos se o principal não tiver classificação
    if not classificacoes and len(issns) > 1:
        for issn_alt in issns[1:]:
            log(f"ISSN principal sem resultado. Tentando alternativo: {issn_alt}")
            classificacoes = consultar_qualis(issn_alt)
            if classificacoes:
                issn_principal = issn_alt
                break

    if classificacoes:
        log(f"✔ {len(classificacoes)} classificação(ões) encontrada(s) para {issn_principal}.")
    else:
        log(f"Periódico com ISSN {issn_principal} não encontrado na base Qualis atual.")

    return {
        "status": "sucesso",
        "issn": issn_principal,
        "issns_encontrados": issns,
        "qualis": classificacoes,
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        resultado = analisar_pdf(sys.argv[1])
        print(json.dumps(resultado, ensure_ascii=False))
    else:
        print(json.dumps({"status": "erro", "mensagem": "Nenhum arquivo informado."}))
