/**
 * ============================================================================
 * SISTEMA DE APURAÇÃO ELEITORAL PARITÁRIA
 * Arquitetura Frontend: JavaScript Vanilla ES6+ Modular & Reativo
 * Autor: @brendan (Desenvolvedor Frontend Sênior)
 * ============================================================================
 */

(function () {
  'use strict';

  // Chave do LocalStorage
  const STORAGE_KEY = 'apuracao_eleitoral_paritaria_v1';

  // Estrutura de Estado Padrão Inicial
  const defaultState = {
    activeSegment: 'docentes',
    activeUrnaId: 'urna-doc-1',
    soundEnabled: true,
    segments: {
      docentes: {
        id: 'docentes',
        name: 'Docentes',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        weight: 1 / 3,
        urnas: [
          {
            id: 'urna-doc-1',
            name: 'Urna 01 - Docentes',
            nicacio: 0,
            neilor: 0,
            branco: 0,
            nulo: 0,
            logs: []
          }
        ]
      },
      tecnicos: {
        id: 'tecnicos',
        name: 'Técnicos',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        weight: 1 / 3,
        urnas: [
          {
            id: 'urna-tec-1',
            name: 'Urna 01 - Técnicos',
            nicacio: 0,
            neilor: 0,
            branco: 0,
            nulo: 0,
            logs: []
          }
        ]
      },
      alunos: {
        id: 'alunos',
        name: 'Alunos',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        weight: 1 / 3,
        urnas: [
          {
            id: 'urna-alu-1',
            name: 'Urna 01 - Alunos',
            nicacio: 0,
            neilor: 0,
            branco: 0,
            nulo: 0,
            logs: []
          }
        ]
      }
    }
  };

  // Objeto de Estado em Memória
  let state = loadState();

  // Variável para ação pendente de confirmação no modal de subtração (-1)
  let pendingSubAction = null;

  // Web Audio Synth para feedback sonoro imediato (sem arquivos externos)
  const audioContext = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

  function playSound(type = 'click') {
    if (!state.soundEnabled || !audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      const now = audioContext.currentTime;

      if (type === 'nicacio') {
        // Tom Laranja (vibrante médio-alto)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'neilor') {
        // Tom Verde (harmônico)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'sub') {
        // Tom de diminuição / estorno (baixo)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'neutral') {
        // Tom neutro para branco/nulo
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.warn('Áudio não inicializado:', e);
    }
  }

  // =========================================================================
  // PERSISTÊNCIA LOCAL (LocalStorage)
  // =========================================================================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      const parsed = JSON.parse(raw);
      // Validação básica da estrutura
      if (!parsed.segments || !parsed.segments.docentes || !parsed.segments.tecnicos || !parsed.segments.alunos) {
        return JSON.parse(JSON.stringify(defaultState));
      }
      return parsed;
    } catch (err) {
      console.error('Falha ao ler LocalStorage:', err);
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Erro ao salvar no LocalStorage:', err);
    }
  }

  // =========================================================================
  // HELPERS DE CONSULTA DE DADOS
  // =========================================================================
  function getActiveSegment() {
    return state.segments[state.activeSegment] || state.segments.docentes;
  }

  function getActiveUrna() {
    const seg = getActiveSegment();
    let urna = seg.urnas.find(u => u.id === state.activeUrnaId);
    if (!urna) {
      if (seg.urnas.length > 0) {
        urna = seg.urnas[0];
        state.activeUrnaId = urna.id;
        saveState();
      }
    }
    return urna;
  }

  function formatTime(isoOrTimestamp) {
    const d = isoOrTimestamp ? new Date(isoOrTimestamp) : new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Toast Notificação
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastText) return;

    toastText.textContent = message;

    if (type === 'success') {
      toastIcon.className = 'text-emerald-400';
      toastIcon.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5"></i>`;
    } else if (type === 'warning') {
      toastIcon.className = 'text-amber-400';
      toastIcon.innerHTML = `<i data-lucide="alert-triangle" class="w-5 h-5"></i>`;
    } else if (type === 'error') {
      toastIcon.className = 'text-rose-400';
      toastIcon.innerHTML = `<i data-lucide="x-circle" class="w-5 h-5"></i>`;
    }

    if (window.lucide) lucide.createIcons();

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2400);
  }

  // =========================================================================
  // MATEMÁTICA E APURAÇÃO PARITÁRIA
  // =========================================================================
  function calculateElectionResults() {
    const segmentKeys = ['docentes', 'tecnicos', 'alunos'];
    const segmentResults = {};
    let totalAbsNicacio = 0;
    let totalAbsNeilor = 0;
    let totalAbsBranco = 0;
    let totalAbsNulo = 0;
    let totalAbsValidos = 0;
    let totalAbsGeral = 0;

    // 1. Apuração individual de cada segmento
    segmentKeys.forEach(key => {
      const seg = state.segments[key];
      let nicacio = 0;
      let neilor = 0;
      let branco = 0;
      let nulo = 0;

      seg.urnas.forEach(u => {
        nicacio += (u.nicacio || 0);
        neilor += (u.neilor || 0);
        branco += (u.branco || 0);
        nulo += (u.nulo || 0);
      });

      const validos = nicacio + neilor;
      const total = validos + branco + nulo;

      const pctNicacio = validos > 0 ? (nicacio / validos) * 100 : 0;
      const pctNeilor = validos > 0 ? (neilor / validos) * 100 : 0;

      segmentResults[key] = {
        name: seg.name,
        nicacio,
        neilor,
        branco,
        nulo,
        validos,
        total,
        pctNicacio,
        pctNeilor,
        urnasCount: seg.urnas.length
      };

      totalAbsNicacio += nicacio;
      totalAbsNeilor += neilor;
      totalAbsBranco += branco;
      totalAbsNulo += nulo;
      totalAbsValidos += validos;
      totalAbsGeral += total;
    });

    // 2. Cálculo Paritário Ponderado (1/3 por segmento ativo com votos válidos)
    const activeSegmentsWithVotes = segmentKeys.filter(k => segmentResults[k].validos > 0);
    const numActiveSegments = activeSegmentsWithVotes.length;

    let weightedNicacioPct = 0;
    let weightedNeilorPct = 0;

    if (numActiveSegments > 0) {
      // Cada segmento ativo recebe 1 / numActiveSegments (quando os 3 têm votos, exatamente 1/3 cada)
      const segmentWeight = 100 / numActiveSegments;

      activeSegmentsWithVotes.forEach(k => {
        const segRes = segmentResults[k];
        weightedNicacioPct += (segRes.pctNicacio * (1 / numActiveSegments));
        weightedNeilorPct += (segRes.pctNeilor * (1 / numActiveSegments));
      });
    }

    return {
      segmentResults,
      totalAbsNicacio,
      totalAbsNeilor,
      totalAbsBranco,
      totalAbsNulo,
      totalAbsValidos,
      totalAbsGeral,
      weightedNicacioPct,
      weightedNeilorPct,
      numActiveSegments
    };
  }

  // =========================================================================
  // AÇÕES DE VOTAÇÃO (ADICIONAR / DIMINUIR)
  // =========================================================================
  function addVote(candidateKey) {
    const urna = getActiveUrna();
    if (!urna) return;

    if (typeof urna[candidateKey] !== 'number') {
      urna[candidateKey] = 0;
    }
    urna[candidateKey]++;

    // Registrar no Log da Urna
    if (!Array.isArray(urna.logs)) {
      urna.logs = [];
    }

    const logEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      candidate: candidateKey,
      action: 'add',
      time: new Date().toISOString(),
      displayCandidate: getCandidateDisplayName(candidateKey)
    };

    // Adiciona no início e mantém apenas os últimos 10
    urna.logs.unshift(logEntry);
    if (urna.logs.length > 10) {
      urna.logs.pop();
    }

    saveState();

    // Feedback sonoro
    if (candidateKey === 'nicacio') playSound('nicacio');
    else if (candidateKey === 'neilor') playSound('neilor');
    else playSound('neutral');

    renderAll();
    showToast(`+1 Voto para ${getCandidateDisplayName(candidateKey)} na ${urna.name}!`);
  }

  function openSubModal(candidateKey) {
    const urna = getActiveUrna();
    const seg = getActiveSegment();
    if (!urna) return;

    const currentCount = urna[candidateKey] || 0;
    if (currentCount <= 0) {
      showToast(`Esta urna já está com 0 votos em ${getCandidateDisplayName(candidateKey)}.`, 'warning');
      return;
    }

    pendingSubAction = {
      candidateKey,
      urnaId: urna.id,
      segmentKey: state.activeSegment
    };

    // Preencher modal
    document.getElementById('modal-sub-segment').textContent = seg.name;
    document.getElementById('modal-sub-urna').textContent = urna.name;
    const candDisplay = getCandidateDisplayName(candidateKey);
    document.getElementById('modal-sub-candidate').textContent = candDisplay;
    document.getElementById('modal-sub-message').textContent = `Deseja realmente estornar (-1 voto) de ${candDisplay} nesta urna?`;

    const modal = document.getElementById('modal-confirm-sub');
    modal.classList.remove('hidden');
  }

  function executeSubVote() {
    if (!pendingSubAction) return;

    const { candidateKey, urnaId, segmentKey } = pendingSubAction;
    const seg = state.segments[segmentKey];
    if (!seg) return;
    const urna = seg.urnas.find(u => u.id === urnaId);
    if (!urna) return;

    if (urna[candidateKey] > 0) {
      urna[candidateKey]--;

      // Registra no Log
      if (!Array.isArray(urna.logs)) urna.logs = [];
      urna.logs.unshift({
        id: 'log-' + Date.now(),
        candidate: candidateKey,
        action: 'sub',
        time: new Date().toISOString(),
        displayCandidate: `${getCandidateDisplayName(candidateKey)} (-1 Estorno)`
      });
      if (urna.logs.length > 10) urna.logs.pop();

      saveState();
      playSound('sub');
      renderAll();
      showToast(`1 voto estornado de ${getCandidateDisplayName(candidateKey)}.`, 'warning');
    }

    closeSubModal();
  }

  function closeSubModal() {
    pendingSubAction = null;
    document.getElementById('modal-confirm-sub').classList.add('hidden');
  }

  function getCandidateDisplayName(key) {
    switch (key) {
      case 'nicacio': return 'Nicácio';
      case 'neilor': return 'Neilor';
      case 'branco': return 'Branco';
      case 'nulo': return 'Nulo';
      default: return key;
    }
  }

  // =========================================================================
  // GESTÃO DE URNAS
  // =========================================================================
  function createNewUrna(segmentKey, name) {
    const seg = state.segments[segmentKey];
    if (!seg) return;

    const newId = 'urna-' + segmentKey.substr(0, 3) + '-' + Date.now();
    const newUrna = {
      id: newId,
      name: name.trim() || `Urna 0${seg.urnas.length + 1} - ${seg.name}`,
      nicacio: 0,
      neilor: 0,
      branco: 0,
      nulo: 0,
      logs: []
    };

    seg.urnas.push(newUrna);
    state.activeSegment = segmentKey;
    state.activeUrnaId = newId;
    saveState();
    renderAll();
    showToast(`Nova urna "${newUrna.name}" criada com sucesso!`);
  }

  function removeUrna(segmentKey, urnaId) {
    const seg = state.segments[segmentKey];
    if (!seg) return;

    if (seg.urnas.length <= 1) {
      alert('Cada segmento precisa manter pelo menos 1 urna de votação.');
      return;
    }

    const urna = seg.urnas.find(u => u.id === urnaId);
    const totalVotes = (urna.nicacio || 0) + (urna.neilor || 0) + (urna.branco || 0) + (urna.nulo || 0);

    if (totalVotes > 0) {
      const confirmDel = confirm(`ATENÇÃO: A urna "${urna.name}" possui ${totalVotes} votos registrados. Deseja realmente excluí-la? Os votos desta urna serão apagados.`);
      if (!confirmDel) return;
    }

    seg.urnas = seg.urnas.filter(u => u.id !== urnaId);
    if (state.activeUrnaId === urnaId) {
      state.activeUrnaId = seg.urnas[0].id;
    }

    saveState();
    renderAll();
    showToast(`Urna removida.`);
  }

  function resetAllVotes() {
    Object.keys(state.segments).forEach(k => {
      state.segments[k].urnas.forEach(u => {
        u.nicacio = 0;
        u.neilor = 0;
        u.branco = 0;
        u.nulo = 0;
        u.logs = [];
      });
    });
    saveState();
    renderAll();
    showToast('Zerésima emitida: Todos os votos foram zerados!', 'warning');
  }

  // =========================================================================
  // RENDERIZAÇÃO DA UI
  // =========================================================================
  function renderAll() {
    renderSegmentButtons();
    renderUrnaSelector();
    renderActiveUrnaCard();
    renderUrnaLogs();
    renderResultsView();
    renderUrnasManagement();
    updateBadges();
  }

  // 1. Segmentos (Botões no topo da Votação)
  function renderSegmentButtons() {
    const container = document.getElementById('segment-selector-container');
    if (!container) return;

    const segments = [
      { id: 'docentes', label: 'Docentes', icon: 'graduation-cap', color: 'indigo' },
      { id: 'tecnicos', label: 'Técnicos', icon: 'briefcase', color: 'emerald' },
      { id: 'alunos', label: 'Alunos', icon: 'users', color: 'amber' }
    ];

    container.innerHTML = segments.map(s => {
      const isActive = state.activeSegment === s.id;
      const urnasCount = state.segments[s.id].urnas.length;
      
      const activeClass = isActive 
        ? 'bg-slate-800 border-orange-500 text-white shadow-lg ring-1 ring-orange-500/50' 
        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';

      return `
        <button type="button" data-segment="${s.id}" class="segment-pill-btn flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all ${activeClass}">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="font-bold text-xs sm:text-sm capitalize">${s.label}</span>
          </div>
          <span class="text-[10px] font-medium text-slate-400">${urnasCount} ${urnasCount === 1 ? 'urna' : 'urnas'}</span>
        </button>
      `;
    }).join('');

    // Attach listeners
    container.querySelectorAll('.segment-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const segId = btn.getAttribute('data-segment');
        if (state.activeSegment !== segId) {
          state.activeSegment = segId;
          const seg = state.segments[segId];
          state.activeUrnaId = seg.urnas[0] ? seg.urnas[0].id : '';
          saveState();
          renderAll();
        }
      });
    });
  }

  // 2. Seletor de Urnas
  function renderUrnaSelector() {
    const select = document.getElementById('select-active-urna');
    if (!select) return;

    const seg = getActiveSegment();
    select.innerHTML = seg.urnas.map(u => {
      const total = (u.nicacio || 0) + (u.neilor || 0) + (u.branco || 0) + (u.nulo || 0);
      const isSelected = u.id === state.activeUrnaId ? 'selected' : '';
      return `<option value="${u.id}" ${isSelected}>${u.name} (${total} votos)</option>`;
    }).join('');
  }

  // 3. Card da Urna Ativa e Contadores
  function renderActiveUrnaCard() {
    const urna = getActiveUrna();
    const seg = getActiveSegment();
    if (!urna) return;

    // Header resumo
    document.getElementById('active-urna-badge-segment').textContent = seg.name;
    document.getElementById('active-urna-name-display').textContent = urna.name;

    const validos = (urna.nicacio || 0) + (urna.neilor || 0);
    const total = validos + (urna.branco || 0) + (urna.nulo || 0);

    document.getElementById('active-urna-total-votos').textContent = total;
    document.getElementById('active-urna-validos').textContent = validos;

    // Contadores de Voto
    document.getElementById('count-nicacio-urna').textContent = urna.nicacio || 0;
    document.getElementById('count-neilor-urna').textContent = urna.neilor || 0;
    document.getElementById('count-branco-urna').textContent = urna.branco || 0;
    document.getElementById('count-nulo-urna').textContent = urna.nulo || 0;

    // Percentuais na Urna
    const pctNic = validos > 0 ? ((urna.nicacio / validos) * 100).toFixed(1) : '0.0';
    const pctNei = validos > 0 ? ((urna.neilor / validos) * 100).toFixed(1) : '0.0';

    document.getElementById('card-nicacio-percent-urn').textContent = `${pctNic}% nesta urna`;
    document.getElementById('card-neilor-percent-urn').textContent = `${pctNei}% nesta urna`;
  }

  // 4. Log dos últimos 10 votos
  function renderUrnaLogs() {
    const container = document.getElementById('votes-log-container');
    const urna = getActiveUrna();
    if (!container || !urna) return;

    if (!urna.logs || urna.logs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-500 text-xs italic">
          Nenhum voto registrado ainda nesta urna (${urna.name}).
        </div>
      `;
      return;
    }

    container.innerHTML = urna.logs.map((log, index) => {
      let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
      let icon = 'vote';
      let sign = '+1';

      if (log.action === 'sub') {
        badgeBg = 'bg-rose-950/60 text-rose-300 border-rose-800/50';
        icon = 'minus-circle';
        sign = '-1';
      } else if (log.candidate === 'nicacio') {
        badgeBg = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      } else if (log.candidate === 'neilor') {
        badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      } else if (log.candidate === 'branco') {
        badgeBg = 'bg-slate-700 text-slate-200 border-slate-600';
      } else if (log.candidate === 'nulo') {
        badgeBg = 'bg-rose-900/40 text-rose-300 border-rose-800/40';
      }

      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs ${index === 0 ? 'log-item-new ring-1 ring-orange-500/30' : ''}">
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400 font-bold">
              ${index + 1}
            </span>
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badgeBg} flex items-center gap-1">
              <span>${log.displayCandidate}</span>
            </span>
          </div>
          <div class="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>${formatTime(log.time)}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // 5. Renderização do Painel Geral de Resultados & Pesos
  function renderResultsView() {
    const res = calculateElectionResults();

    // Placar Geral Ponderado
    const nicWeighted = res.weightedNicacioPct.toFixed(2);
    const neiWeighted = res.weightedNeilorPct.toFixed(2);

    document.getElementById('res-nicacio-weighted-pct').textContent = `${nicWeighted}%`;
    document.getElementById('res-neilor-weighted-pct').textContent = `${neiWeighted}%`;

    document.getElementById('res-nicacio-abs').textContent = res.totalAbsNicacio;
    document.getElementById('res-neilor-abs').textContent = res.totalAbsNeilor;

    document.getElementById('bar-nicacio-pct').style.width = `${nicWeighted}%`;
    document.getElementById('bar-neilor-pct').style.width = `${neiWeighted}%`;

    // Totais
    document.getElementById('res-total-geral').textContent = res.totalAbsGeral;
    document.getElementById('res-total-validos').textContent = res.totalAbsValidos;
    document.getElementById('res-total-brancos').textContent = res.totalAbsBranco;
    document.getElementById('res-total-nulos').textContent = res.totalAbsNulo;

    // Status de Liderança
    const leaderText = document.getElementById('leader-text');
    const leaderAvatar = document.getElementById('leader-avatar');
    const diffPercent = document.getElementById('diff-percent');

    if (res.totalAbsValidos === 0) {
      leaderText.textContent = 'Aguardando votos válidos';
      leaderAvatar.textContent = '?';
      leaderAvatar.className = 'w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-slate-400';
      diffPercent.textContent = '0.00%';
    } else if (res.weightedNicacioPct > res.weightedNeilorPct) {
      const diff = (res.weightedNicacioPct - res.weightedNeilorPct).toFixed(2);
      leaderText.innerHTML = `<span class="text-orange-400 font-black">NICÁCIO</span> está liderando a apuração paritária`;
      leaderAvatar.textContent = 'N';
      leaderAvatar.className = 'w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center font-black text-orange-400';
      diffPercent.textContent = `+${diff}%`;
      diffPercent.className = 'text-sm sm:text-base font-extrabold font-mono text-orange-400';
    } else if (res.weightedNeilorPct > res.weightedNicacioPct) {
      const diff = (res.weightedNeilorPct - res.weightedNicacioPct).toFixed(2);
      leaderText.innerHTML = `<span class="text-emerald-400 font-black">NEILOR</span> está liderando a apuração paritária`;
      leaderAvatar.textContent = 'N';
      leaderAvatar.className = 'w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400';
      diffPercent.textContent = `+${diff}%`;
      diffPercent.className = 'text-sm sm:text-base font-extrabold font-mono text-emerald-400';
    } else {
      leaderText.textContent = 'Empate rigoroso entre Nicácio e Neilor';
      leaderAvatar.textContent = '=';
      leaderAvatar.className = 'w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400';
      diffPercent.textContent = '0.00%';
      diffPercent.className = 'text-sm sm:text-base font-extrabold font-mono text-amber-400';
    }

    // Cards de Equivalência de Pesos
    renderWeightEquivalenceCards(res);

    // Detalhamento por Segmento
    renderSegmentDetailCards(res);

    // Tabela Geral de Urnas
    renderUrnasTable(res);
  }

  // Cards Explicativos de Pesos
  function renderWeightEquivalenceCards(res) {
    const container = document.getElementById('segment-weights-cards');
    if (!container) return;

    const segmentsMeta = [
      { key: 'docentes', name: 'Docentes', icon: 'graduation-cap', color: 'indigo' },
      { key: 'tecnicos', name: 'Técnicos', icon: 'briefcase', color: 'emerald' },
      { key: 'alunos', name: 'Alunos', icon: 'users', color: 'amber' }
    ];

    container.innerHTML = segmentsMeta.map(m => {
      const segRes = res.segmentResults[m.key];
      const validos = segRes.validos;
      
      // Peso do voto individual neste segmento = (1/3) / validos
      const singleVoteWeightPct = validos > 0 ? ((1 / 3) / validos * 100) : 0;
      
      return `
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-white flex items-center gap-1.5">
              ${m.name}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              Peso do Segmento: 33,33%
            </span>
          </div>

          <div class="pt-2 border-t border-slate-800/80 flex justify-between items-baseline">
            <span class="text-xs text-slate-400">Total Válidos:</span>
            <span class="text-base font-black text-white font-mono">${validos}</span>
          </div>

          <div class="flex justify-between items-baseline">
            <span class="text-xs text-slate-400">Peso de 1 Voto:</span>
            <span class="text-sm font-bold text-amber-400 font-mono">
              ${validos > 0 ? singleVoteWeightPct.toFixed(4) + '%' : 'Aguardando votos'}
            </span>
          </div>

          <p class="text-[11px] text-slate-500 italic pt-1">
            ${validos > 0 
              ? `Cada voto equivale a ${(singleVoteWeightPct / 100 * 300).toFixed(2)} pts proporcionais base 100` 
              : 'Sem votos válidos registrados neste setor ainda.'}
          </p>
        </div>
      `;
    }).join('');
  }

  // Cards de Detalhe por Segmento
  function renderSegmentDetailCards(res) {
    const container = document.getElementById('segments-detail-container');
    if (!container) return;

    const segmentsMeta = [
      { key: 'docentes', name: 'Docentes (1/3)', color: 'border-indigo-500/30' },
      { key: 'tecnicos', name: 'Técnicos Administrativos (1/3)', color: 'border-emerald-500/30' },
      { key: 'alunos', name: 'Alunos (1/3)', color: 'border-amber-500/30' }
    ];

    container.innerHTML = segmentsMeta.map(m => {
      const segRes = res.segmentResults[m.key];
      const pctNic = segRes.pctNicacio.toFixed(1);
      const pctNei = segRes.pctNeilor.toFixed(1);

      return `
        <div class="bg-slate-900 border ${m.color} rounded-2xl p-5 shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-white text-base">${m.name}</h4>
            <span class="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
              ${segRes.urnasCount} ${segRes.urnasCount === 1 ? 'urna' : 'urnas'}
            </span>
          </div>

          <!-- Mini Placar no Segmento -->
          <div class="space-y-2 pt-1">
            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="text-orange-400">Nicácio: ${segRes.nicacio} votos</span>
                <span class="text-orange-400 font-mono">${pctNic}%</span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-orange-500 rounded-full" style="width: ${pctNic}%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="text-emerald-400">Neilor: ${segRes.neilor} votos</span>
                <span class="text-emerald-400 font-mono">${pctNei}%</span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width: ${pctNei}%"></div>
              </div>
            </div>
          </div>

          <!-- Resumo de Válidos/Brancos/Nulos -->
          <div class="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-slate-950 p-2 rounded-xl">
              <span class="text-[10px] text-slate-400 block uppercase">Válidos</span>
              <strong class="text-white font-mono">${segRes.validos}</strong>
            </div>
            <div class="bg-slate-950 p-2 rounded-xl">
              <span class="text-[10px] text-slate-400 block uppercase">Brancos</span>
              <strong class="text-slate-300 font-mono">${segRes.branco}</strong>
            </div>
            <div class="bg-slate-950 p-2 rounded-xl">
              <span class="text-[10px] text-slate-400 block uppercase">Nulos</span>
              <strong class="text-rose-400 font-mono">${segRes.nulo}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Tabela Geral de Urnas
  function renderUrnasTable() {
    const tbody = document.getElementById('urnas-table-body');
    if (!tbody) return;

    const rows = [];
    const segmentKeys = ['docentes', 'tecnicos', 'alunos'];

    segmentKeys.forEach(segKey => {
      const seg = state.segments[segKey];
      seg.urnas.forEach(u => {
        const validos = (u.nicacio || 0) + (u.neilor || 0);
        const total = validos + (u.branco || 0) + (u.nulo || 0);

        rows.push(`
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-3 capitalize text-slate-300 font-semibold">${seg.name}</td>
            <td class="py-3 px-3 text-white font-medium">${u.name}</td>
            <td class="py-3 px-3 text-orange-400 font-bold font-mono">${u.nicacio || 0}</td>
            <td class="py-3 px-3 text-emerald-400 font-bold font-mono">${u.neilor || 0}</td>
            <td class="py-3 px-3 text-slate-300 font-mono">${u.branco || 0}</td>
            <td class="py-3 px-3 text-rose-400 font-mono">${u.nulo || 0}</td>
            <td class="py-3 px-3 text-white font-bold font-mono">${validos}</td>
            <td class="py-3 px-3 text-slate-200 font-bold font-mono">${total}</td>
          </tr>
        `);
      });
    });

    tbody.innerHTML = rows.join('');
  }

  // 6. Gerenciamento de Urnas (Aba 3)
  function renderUrnasManagement() {
    const container = document.getElementById('urnas-management-list');
    if (!container) return;

    const segmentKeys = ['docentes', 'tecnicos', 'alunos'];

    container.innerHTML = segmentKeys.map(segKey => {
      const seg = state.segments[segKey];
      
      const urnasListHtml = seg.urnas.map(u => {
        const validos = (u.nicacio || 0) + (u.neilor || 0);
        const total = validos + (u.branco || 0) + (u.nulo || 0);

        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 gap-3">
            <div>
              <h5 class="font-bold text-white text-sm">${u.name}</h5>
              <div class="flex flex-wrap gap-2 text-xs text-slate-400 mt-1 font-mono">
                <span class="text-orange-400">Nicácio: <strong>${u.nicacio || 0}</strong></span>
                <span>•</span>
                <span class="text-emerald-400">Neilor: <strong>${u.neilor || 0}</strong></span>
                <span>•</span>
                <span>Branco: <strong>${u.branco || 0}</strong></span>
                <span>•</span>
                <span class="text-rose-400">Nulo: <strong>${u.nulo || 0}</strong></span>
                <span>•</span>
                <span class="text-white font-bold">Total: ${total}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button class="btn-select-urna-manage px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors" data-segment="${segKey}" data-urna-id="${u.id}">
                Ir para Votação
              </button>
              ${seg.urnas.length > 1 ? `
                <button class="btn-delete-urna p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 text-xs border border-rose-800/40 transition-colors" title="Excluir Urna" data-segment="${segKey}" data-urna-id="${u.id}">
                  <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-white capitalize">${seg.name}</h4>
            <span class="text-xs text-slate-400">${seg.urnas.length} ${seg.urnas.length === 1 ? 'urna' : 'urnas'}</span>
          </div>
          <div class="space-y-2">
            ${urnasListHtml}
          </div>
        </div>
      `;
    }).join('');

    // Listeners
    container.querySelectorAll('.btn-select-urna-manage').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeSegment = btn.getAttribute('data-segment');
        state.activeUrnaId = btn.getAttribute('data-urna-id');
        saveState();
        switchTab('vote');
        renderAll();
      });
    });

    container.querySelectorAll('.btn-delete-urna').forEach(btn => {
      btn.addEventListener('click', () => {
        removeUrna(btn.getAttribute('data-segment'), btn.getAttribute('data-urna-id'));
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  // 7. Badges no Header
  function updateBadges() {
    let totalVotos = 0;
    let totalUrnas = 0;

    Object.keys(state.segments).forEach(k => {
      const seg = state.segments[k];
      totalUrnas += seg.urnas.length;
      seg.urnas.forEach(u => {
        totalVotos += (u.nicacio || 0) + (u.neilor || 0) + (u.branco || 0) + (u.nulo || 0);
      });
    });

    const badgeVotos = document.getElementById('badge-total-votos');
    if (badgeVotos) badgeVotos.textContent = totalVotos;

    const badgeUrnas = document.getElementById('badge-total-urnas');
    if (badgeUrnas) badgeUrnas.textContent = totalUrnas;
  }

  // =========================================================================
  // SISTEMA DE ABAS (TABS)
  // =========================================================================
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

    if (tabId === 'vote') {
      document.getElementById('tab-vote').classList.add('active');
      document.getElementById('view-vote').classList.remove('hidden');
    } else if (tabId === 'results') {
      document.getElementById('tab-results').classList.add('active');
      document.getElementById('view-results').classList.remove('hidden');
    } else if (tabId === 'urnas') {
      document.getElementById('tab-urnas').classList.add('active');
      document.getElementById('view-urnas').classList.remove('hidden');
    }
  }

  // =========================================================================
  // ATRIBUIÇÃO DE EVENTOS DO DOM
  // =========================================================================
  function setupEventListeners() {
    // 1. Abas
    document.getElementById('tab-vote').addEventListener('click', () => switchTab('vote'));
    document.getElementById('tab-results').addEventListener('click', () => switchTab('results'));
    document.getElementById('tab-urnas').addEventListener('click', () => switchTab('urnas'));

    // 2. Troca de Urna no Select
    document.getElementById('select-active-urna').addEventListener('change', (e) => {
      state.activeUrnaId = e.target.value;
      saveState();
      renderAll();
    });

    // 3. Botões de Voto Nicácio (+1 e -1)
    document.getElementById('btn-add-nicacio').addEventListener('click', () => addVote('nicacio'));
    document.getElementById('btn-sub-nicacio').addEventListener('click', () => openSubModal('nicacio'));

    // 4. Botões de Voto Neilor (+1 e -1)
    document.getElementById('btn-add-neilor').addEventListener('click', () => addVote('neilor'));
    document.getElementById('btn-sub-neilor').addEventListener('click', () => openSubModal('neilor'));

    // 5. Botões de Branco e Nulo
    document.getElementById('btn-add-branco').addEventListener('click', () => addVote('branco'));
    document.getElementById('btn-sub-branco').addEventListener('click', () => openSubModal('branco'));

    document.getElementById('btn-add-nulo').addEventListener('click', () => addVote('nulo'));
    document.getElementById('btn-sub-nulo').addEventListener('click', () => openSubModal('nulo'));

    // 6. Modal de Confirmação Subtração (-1)
    document.getElementById('btn-confirm-sub').addEventListener('click', executeSubVote);
    document.getElementById('btn-cancel-sub').addEventListener('click', closeSubModal);

    // 7. Modal de Adicionar Urna
    const modalAddUrna = document.getElementById('modal-add-urna');
    const openAddUrnaModal = () => {
      document.getElementById('modal-urna-segment').value = state.activeSegment;
      document.getElementById('modal-urna-name').value = '';
      modalAddUrna.classList.remove('hidden');
      document.getElementById('modal-urna-name').focus();
    };

    document.getElementById('btn-quick-add-urna').addEventListener('click', openAddUrnaModal);
    document.getElementById('btn-open-add-urna-modal').addEventListener('click', openAddUrnaModal);
    document.getElementById('btn-close-modal-add-urna').addEventListener('click', () => modalAddUrna.classList.add('hidden'));
    document.getElementById('btn-cancel-modal-add-urna').addEventListener('click', () => modalAddUrna.classList.add('hidden'));

    document.getElementById('form-add-urna').addEventListener('submit', (e) => {
      e.preventDefault();
      const segKey = document.getElementById('modal-urna-segment').value;
      const name = document.getElementById('modal-urna-name').value;
      if (name.trim()) {
        createNewUrna(segKey, name.trim());
        modalAddUrna.classList.add('hidden');
      }
    });

    // 8. Limpar visualização do log
    document.getElementById('btn-clear-log').addEventListener('click', () => {
      const urna = getActiveUrna();
      if (urna) {
        urna.logs = [];
        saveState();
        renderUrnaLogs();
        showToast('Log de atividades limpo.');
      }
    });

    // 9. Impressão / PDF
    document.getElementById('btn-print-report').addEventListener('click', () => {
      window.print();
    });

    // 10. Som
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    btnToggleSound.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      saveState();
      const icon = document.getElementById('sound-icon');
      if (state.soundEnabled) {
        icon.setAttribute('data-lucide', 'volume-2');
        showToast('Sons de confirmação ativados.');
      } else {
        icon.setAttribute('data-lucide', 'volume-x');
        showToast('Sons desativados.');
      }
      if (window.lucide) lucide.createIcons();
    });

    // 11. Modal Zerésima
    const modalReset = document.getElementById('modal-confirm-reset');
    document.getElementById('btn-reset-all').addEventListener('click', () => {
      modalReset.classList.remove('hidden');
    });
    document.getElementById('btn-cancel-reset').addEventListener('click', () => {
      modalReset.classList.add('hidden');
    });
    document.getElementById('btn-do-reset').addEventListener('click', () => {
      resetAllVotes();
      modalReset.classList.add('hidden');
    });

    // 12. Backup JSON (Exportar)
    document.getElementById('btn-export-backup').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `apuracao_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Arquivo de backup exportado com sucesso!');
    });

    // 13. Backup JSON (Importar)
    const importInput = document.getElementById('import-file-input');
    document.getElementById('btn-import-backup').addEventListener('click', () => {
      importInput.click();
    });
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedState = JSON.parse(event.target.result);
          if (importedState.segments && importedState.segments.docentes) {
            state = importedState;
            saveState();
            renderAll();
            showToast('Dados restaurados com sucesso!');
          } else {
            alert('Arquivo de backup inválido.');
          }
        } catch (err) {
          alert('Erro ao processar arquivo JSON.');
        }
      };
      reader.readAsText(file);
    });

    // Botão de Settings no header abre Aba 3
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      switchTab('urnas');
    });
  }

  // =========================================================================
  // INICIALIZAÇÃO DA APLICAÇÃO
  // =========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    renderAll();
  });

})();
