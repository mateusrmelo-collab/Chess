
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
    showPromotion(moverColor);
    return; 
  }

  finishMove(note, moverColor);
}

function finishMove(note, moverColor){
  moveLog.push({color:moverColor, note});
  turn = opp(turn);
  checkEndState();
  render();
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
      setStatus('♚ Xeque-mate! '+winner+' vencem!', turn);
    } else {
      setStatus('Empate por afogamento (stalemate)', turn);
    }
  } else if(inCheck){
    setStatus((turn==='w'?'Brancas':'Pretas')+' em XEQUE!', turn);
  } else {
    setStatus('Vez das '+(turn==='w'?'Brancas':'Pretas'), turn);
  }
}

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

function setStatus(text, color){
  const dot = `<span class="turn-dot" style="background:${color==='w'?'#fff':'#1a1a1a'}"></span>`;
  statusEl.innerHTML = (gameOver? '' : dot) + text;
}

function render(){
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
  ranksEl.innerHTML = rows.map(r=>`<div>${8-r}</div>`).join('');
  filesEl.innerHTML = cols.map(c=>`<div style="width:60px;text-align:center">${files[c]}</div>`).join('');
}

function renderSideInfo(){

    const white = document.getElementById("capturedByWhite");
    const black = document.getElementById("capturedByBlack");

    white.innerHTML = "";
    black.innerHTML = "";

    capturedByWhite.forEach(src=>{
        const img = document.createElement("img");
        img.src = src;
        img.className = "captured-piece";
        white.appendChild(img);
    });

    capturedByBlack.forEach(src=>{
        const img = document.createElement("img");
        img.src = src;
        img.className = "captured-piece";
        black.appendChild(img);
    });

    const ml=document.getElementById('movesList');
    let html='';
    for(let i=0;i<moveLog.length;i+=2){
        const n=(i/2)+1;
        const w=moveLog[i]?moveLog[i].note:'';
        const b=moveLog[i+1]?moveLog[i+1].note:'';
        html+=`<div>${n}. ${w} ${b}</div>`;
    }
    ml.innerHTML=html;
}

function onSquareClick(r,c){
  if(gameOver || pendingPromotion) return;
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
  document.getElementById('promoModal').classList.add('show');
}
function hidePromotion(){ document.getElementById('promoModal').classList.remove('show'); }

document.getElementById('newGameBtn').onclick=()=>{ initBoard(); setStatus('Vez das Brancas','w'); render(); };
document.getElementById('undoBtn').onclick=()=>{
  if(pendingPromotion){ return; }
  if(history.length===0) return;
  const s=history.pop();
  board=s.board; turn=s.turn; enPassant=s.enPassant;
  capturedByWhite=s.capturedByWhite; capturedByBlack=s.capturedByBlack;
  moveLog=s.moveLog; gameOver=s.gameOver;
  selected=null; legalForSelected=[];
  setStatus('Vez das '+(turn==='w'?'Brancas':'Pretas'),turn);
  render();
};
document.getElementById('flipBtn').onclick=()=>{ flipped=!flipped; render(); };

initBoard();
render();