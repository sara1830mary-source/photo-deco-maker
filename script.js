/* ============================================================
   写真デコメーカー(雛形) - CodePen「JS」パネルに貼るコード
   ============================================================ */

const camera       = document.getElementById('camera');
const cameraError  = document.getElementById('cameraError');
const stage        = document.getElementById('stage');
const photoCanvas  = document.getElementById('photoCanvas');
const frameOverlay = document.getElementById('frameOverlay');
const shutterBtn   = document.getElementById('shutterBtn');
const uploadInput  = document.getElementById('uploadInput');
const captureControls = document.getElementById('captureControls');
const retakeBtn    = document.getElementById('retakeBtn');
const saveBtn      = document.getElementById('saveBtn');
const frameSwatches = document.getElementById('frameSwatches');
const stickerTray  = document.getElementById('stickerTray');
const drawCanvas   = document.getElementById('drawCanvas');
const penToggleBtn = document.getElementById('penToggleBtn');
const penColors    = document.getElementById('penColors');
const penSizes     = document.getElementById('penSizes');
const clearDrawBtn = document.getElementById('clearDrawBtn');

// アップロード写真を読み込むときの基準サイズ(4:3)。
// ★アレンジ例: 大きくすると保存される画像の解像度も上がる
const PHOTO_WIDTH  = 1280;
const PHOTO_HEIGHT = 960;

const STICKER_SIZE = 48; // CSSの .sticker { font-size: 48px; } と揃えておく数値

/* ---------- シールの一覧(絵文字 + 画像) ----------
   ★アレンジ例: ここに好きなシールを追加・削除してね。

   画像シールを追加するときの注意:
   1) URLは「ページのリンク」ではなく「画像ファイルへの直リンク」にすること。
      例: ibb.co の場合、共有画面で「直リンク / Direct link」を選ぶと
          https://i.ibb.co/xxxxxxx/example.png のような、
          末尾が .png / .jpg などで終わるURLが手に入ります。
          https://ibb.co/JWJ46nKr のような「ページURL」は画像として読み込めません。
   2) 画像を「保存する」ボタンで合成するには、画像サーバーが
      CORS(クロスオリジン)を許可している必要があります。
      許可されていない画像は、プレビュー(貼り付け・移動)はできても
      保存時にエラーになることがあります。その場合は別の画像ホスティングを
      試すか、保存はスクリーンショットで代用してください。
------------------------------------------------------------ */
const STICKER_ITEMS = [
  { type: 'emoji', value: '🎀' },
  { type: 'emoji', value: '✨' },
  { type: 'emoji', value: '💖' },
  { type: 'emoji', value: '🌟' },
  { type: 'emoji', value: '🫶' },
  { type: 'emoji', value: '👼' },
  { type: 'emoji', value: '☁️' },
  { type: 'emoji', value: '🪽' },

  // ★画像シールの例(直リンクをそのまま指定しています)
  { type: 'image', value: 'https://i.ibb.co/SDm372jw/image.jpg' },
];

let stickers = []; // 貼ったシールの情報 [{el, type, value, xPercent, yPercent}, ...]
let stream = null;

/* ---------- フレームの一覧(色 + 画像) ----------
   ★アレンジ例: ここに好きなフレームを追加・削除してね。

   画像フレームを追加するときの注意:
   1) 用意する画像は「縦横比 4:3」で作るのがおすすめです(ステージが4:3のため)。
      目安サイズ: 1200×900px 以上(印刷や拡大にも耐えられるよう少し大きめ推奨)。
   2) 画像の「まんなか」を透明(透過PNG)にして、周りだけに枠のイラストを描いてください。
      透明にする範囲の目安: 上下左右それぞれ画像サイズの約10%を「枠(不透明)」にして、
      残りの中央 約80% を透明の窓にすると、写真がちょうどよく見えます。
      (例: 1200×900の画像なら、外側120px前後を枠、中央960×660あたりを透明窓に)
   3) 保存(ダウンロード)にはURLの画像サーバーがCORSを許可している必要があります。
      シール画像と同じ注意点です。
   4) URLは「ページのリンク」ではなく「画像ファイルへの直リンク」(.png/.jpg)を使ってください。
------------------------------------------------------------ */
const FRAME_ITEMS = [  { type: 'color', value: 'frame-pink',   swatch: '#FF3D81', label: 'ピンク' },  { type: 'color', value: 'frame-cyan',   swatch: '#3DDBFF', label: 'シアン' },  { type: 'color', value: 'frame-yellow', swatch: '#FFE066', label: 'イエロー' },  { type: 'color', value: 'frame-mint',   swatch: '#7CE8B4', label: 'ミント' },  { type: 'color', value: 'frame-purple', swatch: '#B28DFF', label: 'パープル' }, // ★追加/  { type: 'image', value: 'https://i.ibb.co/ここに自分の画像の直リンク/frame.png', label: 'オリジナル枠' },  // ★ コメントを外して、URLを自分の画像に];

  // ★ここに画像フレームを追加(直リンクに書き換えてください)
  // { type: 'image', value: 'https://i.ibb.co/xxxxxxx/frame.png', label: 'オリジナル枠' },
];

let currentFrame = FRAME_ITEMS[0]; // 現在選ばれているフレーム

/* ---------- カメラを起動する ---------- */
async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      // 4:3に近い解像度を優先してもらう(枠画像とアスペクト比を揃えるため)
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
        console.error(stream);
    camera.srcObject = stream;
         console.error("-2--");
     
  }catch(err){
    // カメラが使えなくても、アップロード機能は使えるようにしておく
    console.error("---");
    cameraError.hidden = false;
    camera.hidden = true;
    console.error(err);
  }
}
startCamera();

/* ---------- 撮影後の共通処理(表示切り替え・カメラ停止) ---------- */
function finishCapture(){
  camera.hidden = true;
  photoCanvas.hidden = false;
  captureControls.hidden = true;
  retakeBtn.hidden = false;

  // カメラは使い終わったら止めておく(電池・プライバシーの配慮)
  if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
}

/* ---------- 撮影する ---------- */
const countdownEl = document.getElementById('countdown');   // ★ ファイル先頭の const 群に追加してもOK// ★ 撮影そのものは関数に切り出すfunction takePhoto(){  const ctx = photoCanvas.getContext('2d');  photoCanvas.width  = camera.videoWidth;  photoCanvas.height = camera.videoHeight;  ctx.drawImage(camera, 0, 0, photoCanvas.width, photoCanvas.height);  finishCapture();}shutterBtn.addEventListener('click', () => {  if (!camera.videoWidth){    alert('カメラが使えないようです。「写真をアップロード」から画像を選んでね。');    return;  }  let count = 3;                         // ★ カウントダウンの秒数  shutterBtn.disabled = true;            // 連打できないようにする  countdownEl.textContent = count;  countdownEl.hidden = false;  const timer = setInterval(() => {      // ★ 1秒ごとに実行    count--;    if (count > 0){      countdownEl.textContent = count;    } else {      clearInterval(timer);              // タイマーを止める      countdownEl.hidden = true;      shutterBtn.disabled = false;      takePhoto();                       // 0になったら撮影    }  }, 1000);});

/* ---------- 写真をアップロードする ----------
   選んだ画像は、ステージと同じ 4:3 になるよう中央を切り抜いて読み込みます
   (object-fit: cover と同じ考え方)。
------------------------------------------------------------ */
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width  = PHOTO_WIDTH;
    photoCanvas.height = PHOTO_HEIGHT;
    drawImageCover(ctx, img, PHOTO_WIDTH, PHOTO_HEIGHT);
    finishCapture();
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => {
    alert('この画像は読み込めませんでした。別の画像を試してね。');
  };
  img.src = URL.createObjectURL(file);

  uploadInput.value = ''; // 同じファイルを選び直せるようにリセット
});

/* 画像を、周りをはみ出させながら中央基準でぴったり収める(cover)描画 */
function drawImageCover(ctx, img, targetWidth, targetHeight){
  const targetRatio = targetWidth / targetHeight;
  const imgRatio = img.width / img.height;
  let sx, sy, sw, sh;

  if (imgRatio > targetRatio){
    // 画像が横長すぎる → 左右を切り取る
    sh = img.height;
    sw = sh * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // 画像が縦長すぎる → 上下を切り取る
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

/* ---------- 撮り直す ---------- */
retakeBtn.addEventListener('click', () => {
  camera.hidden = false;
  cameraError.hidden = true;
  photoCanvas.hidden = true;
  captureControls.hidden = false;
  retakeBtn.hidden = true;
  clearStickers();
  clearDrawing();
  startCamera();
});

/* ---------- フレームのボタンを FRAME_ITEMS から自動生成する ---------- */
function renderFrameSwatches(){
  FRAME_ITEMS.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.dataset.index = index;
    btn.setAttribute('aria-label', item.label || 'フレーム');

    if (item.type === 'image'){
      btn.classList.add('swatch-image');
      const img = document.createElement('img');
      img.src = item.value;
      img.alt = '';
      btn.appendChild(img);
    } else {
      btn.style.setProperty('--sw', item.swatch || '#ccc');
    }

    if (item === currentFrame) btn.classList.add('active');
    frameSwatches.appendChild(btn);
  });
}
renderFrameSwatches();

/* ---------- フレームを切り替える ---------- */
frameSwatches.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch');
  if (!btn) return;
  applyFrame(FRAME_ITEMS[Number(btn.dataset.index)]);

  // 選択中の見た目を更新
  frameSwatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
});

function applyFrame(item){
  currentFrame = item;
  stage.classList.remove('frame-pink', 'frame-cyan', 'frame-yellow', 'frame-mint', 'frame-image-active');

  if (item.type === 'image'){
    frameOverlay.crossOrigin = 'anonymous'; // 保存時にキャンバスへ描けるようにする
    frameOverlay.src = item.value;
    frameOverlay.hidden = false;
    stage.classList.add('frame-image-active');
  } else {
    frameOverlay.hidden = true;
    frameOverlay.removeAttribute('src');
    stage.classList.add(item.value);
  }
}

/* ---------- ペンで書き込む ----------
   drawCanvas は stage と同じ範囲に重ねた、書き込み専用のキャンバス。
   ペンモードがONのときだけ pointer-events を有効にして、
   OFFのときはシールのドラッグ操作を邪魔しないようにしている。
------------------------------------------------------------ */
let penMode = false;
let penColor = '#22223B';
let penSize = 6;
let isDrawing = false;

function setupDrawCanvas(){
  // 表示サイズ(CSSピクセル)に合わせてキャンバスの解像度を設定する
  const rect = stage.getBoundingClientRect();
  drawCanvas.width = rect.width;
  drawCanvas.height = rect.height;
}
setupDrawCanvas();
// ★アレンジ例: ウィンドウサイズが変わったときも追従させたい場合は
// window.addEventListener('resize', setupDrawCanvas); を有効にしてね
// (ただし今描いている内容は消えてしまいます)

penToggleBtn.addEventListener('click', () => {
  penMode = !penMode;
  penToggleBtn.classList.toggle('active', penMode);
  drawCanvas.classList.toggle('pen-active', penMode);
  drawCanvas.style.pointerEvents = penMode ? 'auto' : 'none';
});

penColors.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch');
  if (!btn) return;
  penColor = btn.dataset.color;
  penColors.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
});

penSizes.addEventListener('click', (e) => {
  const btn = e.target.closest('.pen-size-btn');
  if (!btn) return;
  penSize = Number(btn.dataset.size);
  penSizes.querySelectorAll('.pen-size-btn').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
});

function clearDrawing(){
  const ctx = drawCanvas.getContext('2d');
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}
clearDrawBtn.addEventListener('click', clearDrawing);

function getDrawPos(e){
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (drawCanvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (drawCanvas.height / rect.height)
  };
}

drawCanvas.addEventListener('pointerdown', (e) => {
  if (!penMode) return;
  isDrawing = true;
  drawCanvas.setPointerCapture(e.pointerId);
  const ctx = drawCanvas.getContext('2d');
  const pos = getDrawPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

drawCanvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  const ctx = drawCanvas.getContext('2d');
  const pos = getDrawPos(e);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = penColor;
  ctx.lineWidth = penSize;
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

drawCanvas.addEventListener('pointerup', () => { isDrawing = false; });
drawCanvas.addEventListener('pointercancel', () => { isDrawing = false; });

/* ---------- シールのボタンを STICKER_ITEMS から自動生成する ---------- */
function renderStickerTray(){
  STICKER_ITEMS.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = 'sticker-btn';
    btn.dataset.index = index;

    if (item.type === 'image'){
      const img = document.createElement('img');
      img.src = item.value;
      img.alt = 'シール';
      btn.appendChild(img);
    } else {
      btn.textContent = item.value;
    }

    stickerTray.appendChild(btn);
  });
}
renderStickerTray();

/* ---------- シールを貼る ---------- */
stickerTray.addEventListener('click', (e) => {
  const btn = e.target.closest('.sticker-btn');
  if (!btn) return;
  const item = STICKER_ITEMS[Number(btn.dataset.index)];
  addSticker(item, 50, 50); // まずは真ん中(50%, 50%)に配置
});

function addSticker(item, xPercent, yPercent){
  const el = document.createElement('div');
  el.className = 'sticker';
  el.style.left = xPercent + '%';
  el.style.top  = yPercent + '%';

  let imgEl = null;
  if (item.type === 'image'){
    el.classList.add('sticker-image');
    imgEl = document.createElement('img');
    imgEl.crossOrigin = 'anonymous'; // 保存時にキャンバスへ描けるようにする
    imgEl.src = item.value;
    imgEl.alt = 'シール';
    el.appendChild(imgEl);
  } else {
    el.textContent = item.value;
  }

  stage.appendChild(el);
  makeDraggable(el);
  stickers.push({ el, imgEl, type: item.type, value: item.value, xPercent, yPercent });
}

function clearStickers(){
  stickers.forEach(s => s.el.remove());
  stickers = [];
}

/* ---------- シールをドラッグできるようにする ---------- */
function makeDraggable(el){
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      const rect = stage.getBoundingClientRect();
      let xPercent = ((ev.clientX - rect.left) / rect.width)  * 100;
      let yPercent = ((ev.clientY - rect.top)  / rect.height) * 100;
      xPercent = Math.min(100, Math.max(0, xPercent));
      yPercent = Math.min(100, Math.max(0, yPercent));

      el.style.left = xPercent + '%';
      el.style.top  = yPercent + '%';

      const data = stickers.find(s => s.el === el);
      if (data){ data.xPercent = xPercent; data.yPercent = yPercent; }
    };

    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  });
}

/* ---------- 1枚の画像として保存する ---------- */
saveBtn.addEventListener('click', () => {
  if (photoCanvas.hidden){
    alert('先に撮影してね！');
    return;
  }

  // 写真・フレーム・シールをまとめて1枚のcanvasに描き直す
  const out = document.createElement('canvas');
  out.width  = photoCanvas.width;
  out.height = photoCanvas.height;
  const ctx = out.getContext('2d');

  // ① 写真本体
  ctx.drawImage(photoCanvas, 0, 0);

  // ② フレーム(色 or 画像)
  if (currentFrame.type === 'image' && frameOverlay.naturalWidth > 0){
    try{
      ctx.drawImage(frameOverlay, 0, 0, out.width, out.height);
    }catch(err){
      console.error(err);
      alert('フレーム画像を保存用に描画できませんでした(CORSの可能性があります)。\n色フレームで試してみてください。');
      return;
    }
  } else {
    const frameColor = getComputedStyle(stage).getPropertyValue('--frame').trim();
    const lineWidth = out.width * 0.02;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = frameColor;
    ctx.setLineDash([out.width * 0.03, out.width * 0.02]);
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, out.width - lineWidth, out.height - lineWidth);
  }

  // ③ シール(画面上の見た目と同じ縮尺で描く)
  const stageRect = stage.getBoundingClientRect();
  const scale = out.width / stageRect.width;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  stickers.forEach(s => {
    const cx = (s.xPercent / 100) * out.width;
    const cy = (s.yPercent / 100) * out.height;

    if (s.type === 'image' && s.imgEl && s.imgEl.naturalWidth > 0){
      // 画面上での表示サイズをそのまま拡大縮小して描く
      const rect = s.el.getBoundingClientRect();
      const dw = rect.width  * scale;
      const dh = rect.height * scale;
      ctx.drawImage(s.imgEl, cx - dw / 2, cy - dh / 2, dw, dh);
    } else if (s.type === 'emoji') {
      ctx.font = (STICKER_SIZE * scale) + 'px sans-serif';
      ctx.fillText(s.value, cx, cy);
    }
  });

  // ④ ペンの書き込み(いちばん上に重ねる)
  ctx.drawImage(drawCanvas, 0, 0, out.width, out.height);

  // ⑤ ダウンロード
  try{
    const link = document.createElement('a');
    link.download = 'photo-deco.png';
    link.href = out.toDataURL('image/png');
    link.click();
  }catch(err){
    // 画像シールがCORSを許可していないホストの場合、ここでエラーになることがある
    console.error(err);
    alert('保存できませんでした。画像シールの読み込み元がCORSに対応していない可能性があります。\n別の画像ホスティングを試すか、絵文字シールだけで保存してみてください。');
  }
});

const beautySlider = document.getElementById("beautySlider");
const beautyLevel = document.getElementById("beautyLevel");

function updateBeautyFilter() {
  const value = Number(beautySlider.value);

  const brightness = 1 + value * 0.0012;
  const saturation = 1 + value * 0.006;
  const contrast = 1 - value * 0.001;

  stage.style.setProperty("--beauty-brightness", brightness);
  stage.style.setProperty("--beauty-saturation", saturation);
  stage.style.setProperty("--beauty-contrast", contrast);

  beautyLevel.textContent =
    value < 25 ? "ナチュラル ✨" :
    value < 60 ? "ふんわり盛れ 🩷" :
    "プリクラ風 🎀";
}

beautySlider.addEventListener("input", updateBeautyFilter);
