# 🗳️ Sistema de Apuração Eleitoral Paritária (Docentes, Técnicos e Alunos)

Desenvolvido por **@brendan (Desenvolvedor Frontend Sênior)** para **@domaragao**.

Aplicação web moderna, responsiva (*mobile-first*) e de alta performance para apuração e contagem de votos em eleições com fórmula paritária de 3 segmentos e suporte a múltiplas urnas físicas.

---

## 🚀 Principais Recursos

1. **Persistência Total Local (`LocalStorage`)**:
   - Votos, urnas e histórico nunca são perdidos ao atualizar a página (F5), fechar o navegador ou desligar o dispositivo.
   - Suporte a exportação de backup (.json) e restauração.

2. **Fórmula Paritária (1/3 por Segmento)**:
   - Os 3 segmentos (**Docentes**, **Técnicos Administrativos** e **Alunos**) possuem o mesmo peso eleitoral (33,33% cada).
   - O cálculo pondera o peso individual do voto de acordo com a quantidade de votos válidos apurados no respectivo setor:
     $$\text{Score Candidato} = \frac{1}{3}\left(\frac{V_{\text{Docentes}}}{T_{\text{Docentes}}}\right) + \frac{1}{3}\left(\frac{V_{\text{Técnicos}}}{T_{\text{Técnicos}}}\right) + \frac{1}{3}\left(\frac{V_{\text{Alunos}}}{T_{\text{Alunos}}}\right)$$
   - Exibição em tempo real do peso relativo individual de cada voto por setor.

3. **Múltiplas Urnas por Segmento**:
   - Cada segmento pode ter quantas urnas forem necessárias (ex: *Urna 01 - Auditório*, *Urna 02 - Prédio Central*, etc.).
   - Contabilização isolada por urna e consolidada por segmento e geral.

4. **Interface de Votação Otimizada para Celulares**:
   - Botões gigantes táteis: **Nicácio** (Laranja) e **Neilor** (Verde).
   - Botões de correção (**-1**) com popup/modal de confirmação de segurança para evitar erros de digitação.
   - Botões para votos em **Branco** e **Nulo**.
   - **Log em tempo real** dos últimos 10 votos computados por urna com timestamp.

5. **Painel de Resultados e Relatórios**:
   - Placar geral com percentuais ponderados, barras de progresso dinâmicas e indicador de liderança.
   - Detalhamento por segmento e tabela completa por urna.
   - Botão para **Impressão / Geração de PDF (Ata Oficial de Apuração)** estilizado.

6. **Efeitos Sonoros Sintetizados**:
   - Feedback sonoro suave via Web Audio API (sem dependências de rede externas) para garantir confirmação tátil em cada clique.

---

## 🛠️ Como Executar Localmente

Você pode abrir o arquivo `index.html` diretamente em qualquer navegador moderno ou rodar um servidor HTTP local:

```bash
cd /home/ubuntu/apuracao-eleicao
python3 -m http.server 3000
```
Acesse em: `http://localhost:3000`

---

## 🌐 Deploy na Vercel

O projeto já inclui `vercel.json` configurado para deploy instantâneo:

```bash
cd /home/ubuntu/apuracao-eleicao
vercel --prod
```
