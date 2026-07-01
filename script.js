let aiEnabled = true;       
let aiColor = 'b';         
let aiDifficulty = 3;      
let aiThinking = false;     

const EVAL_WEIGHTS = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000
};

const PST = {
  P: [
    [  0,  0,  0,  0,  0,  0,  0,  0 ],
    [ 50, 50, 50, 50, 50, 50, 50, 50 ],
    [ 10, 10, 20, 30, 30, 20, 10, 10 ],
    [  5,  5, 10, 25, 25, 10,  5,  5 ],
    [  0,  0,  0, 20, 20,  0,  0,  0 ],
    [  5, -5,-10,  0,  0,-10, -5,  5 ],
    [  5, 10, 10,-20,-20, 10, 10,  5 ],
    [  0,  0,  0,  0,  0,  0,  0,  0 ]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50 ],
    [-40,-20,  0,  0,  0,  0,-20,-40 ],
    [-30,  0, 10, 15, 15, 10,  0,-30 ],
    [-30,  5, 15, 20, 20, 15,  5,-30 ],
    [-30,  0, 15, 20, 20, 15,  0,-30 ],
    [-30,  5, 10, 15, 15, 10,  5,-30 ],
    [-40,-20,  0,  5,  5,  0,-20,-40 ],
    [-50,-40,-30,-30,-30,-30,-40,-50 ]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20 ],
    [-10,  0,  0,  0,  0,  0,  0,-10 ],
    [-10,  0,  5, 10, 10,  5,  0,-10 ],
    [-10,  5,  5, 10, 10,  5,  5,-10 ],
    [-10,  0, 10, 10, 10, 10,  0,-10 ],
    [-10, 10, 10, 10, 10, 10, 10,-10 ],
    [-10,  5,  0,  0,  0,  0,  5,-10 ],
    [-20,-10,-10,-10,-10,-10,-10,-20 ]
  ],
  R: [
    [  0,  0,  0,  0,  0,  0,  0,  0 ],
    [  5, 10, 10, 10, 10, 10, 10,  5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [  0,  0,  0,  5,  5,  0,  0,  0 ]
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20 ],
    [-10,  0,  0,  0,  0,  0,  0,-10 ],
    [-10,  0,  5,  5,  5,  5,  0,-10 ],
    [ -5,  0,  5,  5,  5,  5,  0, -5 ],
    [  0,  0,  5,  5,  5,  5,  0, -5 ],
    [-10,  5,  5,  5,  5,  5,  0,-10 ],
    [-10,  0,  5,  0,  0,  0,  0,-10 ],
    [-20,-10,-10, -5, -5,-10,-10,-20 ]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30 ],
    [-30,-40,-40,-50,-50,-40,-40,-30 ],
    [-30,-40,-40,-50,-50,-40,-40,-30 ],
    [-30,-40,-40,-50,-50,-40,-40,-30 ],
    [-20,-30,-30,-40,-40,-30,-30,-20 ],
    [-10,-20,-20,-20,-20,-20,-20,-10 ],
    [ 20, 20,  0,  0,  0,  0, 20, 20 ],
    [ 20, 30, 10,  0,  0, 10, 30, 20 ]
  ]
};

const PIECES = {
  wK:'pecas/wk.png',
  wQ:'pecas/wq.png',
  wR:'pecas/wr.png',
  wB:'pecas/wb.png',
  wN:'pecas/wn.png',
  wP:'pecas/wp.png',
  bK:'pecas/bk.png',
  bQ:'pecas/bq.png',
  bR:'pecas/br.png',
  bB:'pecas/bb.png',
  bN:'pecas/bn.png',
  bP:'pecas/bp.png'
};

let board = [];          
let turn = 'w';
let selected = null;  
let legalForSelected = [];
let enPassant = null;  
let history = [];        
let capturedByWhite = [];
let capturedByBlack = [];
let moveLog = [];
let flipped = false;
let gameOver = false;
let pendingPromotion = null;

function initBoard() {
  board = Array.from({length:8}, () => Array(8).fill(null));
  const back = ['R','N','B','Q','K','B','N','R'];
  for (let c=0;c<8;c++) {
    board[0][c] = {type:back[c], color:'b', moved:false};
    board[1][c] = {type:'P', color:'b', moved:false};
    board[6][c] = {type:'P', color:'w', moved:false};
    board[7][c] = {type:back[c], color:'w', moved:false};
  }
  turn = 'w';
  selected = null;
  legalForSelected = [];
  enPassant = null;
  history = [];
  capturedByWhite = [];
  capturedByBlack = [];
  moveLog = [];
  gameOver = false;
  pendingPromotion = null;
  aiThinking = false;
}

const inside = (r,c) => r>=0 && r<8 && c>=0 && c<8;
const opp = col => col==='w' ? 'b' : 'w';
function cloneBoard(b){ return b.map(row => row.map(cell => cell ? {...cell} : null)); }

function findKing(b, color){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=b[r][c];
    if(p && p.type==='K' && p.color===color) return {r,c};
  }
  return null;
}

function pseudoMoves(b, r, c, ep){
  const p = b[r][c];
  if(!p) return [];
  const moves = [];
  const color = p.color;
  const dir = color==='w' ? -1 : 1;
  const addSlide = (dirs) => {
    for(const [dr,dc] of dirs){
      let nr=r+dr, nc=c+dc;
      while(inside(nr,nc)){
        if(!b[nr][nc]){ moves.push({r:nr,c:nc}); }
        else { if(b[nr][nc].color!==color) moves.push({r:nr,c:nc,capture:true}); break; }
        nr+=dr; nc+=dc;
      }
    }
  };
  switch(p.type){
    case 'P': {
      if(inside(r+dir,c) && !b[r+dir][c]){
        moves.push({r:r+dir,c:c});
        const startRow = color==='w'?6:1;
        if(r===startRow && !b[r+2*dir][c]) moves.push({r:r+2*dir,c:c,double:true});
      }
      for(const dc of [-1,1]){
        const nr=r+dir, nc=c+dc;
        if(inside(nr,nc)){
          if(b[nr][nc] && b[nr][nc].color!==color) moves.push({r:nr,c:nc,capture:true});
          else if(ep && ep.r===nr && ep.c===nc) moves.push({r:nr,c:nc,capture:true,enpassant:true});
        }
      }
      break;
    }
    case 'N': {
      const deltas=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr,dc] of deltas){
        const nr=r+dr,nc=c+dc;
        if(inside(nr,nc) && (!b[nr][nc] || b[nr][nc].color!==color))
          moves.push({r:nr,c:nc,capture: !!b[nr][nc]});
      }
      break;
    }
    case 'B': addSlide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': addSlide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': addSlide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        const nr=r+dr,nc=c+dc;
        if(inside(nr,nc) && (!b[nr][nc] || b[nr][nc].color!==color))
          moves.push({r:nr,c:nc,capture: !!b[nr][nc]});
      }
      if(!p.moved){
        const row = r;
        const rookK = b[row][7];
        if(rookK && rookK.type==='R' && !rookK.moved && !b[row][5] && !b[row][6]){
          if(!isAttacked(b,row,4,opp(color)) && !isAttacked(b,row,5,opp(color)) && !isAttacked(b,row,6,opp(color)))
            moves.push({r:row,c:6,castle:'K'});
        }
        const rookQ = b[row][0];
        if(rookQ && rookQ.type==='R' && !rookQ.moved && !b[row][1] && !b[row][2] && !b[row][3]){
          if(!isAttacked(b,row,4,opp(color)) && !isAttacked(b,row,3,opp(color)) && !isAttacked(b,row,2,opp(color)))
            moves.push({r:row,c:2,castle:'Q'});
        }
      }
      break;
    }
  }
  return moves;
}

function isAttacked(b, r, c, byColor){
  const dir = byColor==='w' ? -1 : 1;
  for(const dc of [-1,1]){
    const pr=r-dir, pc=c+dc;
    if(inside(pr,pc)){ const p=b[pr][pc]; if(p && p.color===byColor && p.type==='P') return true; }
  }
  const kn=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const [dr,dc] of kn){ const nr=r+dr,nc=c+dc; if(inside(nr,nc)){const p=b[nr][nc]; if(p&&p.color===byColor&&p.type==='N') return true;} }
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0&&dc===0)continue; const nr=r+dr,nc=c+dc; if(inside(nr,nc)){const p=b[nr][nc]; if(p&&p.color===byColor&&p.type==='K') return true;} }
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
    let nr=r+dr,nc=c+dc;
    while(inside(nr,nc)){ const p=b[nr][nc]; if(p){ if(p.color===byColor&&(p.type==='B'||p.type==='Q')) return true; break;} nr+=dr;nc+=dc; }
  }
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    let nr=r+dr,nc=c+dc;
    while(inside(nr,nc)){ const p=b[nr][nc]; if(p){ if(p.color===byColor&&(p.type==='R'||p.type==='Q')) return true; break;} nr+=dr;nc+=dc; }
  }
  return false;
}

function simulateMove(b, from, to, ep){
  const nb = cloneBoard(b);
  const p = nb[from.r][from.c];
  if(p.type==='P' && to.enpassant){
    nb[from.r][to.c] = null;
  }
  if(p.type==='K' && to.castle){
    const row=from.r;
    if(to.castle==='K'){ nb[row][5]=nb[row][7]; nb[row][7]=null; if(nb[row][5]) nb[row][5].moved=true; }
    else { nb[row][3]=nb[row][0]; nb[row][0]=null; if(nb[row][3]) nb[row][3].moved=true; }
  }
  nb[to.r][to.c] = p;
  nb[from.r][from.c] = null;
  return nb;
}

function legalMoves(b, r, c, ep){
  const p=b[r][c];
  if(!p) return [];
  const pseudo = pseudoMoves(b,r,c,ep);
  return pseudo.filter(m=>{
    const nb = simulateMove(b,{r,c},m,ep);
    const k = findKing(nb,p.color);
    return k && !isAttacked(nb,k.r,k.c,opp(p.color));
  });
}

function allLegalMoves(b, color, ep){
  const list=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=b[r][c];
    if(p&&p.color===color){
      const lm=legalMoves(b,r,c,ep);
      for(const m of lm) list.push({from:{r,c},to:m});
    }
  }
  return list;
}

function pushHistory(){
  history.push({
    board: cloneBoard(board),
    turn, enPassant: enPassant?{...enPassant}:null,
    capturedByWhite:[...capturedByWhite],
    capturedByBlack:[...capturedByBlack],
    moveLog:[...moveLog],
    gameOver
  });
}

function makeMove(from, to){
  pushHistory();
  const p = board[from.r][from.c];
  const moverColor = p.color;
  let captured = null;
  if(p.type==='P' && to.enpassant){
    captured = board[from.r][to.c];
    board[from.r][to.c]=null;
  } else if(board[to.r][to.c]){
    captured = board[to.r][to.c];
  }
  if(captured){
    const sym = PIECES[captured.color+captured.type];
    if(moverColor==='w') capturedByWhite.push(sym); else capturedByBlack.push(sym);
  }
  if(p.type==='K' && to.castle){
    const row=from.r;
    if(to.castle==='K'){ board[row][5]=board[row][7]; board[row][7]=null; board[row][5].moved=true; }
    else { board[row][3]=board[row][0]; board[row][0]=null; board[row][3].moved=true; }
  }
  board[to.r][to.c]=p;
  board[from.r][from.c]=null;
  p.moved=true;
  enPassant = null;
  if(p.type==='P' && to.double){
    enPassant = {r:(from.r+to.r)/2, c:from.c};
  }
  const files='abcdefgh';
  const note = (p.type==='P'?'':p.type) + files[from.c]+(8-from.r) + (captured?'x':'-') + files[to.c]+(8-to.r);
  if(p.type==='P' && (to.r===0 || to.r===7)){
    pendingPromotion = {pos:{r:to.r,c:to.c}, color:moverColor, note};
    if (aiEnabled && moverColor === aiColor) {

      setTimeout(() => applyPromotion('Q'), 150);
    } else {
      showPromotion(moverColor);
    }
    return;
  }
  finishMove(note, moverColor);
}

function finishMove(note, moverColor){
  moveLog.push({color:moverColor, note});
  turn = opp(turn);
  checkEndState();
  render();
  
  triggerAI();
}

function applyPromotion(type){
  if(!pendingPromotion) return;
  const {pos,color,note} = pendingPromotion;
  board[pos.r][pos.c] = {type, color, moved:true};
  hidePromotion();
  const fullNote = note + '=' + type;
  pendingPromotion = null;
  finishMove(fullNote, color);
}

function checkEndState(){
  const moves = allLegalMoves(board, turn, enPassant);
  const k = findKing(board, turn);
  const inCheck = k && isAttacked(board,k.r,k.c,opp(turn));
  if(moves.length===0){
    gameOver = true;
    if(inCheck){
      const winner = turn==='w'?'Pretas':'Brancas';
      setStatus('Xeque-mate! '+winner+' vencem!', turn);
    } else {
      setStatus('Empate por afogamento (stalemate)', turn);
    }
  } else if(inCheck){
    setStatus((turn==='w'?'Brancas':'Pretas')+' em XEQUE!', turn);
  } else {
    setStatus('Vez das '+(turn==='w'?'Brancas':'Pretas'), turn);
  }
}

function triggerAI() {
  if (!aiEnabled || gameOver || turn !== aiColor || pendingPromotion || aiThinking) {
    return;
  }
  aiThinking = true;

  const dot = `<span class="turn-dot" style="background:${turn==='w'?'#fff':'#1a1a1a'}"></span>`;
  if (statusEl) {
    statusEl.innerHTML = dot + 'IA pensando... <span style="font-size:0.8em;opacity:0.8;">(calculando jogada)</span>';
  }
  
  setTimeout(() => {
    const bestMove = getBestAIMove();
    aiThinking = false;
    if (bestMove) {
      makeMove(bestMove.from, bestMove.to);
    }
  }, 250);
}

function simulateMoveForAI(b, from, to, ep){
  const nb = cloneBoard(b);
  const p = nb[from.r][from.c];
  if(p.type==='P' && to.enpassant){
    nb[from.r][to.c] = null;
  }
  if(p.type==='K' && to.castle){
    const row=from.r;
    if(to.castle==='K'){ nb[row][5]=nb[row][7]; nb[row][7]=null; if(nb[row][5]) nb[row][5].moved=true; }
    else { nb[row][3]=nb[row][0]; nb[row][0]=null; if(nb[row][3]) nb[row][3].moved=true; }
  }
  nb[to.r][to.c] = p;
  nb[from.r][from.c] = null;

  if (p.type === 'P' && (to.r === 0 || to.r === 7)) {
    p.type = 'Q';
  }
  if(p) p.moved = true;
  return nb;
}

function evaluateBoard(currentBoard) {
  let totalScore = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (!p) continue;
      
      const weight = EVAL_WEIGHTS[p.type] || 0;
      const pstRow = p.color === 'w' ? r : (7 - r);
      const pstVal = (PST[p.type] && PST[p.type][pstRow]) ? PST[p.type][pstRow][c] : 0;
      const pieceScore = weight + pstVal;
      
      if (p.color === aiColor) {
        totalScore += pieceScore;
      } else {
        totalScore -= pieceScore;
      }
    }
  }
  return totalScore;
}

function minimax(currentBoard, depth, alpha, beta, isMaximizing, currentColor, ep) {
  const moves = allLegalMoves(currentBoard, currentColor, ep);
  
  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      const k = findKing(currentBoard, currentColor);
      const inCheck = k && isAttacked(currentBoard, k.r, k.c, opp(currentColor));
      if (inCheck) {

        return isMaximizing ? -100000 - depth : 100000 + depth;
      } else {
        return 0; 
      }
    }
    return evaluateBoard(currentBoard);
  }

  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.to.capture) {
      const target = currentBoard[a.to.r][a.to.c];
      scoreA += target ? (EVAL_WEIGHTS[target.type] || 100) : 100;
    }
    if (b.to.capture) {
      const target = currentBoard[b.to.r][b.to.c];
      scoreB += target ? (EVAL_WEIGHTS[target.type] || 100) : 100;
    }
    if (a.to.r === 0 || a.to.r === 7) scoreA += 800;
    if (b.to.r === 0 || b.to.r === 7) scoreB += 800;
    return scoreB - scoreA;
  });

  const nextColor = opp(currentColor);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const nb = simulateMoveForAI(currentBoard, m.from, m.to, ep);
      let nextEp = null;
      if (currentBoard[m.from.r][m.from.c].type === 'P' && m.to.double) {
        nextEp = { r: (m.from.r + m.to.r) / 2, c: m.from.c };
      }
      const evalScore = minimax(nb, depth - 1, alpha, beta, false, nextColor, nextEp);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; 
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const nb = simulateMoveForAI(currentBoard, m.from, m.to, ep);
      let nextEp = null;
      if (currentBoard[m.from.r][m.from.c].type === 'P' && m.to.double) {
        nextEp = { r: (m.from.r + m.to.r) / 2, c: m.from.c };
      }
      const evalScore = minimax(nb, depth - 1, alpha, beta, true, nextColor, nextEp);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; 
    }
    return minEval;
  }
}

function getBestAIMove() {
  const moves = allLegalMoves(board, aiColor, enPassant);
  if (moves.length === 0) return null;

  if (aiDifficulty === 1 && Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.to.capture) {
      const target = board[a.to.r][a.to.c];
      scoreA += target ? (EVAL_WEIGHTS[target.type] || 100) : 100;
    }
    if (b.to.capture) {
      const target = board[b.to.r][b.to.c];
      scoreB += target ? (EVAL_WEIGHTS[target.type] || 100) : 100;
    }
    if (a.to.r === 0 || a.to.r === 7) scoreA += 800;
    if (b.to.r === 0 || b.to.r === 7) scoreB += 800;
    return scoreB - scoreA;
  });

  const depthMap = { 1: 2, 2: 3, 3: 3, 4: 4 };
  const searchDepth = depthMap[aiDifficulty] || 3;

  let bestMove = null;
  let bestValue = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const m of moves) {
    const nb = simulateMoveForAI(board, m.from, m.to, enPassant);
    let nextEp = null;
    if (board[m.from.r][m.from.c].type === 'P' && m.to.double) {
      nextEp = { r: (m.from.r + m.to.r) / 2, c: m.from.c };
    }
    const moveVal = minimax(nb, searchDepth - 1, alpha, beta, false, opp(aiColor), nextEp);
    
    const noise = (Math.random() - 0.5) * 2;
    if (moveVal + noise > bestValue) {
      bestValue = moveVal + noise;
      bestMove = m;
    }
    alpha = Math.max(alpha, bestValue);
  }

  return bestMove || moves[0];
}

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

function setStatus(text, color){
  if (!statusEl) return;
  const dot = `<span class="turn-dot" style="background:${color==='w'?'#fff':'#1a1a1a'}"></span>`;
  statusEl.innerHTML = (gameOver? '' : dot) + text;
}

function render(){
  if (!boardEl) return;
  boardEl.innerHTML='';
  const lastMove = moveLog.length? null : null;
  const lastEntry = history.length ? history[history.length-1] : null;
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  let checkSq=null;
  const k = findKing(board, turn);
  if(k && isAttacked(board,k.r,k.c,opp(turn))) checkSq=k;
  for(const r of rows){
    for(const c of cols){
      const sq=document.createElement('div');
      sq.className='square '+((r+c)%2===0?'light':'dark');
      sq.dataset.r=r; sq.dataset.c=c;
      const p=board[r][c];
      
    if (p) {
        const img = document.createElement("img");
        img.src = PIECES[p.color + p.type];
        img.className = "piece-img";
        img.draggable = false;
        sq.appendChild(img);
    }
      if(selected && selected.r===r && selected.c===c) sq.classList.add('selected');
      const lm = legalForSelected.find(m=>m.r===r&&m.c===c);
      if(lm){ sq.classList.add(lm.capture? 'legal-capture':'legal-move'); }
      if(checkSq && checkSq.r===r && checkSq.c===c) sq.classList.add('in-check');
      sq.addEventListener('click', ()=>onSquareClick(r,c));
      boardEl.appendChild(sq);
    }
  }
  renderSideInfo();
  renderCoords(rows, cols);
}

function renderCoords(rows, cols){
  const files='abcdefgh';
  const ranksEl=document.getElementById('ranks');
  const filesEl=document.getElementById('files');
  if (ranksEl) ranksEl.innerHTML = rows.map(r=>`<div>${8-r}</div>`).join('');
  if (filesEl) filesEl.innerHTML = cols.map(c=>`<div style="width:60px;text-align:center">${files[c]}</div>`).join('');
}

function renderSideInfo(){
    const white = document.getElementById("capturedByWhite");
    const black = document.getElementById("capturedByBlack");
    if (white) white.innerHTML = "";
    if (black) black.innerHTML = "";
    capturedByWhite.forEach(src=>{
        const img = document.createElement("img");
        img.src = src;
        img.className = "captured-piece";
        if (white) white.appendChild(img);
    });
    capturedByBlack.forEach(src=>{
        const img = document.createElement("img");
        img.src = src;
        img.className = "captured-piece";
        if (black) black.appendChild(img);
    });
    const ml=document.getElementById('movesList');
    let html='';
    for(let i=0;i<moveLog.length;i+=2){
        const n=(i/2)+1;
        const w=moveLog[i]?moveLog[i].note:'';
        const b=moveLog[i+1]?moveLog[i+1].note:'';
        html+=`<div>${n}. ${w} ${b}</div>`;
    }
    if (ml) ml.innerHTML=html;
}

function onSquareClick(r,c){

  if(gameOver || pendingPromotion || aiThinking || (aiEnabled && turn === aiColor)) return;
  
  const p=board[r][c];
  if(selected){
    const move = legalForSelected.find(m=>m.r===r&&m.c===c);
    if(move){
      const from={...selected};
      selected=null; legalForSelected=[];
      makeMove(from, move);
      return;
    }
    if(p && p.color===turn){
      selected={r,c};
      legalForSelected=legalMoves(board,r,c,enPassant);
      render();
      return;
    }
    selected=null; legalForSelected=[];
    render();
    return;
  }
  if(p && p.color===turn){
    selected={r,c};
    legalForSelected=legalMoves(board,r,c,enPassant);
    render();
  }
}

function showPromotion(color){
  const choices=document.getElementById('promoChoices');
  if (!choices) return;
  choices.innerHTML='';
  ['Q','R','B','N'].forEach(t=>{
    const d=document.createElement('div');
    const img = document.createElement("img");
    img.src = PIECES[color + t];
    img.className = "piece-img";
    d.appendChild(img);
    d.onclick=()=>applyPromotion(t);
    choices.appendChild(d);
  });
  const modal = document.getElementById('promoModal');
  if (modal) modal.classList.add('show');
}

function hidePromotion(){ 
  const modal = document.getElementById('promoModal');
  if (modal) modal.classList.remove('show'); 
}

const newGameBtn = document.getElementById('newGameBtn');
if (newGameBtn) {
  newGameBtn.onclick=()=>{ 
    initBoard(); 
    setStatus('Vez das Brancas','w'); 
    render(); 
    triggerAI(); 
  };
}

const undoBtn = document.getElementById('undoBtn');
if (undoBtn) {
  undoBtn.onclick=()=>{
    if(pendingPromotion || aiThinking) return;
    if(history.length===0) return;
    
    const movesToUndo = (aiEnabled && aiColor && history.length >= 2 && turn !== aiColor) ? 2 : 1;
    
    for (let i = 0; i < movesToUndo; i++) {
      if (history.length === 0) break;
      const s = history.pop();
      board = s.board; turn = s.turn; enPassant = s.enPassant;
      capturedByWhite = s.capturedByWhite; capturedByBlack = s.capturedByBlack;
      moveLog = s.moveLog; gameOver = s.gameOver;
    }
    
    selected=null; legalForSelected=[];
    setStatus('Vez das '+(turn==='w'?'Brancas':'Pretas'),turn);
    render();
  };
}

const flipBtn = document.getElementById('flipBtn');
if (flipBtn) {
  flipBtn.onclick=()=>{ flipped=!flipped; render(); };
}

function initAIControls() {
  const container = document.querySelector('.controls') || document.body;
  if (!document.getElementById('aiControlPanel')) {
    const panel = document.createElement('div');
    panel.id = 'aiControlPanel';
    panel.style.cssText = 'margin: 10px 0; display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; font-family: sans-serif; font-size: 14px;';
    
    panel.innerHTML = `
    <div class="ia">
     <div class="cima">
      <label style="font-weight:bold; cursor:pointer;">
        <input type="checkbox" id="aiToggleBtn" checked> Ativar IA
      </label>
      <select id="aiColorSelect" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;">
        <option value="b" selected>IA: Pretas</option>
        <option value="w">IA: Brancas</option>
      </select>
      <select id="aiDiffSelect" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;">
        <option value="1">Nível: Fácil</option>
        <option value="2">Nível: Médio</option>
        <option value="3" selected>Nível: Difícil</option>
        <option value="4">Nível: Mestre</option>
      </select>
     </div>
     <div class="baixo">
      <p class="absolute">Desenvolvido por <a href="https://mateusrmelo-collab.github.io/DevMateus/">DevMateus</a></p>
     </div>
    </div>
    `;
    
    const btnGroup = document.getElementById('newGameBtn') ? document.getElementById('newGameBtn').parentNode : null;
    if (btnGroup && btnGroup.parentNode) {
      btnGroup.parentNode.insertBefore(panel, btnGroup.nextSibling);
    } else {
      container.appendChild(panel);
    }

    document.getElementById('aiToggleBtn').addEventListener('change', (e) => {
      aiEnabled = e.target.checked;
      document.getElementById('aiColorSelect').disabled = !aiEnabled;
      document.getElementById('aiDiffSelect').disabled = !aiEnabled;
      if (aiEnabled) triggerAI();
    });

    document.getElementById('aiColorSelect').addEventListener('change', (e) => {
      aiColor = e.target.value;
      if (aiColor === 'w' && !flipped) { flipped = true; render(); }
      else if (aiColor === 'b' && flipped) { flipped = false; render(); }
      triggerAI();
    });

    document.getElementById('aiDiffSelect').addEventListener('change', (e) => {
      aiDifficulty = parseInt(e.target.value, 10);
    });
  }
}

initBoard();
render();

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initAIControls);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAIControls();
  }
}
