// 하단 네비게이션 탭 전환
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  if (btnElement) btnElement.classList.add('active');

  if (tabId === 'tab-home') renderRecords();
  if (tabId === 'tab-analysis') renderChart();
}

document.addEventListener('DOMContentLoaded', () => {
  renderRecords();
});

// 혈압 상태 판정 (정상 / 고혈압 / 주의)
function getBPStatus(sys, dia) {
  if (sys < 120 && dia < 80) {
    return { text: '정상', className: 'badge-normal' };
  } else if (sys <= 129 && dia < 80) {
    return { text: '주의', className: 'badge-warning' };
  } else {
    return { text: '고혈압', className: 'badge-high' };
  }
}

// 날짜 포맷 (예: 10월 4일 오전 11:31)
function formatDate(dateObj) {
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';
  hours = hours % 12 || 12;

  return `${month}월 ${day}일 ${ampm} ${hours}:${minutes}`;
}

// 이미지 촬영/선택 시 자동 숫자 인식
async function processImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previewBox = document.getElementById('previewBox');
  const canvas = document.getElementById('imageCanvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('imageStatusHint');

  previewBox.style.display = 'block';
  hint.innerText = '🔍 혈압계 숫자를 분석 중입니다...';

  const img = new Image();
  img.onload = async function() {
    canvas.width = img.width;
    canvas.height = img.height;

    // 명암 보정 (검은색 뭉개짐 방지)
    ctx.filter = 'contrast(180%) brightness(115%) grayscale(100%)';
    ctx.drawImage(img, 0, 0);

    try {
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
      });

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      const foundNumbers = ret.data.text.match(/\d+/g) || [];
      const validNumbers = foundNumbers.filter(num => num.length >= 2 && num.length <= 3);

      if (validNumbers.length >= 3) {
        document.getElementById('sysInput').value = validNumbers[0];
        document.getElementById('diaInput').value = validNumbers[1];
        document.getElementById('pulseInput').value = validNumbers[2];
        hint.innerText = '✅ 숫자가 자동으로 입력되었습니다!';
      } else {
        hint.innerText = '⚠️ 숫자를 다 읽지 못했습니다. 숫자를 직접 보정해 주세요.';
      }
    } catch (err) {
      console.error(err);
      hint.innerText = '인식 오류가 발생했습니다. 직접 수치를 입력해 주세요.';
    }
  };

  img.src = URL.createObjectURL(file);
}

// 데이터 저장
function saveRecord() {
  const sysVal = document.getElementById('sysInput').value;
  const diaVal = document.getElementById('diaInput').value;
  const pulseVal = document.getElementById('pulseInput').value;

  if (!sysVal || !diaVal || !pulseVal) {
    alert('수축기, 이완기, 맥박 수치를 입력해 주세요.');
    return;
  }

  const sys = parseInt(sysVal);
  const dia = parseInt(diaVal);
  const pulse = parseInt(pulseVal);
  const statusInfo = getBPStatus(sys, dia);

  const record = {
    id: Date.now(),
    date: formatDate(new Date()),
    sys: sys,
    dia: dia,
    pulse: pulse,
    statusText: statusInfo.text,
    statusClass: statusInfo.className
  };

  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]');
  records.unshift(record);
  localStorage.setItem('bpRecords', JSON.stringify(records));

  document.getElementById('sysInput').value = '';
  document.getElementById('diaInput').value = '';
  document.getElementById('pulseInput').value = '';

  renderRecords();
  alert('혈압 기록이 저장되었습니다.');
}

// 개별 삭제
function deleteRecord(id) {
  let records = JSON.parse(localStorage.getItem('bpRecords') || '[]');
  records = records.filter(r => r.id !== id);
  localStorage.setItem('bpRecords', JSON.stringify(records));
  renderRecords();
}

// 전체 삭제
function clearAllData() {
  if (confirm('모든 측정 기록을 삭제하시겠습니까?')) {
    localStorage.removeItem('bpRecords');
    renderRecords();
  }
}

// 측정 기록 리스트 화면 렌더링
function renderRecords() {
  const listEl = document.getElementById('recordList');
  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]');

  if (records.length === 0) {
    listEl.innerHTML = '<div class="empty-msg">저장된 혈압 기록이 없습니다.<br>사진을 찍거나 직접 입력해 보세요.</div>';
    return;
  }

  listEl.innerHTML = records.map(r => `
    <div class="record-item">
      <div class="record-top">
        <span class="record-date">${r.date}</span>
        <div class="record-top-right">
          <span class="status-badge ${r.statusClass}">${r.statusText}</span>
          <button class="delete-item-btn" onclick="deleteRecord(${r.id})">✕</button>
        </div>
      </div>
      <div class="record-bottom">
        <span>${r.sys} / ${r.dia} <span style="font-size:0.8rem; font-weight:normal; color:#6B7280;">mmHg</span></span>
        <span class="record-divider">|</span>
        <span class="pulse-text"><span style="color:#EF4444;">❤️</span> ${r.pulse} <span style="font-size:0.8rem; font-weight:normal; color:#6B7280;">bpm</span></span>
      </div>
    </div>
  `).join('');
}

// 선형 차트 생성
let chartInstance = null;
function renderChart() {
  const records = JSON.parse(localStorage.getItem('bpRecords') || '[]').slice().reverse();
  const ctx = document.getElementById('bpChart').getContext('2d');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r => r.date),
      datasets: [
        { label: '수축기(SYS)', data: records.map(r => r.sys), borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.3 },
        { label: '이완기(DIA)', data: records.map(r => r.dia), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)', tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}

// 폰트 크기 변경
function changeFontSize(size) {
  document.body.style.fontSize = size;
}
