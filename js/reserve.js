document.addEventListener('DOMContentLoaded', () => {
    // === 1. 달력 생성 로직 (2025년 7월 임시 세팅) ===
    const calendarBody = document.getElementById('calendarBody');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const hiddenDateInput = document.getElementById('date');
    let selectedDateCell = null;

    function renderCalendar(year, month) {
        calendarBody.innerHTML = '';
        const firstDay = new Date(year, month - 1, 1).getDay();
        const lastDate = new Date(year, month, 0).getDate();
        
        let date = 1;
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                if (i === 0 && j < firstDay) {
                    // 빈 칸
                } else if (date > lastDate) {
                    // 빈 칸
                } else {
                    cell.textContent = date;
                    const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                    
                    cell.addEventListener('click', () => {
                        if (selectedDateCell) selectedDateCell.classList.remove('selected');
                        cell.classList.add('selected');
                        selectedDateCell = cell;
                        
                        selectedDateDisplay.textContent = `${year}.${String(month).padStart(2, '0')}.${String(cell.textContent).padStart(2, '0')}`;
                        hiddenDateInput.value = currentDateStr;
                    });
                    date++;
                }
                row.appendChild(cell);
            }
            calendarBody.appendChild(row);
            if (date > lastDate) break;
        }
    }
    renderCalendar(2025, 7); // 초기 달력 렌더링

    // === 2. 인원수 증감 로직 ===
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const peopleInput = document.getElementById('people');

    if(btnMinus && btnPlus) {
        btnMinus.addEventListener('click', () => {
            let val = parseInt(peopleInput.value);
            if (val > 1) peopleInput.value = val - 1;
        });
        btnPlus.addEventListener('click', () => {
            let val = parseInt(peopleInput.value);
            if (val < 5) peopleInput.value = val + 1;
        });
    }

    // === 3. 폼 제출 로직 ===
    const reserveForm = document.getElementById('reserveForm');
    // 🔥 여기에 본인의 Worker 주소를 유지하세요.
    const WORKER_URL = 'https://reservation-api.tonycho999.workers.dev/api/reserve';

    if (reserveForm) {
        reserveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!hiddenDateInput.value) {
                alert('달력에서 예약 날짜를 선택해주세요.');
                return;
            }

            const timeSlot = document.querySelector('input[name="timeSlot"]:checked');
            if (!timeSlot) {
                alert('예약 시간을 선택해주세요.');
                return;
            }

            const submitBtn = reserveForm.querySelector('.submit-btn');
            submitBtn.textContent = '예약 처리 중...';
            submitBtn.disabled = true;

            // 데이터 수집
            const email = `${document.getElementById('email1').value}@${document.getElementById('email2').value}`;
            const phone = `${document.getElementById('phone1').value}-${document.getElementById('phone2').value}-${document.getElementById('phone3').value}`;
            const birthdate = `${document.getElementById('birthYear').value}-${document.getElementById('birthMonth').value}-${document.getElementById('birthDay').value}`;
            const address = `[${document.getElementById('postcode').value}] ${document.getElementById('address1').value} ${document.getElementById('address2').value}`;

            const data = {
                name: document.getElementById('name').value,
                phone: phone,
                people: peopleInput.value,
                date: hiddenDateInput.value,
                time_slot: timeSlot.value,
                email: email,
                birthdate: birthdate,
                address: address
            };

            try {
                const response = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('예약이 성공적으로 접수되었습니다!');
                    location.reload(); // 성공 시 새로고침
                } else {
                    alert('예약 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                alert('네트워크 오류가 발생했습니다.');
            } finally {
                submitBtn.textContent = '예약 신청하기';
                submitBtn.disabled = false;
            }
        });
    }
});

// === 4. 다음(카카오) 우편번호 검색 API 함수 ===
function execDaumPostcode() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById('postcode').value = data.zonecode;
            document.getElementById('address1').value = data.address;
            document.getElementById('address2').focus(); // 상세주소로 커서 이동
        }
    }).open();
}
