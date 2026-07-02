document.addEventListener('DOMContentLoaded', () => {

    // === ⭐️ 2026년 운영 정책 설정 ===
    const RULES = {
        "장소 1 (갈현동)": {
            start: "2026-07-25",
            end: "2026-08-17",
            closedDays: [2], // 매주 화요일(2) 휴장
            capacity: 130,   // 회당 정원 130명
            slots: [
                "1회차 (10:00~11:00)", "2회차 (11:30~12:30)", 
                "3회차 (13:00~14:00)", "4회차 (14:30~15:30)", "5회차 (16:00~17:00)"
            ]
        },
        "장소 2 (문원 체육공원)": {
            start: "2026-07-11",
            end: "2026-08-17",
            closedDays: [1], // 매주 월요일(1) 휴장
            exceptions: ["2026-08-17"], // 8/17(월)은 정상운영 예외
            capacity: 60,    // 회당 정원 60명
            slots: [
                "1회차 (11:00~11:50)", "2회차 (12:00~12:50)", "3회차 (14:00~14:50)",
                "4회차 (15:00~15:50)", "5회차 (16:00~16:50)", "6회차 (17:00~17:50)"
            ]
        }
    };

    const API_BASE = 'https://reservation-api.tonycho999.workers.dev';

    let currentYear = 2026;
    let currentMonth = 7;
    
    // 처음에 체크된 탭의 value 값을 가져옴 (예: "장소 1 (갈현동)")
    let selectedLocation = document.querySelector('input[name="locationSelect"]:checked')?.value;
    
    // 혹시 value가 없다면 기본값 설정
    if (!selectedLocation || !RULES[selectedLocation]) {
        selectedLocation = "장소 1 (갈현동)"; 
    }

    const calendarBody = document.getElementById('calendarBody');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const timeListContainer = document.getElementById('timeList');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const hiddenDateInput = document.getElementById('date');

    // ⭐️ 1. 날짜를 선택하기 전에 기본 시간표를 비활성화 상태로 그려주는 함수
    function renderDefaultTimeSlots(locationName) {
        const rule = RULES[locationName];
        if (!rule) return;

        timeListContainer.innerHTML = ''; // 초기화
        
        rule.slots.forEach(slot => {
            const label = document.createElement('label');
            label.className = 'time-item disabled'; // 비활성화 스타일 적용
            label.innerHTML = `
                <input type="radio" name="timeSlot" value="${slot}" disabled>
                <span style="color:#999;">
                    ${slot} <br>
                    <small>(날짜를 먼저 선택해주세요)</small>
                </span>
            `;
            timeListContainer.appendChild(label);
        });
    }

    // === 2. 장소 선택 이벤트 ===
    const locationRadios = document.querySelectorAll('input[name="locationSelect"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 탭 디자인 변경
            document.querySelectorAll('.tab-label').forEach(label => {
                label.style.borderColor = '#ccc';
                label.querySelector('.tab-text').style.color = '#666';
                label.querySelector('.tab-text').style.fontWeight = 'normal';
            });
            e.target.parentElement.style.borderColor = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.color = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.fontWeight = 'bold';
            
            // 데이터 초기화
            selectedLocation = e.target.value;
            hiddenDateInput.value = ''; 
            selectedDateDisplay.textContent = '날짜를 먼저 선택해주세요';
            
            // 달력 다시 그리기 & 기본 시간표 그리기
            renderCalendar(currentYear, currentMonth);
            renderDefaultTimeSlots(selectedLocation); 
        });
    });

    // === 3. 달력 그리기 로직 (운영기간 및 휴장일 적용) ===
    function isSelectable(dateStr, rule) {
        const d = new Date(dateStr);
        const start = new Date(rule.start);
        const end = new Date(rule.end);
        
        if (d < start || d > end) return false;
        if (rule.exceptions && rule.exceptions.includes(dateStr)) return true;
        if (rule.closedDays.includes(d.getDay())) return false;
        return true;
    }

    function renderCalendar(year, month) {
        calendarBody.innerHTML = '';
        currentMonthDisplay.textContent = `${year}년 ${month}월`;
        
        const firstDay = new Date(year, month - 1, 1).getDay();
        const lastDate = new Date(year, month, 0).getDate();
        const rule = RULES[selectedLocation];

        let date = 1;
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                if (i === 0 && j < firstDay) { } 
                else if (date > lastDate) { } 
                else {
                    cell.textContent = date;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                    
                    if (isSelectable(dateStr, rule)) {
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', () => handleDateClick(cell, dateStr));
                    } else {
                        cell.classList.add('disabled');
                        cell.title = '휴장일 또는 운영기간 아님';
                    }
                    date++;
                }
                row.appendChild(cell);
            }
            calendarBody.appendChild(row);
            if (date > lastDate) break;
        }
    }

    // 이전/다음 달 버튼
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (currentMonth === 1) { currentMonth = 12; currentYear--; } else { currentMonth--; }
        renderCalendar(currentYear, currentMonth);
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        if (currentMonth === 12) { currentMonth = 1; currentYear++; } else { currentMonth++; }
        renderCalendar(currentYear, currentMonth);
    });

    // === 4. 날짜 클릭 시 실시간 잔여인원 로드 ===
    async function handleDateClick(cell, dateStr) {
        document.querySelectorAll('#calendarBody td').forEach(td => td.classList.remove('selected'));
        cell.classList.add('selected');
        
        hiddenDateInput.value = dateStr;
        
        // ⭐️ (요청사항) 뒤에 붙던 (장소) 텍스트를 제거하고 날짜만 깔끔하게 표시
        selectedDateDisplay.textContent = dateStr; 
        
        timeListContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">잔여 인원 조회 중...</p>';

        const rule = RULES[selectedLocation];
        
        try {
            const response = await fetch(`${API_BASE}/api/capacity?location=${encodeURIComponent(selectedLocation)}&date=${dateStr}`);
            const bookedData = await response.json();
            
            const bookedMap = {};
            bookedData.forEach(item => {
                bookedMap[item.time_slot] = item.booked;
            });

            timeListContainer.innerHTML = ''; 
            
            rule.slots.forEach(slot => {
                const bookedCount = bookedMap[slot] || 0;
                const remainCount = rule.capacity - bookedCount;
                const isFull = remainCount <= 0;

                const label = document.createElement('label');
                label.className = `time-item ${isFull ? 'disabled' : ''}`;
                
                label.innerHTML = `
                    <input type="radio" name="timeSlot" value="${slot}" ${isFull ? 'disabled' : ''}>
                    <span style="${isFull ? 'color:#dc3545; text-decoration:line-through;' : ''}">
                        ${slot} <br>
                        <small style="color:${isFull ? '#dc3545' : '#28a745'}">
                            (잔여: ${isFull ? '마감' : remainCount + '명'} / 정원: ${rule.capacity}명)
                        </small>
                    </span>
                `;
                timeListContainer.appendChild(label);
            });

        } catch (error) {
            timeListContainer.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오는 데 실패했습니다.</p>';
            renderDefaultTimeSlots(selectedLocation); // 실패 시 다시 기본 시간표 표시
        }
    }

    // ⭐️ 페이지가 처음 켜질 때, 달력을 그리고 기본 시간표도 미리 그려둠
    renderCalendar(currentYear, currentMonth);
    renderDefaultTimeSlots(selectedLocation);

    // === 5. 인원수 증감 로직 ===
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const peopleInput = document.getElementById('people');
    if(btnMinus && btnPlus) {
        btnMinus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val > 1) peopleInput.value = val - 1; });
        btnPlus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val < 5) peopleInput.value = val + 1; });
    }

    // === 6. 폼 제출 로직 ===
    const reserveForm = document.getElementById('reserveForm');
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

            const email = `${document.getElementById('email1').value}@${document.getElementById('email2').value}`;
            const phone = `${document.getElementById('phone1').value}-${document.getElementById('phone2').value}-${document.getElementById('phone3').value}`;
            const birthdate = `${document.getElementById('birthYear').value}-${document.getElementById('birthMonth').value}-${document.getElementById('birthDay').value}`;
            const address = `[${document.getElementById('postcode').value}] ${document.getElementById('address1').value} ${document.getElementById('address2').value}`;

            const data = {
                location: selectedLocation,
                name: document.getElementById('name').value,
                phone: phone,
                people: parseInt(peopleInput.value),
                date: hiddenDateInput.value,
                time_slot: timeSlot.value,
                email: email,
                birthdate: birthdate,
                address: address
            };

            try {
                const response = await fetch(`${API_BASE}/api/reserve`, {
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

// 다음 우편번호 API
function execDaumPostcode() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById('postcode').value = data.zonecode;
            document.getElementById('address1').value = data.address;
            document.getElementById('address2').focus();
        }
    }).open();
}
