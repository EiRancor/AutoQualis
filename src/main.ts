import { open } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell'; // Importação necessária

const btnSelecionar = document.querySelector('#btn-selecionar');
const filePathDisplay = document.querySelector('#file-path');
const resultContainer = document.querySelector('#result-container');
const resultContent = document.querySelector('#resultado-content');

btnSelecionar?.addEventListener('click', async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Artigo Científico', extensions: ['pdf'] }]
    });

    if (selected && typeof selected === 'string') {
      filePathDisplay!.textContent = `Processando: ${selected.split('\\').pop()}...`;
      
      // CHAMA O MOTOR PYTHON REAL
      const command = Command.sidecar('bin/processor', [selected]);
      const output = await command.execute();

      if (output.code === 0) {
        const dados = JSON.parse(output.stdout);
        
        resultContainer?.classList.remove('hidden');
        if (dados.status === "sucesso") {
          resultContent!.innerHTML = `
            <p style="color: #4CAF50;">✔ ISSN Extraído</p>
            <p><strong>ISSN:</strong> ${dados.issn}</p>
            <p><small>Motor: Docling (Offline)</small></p>
          `;
        } else {
          resultContent!.innerHTML = `<p style="color: #ff5555;">Erro: ${dados.mensagem}</p>`;
        }
      } else {
        console.error("Erro no Sidecar:", output.stderr);
        alert("O motor de extração falhou.");
      }
    }
  } catch (err) {
    console.error("Erro na interface:", err);
  }
});