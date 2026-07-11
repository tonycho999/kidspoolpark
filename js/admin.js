document.addEventListener('DOMContentLoaded', async () => {

    const reservationList = document.getElementById('reservationList');
    
    // ⭐️ 요약 박스 엘리먼트 (인원수 표시용)
    const totalBookedEl = document.getElementById('totalBookedCount');
    const totalCanceledEl = document.getElementById('totalCanceledCount');
    
    // 필터 엘리먼트들
    const searchInput = document.getElementById('searchInput');
    const filterLocation = document.getElementById('filterLocation');
    const filterDate = document.getElementById('filterDate');
    const filterTime = document.getElementById('filterTime');
    
    const GET_URL = 'https://reservation-api.tonycho999.workers.dev/api/reservations';
    const UPDATE_URL = 'https://reservation-api.tonycho999.workers.dev/api/update-status';

    let allReservations = []; 

    // 상태에 따른 배경색/글자색 스타일 반환 함수
    function getStatusStyle(status) {
        if (status === '예약완료') {
            return 'background-color: #28a745; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        } else if (status === '예약취소') {
            return 'background-color: #dc3545; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        } else { // 예약대기
            return 'background-color: #ffffff; color: #333; border: 1px solid #ccc; padding: 5px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        }
    }

    function renderTable(dataToRender) {
        reservationList.innerHTML = ''; 
        
        // ⭐️ 1. 인원 합산용 변수 초기화
        let sumBooked = 0;
        let sumCanceled = 0;

        if (dataToRender.length === 0) {
            reservationList.innerHTML = '<tr><td colspan="6">일치하는 예약 내역이 없습니다.</td></tr>';
            // 데이터가 없으면 인원수도 0으로 업데이트
            if(totalBookedEl) totalBookedEl.textContent = '0';
            if(totalCanceledEl) totalCanceledEl.textContent = '0';
            return;
        }

        dataToRender.forEach(item => {
            const currentStatus = item.status || '예약대기';
            
            // ⭐️ 2. 상태에 따라 인원수 더하기
            const peopleCount = parseInt(item.people) || 0;
            if (currentStatus === '예약취소') {
                sumCanceled += peopleCount;
            } else {
                sumBooked += peopleCount;
            }

            const row = document.createElement('tr');
            
            // 뱃지 텍스트 및 색상 로직
            const isMunyhyeon = item.location.includes('장소 1');
            const locationColor = isMunyhyeon ? '#0056b3' : '#28a745'; 
            const locationText = isMunyhyeon ? '문현동' : '갈현동';     

            const locationBadge = `<span style="background:${locationColor}; color:white; padding:3px 6px; border-radius:3px; font-size:0.8em; margin-bottom:5px; display:inline-block; font-weight:bold;">${locationText}</span><br>`;
            const dateTimeStr = `${locationBadge}<strong>${item.date}</strong><br><span style="font-size:0.85em; color:#666;">${item.time_slot}</span>`;
            const userInfoStr = `<strong>${item.name}</strong> (${item.phone})<br><span style="font-size:0.85em; color:#666;">${item.email} / ${item.birthdate}</span>`;

            row.innerHTML = `
                <td>${dateTimeStr}</td>
                <td style="font-family: monospace; font-weight: bold; color: #0056b3;">${item.reservation_code || '-'}</td>
                <td style="text-align:left;">${userInfoStr}</td>
                <td style="text-align:left; font-size:0.9em; max-width:250px; word-break:keep-all;">${item.address || '-'}</td>
                <td>${item.people}명</td>
                <td>
                    <select class="status-select" data-id="${item.id}" style="${getStatusStyle(currentStatus)}">
                        <option value="예약대기" style="background:#fff; color:#333;" ${currentStatus === '예약대기' ? 'selected' : ''}>예약대기</option>
                        <option value="예약완료" style="background:#fff; color:#333;" ${currentStatus === '예약완료' ? 'selected' : ''}>예약완료</option>
                        <option value="예약취소" style="background:#fff; color:#333;" ${currentStatus === '예약취소' ? 'selected' : ''}>예약취소</option>
                    </select>
                </td>
            `;
            reservationList.appendChild(row);
        });

        // ⭐️ 3. 계산된 총 인원수를 요약 박스에 반영
        if(totalBookedEl) totalBookedEl.textContent = sumBooked;
        if(totalCanceledEl) totalCanceledEl.textContent = sumCanceled;

        attachSelectListeners();
    }

    function attachSelectListeners() {
        document.querySelectorAll('.status-select').forEach(selectElement => {
            selectElement.addEventListener('change', async (e) => {
                const reservationId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;

                try {
                    const updateRes = await fetch(UPDATE_URL, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: reservationId, status: newStatus })
                    });
                    
                    if (updateRes.ok) {
                        const itemToUpdate = allReservations.find(item => item.id == reservationId);
                        if (itemToUpdate) itemToUpdate.status = newStatus;
                        
                        // ⭐️ 상태 변경 시 스타일만 바꾸는 게 아니라, 
                        // 전체 표를 다시 그려서 상단의 총 인원수(요약)도 실시간으로 갱신되게 만듦!
                        applyFilters(); 
                        
                    } else {
                        alert('상태 변경에 실패했습니다.');
                        location.reload(); 
                    }
                } catch (error) {
                    alert('네트워크 오류가 발생했습니다.');
                    location.reload();
                }
            });
        });
    }

    // 다중 필터링 함수
    function applyFilters() {
        const keyword = searchInput.value.toLowerCase().trim();
        const loc = filterLocation.value;
        const date = filterDate.value;
        const time = filterTime.value;

        const filteredData = allReservations.filter(item => {
            // 1. 이름 / 연락처 / 예약번호 통합 검색
            const matchKeyword = 
                (item.name && item.name.toLowerCase().includes(keyword)) || 
                (item.phone && item.phone.includes(keyword)) ||
                (item.reservation_code && item.reservation_code.toLowerCase().includes(keyword));
                
            // 2. 장소 필터
            const matchLoc = loc === "" || item.location.includes(loc);
            // 3. 날짜 필터
            const matchDate = date === "" || item.date === date;
            // 4. 시간(회차) 필터
            const matchTime = time === "" || item.time_slot.includes(time);

            return matchKeyword && matchLoc && matchDate && matchTime;
        });

        renderTable(filteredData);
    }

    // 필터 이벤트 리스너 등록
    [searchInput, filterLocation, filterDate, filterTime].forEach(el => {
        if(el) el.addEventListener('input', applyFilters);
    });

    // 초기 데이터 로드
    try {
        const response = await fetch(GET_URL);
        const data = await response.json();
        allReservations = data;
        renderTable(allReservations);
    } catch (error) {
        reservationList.innerHTML = '<tr><td colspan="6">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
});
