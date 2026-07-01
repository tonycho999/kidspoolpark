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
        "장소 2 (잭과나무)": {
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

    // API URL 설정 (본인 주소로 변경 필요시 수정)
    const API_BASE = 'https://reservation-api.tonycho999.workers.dev';

    let currentYear = 2026;
    let currentMonth = 7;
    let selectedLocation = document.querySelector('input[name="locationSelect"]:checked')?.value || "장소 1 (갈현동)";

    const calendarBody = document.getElementById('calendarBody');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const timeListContainer = document.getElementById('timeList');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const hiddenDateInput = document.getElementById('date');

    // === 1. 장소 선택 이벤트 ===
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
            
            selectedLocation = e.target.value;
            hiddenDateInput.value = ''; // 장소 변경시 날짜 초기화
            selectedDateDisplay.textContent = '날짜를 먼저 선택해주세요';
            timeListContainer.innerHTML = '';
            
            // 장소에 맞춰 달력 다시 그리기
            renderCalendar(currentYear, currentMonth);
        });
    });

    // === 2. 달력 그리기 로직 (운영기간 및 휴장일 적용) ===
    function isSelectable(dateStr, rule) {
        const d = new Date(dateStr);
        const start = new Date(rule.start);
        const end = new Date(rule.end);
        
        // 1) 기간 확인
        if (d < start || d > end) return false;
        
        // 2) 휴장일 예외 확인 (예: 8/17 정상운영)
        if (rule.exceptions && rule.exceptions.includes(dateStr)) return true;
        
        // 3) 요일 휴장 확인
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
                if (i === 0 && j < firstDay) {
                    // 빈 칸
                } else if (date > lastDate) {
                    // 빈 칸
                } else {
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

    // === 3. 날짜 클릭 시 시간표 및 잔여인원 로드 ===
    async function handleDateClick(cell, dateStr) {
        // 기존 선택 UI 해제
        document.querySelectorAll('#calendarBody td').forEach(td => td.classList.remove('selected'));
        cell.classList.add('selected');
        
        hiddenDateInput.value = dateStr;
        selectedDateDisplay.textContent = `${dateStr} (${selectedLocation.split(' ')[0]})`;
        
        timeListContainer.innerHTML = '<p>잔여 인원 조회 중...</p>';

        const rule = RULES[selectedLocation];
        
        try {
            // DB에서 해당 날짜의 예약 현황 조회
            const response = await fetch(`${API_BASE}/api/capacity?location=${encodeURIComponent(selectedLocation)}&date=${dateStr}`);
            const bookedData = await response.json();
            
            // [{time_slot: "1회차...", booked: 15}, ...] 형태의 데이터를 쉽게 찾도록 변환
            const bookedMap = {};
            bookedData.forEach(item => {
                bookedMap[item.time_slot] = item.booked;
            });

            timeListContainer.innerHTML = ''; // 초기화
            
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
            timeListContainer.innerHTML = '<p style="color:red;">데이터를 불러오는 데 실패했습니다.</p>';
        }
    }

    // 초기 달력 렌더링
    renderCalendar(currentYear, currentMonth);

    // === 4. 인원수 증감 로직 ===
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const peopleInput = document.getElementById('people');
    if(btnMinus && btnPlus) {
        btnMinus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val > 1) peopleInput.value = val - 1; });
        btnPlus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val < 5) peopleInput.value = val + 1; });
    }

    // === 5. 폼 제출 로직 ===
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
                people: peopleInput.value,
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
