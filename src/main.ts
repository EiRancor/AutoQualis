import { open } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell';

// ── Elementos da interface ──────────────────────────────────────────────────
const btnSelecionar    = document.querySelector<HTMLButtonElement>('#btn-selecionar')!;
const filePathDisplay  = document.querySelector<HTMLParagraphElement>('#file-path')!;
const resultContainer  = document.querySelector<HTMLDivElement>('#result-container')!;
const resultIcon       = document.querySelector<HTMLSpanElement>('#result-icon')!;
const resultTitle      = document.querySelector<HTMLHeadingElement>('#result-title')!;
const issnInfo         = document.querySelector<HTMLDivElement>('#issn-info')!;
const issnValor        = document.querySelector<HTMLSpanElement>('#issn-valor')!;
const tituloInfo       = document.querySelector<HTMLDivElement>('#titulo-info')!;
const tituloValor      = document.querySelector<HTMLSpanElement>('#titulo-valor')!;
const qualisGrid       = document.querySelector<HTMLDivElement>('#qualis-grid')!;
const resultError      = document.querySelector<HTMLParagraphElement>('#result-error')!;

// ── Painel de Log ───────────────────────────────────────────────────────────
const logPanel  = document.querySelector<HTMLDivElement>('#log-panel')!;
const logBody   = document.querySelector<HTMLDivElement>('#log-body')!;
const logToggle = document.querySelector<HTMLButtonElement>('#log-toggle')!;
const logClear  = document.querySelector<HTMLButtonElement>('#log-clear')!;
const logHeader = document.querySelector<HTMLDivElement>('.log-header')!;

function adicionarLog(mensagem: string, hora?: string, tipo: 'ok' | 'err' | 'normal' = 'normal') {
  const hint = logBody.querySelector('.log-hint');
  if (hint) hint.remove();

  const linha = document.createElement('div');
  linha.className = 'log-line';

  const msgClass = tipo === 'ok' ? 'ok' : tipo === 'err' ? 'err' : '';

  linha.innerHTML = `
    <span class="log-time">[${hora ?? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
    <span class="log-msg ${msgClass}">${mensagem}</span>
  `;
  logBody.appendChild(linha);
  logBody.scrollTop = logBody.scrollHeight;
}

// Toggle minimizar painel de log
logHeader.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('.log-btn')) return;
  toggleLog();
});
logToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleLog(); });
logClear.addEventListener('click', (e) => {
  e.stopPropagation();
  logBody.innerHTML = '<p class="log-hint">Log limpo.</p>';
});

function toggleLog() {
  const minimized = logPanel.classList.toggle('minimized');
  logToggle.textContent = minimized ? '▲' : '▼';
}

// ── Cores dos estratos ──────────────────────────────────────────────────────
function corEstrato(estrato: string): string {
  const e = estrato.toUpperCase();
  const map: Record<string, string> = {
    A1: '🟢', A2: '🟢', A3: '🟢', A4: '🟢',
    B1: '🟡', B2: '🟡', B3: '🟠', B4: '🟠',
    C:  '🔴'
  };
  return map[e] ?? '⚪';
}

function renderQualis(qualis: Array<{ area: string; estrato: string; titulo: string; quadrienio: string }>) {
  qualisGrid.innerHTML = '';

  if (!qualis || qualis.length === 0) {
    qualisGrid.innerHTML = `
      <div class="nao-encontrado">
        ⚪ Periódico não encontrado na base Qualis — Ciência da Computação (2017-2020)
      </div>`;
    return;
  }

  for (const item of qualis) {
    const card = document.createElement('div');
    card.className = 'qualis-card';
    const cls = `est-${item.estrato.toUpperCase().replace('+', '')}`;
    card.innerHTML = `
      <div class="q-area">${item.area}</div>
      <div class="q-titulo">${item.titulo}</div>
      <div class="q-row">
        <span class="estrato-badge ${cls}">${corEstrato(item.estrato)} ${item.estrato}</span>
        <span class="q-periodo">${item.quadrienio}</span>
      </div>
    `;
    qualisGrid.appendChild(card);
  }
}

// ── Selecionar e processar PDF ──────────────────────────────────────────────
btnSelecionar.addEventListener('click', async () => {
  await processarArquivo();
});

async function processarArquivo(caminho?: string) {
  try {
    const selected = caminho ?? await open({
      multiple: false,
      filters: [{ name: 'Artigo Científico', extensions: ['pdf'] }]
    });

    if (!selected || typeof selected !== 'string') return;

    // Reset UI
    btnSelecionar.disabled = true;
    filePathDisplay.textContent = `⏳ Processando: ${selected.split('\\').pop()}...`;
    resultContainer.classList.add('hidden');
    resultError.classList.add('hidden');
    qualisGrid.innerHTML = '';

    // Expandir painel de log ao iniciar
    logPanel.classList.remove('minimized');
    logToggle.textContent = '▼';
    adicionarLog(`Arquivo selecionado: ${selected.split('\\').pop()}`);

    // ── Spawn do sidecar com streaming de stderr ──
    const command = Command.sidecar('bin/processor', [selected]);
    let stdoutData = '';

    // stderr → log em tempo real
    command.stderr.on('data', (linha: string) => {
      linha.trim().split('\n').forEach(l => {
        const trimmed = l.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('LOG|')) {
          const partes = trimmed.split('|');
          const hora = partes[1] ?? '';
          const msg  = partes.slice(2).join('|');
          const tipo = msg.startsWith('✔') ? 'ok' : msg.startsWith('✗') || msg.toLowerCase().includes('erro') ? 'err' : 'normal';
          adicionarLog(msg, hora, tipo);
        }
        // Logs não estruturados (ex: RapidOCR) — ignorar na UI
      });
    });

    // stdout → JSON final
    command.stdout.on('data', (linha: string) => {
      stdoutData += linha;
    });

    await command.spawn();

    // Aguardar conclusão
    const saida = await new Promise<{ code: number | null }>((resolve) => {
      command.on('close', (data: { code: number | null }) => resolve(data));
      command.on('error', (err: string) => {
        adicionarLog(`Erro fatal: ${err}`, undefined, 'err');
        resolve({ code: 1 });
      });
    });

    btnSelecionar.disabled = false;
    filePathDisplay.textContent = `📄 ${selected.split('\\').pop()}`;

    if ((saida.code ?? 1) !== 0) {
      adicionarLog('O motor de extração encerrou com erro.', undefined, 'err');
      mostrarErro('O motor de extração falhou. Verifique o log.');
      return;
    }

    // Parsear JSON do stdout (pega a última linha com "{")
    let dados: any;
    try {
      const linhas = stdoutData.trim().split('\n');
      const jsonLine = [...linhas].reverse().find(l => l.trim().startsWith('{'));
      dados = JSON.parse(jsonLine ?? stdoutData.trim());
    } catch {
      mostrarErro('Resposta inválida do motor de extração.');
      return;
    }

    resultContainer.classList.remove('hidden');

    if (dados.status === 'sucesso') {
      resultIcon.textContent = '✔';
      resultTitle.textContent = 'Resultado da Análise';
      resultTitle.style.color = '';

      issnInfo.classList.remove('hidden');
      issnValor.textContent = dados.issn ?? '—';

      const titulo = dados.qualis?.[0]?.titulo;
      if (titulo) {
        tituloInfo.classList.remove('hidden');
        tituloValor.textContent = titulo;
      } else {
        tituloInfo.classList.add('hidden');
      }

      renderQualis(dados.qualis ?? []);
      adicionarLog('Análise concluída com sucesso.', undefined, 'ok');

    } else {
      mostrarErro(dados.mensagem ?? 'Erro desconhecido.');
      adicionarLog(`Erro: ${dados.mensagem}`, undefined, 'err');
    }

  } catch (err) {
    btnSelecionar.disabled = false;
    console.error('Erro na interface:', err);
    adicionarLog(`Exceção na interface: ${err}`, undefined, 'err');
  }
}

function mostrarErro(msg: string) {
  resultContainer.classList.remove('hidden');
  resultIcon.textContent = '✗';
  resultTitle.textContent = 'Erro na Análise';
  resultTitle.style.color = 'var(--danger)';
  resultError.textContent = msg;
  resultError.classList.remove('hidden');
  issnInfo.classList.add('hidden');
  tituloInfo.classList.add('hidden');
  qualisGrid.innerHTML = '';
}
