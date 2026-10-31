# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import copy_metadata, collect_data_files, collect_submodules
import os

datas = []

# ── Metadados de pacotes (necessário para docling.datamodel.document.DoclingVersion) ──
metadata_pkgs = [
    'docling', 'docling_core', 'docling_ibm_models', 'docling_parse',
    'pydantic', 'pydantic_core', 'pydantic_settings',
    'tqdm', 'transformers', 'huggingface_hub', 'accelerate',
    'torchvision', 'rapidocr',
]
for pkg in metadata_pkgs:
    try:
        datas += copy_metadata(pkg)
    except Exception:
        pass

# ── Arquivos de dados dos pacotes ──
for pkg in ['docling', 'docling_core', 'docling_ibm_models', 'docling_parse', 'rapidocr']:
    try:
        datas += collect_data_files(pkg)
    except Exception:
        pass

# ── Banco de dados Qualis (CSV) ──
qualis_csv = os.path.join(os.path.dirname(os.path.abspath(SPEC)), '..', 'data', 'qualis.csv')
qualis_csv = os.path.normpath(qualis_csv)
if os.path.exists(qualis_csv):
    datas.append((qualis_csv, '.'))
    print(f"[SPEC] Incluindo qualis.csv: {qualis_csv}")
else:
    print(f"[SPEC] AVISO: qualis.csv não encontrado em: {qualis_csv}")

# ── Hidden imports ──
hiddenimports = []
for pkg in ['docling', 'docling_core', 'docling_ibm_models', 'docling_parse', 'rapidocr']:
    try:
        hiddenimports += collect_submodules(pkg)
    except Exception:
        pass

a = Analysis(
    ['processor.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='processor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
