# AutoQualis 🎓

O **AutoQualis** é uma ferramenta de automação voltada para a gestão acadêmica, desenvolvida para facilitar a identificação de artigos científicos e a consulta de seus respectivos extratos Qualis. 

O projeto utiliza uma arquitetura híbrida de alta performance, combinando **Rust (Tauri)** para a interface e segurança, com um motor de inteligência artificial em **Python (IBM Docling)** para o processamento de documentos.

## ✨ Diferenciais
* **Privacidade Total:** Processamento 100% offline (Digital Bunker). Nenhum PDF é enviado para a nuvem.
* **Extração Robusta:** Utiliza o motor **IBM Docling** para identificar ISSNs mesmo em PDFs com layouts complexos ou digitalizações.
* **Leveza no Frontend:** Interface construída com Tauri, resultando em um consumo mínimo de memória RAM.

## 🛠️ Tecnologias
- **Frontend:** [Tauri](https://tauri.app/), TypeScript, Vite.
- **Backend:** [Rust](https://www.rust-lang.org/).
- **Motor de IA:** Python 3.12 + [IBM Docling](https://github.com/DS4SD/docling).
- **Runtime:** [Bun](https://bun.sh/).

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js / Bun
- Rust (Cargo)
- Python 3.12+

### Configuração do Ambiente
1.  **Instale as dependências do frontend:**
    ```bash
    bun install
    ```

2.  **Prepare o Motor Python (Sidecar):**
    Entre na pasta `python_motor/`, crie um ambiente virtual e instale as dependências:
    ```bash
    pip install docling pyinstaller
    ```
    Gere o executável para o Sidecar:
    ```bash
    pyinstaller --onefile processor.py
    ```
    *Nota: O binário gerado deve ser movido para `src-tauri/bin/` com a nomenclatura correta para sua arquitetura (ex: `processor-x86_64-pc-windows-msvc.exe`).*

3.  **Inicie o aplicativo em modo de desenvolvimento:**
    ```bash
    bun tauri dev
    ```

## 📄 Licença
Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido por **Emerson Rancor** – Estudante de Ciência da Computação (UNEMAT).
