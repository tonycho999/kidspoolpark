document.addEventListener('DOMContentLoaded', () => {

    // === 장소 선택 탭 UI 변경 스크립트 ===
    const locationRadios = document.querySelectorAll('input[name="locationSelect"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.tab-label').forEach(label => {
                label.style.borderColor = '#ccc';
                label.querySelector('.tab-text').style.color = '#666';
                label.querySelector('.tab-text').style.fontWeight = 'normal';
            });
            e.target.parentElement.style.borderColor = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.color = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.fontWeight = 'bold';
        });
    });

    // === 1. 달력 생성 로직 ===
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
                if (i === 0 && j < firstDay) { } 
                else if (date > lastDate) { } 
                else {
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
    renderCalendar(2025, 7);

    // === 2. 인원수 증감 로직 ===
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const peopleInput = document.getElementById('people');
    if(btnMinus && btnPlus) {
        btnMinus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val > 1) peopleInput.value = val - 1; });
        btnPlus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val < 5) peopleInput.value = val + 1; });
    }

    // === 3. 폼 제출 로직 ===
    const reserveForm = document.getElementById('reserveForm');
    const WORKER_URL = 'https://reservation-api.tonycho999.workers.dev/api/reserve';

    if (reserveForm) {
        reserveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!hiddenDateInput.value) return alert('달력에서 예약 날짜를 선택해주세요.');
            const timeSlot = document.querySelector('input[name="timeSlot"]:checked');
            if (!timeSlot) return alert('예약 시간을 선택해주세요.');
            const agree = document.getElementById('privacyAgree');
            if (!agree.checked) return alert('개인정보 수집 및 이용에 동의해주세요.');

            const submitBtn = reserveForm.querySelector('.submit-btn');
            submitBtn.textContent = '예약 처리 중...';
            submitBtn.disabled = true;

            // 데이터 수집
            const selectedLocation = document.querySelector('input[name="locationSelect"]:checked').value; // ⭐️ 장소 가져오기
            const email = `${document.getElementById('email1').value}@${document.getElementById('email2').value}`;
            const phone = `${document.getElementById('phone1').value}-${document.getElementById('phone2').value}-${document.getElementById('phone3').value}`;
            const birthdate = `${document.getElementById('birthYear').value}-${document.getElementById('birthMonth').value}-${document.getElementById('birthDay').value}`;
            const address = `[${document.getElementById('postcode').value}] ${document.getElementById('address1').value} ${document.getElementById('address2').value}`;

            const data = {
                location: selectedLocation, // ⭐️ 장소 데이터 추가
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
                    location.reload(); 
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

// === 4. 다음 우편번호 API ===
function execDaumPostcode() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById('postcode').value = data.zonecode;
            document.getElementById('address1').value = data.address;
            document.getElementById('address2').focus();
        }
    }).open();
}
