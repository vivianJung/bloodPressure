// 탭 전환 기능
function openTab(tabId) {
  const contents = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-btn');

  contents.forEach(content => content.classList.remove('active'));
  buttons.forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');

  if (tabId === 'tab-list') renderRecords();
  if (tabId === 'tab-chart') renderChart();
  if (tabId === 'tab-calendar') renderCalendar();
}

// 이미지 불러오기 및 LCD 화면 검은색 뭉개짐 방지 자동 명암 처리
function processImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = function() {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const hint = document.getElementById('imageStatusHint');

    canvas.width = img.width;
    canvas.height = img.height;

    // [핵심] LCD 화면이 검게 뭉개지지 않도록 대치 감도 및 명암 밝기 자동 보정
    ctx.filter = 'contrast(180%) brightness(110%) grayscale(100%)';
    ctx.drawImage(img, 0, 0);

    canvas.style.display = 'block';
    hint.style.display = 'none';

    // (참고) 사진 인식 시 기본 수치 가이드 자동 채움 예시
    document.getElementById('sysInput').value = 120;
    document.getElementById('diaInput').value = 80;
    document.getElementById('pulseInput').value = 70;
  };

  img.src = URL.createObjectURL(file);
}

// 데이터 저장기능 (Local Storage)
function saveRecord() {
  const sys = document.getElementById('sysInput').value;
  const dia = document.getElementById('diaInput').value;
  const pulse = document.getElementById('pulseInput').value;

  if (!sys || !dia || !pulse) {
    alert('수축기, 이완기, 맥박 수치를 입력해주세요.');
    return;
  }

  const record = {
    id: Date.now(),
    date: new Date().toLocaleString('ko-KR'),
    sys: parseInt(sys),
    dia: parseInt(dia),
    pulse: parseInt(pulse)
  };

  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]');
  records.unshift(record);
  localStorage.setItem('bpRecords', JSON.stringify(records));

  alert('혈압 기록이 저장되었습니다!');
  document.getElementById('sysInput').value = '';
  document.getElementById('diaInput').value = '';
  document.getElementById('pulseInput').value = '';
}

// 기록 목록 보기
function renderRecords() {
  const listEl = document.getElementById('recordList');
  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]');

  if (records.length === 0) {
    listEl.innerHTML = '<li style="text-align:center; padding:20px; color:#888;">저장된 기록이 없습니다.</li>';
    return;
  }

  listEl.innerHTML = records.map(r => `
    <li class="record-item">
      <div>
        <strong style="color:#2563eb;">${r.sys} / ${r.dia} mmHg</strong> (맥박: ${r.pulse})
        <div style="font-size:0.75rem; color:#888;">${r.date}</div>
      </div>
    </li>
  `).join('');
}

// 데이터 전체 삭제
function clearAllData() {
  if (confirm('모든 혈압 기록을 삭제하시겠습니까?')) {
    localStorage.removeItem('bpRecords');
    renderRecords();
  }
}

// 선형 차트 보기
let chartInstance = null;
function renderChart() {
  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]').reverse();
  const ctx = document.getElementById('bpChart').getContext('2d');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r => r.date.split('. ')[2] || r.date),
      datasets: [
        { label: '수축기(SYS)', data: records.map(r => r.sys), borderColor: '#ef4444', fill: false },
        { label: '이완기(DIA)', data: records.map(r => r.dia), borderColor: '#3b82f6', fill: false }
      ]
    }
  });
}

// 달력 보기
function renderCalendar() {
  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]');
  const calEl = document.getElementById('calendarView');
  calEl.innerHTML = `<p style="text-align:center; padding:10px;">총 <strong>${records.length}개</strong>의 혈압 측정 데이터 기록됨</p>`;
}

// 폰트 크기 변경
function changeFontSize(size) {
  document.body.style.fontSize = size;
}
