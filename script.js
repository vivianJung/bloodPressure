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

// 이미지 처리 및 자동 숫자 인식(OCR)
async function processImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const canvas = document.getElementById('imageCanvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('imageStatusHint');

  hint.style.display = 'block';
  hint.innerText = '🔍 사진에서 숫자를 분석하는 중입니다... (약 3~5초 소요)';

  const img = new Image();
  img.onload = async function() {
    canvas.width = img.width;
    canvas.height = img.height;

    // LCD 명암 보정 (숫자 인식률 향상)
    ctx.filter = 'contrast(200%) brightness(120%) grayscale(100%)';
    ctx.drawImage(img, 0, 0);
    canvas.style.display = 'block';

    try {
      // Tesseract.js 엔진으로 숫자만 추출
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789', // 숫자만 인식하도록 제한
      });

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      // 추출된 텍스트에서 2자리 이상의 숫자들만 추출 (예: 120, 80, 70)
      const foundNumbers = ret.data.text.match(/\d+/g) || [];
      const validNumbers = foundNumbers.filter(num => num.length >= 2 && num.length <= 3);

      if (validNumbers.length >= 3) {
        document.getElementById('sysInput').value = validNumbers[0]; // 첫 번째 숫자: 수축기
        document.getElementById('diaInput').value = validNumbers[1]; // 두 번째 숫자: 이완기
        document.getElementById('pulseInput').value = validNumbers[2]; // 세 번째 숫자: 맥박
        hint.innerText = '✅ 숫자가 자동으로 입력되었습니다! 수치를 확인해주세요.';
      } else if (validNumbers.length > 0) {
        if (validNumbers[0]) document.getElementById('sysInput').value = validNumbers[0];
        if (validNumbers[1]) document.getElementById('diaInput').value = validNumbers[1];
        hint.innerText = '⚠️ 일부 숫자만 인식되었습니다. 빠진 수치는 직접 입력해주세요.';
      } else {
        hint.innerText = '❌ 숫자를 찾지 못했습니다. 숫자를 직접 입력하시거나 정면에서 다시 찍어주세요.';
      }
    } catch (error) {
      console.error(error);
      hint.innerText = '인식 중 오류가 발생했습니다. 숫자를 직접 입력해주세요.';
    }
  };

  img.src = URL.createObjectURL(file);
}

// 데이터 저장 기능
function saveRecord() {
  const sys = document.getElementById('sysInput').value;
  const dia = document.getElementById('diaInput').value;
  const pulse = document.getElementById('pulseInput').value;

  if (!sys || !dia || !pulse) {
    alert('수축기, 이완기, 맥박 수치를 모두 입력해 주세요.');
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

// 기록 목록 출력
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

// 전체 삭제
function clearAllData() {
  if (confirm('모든 혈압 기록을 삭제하시겠습니까?')) {
    localStorage.removeItem('bpRecords');
    renderRecords();
  }
}

// 선형 차트 렌더링
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
  calEl.innerHTML = `<p style="text-align:center; padding:10px;">총 <strong>${records.length}개</strong>의 측정 기록이 있습니다.</p>`;
}

// 폰트 크기 변경
function changeFontSize(size) {
  document.body.style.fontSize = size;
}
